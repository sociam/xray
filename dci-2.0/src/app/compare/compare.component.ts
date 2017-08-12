import { Component, OnInit, OnChanges, Input, SimpleChanges } from '@angular/core';
import { LoaderService, App2Hosts, String2String, Host2PITypes, AppSubstitutions, APIAppInfo } from '../loader.service';
import { AppUsage } from '../usagetable/usagetable.component';
import * as _ from 'lodash';

class Substitution {
  target: AppUsage;
  all: AppUsage[];
}

@Component({
  selector: 'app-compare',
  templateUrl: './compare.component.html',
  styleUrls: ['./compare.component.scss']
})
export class CompareComponent implements OnInit, OnChanges {

  @Input() using: AppUsage[];   // using represents the background app
  @Input() targetAppId: string;

  substitutions: Substitution[];

  constructor(private loader: LoaderService) {
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
          this.substitutions = [{ target: targetUsage, all: this.using }].concat(subs.map(app => {
            let clone = makeUsage(app.app, targetUsage);
            return ({ target: clone, all: [clone].concat(otherUsages) });
          }));
          console.log('substitutions are ', this.substitutions);
        });
      });
  }
}
