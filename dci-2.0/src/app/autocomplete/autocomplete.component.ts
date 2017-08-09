import { Component, OnInit, ElementRef, EventEmitter, Input, Output } from '@angular/core';
import { LoaderService, APIAppInfo } from "app/loader.service";

// thanks to http://4dev.tech/2016/03/tutorial-creating-an-angular2-autocomplete/ !

@Component({
  selector: 'app-autocomplete',
  templateUrl: './autocomplete.component.html',
  styleUrls: ['./autocomplete.component.scss'],
  host: {
     '(document:click)': 'handleClick($event)'
  }
})
export class AutocompleteComponent implements OnInit {

  public query = '';
  public filteredList = [];
  
  @Input() selected: APIAppInfo;  
  @Output() selectedChange = new EventEmitter<APIAppInfo>();
  
  constructor(private myElement: ElementRef, private loader: LoaderService) {
  }

  ngOnInit() { }

  filter() {
    if (this.query.trim() !== ""){
      this.loader.findApps(this.query.trim()).then((results: APIAppInfo[]) => {
        const qL = this.query.toLowerCase();
        this.filteredList = results.filter((x) => x.storeinfo.title.toLowerCase().indexOf(qL) == 0);
        this.filteredList.sort((a,b) => {
            var atitle = a.storeinfo.title.toUpperCase(); // ignore upper and lowercase
            var btitle = b.storeinfo.title.toUpperCase(); // ignore upper and lowercase
            if (atitle < btitle) { 
              return -1;
            }
            if (atitle > btitle) {
              return 1;
            }
            return 0;
          });
      });
    } else {
        this.filteredList = [];
    }
  }
  
  select(item){
    console.log('selected ', item);
    if (item) {
      this.selectedChange.emit(item);
    }
    this.selected = item;
    this.query = item.storeinfo.title;
    this.filteredList = [];
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
