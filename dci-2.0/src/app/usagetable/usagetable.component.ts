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
  private all_apps: string[];
  candidates: string[];
  minUsage = 0;
  maxUsage = 50;
  appToAdd: string;

  constructor(private loader: LoaderService, private connector: UsageConnectorService) { }

  ngOnInit() {
    this.loader.getAppToHosts().then((a2h) => {
      this.all_apps = _.keys(a2h);
      this.selectedApps = this.connector.getState().concat();
      this._update_candidates();      
    });
    (<any>window).selectedApps = this.selectedApps;    
  }

  _update_candidates() {
    this.candidates = _.difference(this.all_apps, this.selectedApps.map((x) => x.appid));  
    // console.log('this apps', this.all_apps.length, this.selectedApps.length, this.candidates.length);    
  }

  appValueChanged(appusage: AppUsage, event) {
    // console.log('app value changed', appusage.appid, event);
    this.connector.usageChanged(this.selectedApps.concat());
  }

  delete(usage: AppUsage) {
    this.selectedApps = this.selectedApps.filter((x) => x.appid !== usage.appid);
    this._update_candidates();
  }

  clearState() { this.connector.clearState(); this.selectedApps = []; }

  addApp(appToAdd: string, event) {
    if (appToAdd && this.candidates.indexOf(appToAdd) >= 0) {
      this.selectedApps.push({appid: appToAdd, mins: 0}); 
      this._update_candidates();
      this.appToAdd = undefined;
      this.appValueChanged(this.selectedApps[this.selectedApps.length - 1], event);
    }
  }

}
