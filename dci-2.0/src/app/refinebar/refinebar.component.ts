import { Component, Input, OnInit, OnChanges, SimpleChanges, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { LoaderService, App2Hosts, String2String, CompanyID2Info, Host2PITypes } from '../loader.service';
import { AppUsage } from '../usagetable/usagetable.component';
import { UsageConnectorService } from '../usage-connector.service';
import * as d3 from 'd3';
import * as _ from 'lodash';

interface AppImpact {
  appid: string;
  companyid: string;
  impact: number;
};

@Component({
  selector: 'app-refinebar',
  templateUrl: './refinebar.component.html',
  styleUrls: ['./refinebar.component.css']
})
export class RefinebarComponent implements OnInit, AfterViewInit {

  app2hosts: App2Hosts;
  host2companyid: String2String;
  companyid2info: CompanyID2Info;
  host2short: String2String;
  host2PI: Host2PITypes;
  private usage: AppUsage[];
  private init: Promise<any>;
  lastMax = 0;
  _byTime = 'yes';
  normaliseImpacts = false;
  @ViewChild('thing') svg: ElementRef;

  constructor(private loader: LoaderService, private connector: UsageConnectorService) {}

  ngOnInit() {
    (<any>window).usage = this.usage;

    this.init = Promise.all([
      this.loader.getAppToHosts().then((a2h) => this.app2hosts = a2h),
      this.loader.getHostToCompany().then((h2c) => this.host2companyid = h2c),
      this.loader.getCompanyInfo().then((ci) => this.companyid2info = ci),
      this.loader.getHostToShort().then((h2h) => this.host2short = h2h),
      this.loader.getHostToPITypes().then((h2pit) => this.host2PI = h2pit)
    ]).then(() => console.log('then done'));

    this.connector.usageChanged$.subscribe(appuse => {
        this.usage = appuse.concat();
        this.init.then(() => this.render());
    });    
  }

  compileImpacts(usage: AppUsage[]): AppImpact[] {
    // folds privacy impact in simply by doing a weighted sum over hosts
    // usage has to be in a standard unit: days, minutes
    // first, normalise usage

    const timebased = this.byTime === 'yes',
      total = _.reduce(usage, (tot, appusage): number => tot + (timebased ? appusage.mins : 1.0), 0),
      impacts = usage.map((u) => ({ ...u, impact: (timebased ? u.mins : 1.0) / (1.0 * (this.normaliseImpacts ? total : 1.0))}));
    return _.flatten(impacts.map((usg): AppImpact[] => {
        const hosts = this.app2hosts[usg.appid];
        if (hosts === undefined) { console.warn('No app found ', usg.appid); return []; }

        return _.uniq(hosts.map((host) => {
          const company = this.host2companyid[host];
          if (company === undefined) { console.warn('no company for ', host); return undefined; }
          return company;
        }).filter((x) => x)).map((company) => ({ appid: usg.appid, companyid: company, impact: usg.impact }));
    }));
  }
    
  ngAfterViewInit(): void { this.init.then(() => this.render()); }

  set byTime(val) { 
    this.lastMax = 0;
    this._byTime = val;
    this.init.then(() => this.render());
  }
  get byTime() {
    return this._byTime;
  }

  render() {
    if (!this.svg) { return; }

    d3.select(this.svg.nativeElement).selectAll('*').remove();

    if (this.usage === undefined || this.usage.length === 0) { 
      return;
    }

    // to prepare for stack() let's
    let usage = this.usage,
      impacts = this.compileImpacts(usage),
      apps = _.uniq(impacts.map((x) => x.appid)),
      companies = _.uniq(impacts.map((x) => x.companyid)),
      get_impact = (cid, aid) => {
        const t = impacts.filter((imp) => imp.companyid === cid && imp.appid === aid)[0];
        return t !== undefined ? t.impact : 0;
      },
      by_company = companies.map((c) => ({company: c,
        total: apps.reduce((total, aid) => total += get_impact(c, aid), 0),
        ..._.fromPairs(apps.map((aid) => [aid, get_impact(c, aid)]))}));

    // sort apps
    apps.sort((a, b) => _.filter(usage, {appid: b})[0].mins - _.filter(usage, {appid: a})[0].mins);

    by_company.sort((c1, c2) => c2.total - c1.total); // apps.reduce((total, app) => total += c2[app], 0) - apps.reduce((total, app) => total += c1[app], 0));
    
    // re-order companies
    companies = by_company.map((bc) => bc.company);

    const stack = d3.stack(),
      out = stack.keys(apps)(by_company);

    const svg = d3.select(this.svg.nativeElement),
      margin = { top: 20, right: 20, bottom: 80, left: 40 },
      width = +svg.attr('width') - margin.left - margin.right,
      height = +svg.attr('height') - margin.top - margin.bottom,
      g = svg.append('g').attr('transform', 'translate(' + margin.left + ',' + margin.top + ')'),
      x = d3.scaleBand()
        .rangeRound([0, width]).paddingInner(0.05).align(0.1)
        .domain(companies),
      y = d3.scaleLinear()
        .rangeRound([height, 0])
        .domain([0, this.lastMax = Math.max(this.lastMax, d3.max(by_company, function (d) { return d.total; }))]).nice(),
      z = d3.scaleOrdinal()
        .range(['#98abc5', '#8a89a6', '#7b6888', '#6ba486b', '#a05d56', '#d0743c', '#ff8c00'])
        .domain(apps);    

    g.append('g')
      .selectAll('g')
      .data(d3.stack().keys(apps)(by_company))
      .enter().append('g')
      .attr('fill', function (d) { return z(d.key); })
      .selectAll('rect')
      .data(function (d) { return d; })
      .enter().append('rect')
      .attr('x', function (d) { return x(d.data.company); })
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
      .data(apps.slice().reverse())
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

  // }
  }
}
