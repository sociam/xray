import { Component, OnInit } from '@angular/core';
import { LoaderService, App2Hosts, String2String, CompanyID2Info, Host2PITypes } from '../loader.service';
import * as _ from 'lodash';
import { UsageConnectorService } from '../usage-connector.service';

export interface AppUsage { appid: string; mins: number };

@Component({
  selector: 'app-usagetable',
  templateUrl: './usagetable.component.html',
  styleUrls: ['./usagetable.component.scss']
})
export class UsagetableComponent implements OnInit {
  
  selectedApps: AppUsage[] = [];
  showAdder = false;
  apps: string[];
  minUsage = 0;
  maxUsage = 50;

  constructor(private loader: LoaderService, private connector: UsageConnectorService) { }

  ngOnInit() {
    this.loader.getAppToHosts().then((a2h) => this.apps = _.keys(a2h));
    this.selectedApps = this.connector.getState().concat();
    (<any>window).selectedApps = this.selectedApps;    
  }

  appValueChanged(appusage: AppUsage, event) {
    console.log('app value changed', appusage.appid, event);
    this.connector.usageChanged(this.selectedApps.concat());
  }

  clearState() { this.connector.clearState(); this.selectedApps = []; }

  addApp(appToAdd: string) {
    if (appToAdd) {
      console.log('got app to add ', appToAdd);      
      this.selectedApps.push({appid: appToAdd, mins: 0}); 
      const has = this.selectedApps.map((x) => x.appid);
      this.apps = _.difference(this.apps, has);
      this.showAdder = false;
    }
  }

}
