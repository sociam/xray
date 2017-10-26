import { Injectable } from '@angular/core';
import { APIAppInfo, CompanyInfo } from 'app/loader.service';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';
import { Subject } from 'rxjs/Subject';
import { ActivityLogService } from "app/activity-log.service";

export type HoverTarget = APIAppInfo;

@Injectable()
export class HoverService {
  private HoverChangedSource = new BehaviorSubject<HoverTarget>(undefined);  
  HoverChanged$ = this.HoverChangedSource.asObservable();
  
  constructor(private actlog : ActivityLogService) {
  }

  hoverChanged(target: HoverTarget) {
    this.actlog.log('hover-app', target && target.app || 'unhover');    
    this.HoverChangedSource.next(target);
  }
  clearState() {
    this.hoverChanged(undefined);
  }
  getState(): HoverTarget { 
    return this.HoverChangedSource.getValue();
  }
}
