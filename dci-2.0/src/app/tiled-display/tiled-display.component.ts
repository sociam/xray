import { Component, OnInit } from '@angular/core';
import { FocusService, FocusTarget } from "app/focus.service";
import { APIAppInfo, CompanyInfo } from "app/loader.service";

@Component({
  selector: 'app-tiled-display',
  templateUrl: './tiled-display.component.html',
  styleUrls: ['./tiled-display.component.scss']
})
export class TiledDisplayComponent implements OnInit {

  target : FocusTarget;
  targettype : string;
  toggle : string; 
  sideOpen : boolean;
  panel_class: string;

  constructor(private focus: FocusService) {     
    this.focus.focusChanged$.subscribe((target: FocusTarget) => { 
      console.log('incoming -> ', target);
      if (!target) { 
        delete this.target;
        delete this.targettype;
        return;
      }

      this.target = target; 
      if ((<APIAppInfo>target).app !== undefined) { 
        console.log('setting app target ', target);
        this.targettype = 'app'; 
        return; 
      }
      if ((<CompanyInfo>target).company !== undefined) { 
        console.log('setting company target ', target);
        this.targettype = 'company'; 
        return; 
      }  
      delete this.targettype;
    });

    this.sideOpen = true;
    this.toggle = 'Close Apps'
    this.panel_class = 'closed-panel';
  }

  toggleSideBar() {
    console.log('Side Bar!!')
    if(this.sideOpen) {
      this.toggle = 'Open Apps';
      this.sideOpen = false;
      this.panel_class = 'closed-panel';
    }
    else {
      this.toggle = 'Close Apps';
      this.sideOpen = true;
      this.panel_class = 'opened-panel';
    }

  }

  ngOnInit() {
  }

}
