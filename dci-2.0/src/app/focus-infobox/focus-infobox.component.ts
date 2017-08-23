import { Component, OnInit, Input } from '@angular/core';
import { FocusTarget } from "app/focus.service";

@Component({
  selector: 'app-focus-infobox',
  templateUrl: './focus-infobox.component.html',
  styleUrls: ['./focus-infobox.component.css']
})
export class FocusInfoboxComponent implements OnInit {

  @Input() target: FocusTarget;
  @Input() targettype: string;

  constructor() { }

  ngOnInit() {
  }

}
