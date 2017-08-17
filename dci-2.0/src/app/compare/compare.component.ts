import { Component, OnInit, OnChanges, Input, SimpleChanges } from '@angular/core';
import { LoaderService, App2Hosts, String2String, Host2PITypes, AppSubstitutions, APIAppInfo } from '../loader.service';
import { AppUsage } from '../usagetable/usagetable.component';
import * as _ from 'lodash';
import { Router, ActivatedRoute, ParamMap } from '@angular/router';
import { UsageConnectorService } from "app/usage-connector.service";

class Substitution {
  target: AppUsage;
  all: AppUsage[];
  selected ?: boolean = false;
}

@Component({
  selector: 'app-compare',
  templateUrl: './compare.component.html',
  styleUrls: ['./compare.component.scss']
})
export class CompareComponent implements OnInit, OnChanges {

  @Input() using: AppUsage[];   // using represents the background app
  @Input() targetAppId: string;

  substitutions_all: Substitution[];
  substitutions: Substitution[][];
  original_app: Substitution;
  other_substitutions: Substitution[];
  other_substitution_rows: Substitution[][];

  constructor(private loader: LoaderService, private usage: UsageConnectorService,  private router: Router) {
  }

  ngOnInit() { }

  ngOnChanges(changes: SimpleChanges): void {
    // recompute substitutions
    if (!this.using || !this.targetAppId) {
      console.log('not using or targetAppId :(');
      return;
    }
    Promise.all(this.using.map(usg => this.loader.getFullAppInfo(usg.appid)))
      .then(() => {
        // loaded all 
        this.loader.getAlternatives(this.targetAppId).then((subs: APIAppInfo[]): undefined => {
          // others is AppUsage for everything except targetapp
          const targetUsage: AppUsage = this.using.filter(usg => usg.appid === this.targetAppId)[0],
            otherUsages: AppUsage[] = this.using.filter(usg => usg.appid !== this.targetAppId);

          if (targetUsage === undefined) {
            console.error('Error : Corresponding app not found in usage - internal error - or could your URL be messed up?', this.targetAppId);
            this.substitutions = [];
            return;
          }

          subs = subs.filter(app => app.app !== this.targetAppId);

          const makeUsage = (appid: string, target: AppUsage): AppUsage => _.extend({}, target, { appid: appid });

          // substitutions are usages
          this.substitutions_all = [{ target: targetUsage, all: this.using }].concat(subs.map(app => {
            let clone = makeUsage(app.app, targetUsage);
            return ({ target: clone, all: [clone].concat(otherUsages) });
          }));
          this.original_app = this.substitutions_all[0];
          this.other_substitutions = this.substitutions_all.slice(1);
          this.substitutions = this.splitIntoRows<Substitution>(4, this.substitutions_all);
          this.other_substitution_rows = this.splitIntoRows<Substitution>(2, this.other_substitutions);
          console.log('substitutions are ', this.substitutions);
        });
      });
  }

  splitIntoRows<T>(columns: number, list: T[]): T[][] {
    return _.range(0, list.length / columns).map(index => list.slice(index*columns, (index + 1)*columns));
  }

  appInfo(appid: string): APIAppInfo { return this.loader.getCachedAppInfo(appid); }

  select(s: Substitution) {
    this.substitutions.map(srow => srow.map(_s => { 
      if (_s !== s) { delete _s.selected; return }
      console.log('setting true ', _s);
      _s.selected = true;
    }));
  }

  replaceTarget(s: Substitution) {
    this.usage.usageChanged(s.all);
    this.router.navigate(['/tiled']);
  }
}
