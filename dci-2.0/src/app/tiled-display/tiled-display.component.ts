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
  toggle_side : string; 
  toggle_model: string;
  modelOpen: boolean;
  sideOpen : boolean;
  panel_class: string;
  model_class: string;

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
        this.showModel();
        return; 
      }
      if ((<CompanyInfo>target).company !== undefined) { 
        console.log('setting company target ', target);
        this.targettype = 'company'; 
        this.showModel();
        return; 
      }  
      delete this.targettype;
    });

    this.sideOpen = true;
    this.toggle_side = 'Close Apps'
    this.panel_class = 'opened-panel';
    
    this.modelOpen = false;
    this.toggle_model = 'Show Info';
    this.model_class = 'closed_panel';
  }

  toggleSideBar() {
    if(this.sideOpen) {
      this.closeSideBar();
    }
    else {
      this.showSideBar()
    }
  }



  showSideBar() {
    this.closeModel()
    this.toggle_side = 'Close Apps';
    this.sideOpen = true;
    this.panel_class = 'opened-panel';
  }
  closeSideBar() {
    this.toggle_side = 'Open Apps';
    this.sideOpen = false;
    this.panel_class = 'closed-panel';
  }
  showModel() {
    this.closeSideBar()
    this.toggle_model = 'Hide Info';
    this.modelOpen = true;
    this.model_class = 'opened-panel';  
  }

  closeModel() {
    this.toggle_model = 'Show Info';
    this.modelOpen = false;
    this.model_class = 'closed-panel';
    this.targettype = '';
  }

  toggleModel() {
    if(this.modelOpen) {
      this.closeModel()
    }
    else {
      this.showModel();
    }
  }

  ngOnInit() {
  }

}
