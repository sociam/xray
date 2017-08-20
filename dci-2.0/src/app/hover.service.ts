import { Injectable } from '@angular/core';
import { APIAppInfo, CompanyInfo } from 'app/loader.service';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';
import { Subject } from 'rxjs/Subject';

export type HoverTarget = APIAppInfo;

@Injectable()
export class HoverService {
  private HoverChangedSource = new BehaviorSubject<HoverTarget>(undefined);  
  HoverChanged$ = this.HoverChangedSource.asObservable();
  constructor() {}

  hoverChanged(target: HoverTarget) {
    this.HoverChangedSource.next(target);
  }
  clearState() {
    this.hoverChanged(undefined);
  }
  getState(): HoverTarget { 
    return this.HoverChangedSource.getValue();
  }
}
