
import { Component, Input, OnInit, OnChanges, SimpleChanges, ViewChild, ElementRef, AfterViewInit, ViewEncapsulation, EventEmitter, Output, HostListener } from '@angular/core';
import { LoaderService, App2Hosts, String2String, CompanyInfo, CompanyDB, APIAppInfo, GeoIPInfo} from '../loader.service';
import { AppUsage } from '../usagetable/usagetable.component';
import * as d3 from 'd3';
import * as _ from 'lodash';
import * as topojson from 'topojson';
import { HostUtilsService } from 'app/host-utils.service';
import { FocusService } from 'app/focus.service';
import { HoverService, HoverTarget } from "app/hover.service";
import * as colorbrewer from 'colorbrewer';


interface AppImpactGeo {
  appid: string;
  impact: number;
  geo: GeoIPInfo
};

@Component({
  selector: 'app-geomap',
  templateUrl: './geomap.component.html',
  styleUrls: ['./geomap.component.scss'],
  encapsulation: ViewEncapsulation.None
})

export class GeomapComponent implements AfterViewInit, OnChanges {

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

  compileImpacts(usage: AppUsage[]): Promise<AppImpactGeo[]> {
    // folds privacy impact in simply by doing a weighted sum over hosts
    // usage has to be in a standard unit: days, minutes
    // first, normalise usage

    const timebased = this.byTime === 'yes',
      total = _.reduce(usage, (tot, appusage): number => tot + (timebased ? appusage.mins : 1.0), 0),
      impacts = usage.map((u) => ({ ...u, impact: (timebased ? u.mins : 1.0) / (1.0 * (this.normaliseImpacts ? total : 1.0)) }));

    return Promise.all(impacts.map((usg): Promise<AppImpactGeo[]> => {
      
      return this._getApp(usg.appid).then(app => {
        const hosts = app.hosts, geos = app.host_locations;
        if (!hosts || !geos) { console.warn('No hosts found for app ', usg.appid); return []; }
        return geos.map(geo => ({ 
          appid: usg.appid,
          geo: geo,
          impact: usg.impact,
        }));
      });
    })).then((nested_impacts: AppImpactGeo[][]): AppImpactGeo[] => _.flatten(_.flatten(nested_impacts)));
  }


  // accessors for .byTime 
  set byTime(val) {
    this.lastMax = 0;
    this._byTime = val;
    this.init.then(() => this.render());
  }
  get byTime() { return this._byTime; }

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

      let red_impacts = impacts.reduce((perapp, impact) => {
        let appcity = (perapp[impact.appid] || {});
        appcity[impact.geo.city] = (appcity[impact.geo.city] || 0) + impact.impact;
        perapp[impact.appid] = appcity;
        return perapp;
      }, {}),
      geobycity = impacts.reduce((obj, impact) => {
        obj[impact.geo.city] = obj[impact.geo.city] || impact.geo;
        return obj;
      }, {});
      
      impacts = _.flatten(_.map(red_impacts, (cityobj, appid) => _.map(cityobj, (impact, city) => ({ appid: appid, geo: geobycity[city], impact: impact } as AppImpactGeo))));
      impacts.filter(i => i && i.appid && i.geo && i.geo.latitude && i.geo.longitude);

      let apps = _.uniq(impacts.map((x) => x.appid));
      if (this.apps === undefined) {
        // sort apps
        apps.sort((a, b) => _.filter(usage, { appid: b })[0].mins - _.filter(usage, { appid: a })[0].mins);
        this.apps = apps;
      } else {
        apps = this.apps;
      }
    
      let margin = { top: 20, right: 20, bottom: -200, left: 40 },
        width = width_svgel - margin.left - margin.right, // +svg.attr('width') - margin.left - margin.right,
        height = height_svgel - margin.top - margin.bottom, // +svg.attr('height') - margin.top - margin.bottom,
        z = d3.scaleOrdinal(d3.schemeCategory20).domain(apps);

      if (width < 50 || height < 50) { return; }

      const projection = d3.geoMercator()
        .scale(width / 2 / Math.PI) 
        .translate([width / 2, height / 2]),
        path = d3.geoPath().projection(projection);

        this.loader.getWorldMesh().then((mesh) => {
          svg.append('path').attr("d", path(topojson.mesh(mesh))).attr('opacity', 0.2);
        });

        // add circles to svg
        var datas = svg.selectAll("circle")
          .data(impacts);

        datas.enter()
          .append("circle")
          .attr("cx", (d) => { 
            const lat = projection([d.geo.longitude, d.geo.latitude])[0];
            return lat;
          })
          .attr("cy", (d) => { 
            const lon = projection([d.geo.longitude,d.geo.latitude])[1];
            return lon;            
          })
          .attr('opacity',  (d) => {
            let highApp = this.highlightApp || this._hoveringApp;
            if (highApp) {
              return d.appid === highApp.app ? 0.75: 0.01; 
            }
            return 0.8;
          }).attr("r", (d) => Math.max(4, Math.floor(d.impact/100)))
          .attr("fill", (d) => z(d.appid))
          .on('mouseenter', (d) =>  this.hover.hoverChanged(this.loader.getCachedAppInfo(d.appid)))
          .on('mouseleave', (d) => this.hover.hoverChanged(undefined));

        datas.enter().append('text')
          .attr('x', (d) => projection([d.geo.longitude, d.geo.latitude])[0] + 5)          
          .attr('y', (d) =>  projection([d.geo.longitude, d.geo.latitude])[1] + 5)
          .attr('opacity', d => this._hoveringApp && d.appid === this._hoveringApp.app ? 1: 0)
          .text((d) => d.geo.region_name || d.geo.country);

          const leading = 26;
          if (this.showLegend) {
            
            let g = svg.append('g').attr('transform', 'translate(' + margin.left + ',' + margin.top/2 + ')');
            const legend = g.append('g')
              .attr('class', 'legend')
              .attr('transform', 'translate(0,0)')
              .selectAll('g')
              .data(apps.slice().reverse())
              .enter()
              .append('g')
              .attr('transform', function (d, i) { return 'translate(0,' + i * leading + ')'; })
              .on('mouseenter', (d) => this.hover.hoverChanged(this.loader.getCachedAppInfo(d)))
              .on('mouseout', (d) => this.hover.hoverChanged(undefined))
              .on('click', (d) => {
                this.focus.focusChanged(this.loader.getCachedAppInfo(d));
              }).attr('opacity', (d) => {
                let highApp = this.highlightApp || this._hoveringApp;
                if (highApp) {
                  return d === highApp.app ? 1.0: 0.2; 
                }
                return 1.0;
              });

            console.log('maplegend ! ', legend);
      
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
