import { Component, OnInit } from '@angular/core';
import { HostUtilsService } from "app/host-utils.service";
import { CompanyInfo } from "app/loader.service";

import { FullApp } from '../services/apitypes.service';
type APIAppInfo = FullApp;


@Component({
  selector: 'app-foobar',
  templateUrl: './foobar.component.html',
  styleUrls: ['./foobar.component.css']
})
export class FoobarComponent implements OnInit {

  selectedApp: APIAppInfo;
  h2c : { [host: string] : CompanyInfo } = {};
  missingHosts : string[] = [];
  hosts : string[] = [];

  constructor(private hostutils: HostUtilsService) { 
    (<any>window)._fbc = this;
  }

  ngOnInit() {
  }

  appSelected(s: APIAppInfo) {
    // recompute hosts
    console.log('selected app ', s);

    this.missingHosts = [];
    this.hosts = [];

    this.hosts = s.hosts || [];

    this.hosts.map((host) => {
      let company = this.hostutils.findCompany(host, s)
        .then(company => {
          if (company) {
            console.info(`resolved ${host} -> ${company.id}`);
            this.h2c[host] = company;
          } else {
            console.error("Could not resolve company ", host)
            this.missingHosts.push(host);
          }
        });
    });
  }
}
