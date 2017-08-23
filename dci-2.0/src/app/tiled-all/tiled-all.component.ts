import { Component, OnInit } from '@angular/core';
import { CompanyInfo, APIAppInfo } from "app/loader.service";
import { FocusTarget, FocusService } from "app/focus.service";
import { UsageListener } from "app/usage-listener/usage-listener.component";
import { UsageConnectorService } from "app/usage-connector.service";

// target watcher watches for clicks on apps and companies
export class TargetWatcher extends UsageListener {
 
  target : FocusTarget;
  targettype : string;

  constructor(private focus: FocusService, connector: UsageConnectorService) {     
    super(connector);
    this.focus.focusChanged$.subscribe((target: FocusTarget) => { 
      
      if (!target) { 
        delete this.target;
        delete this.targettype;
        return;
      }
      this.target = target; 
      if ((<APIAppInfo>target).app !== undefined) { 
        this.targettype = 'app'; 
        return; 
      }
      if ((<CompanyInfo>target).company !== undefined) { 
        this.targettype = 'company'; 
        return; 
      }  
      delete this.targettype;
    });
  }

}

@Component({
  selector: 'app-tiled-all',
  templateUrl: './tiled-all.component.html',
  styleUrls: ['./tiled-all.component.scss']
})
export class TiledAllComponent extends TargetWatcher implements OnInit {

  showUsageTable = false;
 
  constructor(focus: FocusService, connector: UsageConnectorService) {
    super(focus, connector);
  }

  ngOnInit() {}

}
