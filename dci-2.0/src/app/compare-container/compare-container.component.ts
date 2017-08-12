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
  selectedAppId : string;

  constructor(private connector: UsageConnectorService, private route: ActivatedRoute) {
  }

  ngOnInit() {
    this.route.paramMap.subscribe((pm) => this.selectedAppId = pm.get('app'));
    this.using = this.connector.getState();
  }
}
