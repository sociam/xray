
import { Injectable } from '@angular/core';
import { Http, HttpModule, Headers, URLSearchParams } from '@angular/http';
import 'rxjs/add/operator/toPromise';
import { mapValues, keys, mapKeys, values, trim, uniq, toPairs } from 'lodash';
import { Observable } from 'rxjs/Observable';
import { ReplaySubject } from 'rxjs/ReplaySubject';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import * as _ from 'lodash';


enum PI_TYPES { DEVICE_SOFT, USER_LOCATION, USER_LOCATION_COARSE, DEVICE_ID, USER_PERSONAL_DETAILS }

export let BASE_API = 'http://localhost:8118';
export let API_ENDPOINT = 'http://localhost:8118/api';

export interface App2Hosts { [app: string]: string[] }
export interface Host2PITypes { [host: string]: PI_TYPES[] }
export interface String2String { [host: string]: string }

export interface AppSubstitutions { [app: string]: string[] };

export class GeoIPInfo {
  host?: string;
  ip: string;
  country_code?: string;
  country_name?: string;
  region_code?: string;
  region_name?: string;
  city?: string;
  zip_code?: string;
  time_zone?: string;
  latitude?: number;
  longitude?: number;
  metro_code?: number;  
};

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
      let cache_key = propertyKey + '_' + f.apply(null, args);
      if (retval[cache_key]) {
        if (propertyKey.indexOf('findApps$') >= 0) { 
          console.log('cache hit on ', propertyKey, cache_key);
        }
        return retval[cache_key];
      }
      if (propertyKey.indexOf('findApps$') >= 0) { 
        console.log('cache miss on ', propertyKey, cache_key);   
      }
      return retval[cache_key] = method.apply(this, args);
    };
  };
}

export class CachingSubscription<T> {
  private dataSubject: ReplaySubject<T> = new ReplaySubject<T>();
  data$: Observable<T> = this.dataSubject.asObservable();
  resolved = false;
  constructor(private obs: Observable<T>) {    
    this.obs.subscribe(result => {
      this.resolved = true;
      this.dataSubject.next(result);
    });    
  }
  getObservable() { return this.data$;  }
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

  constructor(private _data: { [id: string]: CompanyInfo }, private sanitiser: DomSanitizer) {
    mapValues(this._data, (s) => {
      if (s && s.company && s.equity && s.equity.length) {
          let n = parseInt(s.equity, 10);
          if (n > 1e6) { s.equity = Math.round(n / 1.0e5) / 10.0 + 'm'; }
          if (n > 1e9) { s.equity = Math.round(n / 1.0e8) / 10.0 + 'bn'; }
      }
      if (s && s.company && s.jurisdiction_code && this.emoji_table[s.jurisdiction_code.toUpperCase()]) {
          s.jurisdiction_flag = this.emoji_table[s.jurisdiction_code.toUpperCase()];
      }
      if (s.parent) {
        s.parentInfo = this.get(s.parent);
      }
      if (s.crunchbase_url) {
        s.crunchbase_url = this.sanitiser.bypassSecurityTrustResourceUrl(s.crunchbase_url);
      }      
      // http://www.google.com/search?btnI=I%27m+Feeling+Lucky&ie=UTF-8&oe=UTF-8&q=
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
    crunchbase_url ?: string | SafeResourceUrl;
    lucky_url ?: string | SafeResourceUrl;
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
    hosts?: string[];
    host_locations?: string[];
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
    site: string;
}

export interface APIAppStub {
  Title: string;
  appid: string;
}

const host_blacklist = ['127.0.0.1','::1','localhost'];

@Injectable()
export class LoaderService {

  _host_blacklist : {[key:string]:boolean};n

  apps: { [id: string]: APIAppInfo } = {};
  
  constructor(private httpM: HttpModule, private http: Http, private sanitiser: DomSanitizer) { 
    this._host_blacklist = host_blacklist.reduce((obj, a) => obj[a]=true && obj, {});
  }

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
      return new CompanyDB(response.json() as {[name: string]: CompanyInfo}, this.sanitiser);
    });
  }
  getSubstitutions(): Promise<AppSubstitutions> {
    return this.http.get('assets/data/app_substitutions.json').toPromise().then(response => {
      return response.json() as AppSubstitutions;
    });
  }
  makeIconPath(url: string): string {
    if (url) {
      return [BASE_API + url].join('/');
    }
  }
  _prepareAppInfo(appinfo: APIAppInfo) {
    appinfo.icon = appinfo.icon && appinfo.icon !== null && appinfo.icon.trim() !== 'null' ? this.makeIconPath(appinfo.icon) : undefined;
    console.log('appinfo icon ', appinfo.app, ' - ', appinfo.icon, typeof appinfo.icon);

    appinfo.hosts = uniq((appinfo.hosts || [])
      .map((host: string): string => trim(host.trim(), '".%')))
      .filter(host => host.length > 3 && host.indexOf('%s') < 0 && host.indexOf('.') >= 0 && host.indexOf('[') < 0 && !this._host_blacklist[host]);

    this.getHostsGeos(appinfo.hosts).then(geomap => {
      return _.uniqBy(appinfo.hosts.map(host => {
        var geo = geomap[host];
        if (!geo) { console.error(' Dean didnt give me a geo for :( ', host); }
        return geo[0] && _.extend({}, geo[0], {host:host});
      }).filter(x => x), (gip) => gip.ip)
    }).then((hostgeos) => {
      console.log('got all me host geos for ', appinfo.app, hostgeos);
      appinfo.host_locations = hostgeos;
    });

    if (appinfo.hosts && appinfo.hosts.length > 100) {
      console.error('WARNING: this app has too many hosts', appinfo.app);
      appinfo.hosts = appinfo.hosts.slice(0, 50);
    }
    this.apps[appinfo.app] = appinfo;
    return appinfo;
  }

