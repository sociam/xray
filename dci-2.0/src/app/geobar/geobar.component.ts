
import { Component, Input, OnInit, OnChanges, SimpleChanges, ViewChild, ElementRef, AfterViewInit, ViewEncapsulation, EventEmitter, Output, HostListener } from '@angular/core';
import { LoaderService, App2Hosts, String2String, CompanyInfo, CompanyDB, APIAppInfo } from '../loader.service';
import { AppUsage } from '../usagetable/usagetable.component';
import * as d3 from 'd3';
import * as _ from 'lodash';
import { HostUtilsService } from 'app/host-utils.service';
import { FocusService } from 'app/focus.service';
import { HoverService, HoverTarget } from "app/hover.service";

interface AppImpactCat {
  appid: string;
  companyid?: string;
  impact: number;
  category?: string;
};

@Component({
  selector: 'app-geobar',
  templateUrl: './geobar.component.html',
  styleUrls: ['./geobar.component.css'],
  encapsulation: ViewEncapsulation.None
})
export class GeobarComponent implements AfterViewInit, OnChanges {

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
  @Input() highlightApp: APIAppInfo;
  @Input() showLegend = true;
  @Input() showTypesLegend = true;
  @Input() showXAxis = true;

  @Input() scale = false;
  vbox = { width: 700, height: 1024 };
  highlightColour = '#FF066A';

  _companyHovering: CompanyInfo;
  _hoveringApp: APIAppInfo;

