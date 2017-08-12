import { Component, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { LoaderService, App2Hosts, String2String, Host2PITypes, APIAppInfo, CompanyDB } from '../loader.service';
import { Http, HttpModule, Headers } from '@angular/http';

import * as _ from 'lodash';
import { UsageConnectorService } from '../usage-connector.service';
import { CompleterService, CompleterData, RemoteData } from 'ng2-completer';

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

  init: Promise<any>;
  selectedApps: AppUsageHHMM[] = [];
  private all_apps: string[];
  candidates: string[];
  minUsage = 0;
  maxUsage = 720;
  stepUsage = 1;
  appToAdd: string;
  selectedApp: APIAppInfo;
  companies: CompanyDB;
  private alternatives: { [app: string] : APIAppInfo[] } = {};
  completer : CompleterData; 

  constructor(private loader: LoaderService, private connector: UsageConnectorService, private completerSvc: CompleterService) { 
  }

  ngOnInit() {
    this.loader.getCompanyInfo().then(companydb => this.companies = companydb);
    this.selectedApps = this.connector.getState().map(usage => new AppUsageHHMM(usage));    
    Promise.all(this.selectedApps.map(usage => this.loader.getFullAppInfo(usage.appid))).then(() => {
      console.log('loaded all');      
    });
  }

  appSelected(appinfo: APIAppInfo) {
    console.log('output connection is working ', appinfo);
  }

  appValueChanged() {
    console.info('appValueChanged >> ');
    this.connector.usageChanged(this.selectedApps.map((x) => x.toAppUsage()));
  }

  delete(usage: AppUsage) {
    this.selectedApps = this.selectedApps.filter((x) => x.appid !== usage.appid);
    this.appValueChanged();
  }
  
  clearState() { this.connector.clearState(); this.selectedApps = []; }

  getAppName(id: string): string {
    let cached = this.loader.getCachedAppInfo(id);
    if (cached) { return cached.storeinfo.title; }
    return '';
  }

  addApp() {
    if (this.selectedApp) {
      this.loader.getAlternatives(this.selectedApp.app).then(alts => {
        this.alternatives[this.selectedApp.app] = alts;
        console.log("ALTERNATIVES CHANGED > ", this.alternatives);
      });
      this.selectedApps.push(new AppUsageHHMM({appid: this.selectedApp.app, mins: 0})); 
      this.appToAdd = undefined;
      this.appValueChanged();
    }
  }

  hasAlternatives(appid: string): boolean {
    // TODO this will involve making a call to the server 
    return this.alternatives && this.alternatives[appid] && this.alternatives[appid].length > 0;
  }

}
