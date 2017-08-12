import { Component, OnInit, Input, OnChanges, SimpleChanges } from '@angular/core';
import { LoaderService, App2Hosts, String2String, CompanyDB, CompanyInfo, Host2PITypes } from '../loader.service';
import * as _ from 'lodash';
import { HostUtilsService } from "app/host-utils.service";

@Component({
  selector: 'app-company-list',
  templateUrl: './company-list.component.html',
  styleUrls: ['./company-list.component.scss']
})
export class CompanyListComponent implements OnInit, OnChanges {
  app2hosts: App2Hosts;
  host2companyid: String2String;
  companyid2info: CompanyDB;
  host2short: String2String;
  host2PI: Host2PITypes;

  @Input() app: string;
  
  init: Promise<any>;

  by_cat: { [category: string] : string[] };
  categories: string[];

  constructor(private loader: LoaderService, private hostutils: HostUtilsService) {
  }

  getCompanyTypeTag(company: string): string {
    return this.companyid2info.get(company) && this.companyid2info.get(company).typetag;
  }

  catfilter = {
    'advertising': (company: CompanyInfo) =>  company.typetag == 'advertising',
    'analytics': (company: CompanyInfo) => ['advertising', 'usage', 'advertizing'].indexOf(company.typetag) >= 0, 
    'functionality': (company: CompanyInfo) => company.typetag == 'app',
    'other': (company: CompanyInfo) => ['advertising', 'usage', 'app'].indexOf(company.typetag) < 0
  };


  ngOnInit() {  }

  ngOnChanges(changes: SimpleChanges): void {

    if (!this.app) { return; }
    
    (this.loader.getCachedAppInfo(this.app) && Promise.resolve(this.loader.getCachedAppInfo(this.app)) || 
    this.loader.getFullAppInfo(this.app))
      .then((appinfo) => {
        console.log('appinfo > ', appinfo);
        Promise.all(appinfo.hosts.map(host => this.hostutils.findCompany(host, appinfo)))
          .then((companies: CompanyInfo[]) => {
            companies = _.uniq(companies).filter(c => c);
            this.by_cat = _.toPairs(_.mapValues(this.catfilter, (filterfn, cat) => companies.filter(filterfn)));
            this.categories = _.keys(this.by_cat);
          });
      });

    // this.init.then(() => {
    //   if (this.app) {
        
    //     const hosts = this.app2hosts[this.app];
    //     console.log('this app ', this.app, ' hosts ', hosts, this.app2hosts);
    //     const companies = _.uniq(hosts.map((h) => this.host2companyid[h]));
    //     this.by_cat = _.toPairs(_.mapValues(this.catfilter, (filterfn, cat) => companies.filter(filterfn)));
    //     this.categories = _.keys(this.by_cat);
    //   } 
    // });
  }
}
