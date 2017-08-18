import { Component, OnInit, ElementRef, EventEmitter, Input, Output, OnChanges, SimpleChanges } from '@angular/core';
import { LoaderService, APIAppInfo } from 'app/loader.service';
import { sortBy, pullAllBy, differenceBy } from 'lodash';
import { Observable } from "rxjs/Observable";
import { Subscription } from "rxjs/Subscription";

// thanks to http://4dev.tech/2016/03/tutorial-creating-an-angular2-autocomplete/ !

@Component({
  selector: 'app-autocomplete',
  templateUrl: './autocomplete.component.html',
  styleUrls: ['./autocomplete.component.scss'],
  host: {
    '(document:click)': 'handleClick($event)'
  }
})
export class AutocompleteComponent implements OnInit, OnChanges {


  public query = '';
  public filteredList = [];

  @Input() selected: APIAppInfo;
  @Input() omit: APIAppInfo[];
  private _omitIDs: { [id: string]: boolean } = {};
  @Output() selectedChange = new EventEmitter<APIAppInfo>();
  private nonce = '';
  private fetching: Subscription;

  constructor(private myElement: ElementRef, private loader: LoaderService) {
  }

  ngOnInit() { }
  ngOnChanges(changes: SimpleChanges): void {

    // console.log('changes! ', changes, this.selected);
    
    if (changes.omit && this.omit) {
      this._omitIDs = this.omit.reduce((obj, a) => {
        obj[a.app] = true;
        return obj;
      }, {});
    }
    // if (changes.selected) {
    //   console.log('changes selected! ', changes.selected.currentValue);
    //   this.query = changes.selected.currentValue === undefined ? '' : changes.selected.currentValue.storeinfo.title;
    // }

    this.query = ''; // this.selected === undefined ? '' : this.selected.storeinfo.title;
  }

  filter() {
    if (this.query.trim() !== '') {
      let nonce = this.nonce = Math.round(1e12 * Math.random()).toString();

      if (this.fetching) { 
        console.log('cancelling previous subscription');
        this.fetching.unsubscribe();  
        delete this.fetching;
      }

      this.fetching = this.loader.findApps$({startsWith: this.query.trim(), fullInfo:true, onlyAnalyzed:true})
      .subscribe((results) => {

        if (this.fetching) {
          this.fetching.unsubscribe();
          delete this.fetching;
        }
        
        console.log('results > ', results);
        if (nonce !== this.nonce) { return; }

        let qL = this.query.toLowerCase().trim(),
              newL = results.filter((x) => !this._omitIDs[x.app] && x.storeinfo.title.toLowerCase().indexOf(qL) === 0 && x.icon),
              by = (x) => x.storeinfo.title;        

        let goners = differenceBy(this.filteredList, newL, by),
          newbies = differenceBy(newL, this.filteredList, by);

        // console.log('old filteredlist: ', this.filteredList.length, this.filteredList.map(a => a.storeinfo.title));
        // console.log('goners: ', goners.length, goners.map(a => a.storeinfo.title));
        // console.log('newbies ', newbies.length, newbies.map(a => a.storeinfo.title));

        pullAllBy(this.filteredList, goners, by);
        Array.prototype.splice.apply(this.filteredList, [this.filteredList, 0].concat(newbies));

        // console.log('newlist ', this.filteredList.length, this.filteredList.map(a => a.storeinfo.title));
        
        this.filteredList = sortBy(this.filteredList, by);

        // console.log(`omit results > "${qL}"`, results.map(r => r.storeinfo.title), this.filteredList, this._omitIDs);
        // this.filteredList.sort((a, b) => {
        //   let atitle = a.storeinfo.title.toUpperCase(); // ignore upper and lowercase
        //   let btitle = b.storeinfo.title.toUpperCase(); // ignore upper and lowercase
        //   if (atitle < btitle) {
        //     return -1;
        //   }
        //   if (atitle > btitle) {
        //     return 1;
        //   }
        //   return 0;
        // });
      });
    } else {
      this.filteredList = [];
    }
  }

  select(item) {
    if (item) {
      this.selectedChange.emit(item);
    }
    this.selected = item;
    this.query = item.storeinfo.title;
    this.filteredList = []; // hide the list
  }

  handleClick(event) {
    let clickedComponent = event.target,
      inside = false;
    do {
      if (clickedComponent === this.myElement.nativeElement) {
        inside = true;
      }
      clickedComponent = clickedComponent.parentNode;
    } while (clickedComponent);
    if (!inside) {
      this.filteredList = [];
    }
  }
}
