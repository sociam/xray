import { Component, OnInit } from '@angular/core';
import { TargetWatcher } from "app/tiled-all/tiled-all.component";
import { UsageConnectorService } from "app/usage-connector.service";
import { FocusService } from "app/focus.service";

@Component({
  selector: 'app-experiment',
  templateUrl: './single-display.component.html',
  styleUrls: ['./single-display.component.scss']
})
export class SingleDisplayComponent extends TargetWatcher {

  constructor(focus: FocusService, connector: UsageConnectorService) {
    super(focus, connector);
  }

}
