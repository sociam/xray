import { Component, OnInit, OnChanges, Input, SimpleChanges } from '@angular/core';
import { LoaderService, App2Hosts, String2String, CompanyID2Info, Host2PITypes, AppSubstitutions } from '../loader.service';
import { AppUsage } from '../usagetable/usagetable.component';
import * as _ from 'lodash';

@Component({
  selector: 'app-compare',
  templateUrl: './compare.component.html',
  styleUrls: ['./compare.component.scss']
})
export class CompareComponent implements OnInit, OnChanges {

  @Input() using: AppUsage[];
  @Input() targetApp: string;

  substitutions: { target: AppUsage,  all: AppUsage[] }[];
  submap: AppSubstitutions;

  usages: { [appid: string] : AppUsage[] };

  init: Promise<any>;

  constructor(private loader: LoaderService) { 
    this.init = loader.getSubstitutions().then((submap) => { this.submap = submap; });
  }

  ngOnInit() {}

  ngOnChanges(changes: SimpleChanges): void {
    // recompute substitutions
    console.info('recomputing substitutions ~ ', changes);
    this.init.then(() => {
      if (this.targetApp === undefined) { console.error('target is undefined ~~ skipping'); return;  }
      
      console.log('using is ', this.using);


      // others is AppUsage for everything except targetapp
      const target = this.using.filter((x) => x.appid.toLowerCase() === this.targetApp.toLowerCase())[0];
      if (target === undefined) {
        console.error('warning, app not found ', this.targetApp);
        this.substitutions = [];
        return;
      }

      const subs = this.submap[target.appid] || [],
        others = this.using.filter((x) => subs.concat([target.appid]).indexOf(x.appid) < 0),
        makeClone = (appid: string, target: AppUsage):AppUsage => {
          console.log('making clone > ', appid);
          const clone = _.extend({}, target, {appid: appid});
          console.log('clone ', clone);
          return clone;
        };

      console.log('others is ', others, ' for target ', target.appid);
      this.substitutions = [target.appid].concat(subs).map((appid) => {
        let clone = makeClone(appid, target);
        return ({ target: clone, all: [clone].concat(others)});
      });
      console.log('substitutions are ', this.substitutions  );

    });    
  }
}
