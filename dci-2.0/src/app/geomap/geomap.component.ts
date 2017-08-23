
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

      console.log('country geo impacts after comp > ', impacts.length);      

      impacts.filter(i => i && i.appid && i.geo && i.geo.latitude && i.geo.longitude);

      console.log('after lat and lon filter> ', impacts.length, impacts);      

      let apps = _.uniq(impacts.map((x) => x.appid));

      //   countries = _.uniq(impacts.map((x) => x.country)),
      //   get_impact = (cid, aid) => {
      //     const t = impacts.filter((imp) => imp.country === cid && imp.appid === aid)[0];
      //     return t !== undefined ? t.impact : 0;
      //   },
      //   by_country = countries.map((countryname) => ({
      //     country: countryname,
      //     total: apps.reduce((total, appid) => total += get_impact(countryname, appid), 0),
      //     ..._.fromPairs(apps.map((appid) => [appid, get_impact(countryname, appid)]))
      //   }));

      if (this.apps === undefined) {
        // sort apps
        apps.sort((a, b) => _.filter(usage, { appid: b })[0].mins - _.filter(usage, { appid: a })[0].mins);
        this.apps = apps;
      } else {
        apps = this.apps;
      }
      // by_country.sort((c1, c2) => c2.total - c1.total); // apps.reduce((total, app) => total += c2[app], 0) - apps.reduce((total, app) => total += c1[app], 0));
      // // re-order companies
      // countries = by_country.map((bc) => bc.country);

      let margin = { top: 20, right: 20, bottom: -200, left: 40 },
        width = width_svgel - margin.left - margin.right, // +svg.attr('width') - margin.left - margin.right,
        height = height_svgel - margin.top - margin.bottom, // +svg.attr('height') - margin.top - margin.bottom,
        z = d3.scaleOrdinal(d3.schemeCategory20).domain(apps);
        

      //   g = svg.append('g').attr('transform', 'translate(' + margin.left + ',' + margin.top + ')'),
      //   x = d3.scaleBand()
      //     .rangeRound([0, width]).paddingInner(0.05).align(0.1)
      //     .domain(countries),
      //   d3maxx = d3.max(by_country, function (d) { return d.total; }) || 0,
      //   ymaxx = this.lastMax = Math.max(this.lastMax, d3maxx);

      // if (d3maxx < 0.7 * ymaxx) {
      //   ymaxx = 1.1 * d3maxx;
      // }

      // // const format = function (d) {
      // //   d = d / 1000000;
      // //   return d3.format(',.02f')(d) + 'M';
      // // };

      // const a = {};

      (<any>window)._d3 = d3;

      const projection = d3.geoMercator()
        .scale(width / 2 / Math.PI) 
        .translate([width / 2, height / 2]),
        path = d3.geoPath().projection(projection);

        this.loader.getWorldMesh().then((mesh) => {
          svg.append('path').attr("d", path(topojson.mesh(mesh)));
        });

        // points
        // const aa = [-122.490402, 37.786453],       bb = [-122.389809, 37.72728];

        // add circles to svg
        svg.selectAll("circle")
          .data(impacts).enter()
          .append("circle")
          .attr("cx", (d) => { 
            const lat = projection([d.geo.longitude, d.geo.latitude])[0];
            console.log('lat ~', lat, [d.geo.latitude,d.geo.longitude]);
            return lat;
          })
          .attr("cy", (d) => { 
            const lon = projection([d.geo.longitude,d.geo.latitude])[1];
            console.log('lon ~', lon, [d.geo.latitude,d.geo.longitude]);
            return lon;            
            // return projection(d)[1]; 
          })
          .attr("r", (d) => {
            console.log('impact > ', d.impact);
            return Math.floor(d.impact/100);
          }).attr("fill", (d) => {
            console.log('d ', d.appid, z(d.appid));
            return z(d.appid);
          });

      // var map = d3.geo.choropleth()
      //   .geofile('/d3-geomap/topojson/world/countries.json')
      //   .colors(colorbrewer.YlGnBu[9])
      //   .column((xx) => xx.impact)
      //   .format(format)
      //   .legend(true)
      //   .unitId('Country Code');

      // d3.select(svg).datum(by_country).call(map.draw, map);

    });
  }
  @HostListener('window:resize')
  onResize() {
    // call our matchHeight function here
    this.render();
  }
}
