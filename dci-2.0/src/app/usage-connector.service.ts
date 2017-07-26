import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';
import { AppUsage } from './usagetable/usagetable.component';

@Injectable()
export class UsageConnectorService {
  
  private usageChangedSource = new BehaviorSubject<AppUsage[]>([]);  
  usageChanged$ = this.usageChangedSource.asObservable();

  constructor() { }

  usageChanged(usage: AppUsage[]) {
    this.usageChangedSource.next(usage);
  }
}
