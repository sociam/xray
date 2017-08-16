import { Component, Input, OnInit, OnChanges, SimpleChanges, ViewChild, ElementRef, AfterViewInit, ViewEncapsulation, EventEmitter, Output, HostListener } from '@angular/core';
import { LoaderService, App2Hosts, String2String, CompanyInfo, CompanyDB, APIAppInfo } from '../loader.service';
import { AppUsage } from '../usagetable/usagetable.component';
import * as d3 from 'd3';
import * as _ from 'lodash';
import { HostUtilsService } from "app/host-utils.service";
import { FocusService } from "app/focus.service";

interface AppImpact {
  appid: string;
  companyid: string;
  impact: number;
};

@Component({
  selector: 'app-refinebar',
  templateUrl: './refinebar.component.html',
  styleUrls: ['./refinebar.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class RefinebarComponent implements AfterViewInit, OnChanges {
  // refactor to get rid of -- 
  // app2hosts: App2Hosts;
  // host2companyid: String2String;
  // host2short: String2String;

  // still in use!
  companyid2info: CompanyDB;

  private usage: AppUsage[];
  private init: Promise<any>;
  lastMax = 0;
  _byTime = 'yes';
  normaliseImpacts = false;

  apps: string[]; // keeps app ordering between renders

  // @ViewChild('thing') svg: ElementRef; // this gets a direct el reference to the svg element

  // incoming attribute
  @Input('appusage') usage_in: AppUsage[];
  @Input() showModes = true;
  @Input() highlightApp: string;
  @Input() showLegend = true;
  @Input() scale = false;

  highlightColour = '#FF066A';

  constructor(private el: ElementRef, private loader: LoaderService, private hostutils: HostUtilsService, private focus: FocusService) {
    this.init = Promise.all([
      this.loader.getCompanyInfo().then((ci) => this.companyid2info = ci),
    ]);
    (<any>window)._rb = this;
  }
  getSVGElement() {
    const nE: HTMLElement = this.el.nativeElement;
    return Array.from(nE.getElementsByTagName('svg'))[0];
  }

  // this gets called when this.usage_in changes
  ngOnChanges(changes: SimpleChanges): void {
    if (!this.usage_in) { return; }
    this.init.then(() => {
      if (!this.usage_in || !this.usage || !this.apps || this.apps.length !== this.usage_in.length) {
        delete this.apps;
      }
      this.usage = this.usage_in;
      console.log('>> REFINEBAR new usage ', JSON.stringify(this.usage));
      this.render();
    });
  }

  ngAfterViewInit(): void { this.init.then(() => this.render()); }

  private _getApp(appid: string): Promise<APIAppInfo> {
    return this.loader.getCachedAppInfo(appid) && Promise.resolve(this.loader.getCachedAppInfo(appid))
      || this.loader.getFullAppInfo(appid);
  }

  compileImpacts(usage: AppUsage[]): Promise<AppImpact[]> {
    // folds privacy impact in simply by doing a weighted sum over hosts
    // usage has to be in a standard unit: days, minutes
    // first, normalise usage

    const timebased = this.byTime === 'yes',
      total = _.reduce(usage, (tot, appusage): number => tot + (timebased ? appusage.mins : 1.0), 0),
      impacts = usage.map((u) => ({ ...u, impact: (timebased ? u.mins : 1.0) / (1.0 * (this.normaliseImpacts ? total : 1.0)) }));

    return Promise.all(impacts.map((usg): Promise<AppImpact[]> => {

      return this._getApp(usg.appid).then(app => {
        const hosts = app && app.hosts;
        if (!hosts) { console.warn('No hosts found for app ', usg.appid); return Promise.resolve([]); }

        return Promise.all(hosts.map(host => this.hostutils.findCompany(host, app)))
          .then((companies: CompanyInfo[]) => _.uniq(companies.filter((company) => company !== undefined && company.typetag !== 'ignore')))
          .then((companies: CompanyInfo[]) => companies.map((company) => ({ appid: usg.appid, companyid: company.id, impact: usg.impact })));
      });
    })).then((impacts: AppImpact[][]): AppImpact[] => _.flatten(impacts));
  }


  // accessors for .byTime 
  set byTime(val) {
    this.lastMax = 0;
    this._byTime = val;
    this.init.then(() => this.render());
  }
  get byTime() { return this._byTime; }


  _selectedType: string;
  setSelectedTypeHighlight(ctype: string) {
    var svg = this.getSVGElement();
    this._selectedType = ctype;
    d3.select(svg).selectAll('rect.back').classed('reveal', false);
    d3.select(svg).selectAll('.ctypelegend g').classed('selected', false)

    if (ctype) {
      d3.select(svg).selectAll('rect.back.' + ctype).classed('reveal', true);
      d3.select(svg).selectAll('.ctypelegend g.' + ctype).classed('selected', true)
    };
  }

  _selectCompany(company: CompanyInfo) {
    console.log('selectCompany >', company);
  }
  // 
  render() {
    // console.log(':: render usage:', this.usage && this.usage.length);
    const svgel = this.getSVGElement();
    if (!svgel || this.usage === undefined || this.usage.length === 0) { return; }
    console.log('refinebar render! getSVGElement > ', svgel);

    let rect = svgel.getBoundingClientRect(),
      width_svgel = Math.round(rect.width - 5),
      height_svgel = Math.round(rect.height - 5),
      svg = d3.select(svgel);

    if (!this.scale) {
      svg.attr('width', width_svgel)
        .attr('height', height_svgel);
    } else {
      // <svg #thing viewBox="0 0 1024 700" preserveAspectRatio="xMinYMin meet" virtualWidth="1024" virtualHeight="700"></svg      

      svg.attr('viewBox', `0 0 1024 500`)
        .attr('virtualWidth', 1024)
        .attr('virtualHeight', 700)
        .attr('preserveAspectRatio', "none") //  "xMinYMin meet")

        width_svgel = 1024;
        height_svgel = 700;          
    }

    svg.selectAll('*').remove();

    const usage = this.usage;

    // to prepare for stack() let's
    this.compileImpacts(this.usage).then(impacts => {

      let apps = _.uniq(impacts.map((x) => x.appid)),
        companies = _.uniq(impacts.map((x) => x.companyid)),
        get_impact = (cid, aid) => {
          const t = impacts.filter((imp) => imp.companyid === cid && imp.appid === aid)[0];
          return t !== undefined ? t.impact : 0;
        },
        by_company = companies.map((c) => ({
          company: c,
          total: apps.reduce((total, aid) => total += get_impact(c, aid), 0),
          ..._.fromPairs(apps.map((aid) => [aid, get_impact(c, aid)]))
        }));

      if (this.apps === undefined) {
        // sort apps
        apps.sort((a, b) => _.filter(usage, { appid: b })[0].mins - _.filter(usage, { appid: a })[0].mins);
        this.apps = apps;
      } else {
        apps = this.apps;
      }

      const satBand = (name, domain, h, l, slow, shigh) => {
          return (appkey) => {
            var ki = domain.indexOf(appkey),
              bandwidth = (shigh - slow) / domain.length,
              starget = slow + ki * bandwidth,
              targetc = d3.hsl(h, starget, starget);
            // console.log(`satBand [${name}]:${appkey} - ki:${ki}, bw:${bandwidth}, slow:${slow}, shigh:${shigh}, ${starget}`, targetc);
            return targetc;
          };
        },
        catcolours = { // .interpolate(d3.interpolateHsl).
          'advertising': satBand('adv', apps, 0.2, 0.6, 0.2, 1),
          'app': satBand('app', apps, 80, 0.6, 0.2, 1),
          'analytics': satBand('analytics', apps, 30, 0.4, 0.2, 1),
          'usage': satBand('usage', apps, 30, 0.6, 0.2, 1),
          'other': satBand('other', apps, 0.5, 0.6, 0.2, 1)
        },
        getColor = (app: string, company: string): string => {
          if (app === undefined) {
            app = apps[0]; // apps.length - 1];
          }
          let companyInfo = this.companyid2info.get(company);
          if (companyInfo && companyInfo.typetag && catcolours[companyInfo.typetag]) {
            return catcolours[companyInfo.typetag](app);
          }
          return catcolours.other(app);
        };

      (<any>window).d3 = d3;

      by_company.sort((c1, c2) => c2.total - c1.total); // apps.reduce((total, app) => total += c2[app], 0) - apps.reduce((total, app) => total += c1[app], 0));

      // re-order companies
      companies = by_company.map((bc) => bc.company);

      const stack = d3.stack(),
        out = stack.keys(apps)(by_company);

      const margin = { top: 20, right: 20, bottom: 130, left: 40 },
        width = width_svgel - margin.left - margin.right, //+svg.attr('width') - margin.left - margin.right,
        height = height_svgel - margin.top - margin.bottom, // +svg.attr('height') - margin.top - margin.bottom,
        g = svg.append('g').attr('transform', 'translate(' + margin.left + ',' + margin.top + ')'),
        x = d3.scaleBand()
          .rangeRound([0, width]).paddingInner(0.05).align(0.1)
          .domain(companies),
        d3maxx = d3.max(by_company, function (d) { return d.total; }) || 0,
        ymaxx = this.lastMax = Math.max(this.lastMax, d3maxx),
        y = d3.scaleLinear()
          .rangeRound([height, 0])
          .domain([0, ymaxx]).nice(),
        z = d3.scaleOrdinal(d3.schemeCategory20)
          .domain(apps);
      // z = d3.scaleOrdinal()
      //   .range(['#98abc5', '#8a89a6', '#7b6888', '#6ba486b', '#a05d56', '#d0743c', '#ff8c00'])
      //   .domain(apps);
      console.log('width ', width_svgel);
      console.log('height ', height_svgel);

      g.selectAll('rect.back')
        .data(companies)
        .enter().append('rect')
        .attr('class', (company) => 'back ' + this.companyid2info.get(company).typetag)
        .attr('x', (company) => x(company))
        .attr('y', 0)
        .attr('height', height)
        .attr('width', x.bandwidth())
        .on('click', (d) => this.focus.focusChanged(this.companyid2info.get(d)));

      // main rects
      const f = function (selection, first, last) {
        return selection.selectAll('rect')
          .data((d) => d)
          .enter().append('rect')
          .attr('class', 'bar')
          .attr('x', function (d) { return x(d.data.company); })
          .attr('y', function (d) { return y(d[1]); })
          .attr('height', function (d) { return y(d[0]) - y(d[1]); })
          .attr('width', x.bandwidth());
      };
      g.append('g')
        .selectAll('g')
        .data(d3.stack().keys(apps)(by_company))
        .enter().append('g')
        .attr('fill', (d) => {
          if (this.highlightApp !== undefined) {
            return d.key === this.highlightApp ? this.highlightColour : '#bbb';
          }
          return z(d.key);
        })
        .call(f);

      // x axis
      g.append('g')
        .attr('class', 'axis x')
        .attr('transform', 'translate(0,' + height + ')')
        .call(d3.axisBottom(x))
        .selectAll('text')
        .style('text-anchor', 'end')
        .attr('y', 1)
        .attr('dx', '-.8em')
        .attr('dy', '.15em')
        .attr('transform', 'rotate(-90)');

      d3.selectAll('g.axis.x g.tick')
        .filter(function (d) { return d; })
        .attr('class', (d) => this.companyid2info.get(d).typetag)
        .on('click', (d) => this._selectCompany(this.companyid2info.get(d)));

      g.append('g')
        .attr('class', 'axis y')
        .call(d3.axisLeft(y).ticks(null, 's'))
        .append('text')
        .attr('x', 2)
        .attr('y', y(y.ticks().pop()) - 8)
        .attr('dy', '0.32em')
        .text('Impact');

      // legend
      const leading = 26;
      if (this.showLegend) {
        const legend = g.append('g')
          .attr('class', 'legend')
          .attr('transform', 'translate(0,10)')
          .selectAll('g')
          .data(apps.slice().reverse())
          .enter().append('g')
          .attr('transform', function (d, i) { return 'translate(0,' + i * leading + ')'; });

        legend.append('rect')
          .attr('x', width - 19)
          .attr('width', 19)
          .attr('height', 19)
          .attr('fill', z);

        legend.append('text')
          .attr('x', width - 24)
          .attr('y', 9.5)
          .attr('dy', '0.32em')
          .text((d) => this.loader.getCachedAppInfo(d) && this.loader.getCachedAppInfo(d).storeinfo.title || d);
      }

      const ctypes = ['advertising', 'analytics', 'app', 'other'],
        ctypeslegend = g.append('g')
          .attr('class', 'ctypelegend')
          .attr('transform', 'translate(0,10)')
          .selectAll('g')
          .data(ctypes)
          .enter().append('g')
          .attr('class', (d) => d)
          .on("mouseenter", (d) => this.setSelectedTypeHighlight(d))
          // .on("mouseleave", (d) => d3.selectAll('rect.back.' + d).classed('reveal', false))
          .attr('transform', (d, i) => 'translate(0,' + i * leading + ')');

      ctypeslegend.append('rect')
        .attr('x', this.showLegend ? width - 200 - 24 : width - 19)
        .attr('width', 19)
        .attr('height', 19)
        .attr('class', (d) => 'legend ' + d);
      ctypeslegend.append('text')
        .attr('x', this.showLegend ? width - 200 - 24 : width - 19)
        .attr('y', 9.5)
        .attr('dy', '0.32em')
        .text((d) => d);

      if (this._selectedType) {
        this.setSelectedTypeHighlight(this._selectedType)
      }
    });
  }
  @HostListener('window:resize') 
  onResize() {
      // call our matchHeight function here
      this.render();
  }
}
