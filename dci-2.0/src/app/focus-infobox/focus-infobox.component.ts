import { Component, OnInit, Input, OnChanges, SimpleChanges } from '@angular/core';
import { FocusTarget, FocusService } from "app/focus.service";

@Component({
  selector: 'app-focus-infobox',
  templateUrl: './focus-infobox.component.html',
  styleUrls: ['./focus-infobox.component.scss']
})
export class FocusInfoboxComponent implements OnInit {

  @Input() target: FocusTarget;
  @Input() targettype: string;

  constructor(private focus: FocusService) { }

  ngOnInit() {
  }
  close() {
    this.focus.focusChanged(undefined);
  }

  
}
