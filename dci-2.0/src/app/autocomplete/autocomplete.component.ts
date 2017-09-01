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
  private loading = false;
  private loadingSuggestions = false;

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

  levenshteinDistance(a, b): number {
    var tmp;
    if (a.length === 0) { return b.length; }
    if (b.length === 0) { return a.length; }
    if (a.length > b.length) { tmp = a; a = b; b = tmp; }
  
    var i, j, res, alen = a.length, blen = b.length, row = Array(alen);
    for (i = 0; i <= alen; i++) { row[i] = i; }
  
    for (i = 1; i <= blen; i++) {
      res = i;
      for (j = 1; j <= alen; j++) {
        tmp = row[j - 1];
        row[j - 1] = res;
        res = b[i - 1] === a[j - 1] ? tmp : Math.min(tmp + 1, Math.min(res + 1, row[j] + 1));
      }
    }
    return res;
  }

  filter() {
    if (this.query.trim() !== '') {
      this.loadingSuggestions = true;
      let fetching = this.fetching = this.loader.findApps({title: this.query.trim(), fullInfo: true, onlyAnalyzed: true}, false, false)
      .then((results) => {
        if (fetching !== this.fetching) { 
          // we are already obsolete, return;
          return; 
        }
        delete this.fetching;
        this.loadingSuggestions = false;

        // console.log('autocomplete results ', results, 'omitIDs', this._omitIDs);

        let qL = this.query.toLowerCase().trim(),
              newL = results.filter((x) => !this._omitIDs[x.app] && x.storeinfo.title.toLowerCase().indexOf(qL) >= 0),
              byTitle = (x) => x.storeinfo.title,
              by = (x) => this.levenshteinDistance(qL, x.storeinfo.title.toLowerCase());

        // console.log('newL ', newL);              

        let goners = differenceBy(this.filteredList, newL, byTitle),
          newbies = differenceBy(newL, this.filteredList, byTitle);

        pullAllBy(this.filteredList, goners, byTitle);
        Array.prototype.splice.apply(this.filteredList, [this.filteredList, 0].concat(newbies));
        this.filteredList = sortBy(this.filteredList, by);
      }).catch((e) => {
        this.loadingSuggestions = false;
        delete this.fetching;
        this.filteredList = [];
      });
    } else {
      this.loadingSuggestions = false;
      this.filteredList = [];
    }
  }

  select(item) {    
    if (item) {
      this.selected = item;
      this.filteredList = []; // hide the list      
      this.query = item.storeinfo.title;          
      this.loading = true;
      this.loader.getFullAppInfo(item.app).then((fullitem) => {
        this.loading = false;
        console.log('got full item ', fullitem);
          this.selectedChange.emit(fullitem);          
      });      
    }
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
