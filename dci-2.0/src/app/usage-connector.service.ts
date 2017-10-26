import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';
import { AppUsage } from './usagetable/usagetable.component';

@Injectable()
export class UsageConnectorService {
  
  private usageChangedSource = new BehaviorSubject<AppUsage[]>([]);  
  usageChanged$ = this.usageChangedSource.asObservable();

  constructor() { 
    console.log('constructor >>> ');
    let init_state = [];
    if (localStorage._last_app_usage !== undefined) { 
       init_state = JSON.parse(localStorage._last_app_usage).usage;
    }
    console.log('restored state > ', init_state);
    this.usageChanged(init_state);
  }
  usageChanged(usage: AppUsage[]) {
    this.usageChangedSource.next(usage);
    this._keep_state(usage);
  }
  private _keep_state(usage: AppUsage[]) {
    localStorage._last_app_usage = JSON.stringify({usage: usage});
  }
  clearState() {
    this.usageChanged([]);
  }
  getState(): AppUsage[] { 
    return this.usageChangedSource.getValue();
  }
}
