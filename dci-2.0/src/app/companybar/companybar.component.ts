import { Component, Input, OnInit, OnChanges, DoCheck, SimpleChanges, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { LoaderService, App2Hosts, String2String, CompanyID2Info, Host2PITypes } from '../loader.service';
import { AppUsage } from '../usagetable/usagetable.component';
import { UsageConnectorService } from '../usage-connector.service';
import * as d3 from 'd3';
import * as _ from 'lodash';

@Component({
  selector: 'app-companybar',
  templateUrl: './companybar.component.html',
  styleUrls: ['./companybar.component.css']
})
export class CompanybarComponent implements OnInit, AfterViewInit {

  app2hosts: App2Hosts;
  host2companyid: String2String;
  companyid2info: CompanyID2Info;
  host2short: String2String;
  host2PI: Host2PITypes;
  private usage: AppUsage[];
  private init: Promise<any>;
  _countHosts = 'yes';
  @ViewChild('svgbar') el : ElementRef;

  constructor(private loader: LoaderService, private connector: UsageConnectorService) {}

  ngOnInit() {
    this.init = Promise.all([
      this.loader.getAppToHosts().then((a2h) => this.app2hosts = a2h),
      this.loader.getHostToCompany().then((h2c) => this.host2companyid = h2c),
      this.loader.getCompanyInfo().then((ci) => this.companyid2info = ci),
      this.loader.getHostToShort().then((h2h) => this.host2short = h2h),
      this.loader.getHostToPITypes().then((h2pit) => this.host2PI = h2pit)
    ]).then(() => {
      this.connector.usageChanged$.subscribe(appuse => {
          this.usage = appuse.concat();
          this.init.then(() => this.render());
      }); 
    });
  }
  ngAfterViewInit(): void { this.init.then(() => this.render()); }

  set countHosts(val: string) {
    this._countHosts = val;
    this.init.then(() => this.render());
  }
  get countHosts() {  return this._countHosts;  }
  
  render() {
    // awful, later we want to transition
    if (!this.el) { return; }
    d3.select(this.el.nativeElement).selectAll('*').remove();
    
    // to prepare for stack() let's
    let apps = _.uniq(this.usage.map((x) => x.appid)),
      by_app = _.fromPairs(apps.map((app) => [app,
        (this.app2hosts[app] || []).map((host: string): string => { 
          let company: string = this.host2companyid[host];
          if (company === undefined) { console.warn('no company mapping for ', host); };
          return company;
        }).filter((x) => x).reduce((obj: ({ [company: string]: number }), company: string) => {
          obj[company] = this.countHosts === 'yes' ? (obj[company] || 0) + 1 : 1;
          // obj[company] = (obj[company] || 0) + 1;
          return obj;
        }, {})])),
      companies = _.uniq(_.flatten(_.values(by_app).map( (company_counts: { [cid: string]: number }): string[] => _.keys(company_counts))));
    
    // sort apps
    apps.sort((a, b) => _.sum(_.values(by_app[b])) - _.sum(_.values(by_app[a])));    
    
    let rows = apps.map((app) => ({ app: app, 
        total: _.sum(_.values(by_app[app])),
        ..._.fromPairs(companies.map((comp) => [comp, by_app[app][comp] || 0])) 
      }));

    const stack = d3.stack(),
      out = stack.keys(companies)(rows);

    const svg = d3.select(this.el.nativeElement),
      margin = { top: 20, right: 20, bottom: 80, left: 40 },
      width = +svg.attr('width') - margin.left - margin.right,
      height = +svg.attr('height') - margin.top - margin.bottom,
      g = svg.append('g').attr('transform', 'translate(' + margin.left + ',' + margin.top + ')'),
      x = d3.scaleBand()
        .rangeRound([0, width]).paddingInner(0.05).align(0.1)
        .domain(apps),
      y = d3.scaleLinear()
        .rangeRound([height, 0])
        .domain([0, d3.max(rows, function (d) { return d.total; })]).nice(),
      z = d3.scaleOrdinal(d3.schemeCategory20)
         // .range(['#98abc5', '#8a89a6', '#7b6888', '#6ba486b', '#a05d56', '#d0743c', '#ff8c00'])
        .domain(companies);    

    g.append('g')
      .selectAll('g')
      .data(d3.stack().keys(companies)(rows))
      .enter().append('g')
      .attr('fill', function (d) { return z(d.key); })
      .selectAll('rect')
      .data(function (d) { return d; })
      .enter().append('rect')
      .attr('x', function (d) { return x(d.data.app); })
      .attr('y', function (d) { return y(d[1]); })
      .attr('height', function (d) { return y(d[0]) - y(d[1]); })
      .attr('width', x.bandwidth());

    g.append('g')
      .attr('class', 'axis')
      .attr('transform', 'translate(0,' + height + ')')
      .call(d3.axisBottom(x))
      .selectAll('text')	
        .style('text-anchor', 'end')
        .attr('dx', '-.8em')
        .attr('dy', '.15em')
        .attr('transform', 'rotate(-65)');

    g.append('g')
      .attr('class', 'axis')
      .call(d3.axisLeft(y).ticks(null, 's'))
      .append('text')
      .attr('x', 2)
      .attr('y', y(y.ticks().pop()) - 8)
      .attr('dy', '0.32em')
      .attr('fill', '#000')
      .attr('font-weight', 'bold')
      .attr('text-anchor', 'start')
      .text('Impact');

    const legend = g.append('g')
      .attr('font-family', 'sans-serif')
      .attr('font-size', 11)
      .attr('text-anchor', 'end')
      .selectAll('g')
      .data(companies.slice().reverse())
      .enter().append('g')
      .attr('transform', function (d, i) { return 'translate(0,' + i * 20 + ')'; });

    legend.append('rect')
      .attr('x', width - 19)
      .attr('width', 19)
      .attr('height', 19)
      .attr('fill', z);

    legend.append('text')
      .attr('x', width - 24)
      .attr('y', 9.5)
      .attr('dy', '0.32em')
      .text(function (d) { return d; });

  }

}
