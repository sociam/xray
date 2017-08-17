
import { Injectable } from '@angular/core';
import { Http, HttpModule, Headers } from '@angular/http';
import 'rxjs/add/operator/toPromise';
import { mapValues, keys, mapKeys, values, trim, uniq } from 'lodash';

enum PI_TYPES { DEVICE_SOFT, USER_LOCATION, USER_LOCATION_COARSE, DEVICE_ID, USER_PERSONAL_DETAILS }

export let BASE_API = 'http://localhost:8118';
export let API_ENDPOINT = 'http://localhost:8118/api';

export interface App2Hosts { [app: string]: string[] }
export interface Host2PITypes { [host: string]: PI_TYPES[] }
export interface String2String { [host: string]: string }

export interface AppSubstitutions { [app: string]: string[] };

export let cache = (target: Object, propertyKey: string, descriptor: TypedPropertyDescriptor<any>) => {
  // console.log('@cache:: ~~ ', target, propertyKey, descriptor);
  let retval: { [method: string]: any } = {},
    method = descriptor.value;

  descriptor.value = function (...args: any[]) {
    if (retval[propertyKey]) {
      return retval[propertyKey];
    }
    return retval[propertyKey] = method.apply(this, args);
  };
};

// can be customised to be sensitive to target.
// pass in function that will generate keys for the cache:
// e.g. if values varies on multiple parameters, then return 
// a concatenation of dependent values
export let memoize = (f: (...args: any[]) => string) => {
  return function (target: Object, propertyKey: string, descriptor: TypedPropertyDescriptor<any>) {
    let retval: { [method: string]: any } = {}, method = descriptor.value;
    descriptor.value = function (...args: any[]) {
      var cache_key = propertyKey + '_' + f.apply(null, args);
      if (retval[cache_key]) {
        return retval[cache_key];
      }
      return retval[cache_key] = method.apply(this, args);
    };
  };
}


export class CompanyDB {
  emoji_table = {
    US: '&#x1F1FA;&#x1F1F8;',
    UK: '&#x1F1EC;&#x1F1E7;',
    AT: '&#x1F1E6;&#x1F1F9;',
    CN: '&#x1F1E8;&#x1F1F3;',
    FR: '&#x1F1EB;&#x1F1F7;',
    CA: '&#x1F1E8;&#x1F1E6;',
    DE: '&#x1F1E9;&#x1F1EA;'
  };

  constructor(private _data: { [id: string] : CompanyInfo } ) {
    mapValues(this._data, (s) => {
      if (s && s.company && s.equity && s.equity.length) {
          var n = parseInt(s.equity);
          if (n > 1e6) { s.equity = Math.round(n / 1.0e5) / 10.0 + "m"; }
          if (n > 1e9) { s.equity = Math.round(n / 1.0e8) / 10.0 + "bn"; }
      }
      if (s && s.company && s.jurisdiction_code && this.emoji_table[s.jurisdiction_code.toUpperCase()]) {
          s.jurisdiction_flag = this.emoji_table[s.jurisdiction_code.toUpperCase()];
      }
      if (s.parent) {
        s.parentInfo = this.get(s.parent);
      }
    });
  }
  get(companyid: string): CompanyInfo | undefined {
    return this._data[companyid];
  }
  add(info: CompanyInfo) {
    this._data[info.id] = info;
  }
  getCompanyInfos(): CompanyInfo[] {
    return values(this._data);
  }
  getIDs(): string[] {
    return keys(this._data);
  }
}

export class AppAlternative {
  altAppTitle: string;
  altToURL: string; // e.g. "http://alternativeto.net/software/pricealarm-net/",
  gPlayURL: string;
  gPlayID: string;
  iconURL: string; // e.g. "d2.alternativeto.net/dist/icons/pricealarm-net_105112.png?width=128&height=128&mode=crop&upscale=false",
  officialSiteURL: string; //  "http://www.PriceAlarm.net",
  isScraped: boolean; 
}

export class CompanyInfo {
    // readonly id: string;
    // readonly company: string;
    domains: string[];
    founded ?: string;
    acquired ?: string;
    type: string[];
    // readonly typetag ?: string;
    jurisdiction ?: string;
    jurisdiction_code ?: string;
    parent ?: string;
    parentInfo ?: CompanyInfo;
    capita ?: string;
    equity ?: string;
    size ?: string;
    data_source ?: string;
    description ?: string;
    constructor(readonly id: string, readonly company: string, domains: string[], readonly typetag: string) {
      this.domains = domains;
    }
}

