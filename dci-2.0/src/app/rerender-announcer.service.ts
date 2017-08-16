import { Injectable } from '@angular/core';
import { BehaviorSubject } from "rxjs/BehaviorSubject";

@Injectable()
export class RerenderAnnouncerService {

  private rerenderSource = new BehaviorSubject<any>(undefined);  
  rerender$ = this.rerenderSource.asObservable();
  constructor() {}

  annouce(renderSrc : any) {
    this.rerenderSource.next(renderSrc);
  }  
}
