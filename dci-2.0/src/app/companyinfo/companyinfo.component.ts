import { Component, OnInit, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CompanyInfo, LoaderService } from "app/loader.service";

@Component({
  selector: 'app-companyinfo',
  templateUrl: './companyinfo.component.html',
  styleUrls: ['./companyinfo.component.scss']
})
export class CompanyinfoComponent implements OnInit, OnChanges {

  @Input() selected: CompanyInfo;
  
  constructor(private loader: LoaderService) { }

  ngOnInit() {
  }

  ngOnChanges(changes: SimpleChanges): void {

    const company = <CompanyInfo>changes.selected.currentValue;
    
    if (company && !company.crunchbase_url && company.crunchbase_url !== null) {
      this.loader.getCrunchbaseURLs(company).then(results => {
        if (results && results.length) {
          company.crunchbase_url = results[0];
          return;
        }
        company.crunchbase_url = null;
      }).catch(e => {
        // it's ok!
      });
    }
  }
}
