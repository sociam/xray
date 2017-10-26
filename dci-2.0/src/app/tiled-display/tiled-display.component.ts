import { Component, OnInit } from '@angular/core';
import { FocusService, FocusTarget } from "app/focus.service";
import { APIAppInfo, CompanyInfo } from "app/loader.service";
import { UsageConnectorService } from "app/usage-connector.service";
import { TargetWatcher } from "app/tiled-all/tiled-all.component";

@Component({
  selector: 'app-tiled-display',
  templateUrl: './tiled-display.component.html',
  styleUrls: ['./tiled-display.component.scss']
})
export class TiledDisplayComponent extends TargetWatcher implements OnInit {

  constructor(focus: FocusService, connector: UsageConnectorService) {
    super(focus, connector);
  }

  ngOnInit() {
  }

}