  constructor(private el: ElementRef,
    private loader: LoaderService,
    private hostutils: HostUtilsService,
    private focus: FocusService,
    private hover: HoverService) {
    this.init = Promise.all([
      this.loader.getCompanyInfo().then((ci) => this.companyid2info = ci),
    ]);
    hover.HoverChanged$.subscribe((target) => {
      // console.log('hover changed > ', target);
      if (target !== this._hoveringApp) {
        this._hoveringApp = target ? target as APIAppInfo : undefined;
        this.render();
      }
    });
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
      this.render();
    });
  }

  ngAfterViewInit(): void { this.init.then(() => this.render()); }

  private _getApp(appid: string): Promise<APIAppInfo> {
    return this.loader.getCachedAppInfo(appid) && Promise.resolve(this.loader.getCachedAppInfo(appid))
      || this.loader.getFullAppInfo(appid);
  }

  compileImpacts(usage: AppUsage[]): Promise<AppImpactCat[]> {
    // folds privacy impact in simply by doing a weighted sum over hosts
    // usage has to be in a standard unit: days, minutes
    // first, normalise usage

    const timebased = this.byTime === 'yes',
      total = _.reduce(usage, (tot, appusage): number => tot + (timebased ? appusage.mins : 1.0), 0),
      impacts = usage.map((u) => ({ ...u, impact: (timebased ? u.mins : 1.0) / (1.0 * (this.normaliseImpacts ? total : 1.0)) }));

    return Promise.all(impacts.map((usg): Promise<AppImpactCat[]> => {
      return this._getApp(usg.appid).then(app => {
        const hosts = app && app.hosts;
        if (!hosts) { console.warn('No hosts found for app ', usg.appid); return Promise.resolve([]); }

        return Promise.all(hosts.map(host => this.hostutils.findCompany(host, app)))
          .then((companies: CompanyInfo[]) => _.uniq(companies.filter((company) => company !== undefined && company.typetag !== 'ignore')))
          .then((companies: CompanyInfo[]) => companies.map((company) => ({ appid: usg.appid, companyid: company.id, category: company.typetag, impact: usg.impact })));
      });
    })).then((nested_impacts: AppImpactCat[][]): AppImpactCat[] => _.flatten(nested_impacts));
  }


  // accessors for .byTime 
  set byTime(val) {
    this.lastMax = 0;
    this._byTime = val;
    this.init.then(() => this.render());
  }
  get byTime() { return this._byTime; }


  // this is for displaying what company you're hovering on based 
  // on back rects
  _companyHover(company: CompanyInfo, hovering: boolean) {
    this._companyHovering = hovering ? company : undefined;
  }

  // 
  render() {
    // console.log(':: render usage:', this.usage && this.usage.length);
    const svgel = this.getSVGElement();
    if (!svgel || this.usage === undefined || this.usage.length === 0) { return; }
    // console.log('refinebar render! getSVGElement > ', svgel);

    let rect = svgel.getBoundingClientRect(),
      width_svgel = Math.round(rect.width - 5),
      height_svgel = Math.round(rect.height - 5),
      svg = d3.select(svgel);

    if (!this.scale) {
      svg.attr('width', width_svgel)
        .attr('height', height_svgel);
    } else {
      svg.attr('viewBox', `0 0 ${this.vbox.width} ${this.vbox.height}`)
        .attr('virtualWidth', this.vbox.width)
        .attr('virtualHeight', this.vbox.height)
        .attr('preserveAspectRatio', 'none') //  "xMinYMin meet")
      width_svgel = this.vbox.width;
      height_svgel = this.vbox.height;
    }

    svg.selectAll('*').remove();

    const usage = this.usage;

    // to prepare for stack() let's
    this.compileImpacts(this.usage).then(impacts => {

      console.log('cat impacts > ', impacts);

      let red_impacts = impacts.reduce((perapp, impact) => {
        let appcat = (perapp[impact.appid] || {});
        appcat[impact.category] = (appcat[impact.category] || 0) + impact.impact;
        perapp[impact.appid] = appcat;
        return perapp;
      }, {});

      impacts = _.flatten(_.map(red_impacts, (catimpacts, appid) => _.map(catimpacts, (impact, cat) => ({ appid: appid, category: cat, impact: impact } as AppImpactCat))));

      console.log('cat red_impacts ', red_impacts, impacts);

      let apps = _.uniq(impacts.map((x) => x.appid)),
        categories = _.uniq(impacts.map((x) => x.category)),
        get_impact = (cid, aid) => {
          const t = impacts.filter((imp) => imp.category === cid && imp.appid === aid)[0];
          return t !== undefined ? t.impact : 0;
        },
        by_category = categories.map((catname) => ({
          category: catname,
          total: apps.reduce((total, appid) => total += get_impact(catname, appid), 0),
          ..._.fromPairs(apps.map((appid) => [appid, get_impact(catname, appid)]))
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
          let ki = domain.indexOf(appkey),
            bandwidth = (shigh - slow) / domain.length,
            starget = slow + ki * bandwidth,
            targetc = d3.hsl(h, starget, starget);
          // console.log(`satBand [${name}]:${appkey} - ki:${ki}, bw:${bandwidth}, slow:${slow}, shigh:${shigh}, ${starget}`, targetc);
          return targetc;
        };
      };

      (<any>window).d3 = d3;

      by_category.sort((c1, c2) => c2.total - c1.total); // apps.reduce((total, app) => total += c2[app], 0) - apps.reduce((total, app) => total += c1[app], 0));

      // re-order companies
      categories = by_category.map((bc) => bc.category);

      const stack = d3.stack(),
        out = stack.keys(apps)(by_category);

      let margin = { top: 20, right: 20, bottom: this.showXAxis ? 120 : 0, left: 40 },
        width = width_svgel - margin.left - margin.right, // +svg.attr('width') - margin.left - margin.right,
        height = height_svgel - margin.top - margin.bottom, // +svg.attr('height') - margin.top - margin.bottom,
        g = svg.append('g').attr('transform', 'translate(' + margin.left + ',' + margin.top + ')'),
        x = d3.scaleBand()
          .rangeRound([0, width]).paddingInner(0.05).align(0.1)
          .domain(categories),
        d3maxx = d3.max(by_category, function (d) { return d.total; }) || 0,
        ymaxx = this.lastMax = Math.max(this.lastMax, d3maxx);

        console.log('cat categories > ', categories);


      if (d3maxx < 0.7 * ymaxx) {
        ymaxx = 1.1 * d3maxx;
      }

      let y = d3.scaleLinear()
        .rangeRound([height, 0])
        .domain([0, ymaxx]).nice(),
        z = d3.scaleOrdinal(d3.schemeCategory20).domain(apps);

      // main rects
      const f = (selection, first, last) => {
        return selection.selectAll('rect')
          .data((d) => d)
          .enter().append('rect')
          .attr('class', 'bar')
          .attr('x', (d) => x(d.data.category))
          .attr('y', (d) => y(d[1]))
          .attr('height', function (d) { return y(d[0]) - y(d[1]); })
          .attr('width', x.bandwidth())
          .on('click', (d) => this.focus.focusChanged(this.companyid2info.get(d.data.company)))
          .on('mouseenter', (d) => this._companyHover(this.companyid2info.get(d.data.company), true))
          .on("mouseleave", (d) => this._companyHover(this.companyid2info.get(d.data.company), false));
      };

      g.append('g')
        .selectAll('g')
        .data(d3.stack().keys(apps)(by_category))
        .enter().append('g')
        .attr('fill', (d) => {
          // highlightApp comes in from @Input() attribute, set using compare
          // _apphover comes in from hovering service, namely usagetable hover
          let highApp = this.highlightApp || this._hoveringApp;
          if (highApp) {
            return d.key === highApp.app ? z(d.key) : 'rgba(200,200,200,0.2)';
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

      if (!this.showXAxis) {
        svg.selectAll('g.axis.x text').text('');
        svg.selectAll('g.axis.x g.tick').remove();
      } else {
        svg.selectAll('g.axis.x g.tick')
          .filter(function (d) { return d; })
          .attr('class', (d) => d.category)
          .on('click', (d) => this.focus.focusChanged(this.companyid2info.get(d)));
      }

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
          .enter()
          .append('g')
          .attr('transform', function (d, i) { return 'translate(0,' + i * leading + ')'; })
          .on('mouseenter', (d) => this.hover.hoverChanged(this.loader.getCachedAppInfo(d)))
          .on('mouseout', (d) => this.hover.hoverChanged(undefined))
          .on('click', (d) => {
            console.log('click! ', d);
            this.focus.focusChanged(this.loader.getCachedAppInfo(d));
          });
                  
        legend.append('rect')
          .attr('x', this.showTypesLegend ? width - 140 - 19 : width - 19)
          .attr('width', 19)
          .attr('height', 19)
          .attr('fill', z);

        legend.append('text')
          .attr('x', this.showTypesLegend ? width - 140 - 24 : width - 24)
          .attr('y', 9.5)
          .attr('dy', '0.32em')
          .text((d) => this.loader.getCachedAppInfo(d) && this.loader.getCachedAppInfo(d).storeinfo.title || d);

      }

    });
  }
  @HostListener('window:resize')
  onResize() {
    // call our matchHeight function here
    this.render();
  }
}
