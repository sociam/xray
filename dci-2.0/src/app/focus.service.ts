import { Injectable } from '@angular/core';
import { APIAppInfo, CompanyInfo } from 'app/loader.service';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';
import { Subject } from 'rxjs/Subject';

export type FocusTarget = APIAppInfo | CompanyInfo;

@Injectable()
export class FocusService {
  private focusChangedSource = new BehaviorSubject<FocusTarget>(undefined);  
  focusChanged$ = this.focusChangedSource.asObservable();
  constructor() {}

  focusChanged(focusTarget: FocusTarget) {
    this.focusChangedSource.next(focusTarget);
  }
  clearState() {
    this.focusChanged(undefined);
  }
  getState(): FocusTarget { 
    return this.focusChangedSource.getValue();
  }
}
