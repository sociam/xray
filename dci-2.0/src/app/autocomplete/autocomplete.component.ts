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
  private fetching: Promise<void>;

  constructor(private myElement: ElementRef, private loader: LoaderService) {
  }

  ngOnInit() { }
  ngOnChanges(changes: SimpleChanges): void {
    if (changes.omit && this.omit) {
      this._omitIDs = this.omit.reduce((obj, a) => {
        obj[a.app] = true;
        return obj;
      }, {});
    }
    this.query = ''; // this.selected === undefined ? '' : this.selected.storeinfo.title;
  }

  filter() {
    if (this.query.trim() !== '') {

      let fetching = this.fetching = this.loader.findApps$({startsWith: this.query.trim(), fullInfo: true, onlyAnalyzed: true})
      .then((results) => {
        if (fetching !== this.fetching) { 
          // we are already obsolete, return;
          return; 
        }
        delete this.fetching;

        let qL = this.query.toLowerCase().trim(),
              newL = results.filter((x) => !this._omitIDs[x.app] && x.storeinfo.title.toLowerCase().indexOf(qL) === 0 && x.icon),
              by = (x) => x.storeinfo.title;        

        let goners = differenceBy(this.filteredList, newL, by),
          newbies = differenceBy(newL, this.filteredList, by);

        pullAllBy(this.filteredList, goners, by);
        Array.prototype.splice.apply(this.filteredList, [this.filteredList, 0].concat(newbies));
        this.filteredList = sortBy(this.filteredList, by);
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
