import { Component, OnInit, Input } from '@angular/core';
import { CompanyInfo } from "app/loader.service";

@Component({
  selector: 'app-companyinfo',
  templateUrl: './companyinfo.component.html',
  styleUrls: ['./companyinfo.component.scss']
})
export class CompanyinfoComponent implements OnInit {

  @Input() selected: CompanyInfo;
  
  constructor() { }

  ngOnInit() {
  }

}
