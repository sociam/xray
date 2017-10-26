import { Component, OnInit } from '@angular/core';
import { ActivityLogService } from "app/activity-log.service";

@Component({
  selector: 'app-user-study-setup',
  templateUrl: './user-study-setup.component.html',
  styleUrls: ['./user-study-setup.component.css']
})
export class UserStudySetupComponent implements OnInit {

  setpid : string;
  inpid : string;
  participants : string[];
  dumped : string;
  status : string;
  error : string;
  
  constructor(private log: ActivityLogService) { 
  }

  ngOnInit() {
    this.setpid = this.log.getParticipantID();
    this.participants = this.log.getSavedPIDs();
  }

  setParticipantID(pid: string) {
    this.log.setParticipantID(pid);
    this.setpid = this.log.getParticipantID();
  }

  dumpParticipant(pid: string)  {
    console.log( 'got part data ', this.log.getSaved(pid));
    this.dumped = JSON.stringify(this.log.getSaved(pid));
  }

  start() {
    try { 
      const status = this.log.startParticipant();
      this.status = status instanceof Object ? 'ok' : 'error';
      this.error = undefined;
    } catch(e) {
      console.log('o ho ho ');
      console.error('Error ', e.name, e.message, e);
      (<any>window)._ee = e;
      this.error  = e.message;
    }    
  }

  stop() { 
    this.log.endParticipant();
    delete this.setpid;
  }

}