export class APIAppInfo {
    app: string;
    title: string;
    summary: string;
    description: string;
    storeURL: string;
    price: string;
    free: boolean;
    rating: string;
    numReviews: number;
    genre: string;
    installs: { min: number, max: number};
    developer: {
      email: string[];
      name: string;
      site: string;
      storeSite: string;
    };
    updated: string;
    androidVer: string;
    contentRating: string;
    screenshots: string[];
    video: string;
    recentChanges: string[];
    crawlDate: string; // date string    
    string: string; // what's this?
    region: string; // us
    ver: string; // date string 
    screenFlags: number;
    hosts: string[] | undefined;
    storeinfo: { 
      title: string;
      summary: string;
      androidVer: string;
      numReviews: number;
      installs: { min: number, max: number };
      rating: number;
      updated: string;
    }
    icon: string;
    emails: string[]; // author contact email
    name: string; 
    storeSite: string;
    site:string;
}

export interface APIAppStub {
  Title: string;
  appid: string;
}

@Injectable()
export class LoaderService {
  constructor(private httpM: HttpModule, private http: Http) { }

  @cache
  getAppToHosts(): Promise<App2Hosts> {
    return this.http.get('assets/data/host_by_app.json').toPromise().then(response => {
      return mapValues(response.json(), ((hvobj) => keys(hvobj))) as { [app: string]: string[] };
    });
  }

  @cache  
  getHostToPITypes(): Promise<Host2PITypes> {
    return this.http.get('assets/data/pi_by_host.json').toPromise().then(response => {
      return response.json() as { [app: string]: string[] };
    }).then((data: { [app: string]: string[] }) => {
      return Promise.resolve(mapValues(data, 
        (s: string[]): PI_TYPES[] => s.map(pis => {
          if (PI_TYPES[pis] === undefined) { throw new Error(`undefined PI_TYPE ${pis}`);  }
          return PI_TYPES[pis]
        }))
      );
    });
  }
  getHostToCompany(): Promise<String2String> {
    return this.http.get('assets/data/h2c.json').toPromise().then(response => {
      return response.json() as String2String;
    });
  }
  getHostToShort(): Promise<String2String> {
    return this.http.get('assets/data/h2h_2ld.json').toPromise().then(response => {
      return response.json() as String2String;
    });
  }
  @cache
  getCompanyInfo(): Promise<CompanyDB> {
    return this.http.get('assets/data/company_details.json').toPromise().then(response => {
      return new CompanyDB(response.json());
    });
  }
  getSubstitutions(): Promise<AppSubstitutions> {
    return this.http.get('assets/data/app_substitutions.json').toPromise().then(response => {
      return response.json() as AppSubstitutions;
    });
  }
  makeIconPath(url: string) : string {
    if (url) {
      return [BASE_API + url].join('/');
    }
  }

  apps : { [id: string] : APIAppInfo } = {};

  _prepareAppInfo(appinfo: APIAppInfo) {
    appinfo.icon = this.makeIconPath(appinfo.icon);
    appinfo.hosts = uniq((appinfo.hosts || [])
      .map((host: string): string => trim(host.trim(), '".%')))
      .filter(host => host.length > 3 && host.indexOf('.') >= 0 && host.indexOf('[') < 0);
    this.apps[appinfo.app] = appinfo;
  }

  findApps(query: string): Promise<APIAppInfo[]> {
    // var headers = new Headers();
    // headers.set('Accept', 'application/json');
    query = query && query.trim();
    if (!query) return Promise.resolve([]);
    return this.http.get(API_ENDPOINT + `/apps?isFull=true&limit=10&startsWith=${query.trim()}`).toPromise()
      .then(response => response.json() as APIAppInfo[])
      .then((appinfos: APIAppInfo[]) => {
        if (!appinfos) {
          throw new Error('null returned from endpoint ' + query);
        } 
        appinfos.map(appinfo => this._prepareAppInfo(appinfo));
        return appinfos;
      })
  }

  @memoize((appid:string): string => appid)
  getAlternatives(appid: string): Promise<APIAppInfo[]> {
    return this.http.get(API_ENDPOINT + `/alt/${appid}`).toPromise()
      .then(response => {
        if (response && response.text().toString().trim() === 'null') {  console.error('ERROR - got a null coming from the endpoint ~ ' + appid);    }
        return response && response.text().toString().trim() !== 'null' ? response.json() as string[] : [];
      }).then(appids => Promise.all(appids.map(id => this.getFullAppInfo(id))))
      .then(appinfos => appinfos.filter(x => x));
  }

  getCachedAppInfo(appid: string):APIAppInfo | undefined {
    // returns a previously seen appid
    return this.apps[appid];
  }
  
  @memoize((appid:string):string => appid)
  getFullAppInfo(appid: string): Promise<APIAppInfo|undefined> {
    return this.http.get(API_ENDPOINT + `/apps?isFull=true&limit=10000&appId=${appid}`).toPromise()
    .then(response => (response && response.json() as APIAppInfo[])[0] || undefined)
    .then(appinfo => {
      if (appinfo) { 
        this._prepareAppInfo(appinfo);
        this.apps[appid] = appinfo;
      } else {
        console.warn('null appinfo');
      }
      return appinfo;
    });
  }


}
