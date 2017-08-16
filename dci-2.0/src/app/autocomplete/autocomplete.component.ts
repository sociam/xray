import { Component, OnInit, ElementRef, EventEmitter, Input, Output, OnChanges, SimpleChanges } from '@angular/core';
import { LoaderService, APIAppInfo } from "app/loader.service";
import { APIService } from '../services/api.service';
import { FullApp } from '../services/apitypes.service';
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
  public appData: FullApp[];
  
  @Input() selected: APIAppInfo;  
  @Input() omit: APIAppInfo[]; 
  private _omitIDs: { [id: string] : boolean } = {};
  @Output() selectedChange = new EventEmitter<APIAppInfo>();
  
  constructor(private myElement: ElementRef, private loader: LoaderService, private api: APIService) {
  }

  ngOnInit() { }
  ngOnChanges(changes: SimpleChanges): void {
    if (this.omit) {
      this._omitIDs = this.omit.reduce((obj, a) => {
        obj[a.app] = true;
        return obj;
      }, {});      
    }
    if (changes.selected) {
      this.query = changes.selected.currentValue === undefined ? '' : changes.selected.currentValue.storeinfo.title;
    }
  }  

  filter() {
  if (this.query !== ""){
        this.api.fetchApps({
          title: this.query,
          fullInfo: true,
          onlyAnalyzed: true
        })
        .then((apps: FullApp[])=>{
          this.filteredList = apps.filter(function(el){
            return el.storeinfo.title.toLowerCase().indexOf(this.query.toLowerCase()) > -1;
          }.bind(this));
        })
        .catch((err) => console.log(err));
      }else{
        this.filteredList = [];
      }
  }
  
  select(item){
    if (item) {
      this.selectedChange.emit(item);
    }
    this.selected = item;
    this.query = item.storeinfo.title;
    this.filteredList = []; // hide the list
  }

  handleClick(event){
   var clickedComponent = event.target;
   var inside = false;
   do {
       if (clickedComponent === this.myElement.nativeElement) {
           inside = true;
       }
      clickedComponent = clickedComponent.parentNode;
   } while (clickedComponent);
    if(!inside){
        this.filteredList = [];
    }
}
}