  @memoize((hosts) => hosts.join('::'))
  getHostsGeos(hosts: string[]): Promise<{[host: string]: GeoIPInfo[]}> {

    const hostsParam = hosts.map(x => x.trim()).join(','),
      urlSP = new URLSearchParams(); 

    urlSP.set('hosts', hostsParam);

    return this.http.get(API_ENDPOINT + `/hosts?${urlSP.toString()}`).toPromise()
      .then(response => response.json() as ({[host:string]: GeoIPInfo[]}));
  }

  findApps(query: string): Promise<APIAppInfo[]> {
    // var headers = new Headers();
    // headers.set('Accept', 'application/json');
    query = query && query.trim();
    if (!query) { return Promise.resolve([]); }
    return this.http.get(API_ENDPOINT + `/apps?isFull=true&limit=120&startsWith=${query.trim()}`).toPromise()
      .then(response => response.json() as APIAppInfo[])
      .then((appinfos: APIAppInfo[]) => {
        if (!appinfos) {
          throw new Error('null returned from endpoint ' + query);
        } 
        appinfos.map(appinfo => this._prepareAppInfo(appinfo));
        return appinfos;
      })
  }
  
  /**
   * Parses JSON Object into a URL param options object and then Turns that to a
   * string. 
   * @param options JSON of param options that can be used to query the xray API.
   */
  private parseFetchAppParams(options: {
      title?: string,
      startsWith?: string, 
      appID?: string, 
      fullInfo?: boolean, 
      onlyAnalyzed?: boolean, 
      limit?: number
    }): string {
      // Initialising URL Parameters from passed in options.
    let urlParams = new URLSearchParams();

    if (options.title) {
      urlParams.append('title', options.title);
    }
    if (options.startsWith) {
      urlParams.append('startsWith', options.startsWith);
    }
    if (options.appID) {
      urlParams.append('appID', options.appID);
    }
    if (options.fullInfo) {
      urlParams.append('isFull',  options.fullInfo ? 'true' : 'false');
    }
    if (options.onlyAnalyzed) {
      urlParams.append('onlyAnalyzed', options.onlyAnalyzed ? 'true' : 'false');
    }
    if (options.limit) {
      urlParams.append('limit', options.limit.toString());
    }
    return urlParams.toString();
  }

  /**
   * Issues a get request to the xray API using the param options provied as a
   * json parameter. the JSON is passed to 'parseFetchAppParams' that acts as a 
   * helper function to stringify the optins into a URL acceptable string.
   * @param options JSON of param options that can be used to query the xray API.
   */
  @memoize((options) => { 
    let key = toPairs(options).map(pair => {
      console.log('pair ', pair);
      return pair.map((x) => x.toString()).join(':');
    }).join('--');
    console.log('key > ', key);
    return key;
  })
  findApps$(options: {
      title?: string,
      startsWith?: string, 
      appID?: string, 
      fullInfo?: boolean, 
      onlyAnalyzed?: boolean, 
      limit?: number
    }): Observable<APIAppInfo[]> {
    
    let body = this.parseFetchAppParams(options);    
    let appData: APIAppInfo[];

    // this makes me want to stab my eyes out -> 
    return new CachingSubscription(this.http.get('http://localhost:8118/api/apps?' + body).map((data) => {
      const res = data.json() as APIAppInfo[];
      return res.map((app: APIAppInfo) => {
        if (!app) {
          throw new Error('null returned from endpoint ' + body);
        } 
        return this._prepareAppInfo(app);
       });
    })).getObservable();
  }
  

  @memoize((appid: string): string => appid)
  getAlternatives(appid: string): Promise<APIAppInfo[]> {
    return this.http.get(API_ENDPOINT + `/alt/${appid}`).toPromise()
      .then(response => {
        if (response && response.text().toString().trim() === 'null') {  console.error('ERROR - got a null coming from the endpoint ~ ' + appid);    }
        return response && response.text().toString().trim() !== 'null' ? response.json() as string[] : [];
      }).then(appids => Promise.all(appids.map(id => this.getFullAppInfo(id))))
      .then(appinfos => appinfos.filter(x => x));
  }

  getCachedAppInfo(appid: string): APIAppInfo | undefined {
    // returns a previously seen appid
    return this.apps[appid];
  }
  
  @memoize((appid: string): string => appid)
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
