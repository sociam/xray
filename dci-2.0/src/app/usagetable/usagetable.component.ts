import { Component, OnInit } from '@angular/core';
import { LoaderService, App2Hosts, String2String, CompanyID2Info, Host2PITypes } from '../loader.service';
import * as _ from 'lodash';
import { UsageConnectorService } from '../usage-connector.service';

export interface AppUsage { appid: string; mins: number };

class AppUsageHHMM implements AppUsage { 
  public appid: string;
  private _hh: number;
  private _mm: number;
  private _mins: number;

  constructor(usage: AppUsage) {
    console.log('constructor ', usage);
    this.mins = usage.mins;
    this.appid = usage.appid;
    this.update_hhmm(); 
  }
  get hh(): number { return this._hh; }
  get mm(): number { return this._mm; }
  get mins(): number { return this._mins; }
  private update_mins() {
    this._mins = this._hh * 60.0 + this._mm;
  }
  private update_hhmm() { 
    this._hh = Math.floor(this.mins / 60.0);
    this._mm = (this.mins % 60);    
  }
  set hh(val: number) {
    if (val < 0) { val = 0; }
    this._hh = val;
    this.update_mins();
  }
  set mm(val: number) {
    if (val > 60) {
      val = val % 60;
      this.hh = this.hh + 1;
    }
    if (val < 0) {
      this.hh = this.hh - 1;
      val = 60 + val;       
    }
    this._mm = val;
    this.update_mins();    
  }    
  set mins(val: number) {
    this._mins = val;
    this.update_hhmm();
  }
  toAppUsage(): AppUsage {
    return { appid: this.appid, mins: this.mins };
  }
};

@Component({
  selector: 'app-usagetable',
  templateUrl: './usagetable.component.html',
  styleUrls: ['./usagetable.component.scss']
})
export class UsagetableComponent implements OnInit {
  
  selectedApps: AppUsageHHMM[] = [];
  private all_apps: string[];
  candidates: string[];
  minUsage = 0;
  maxUsage = 720;
  stepUsage = 1;
  appToAdd: string;

  constructor(private loader: LoaderService, private connector: UsageConnectorService) { }

  ngOnInit() {
    this.loader.getAppToHosts().then((a2h) => {
      this.all_apps = _.keys(a2h);
      this.selectedApps = this.connector.getState().concat().map((x) => new AppUsageHHMM(x));
      this._update_candidates();      
    });
    (<any>window).selectedApps = this.selectedApps;    
  }

  _update_candidates() {
    this.candidates = _.difference(this.all_apps, this.selectedApps.map((x) => x.appid));  
    // console.log('this apps', this.all_apps.length, this.selectedApps.length, this.candidates.length);    
  }

  appValueChanged() {
    // console.log('app value changed', appusage.appid, event);
    this.connector.usageChanged(this.selectedApps.map((x) => x.toAppUsage()));
  }

  delete(usage: AppUsage) {
    this.selectedApps = this.selectedApps.filter((x) => x.appid !== usage.appid);
    this._update_candidates();
    this.appValueChanged();
  }

  clearState() { this.connector.clearState(); this.selectedApps = []; }

  addApp(appToAdd: string, event) {
    if (appToAdd && this.candidates.indexOf(appToAdd) >= 0) {
      this.selectedApps.push(new AppUsageHHMM({appid: appToAdd, mins: 0})); 
      this._update_candidates();
      this.appToAdd = undefined;
      this.appValueChanged();
    }
  }

}
