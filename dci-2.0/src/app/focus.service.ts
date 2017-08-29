import { Injectable } from '@angular/core';
import { APIAppInfo, CompanyInfo } from 'app/loader.service';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';
import { Subject } from 'rxjs/Subject';
import { ActivityLogService } from "app/activity-log.service";

export type FocusTarget = APIAppInfo | CompanyInfo;

@Injectable()
export class FocusService {
  private focusChangedSource = new BehaviorSubject<FocusTarget>(undefined);  
  focusChanged$ = this.focusChangedSource.asObservable();
  
  constructor(private actlog : ActivityLogService) {}

  focusChanged(focusTarget: FocusTarget) {
    if (focusTarget) {
      this.actlog.log('focus', focusTarget instanceof APIAppInfo ? focusTarget.app : focusTarget.company);
    } else {
      this.actlog.log('focus', 'unfocus');
    }
    this.focusChangedSource.next(focusTarget);
  }

  clearState() {
    this.focusChanged(undefined);
  }
  
  getState(): FocusTarget { 
    return this.focusChangedSource.getValue();
  }
}
