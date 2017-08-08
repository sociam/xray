import { Component, OnInit, Input, OnChanges, SimpleChanges } from '@angular/core';
import { LoaderService, App2Hosts, String2String, CompanyID2Info, Host2PITypes } from '../loader.service';
import * as _ from 'lodash';

@Component({
  selector: 'app-company-list',
  templateUrl: './company-list.component.html',
  styleUrls: ['./company-list.component.scss']
})
export class CompanyListComponent implements OnInit, OnChanges {
  app2hosts: App2Hosts;
  host2companyid: String2String;
  companyid2info: CompanyID2Info;
  host2short: String2String;
  host2PI: Host2PITypes;

  @Input() app: string;
  
  init: Promise<any>;

  by_cat: { [category: string] : string[] };
  categories: string[];

  getCompanyTypeTag(company: string): string {
    return this.companyid2info[company] && this.companyid2info[company].typetag;
  }

  catfilter = {
    'advertising': (company) =>  this.getCompanyTypeTag(company) == 'advertising',
    'analytics': (company) => ['advertising', 'usage', 'advertizing'].indexOf(this.getCompanyTypeTag(company)) >= 0, 
    'functionality': (company) => this.getCompanyTypeTag(company) == 'app',
    'other': (company) => ['advertising', 'usage', 'app'].indexOf(this.getCompanyTypeTag(company)) < 0
  };

  constructor(private loader: LoaderService) {
    this.init = Promise.all([
      this.loader.getAppToHosts().then((a2h) => this.app2hosts = a2h),
      this.loader.getHostToCompany().then((h2c) => this.host2companyid = h2c),
      this.loader.getCompanyInfo().then((ci) => this.companyid2info = ci),
      this.loader.getHostToShort().then((h2h) => this.host2short = h2h),
      this.loader.getHostToPITypes().then((h2pit) => this.host2PI = h2pit)
    ]).then(() => console.log('then done'));
  }

  ngOnInit() {

  }

  ngOnChanges(changes: SimpleChanges): void {
    this.init.then(() => {
      if (this.app) {
        const hosts = this.app2hosts[this.app];

        console.log('this app ', this.app, ' hosts ', hosts, this.app2hosts);

        const companies = _.uniq(hosts.map((h) => this.host2companyid[h]));
        
        this.by_cat = _.toPairs(_.mapValues(this.catfilter, (filterfn, cat) => companies.filter(filterfn)));

        this.categories = _.keys(this.by_cat);
      } 
    });
  }
}
