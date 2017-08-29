import { Injectable } from '@angular/core';
import { UsageConnectorService } from "app/usage-connector.service";

export class UserEvent {
  type: string;
  time : number;
  info : string;
}

@Injectable()
export class ActivityLogService {

  pid : string;
  debug = true;
  startTime : number;
  prefix = 'refine_actlog_';

  constructor(private usage: UsageConnectorService) { 
    const lastpid = localStorage["lastpid"];
    if (lastpid) {
      this.setParticipantID(lastpid);
      const starts = this.getSaved(lastpid).filter(x => x.type === 'start');
      if (starts.length > 0) {
        this.startTime = starts[starts.length - 1].time;
      }      
    }
  }

  setParticipantID(s : string) {
    if (!s || s.trim().length === 0) {
      return;
    }
    s = s.trim();
    console.info('setting participant id', s);
    this.pid = s;
    localStorage["lastpid"] = s;
    return s;
  }
  getParticipantID(): string {
    return this.pid;
  }
  startParticipant() {
    if (!this.pid) {
      throw new Error('Error no participant ID set');
    }
    this.usage.usageChanged([]);
    this.startTime = new Date().valueOf();
    return this.log('start', this.pid);
  }
  getParticipantId(): string {    
    return this.pid;
  }
  log(type : string, info?: any, other?: any): UserEvent {
    if (!this.pid) {
      throw new Error('no participant ID set ');
    }
    if (!this.startTime) {
      throw new Error('has not called start');
    }
    const event = { type:type , time: new Date().valueOf(), info: info, other: other };
    if (this.debug) {
      console.info("[actlog]", event)
    } 
    this._save(this.pid, event);
    return event;
  }
  _save(pid: string, ue: UserEvent) {
    const data = localStorage[this.prefix + pid] && JSON.parse(localStorage[this.prefix + pid]) || [];
    data.push(ue);
    localStorage[this.prefix + pid] = JSON.stringify(data);
  }
  getSavedPIDs(): string[] {
    return Object.keys(localStorage).filter(k => k.indexOf(this.prefix) === 0).map(k => k.slice(this.prefix.length));
  }
  getSaved(pid: string): UserEvent[] {
    return localStorage[this.prefix + pid] && JSON.parse(localStorage[this.prefix+pid]) || [] as UserEvent[];
  }
}
