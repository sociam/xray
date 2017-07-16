
import { Injectable } from '@angular/core';
import { Http, HttpModule } from '@angular/http';
import 'rxjs/add/operator/toPromise';
import { mapValues } from 'lodash';

enum PI_TYPES { DEVICE_SOFT, USER_LOCATION, DEVICE_ID, USER_PERSONAL_DETAILS }

export class CompanyInfo {
    id: string;
    company: string;
    domains: Array<string>;
    founded ?: string;
    acquired ?: string;
    type: Array<string>;
    typetag ?:string;
    jurisdiction ?: string;
    jurisdiction_code ?: string;
    parent ?: string;
    capita ?: string;
    equity ?: string;
    size ?: string;
    data_source ?:string;
    description ?:string;
}

@Injectable()
export class LoaderService {
  constructor(private httpM: HttpModule, private http: Http) { }
  getAppToHosts() : Promise<{ [app:string] : string[] }> {
    return this.http.get('assets/data/host_by_app.json').toPromise().then(response => {
      return Promise.resolve(response.json().data as { [app:string] : string[] });
    });
  }
  getHostToPITypes() : Promise<{ [host:string] : PI_TYPES[] }> {
    return this.http.get('assets/data/pi_by_host.json').toPromise().then(response => {
      return response.json().data as { [app:string] : string[] };
    }).then((data : { [app:string] : string[] }) => {
      return Promise.resolve(mapValues(data, 
        (s : string[]) : PI_TYPES[] => s.map(pis => {
          if (PI_TYPES[pis] === undefined) { throw new Error(`undefined PI_TYPE ${pis}`);  }
          return PI_TYPES[pis]
        }))
      );
    });
  }
  getHostToCompany() : Promise<{ [host:string] : string }> {
    return this.http.get('assets/data/h2c.json').toPromise().then(response => {
      console.log(response.json());
      return response.json() as { [host:string] : string };
    });
  }
  getHostToShort() : Promise<{ [host:string] : string }> {
    return this.http.get('assets/data/h2h_2ld.json').toPromise().then(response => {
      return response.json() as { [app:string] : string };
    });
  }
  getCompanyInfo() : Promise<{ [host:string] : CompanyInfo }> {
    return this.http.get('assets/data/company_details.json').toPromise().then(response => {
      return response.json() as { [app:string] : CompanyInfo };
    });
  }  
}
