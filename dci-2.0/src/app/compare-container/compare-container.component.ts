import { Component, OnInit } from '@angular/core';
import { AppUsage } from "app/usagetable/usagetable.component";
import { Router, ActivatedRoute } from "@angular/router";
import { UsageConnectorService } from "app/usage-connector.service";

@Component({
  selector: 'app-compare-container',
  templateUrl: './compare-container.component.html',
  styleUrls: ['./compare-container.component.css']
})
export class CompareContainerComponent implements OnInit {

  using : AppUsage[];  
  selected : string;

  constructor(private connector: UsageConnectorService, private route: ActivatedRoute) { 
    console.log('ComparecontainerComponent ... ');
  }

  ngOnInit() {
    console.log('ngOnInit ... ');
    this.route.paramMap.subscribe((pm) => {
      // console.log(' YO ~~~ ', pm.get('app'));
      this.selected = pm.get('app');
      console.log('got selected ', pm.get('app'));
    });    
    this.using = this.connector.getState();
    console.log('hello, compare container component', this.selected, this.using);
    (<any>window)._route = this.route;
  }

}
