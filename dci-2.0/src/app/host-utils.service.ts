import { Injectable } from '@angular/core';
import { Http, HttpModule, Headers } from '@angular/http';
import { LoaderService, APIAppInfo, CompanyInfo, cache } from "app/loader.service";
import * as _ from 'lodash';

const ipv4re = /((^\s*((([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\.){3}([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5]))\s*$)|(^\s*((([0-9A-Fa-f]{1,4}:){7}([0-9A-Fa-f]{1,4}|:))|(([0-9A-Fa-f]{1,4}:){6}(:[0-9A-Fa-f]{1,4}|((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9A-Fa-f]{1,4}:){5}(((:[0-9A-Fa-f]{1,4}){1,2})|:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9A-Fa-f]{1,4}:){4}(((:[0-9A-Fa-f]{1,4}){1,3})|((:[0-9A-Fa-f]{1,4})?:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){3}(((:[0-9A-Fa-f]{1,4}){1,4})|((:[0-9A-Fa-f]{1,4}){0,2}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){2}(((:[0-9A-Fa-f]{1,4}){1,5})|((:[0-9A-Fa-f]{1,4}){0,3}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){1}(((:[0-9A-Fa-f]{1,4}){1,6})|((:[0-9A-Fa-f]{1,4}){0,4}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(:(((:[0-9A-Fa-f]{1,4}){1,7})|((:[0-9A-Fa-f]{1,4}){0,5}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:)))(%.+)?\s*$))/;

@Injectable()
export class HostUtilsService {

  constructor(private httpM: HttpModule, private http: Http, private loader: LoaderService) { }

  @cache
  fetchccSLDs() : Promise<string[]> {
      return this.http.get('assets/data/ccsld.txt').toPromise()
        .then((x) => x.text())
        .then((ccsld) => ccsld.split('\n').filter((x) => (x && x.trim().length > 0 && x.indexOf('.') >= 0 && x.indexOf('//') < 0 && x.indexOf('!') < 0 && x.indexOf('*') < 0)));
  }

  getIdByDomain = (): Promise<{[id: string] : string}> => {
    // reversed version of ^^ getDomainsById for O(1)
    // returns { domain => rowid, shorten_2ld(domain) => rowid }
    return Promise.all([this.loader.getCompanyInfo(),this.fetchccSLDs()]).then((rarr) => {
      const [ cinfo, ccslds ] = rarr;
      return cinfo.getCompanyInfos().reduce((domains, companyinfo: CompanyInfo) => { 
          companyinfo.domains.map( (domain) => {
              domains[domain] = domains[this.shorten_2ld(domain,ccslds)] = companyinfo.id;
          });
          return domains;
        }, {});
    });
  }    
  shorten_2ld = (host: string, ccslds: string[]): string => {
      host = host.trim().toLowerCase();
      // raw ip address
      if (ipv4re.test(host)) {
          // console.log('detected an ipv4 address, skipping shortening', host);
          return host;
      }
      var match = host.match(/([^\.]*)\.([^\.]*)$/);
      if (match) {
          var short = match[0];
          if (ccslds.indexOf(short) >= 0) {
              var onemore = host.slice(0, host.length - short.length - 1).match(/([^\.]*)$/);
              if (onemore) {
                  return [onemore[0], short].join('.');
              } else {
                  // fallback
                  return host;
              }
          }
          return short;
      }
      return host;
  }
  findCompany = (host: string, app: APIAppInfo): Promise<CompanyInfo|undefined> => {
      // old code was O(n) and fast but only exact matched
      return Promise.all([
          this.loader.getCompanyInfo(),
          this.getIdByDomain(),
          this.fetchccSLDs()          
        ]).then(loaded => {
          const [ companyDetails, d2id, cclds ] = loaded,
            name2id = companyDetails.getCompanyInfos().reduce((a, x) => {
                a[x.company] = x.id;
                a[x.company.toLowerCase()] = x.id;
                return a;
            }, {}),
            names = _.keys(name2id).filter((x) => x),
            domains = _.keys(d2id).filter((x) => x.length),
            missing = [],            
            app_company = app.developer && app.developer.name.toLowerCase();

            // Phase 1: check to see if the host is among domains of companies we know
            const matching_domains = _(domains)
                .filter((domain_frag) => host.indexOf(domain_frag) >= 0)
                .sortBy((x) => -x.length) // longer matches first
                .value(),
                match1 = matching_domains.length && d2id[matching_domains[0]];
            
            if (match1) {
                return companyDetails.get(match1);
            }

            // Phase 2 : check to see if the host contains the name is among companies we know
            var matching_companies = _(names)
                .filter((name_frag) => host.indexOf(name_frag.toLowerCase()) >= 0)
                .sortBy((x) => -x.length) // longer matches first
                .value();
            if (matching_companies.length) {
                return companyDetails.get(name2id[matching_companies[0]]);
            }

            /// phase 3 :: match with developer name
            const appdev = app.developer.name.split(' ').map(x => x.toLowerCase().trim()).filter(x => x);
            if (host.split('.').map(x => x.toLowerCase().trim()).filter((y) => appdev.indexOf(y) >= 0).length > 0) {
                // do we try to find a company in our company database? or do we just return it ... :| i dont know          
                console.error('host matched with developer > ', host);
                const ld2 = this.shorten_2ld(host, cclds),
                    newInfo = new CompanyInfo(ld2, app.developer.name, [host], 'app');
                companyDetails.add(newInfo);
                return newInfo;
            }
            
            // // phase 2: Try to match with app company name
            // if (app_company && row.host.indexOf(app_company) >= 0) {
            //     row.host_company = name2id[app_company];
            //     // fall back to app_company
            //     if (!row.host_company) {
            //         console.error('Warning: no app company in name2id for ', app_company);
            //         row.host_company = app_company;
            //     }
            //     return;
            // }
            
            console.info('could not identify company for ', host);
        });
    };

}
