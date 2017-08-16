import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { URLSearchParams } from '@angular/http';
import 'rxjs/add/operator/toPromise';
import { mapValues, keys, mapKeys, values, trim, uniq } from 'lodash';

import { FullApp } from './apitypes.service';

export let BASE_API = 'http://localhost:8118';

@Injectable()
export class APIService {

  constructor(private httpClient: HttpClient) {}
  
  /**
   * Returns a HTTP Headers object with the necessary headers required to
   * interact with the xray API.
   */
  getHeaders() {
    return new HttpHeaders().set('Accept', 'application/json');
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
    }) :string {
      // Initialising URL Parameters from passed in options.
    let urlParams = new URLSearchParams();

    if(options.title) {
      urlParams.append('title', options.title);
    }
    if(options.startsWith) {
      urlParams.append('startsWith', options.startsWith);
    }
    if(options.appID) {
      urlParams.append('appID', options.appID);
    }
    if(options.fullInfo) {
      urlParams.append('isFull',  options.fullInfo ? 'true': 'false');
    }
    if(options.onlyAnalyzed) {
      urlParams.append('onlyAnalyzed', options.onlyAnalyzed ? 'true': 'false');
    }
    if(options.limit) {
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
  fetchApps(options: {
      title?: string,
      startsWith?: string, 
      appID?: string, 
      fullInfo?: boolean, 
      onlyAnalyzed?: boolean, 
      limit?: number
    }) :Promise<FullApp[]> {
    
    const headers = this.getHeaders(); 
    let body = this.parseFetchAppParams(options);    
    let appData: FullApp[];

    return this.httpClient.get<FullApp[]>( 'http://localhost:8118/api/apps?' + body, { headers: headers })
    .toPromise()
    .then((data: FullApp[]) => { 
      console.log(data); 
      data.forEach(app => this._prepareAppInfo(app));
      return data; 
    })
    .catch((err) => { return err; })
  }

  makeIconPath(url: string) : string {
    if (url) {
      return [BASE_API + url].join('/');
    }
  }

  apps : { [id: string] : FullApp } = {};

  _prepareAppInfo(appinfo: FullApp) {
    appinfo.icon = this.makeIconPath(appinfo.icon);
    appinfo.hosts = uniq((appinfo.hosts || [])
      .map((host: string): string => trim(host.trim(), '".%')))
      .filter(host => host.length > 3 && host.indexOf('.') >= 0 && host.indexOf('[') < 0);
    this.apps[appinfo.app] = appinfo;
  }

}
