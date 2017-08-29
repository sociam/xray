import { Component, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { LoaderService, App2Hosts, String2String, Host2PITypes, APIAppInfo, CompanyDB } from '../loader.service';
import { Http, HttpModule, Headers } from '@angular/http';

import * as _ from 'lodash';
import { UsageConnectorService } from '../usage-connector.service';
import { FocusService } from 'app/focus.service';
import { HoverService } from "app/hover.service";
import { ActivityLogService } from "app/activity-log.service";

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
  private _usages: AppUsageHHMM[] = [];
  private _selectedapps: APIAppInfo[] = [];
  private all_apps: string[];
  candidates: string[];
  minUsage = 1;
  maxUsage = 720;
  stepUsage = 1;
  selectedApp: APIAppInfo;
  companies: CompanyDB;
  private alternatives: { [app: string]: APIAppInfo[] } = {};

  constructor(private loader: LoaderService, 
    private connector: UsageConnectorService, 
    private focus: FocusService,
    private hover: HoverService, 
    private actlog: ActivityLogService) { 
      
  }

  get usages() { return this._usages; }
  set usages(newusgs: AppUsageHHMM[]) { 
    this._usages = newusgs;
    Promise.all(newusgs.map(usage => this.loader.getFullAppInfo(usage.appid))).then(appinfos => {
      this._selectedapps = appinfos;
    });
    newusgs.map(usage => this.loadAlternatives(usage.appid));
  }

  ngOnInit() {
    this.loader.getCompanyInfo().then(companydb => this.companies = companydb);
    this.usages = this.connector.getState().map(usage => new AppUsageHHMM(usage));    
  }

  _onHover(appid :string) {
    if (appid) { 
      return this.hover.hoverChanged(this.loader.getCachedAppInfo(appid));
    } 
    this.hover.hoverChanged(undefined);    
  }

  appSelected(appinfo: APIAppInfo) {
    if (appinfo) {
      this.addApp();
    }
  }
  appFocused(appid: string) {
    console.log('app focusing ', appid);    
    this.focus.focusChanged(this.loader.getCachedAppInfo(appid));
  }
  
  appValueChanged(usage?: AppUsageHHMM) {
    if (usage){
      this.actlog.log('app-value-changed', usage.toAppUsage());
    }
    this.connector.usageChanged(this.usages.map((x) => x.toAppUsage()));
  }

  delete(usage: AppUsage) {
    this.usages = this.usages.filter((x) => x.appid !== usage.appid);
    this.appValueChanged();
    this.actlog.log('app-delete', usage.appid);
  }
  
  clearState() { 
    this.connector.clearState(); this.usages = []; 
    this.actlog.log('app-clear');
  }

  getAppName(id: string): string {
    let cached = this.loader.getCachedAppInfo(id);
    if (cached) { return cached.storeinfo.title; }
    return '';
  }
  getAppIcon(id: string): string {
    let cached = this.loader.getCachedAppInfo(id);
    if (cached) { return cached.icon; }
    return '';
  }
  
  getAppDev(id: string): string {
    let cached = this.loader.getCachedAppInfo(id);
    if (cached) { return cached.developer.name};
    return '';
  }

  getHostCount(id: string): string {
    let cached = this.loader.getCachedAppInfo(id);
    if (cached) { return cached.hosts.length.toString(); }
    return '?'
  }

  getRating(id: string): string {
    let cached = this.loader.getCachedAppInfo(id);
    if (cached) { return cached.storeinfo.rating.toString(); }
    return '?'
  }

  // Regex from Stack Overflow. https://stackoverflow.com/questions/2901102/how-to-print-a-number-with-commas-as-thousands-separators-in-javascript
  getDownloads(id: string): string {
    let cached = this.loader.getCachedAppInfo(id);
    if (cached) { return cached.storeinfo.installs.max.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ","); }
    return '?'
  }

  private loadAlternatives(appid: string) {
    return this.loader.getAlternatives(appid).then(alts => this.alternatives[appid] = alts);
  }

  addApp() {
    if (this.selectedApp) {
      this.usages = this.usages.concat([new AppUsageHHMM({appid: this.selectedApp.app, mins: 15})]); 
      this.actlog.log('app-add', this.selectedApp.app);
      this.selectedApp = undefined;
      this.appValueChanged();
    }
  }

  hasAlternatives(appid: string): boolean {
    // TODO this will involve making a call to the server 
    return this.alternatives && this.alternatives[appid] && this.alternatives[appid].length > 0;
  }

}
