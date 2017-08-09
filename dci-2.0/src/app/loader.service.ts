
import { Injectable } from '@angular/core';
import { Http, HttpModule, Headers } from '@angular/http';
import 'rxjs/add/operator/toPromise';
import { mapValues, keys, mapKeys } from 'lodash';

enum PI_TYPES { DEVICE_SOFT, USER_LOCATION, USER_LOCATION_COARSE, DEVICE_ID, USER_PERSONAL_DETAILS }

export let BASE_API = 'http://localhost:8118';
export let API_ENDPOINT = 'http://localhost:8118/api/apps/';

export interface App2Hosts { [app: string]: string[] }
export interface Host2PITypes { [host: string]: PI_TYPES[] }
export interface String2String { [host: string]: string }
export interface CompanyID2Info { [host: string]: CompanyInfo }
export interface AppSubstitutions { [app: string]: string[] };

export interface CompanyInfo {
    id: string;
    company: string;
    domains: string[];
    founded ?: string;
    acquired ?: string;
    type: string[];
    typetag ?: string;
    jurisdiction ?: string;
    jurisdiction_code ?: string;
    parent ?: string;
    capita ?: string;
    equity ?: string;
    size ?: string;
    data_source ?: string;
    description ?: string;
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
    developer: string;
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
    hosts: null;
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
  getAppToHosts(): Promise<App2Hosts> {
    return this.http.get('assets/data/host_by_app.json').toPromise().then(response => {
      return Promise.resolve(mapValues(response.json(), ((hvobj) => keys(hvobj))) as { [app: string]: string[] });
    });
  }
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
  getCompanyInfo(): Promise<CompanyID2Info> {
    return this.http.get('assets/data/company_details.json').toPromise().then(response => {
      return response.json() as CompanyID2Info;
    });
  }
  getSubstitutions(): Promise<AppSubstitutions> {
    return this.http.get('assets/data/app_substitutions.json').toPromise().then(response => {
      return response.json() as AppSubstitutions;
    });
  }

  getApps(): Promise<any> {
    // var headers = new Headers();
    // headers.set('Accept', 'application/json');
    return this.http.get(API_ENDPOINT + '?isFull=false&limit=10000').toPromise().then(response => {
      let json = response.json();
      console.log('got these > ', json);
      return json;      
    });
  }

  augmentUrl(url: string) : string {
    return BASE_API + url;
  }
  findApps(query: string): Promise<APIAppInfo[]> {
    // var headers = new Headers();
    // headers.set('Accept', 'application/json');
    return this.http.get(API_ENDPOINT + `?isFull=true&limit=120&title=${query.trim()}`).toPromise()
      .then(response => response.json() as APIAppInfo[])
      .then((appinfos: APIAppInfo[]) => {
        if (!appinfos) {
          console.log(' null returned ', query);
          return [];
        } 
        appinfos.map(appinfo => appinfo.icon = this.augmentUrl(appinfo.icon));
        return appinfos;
      })
  }
  getAppRecord(appid: string): Promise<any> {
    return this.http.get(API_ENDPOINT + `?isFull=true&limit=10000&appId=${appid}`).toPromise().then(response => response.json());
  }


}
