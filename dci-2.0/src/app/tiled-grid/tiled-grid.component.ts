import { Component, OnInit } from '@angular/core';
import { FocusService, FocusTarget } from 'app/focus.service';
import { APIAppInfo, CompanyInfo } from 'app/loader.service';

@Component({
  selector: 'app-tiled-grid',
  templateUrl: './tiled-grid.component.html',
  styleUrls: ['./tiled-grid.component.scss']
})
export class TiledGridComponent implements OnInit {

  target : FocusTarget;
  targettype : string;

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
  }

  ngOnInit() {
  }

}
