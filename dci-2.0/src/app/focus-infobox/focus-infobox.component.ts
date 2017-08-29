import { Component, OnInit, Input, OnChanges, SimpleChanges } from '@angular/core';
import { FocusTarget, FocusService } from "app/focus.service";
import { LoaderService } from '../loader.service';

@Component({
  selector: 'app-focus-infobox',
  templateUrl: './focus-infobox.component.html',
  styleUrls: ['./focus-infobox.component.scss']
})
export class FocusInfoboxComponent implements OnInit {

  @Input() target: FocusTarget;
  @Input() targettype: string;

  constructor(private focus: FocusService, private loader: LoaderService) { }

  ngOnInit() {
  }
  close() {
    this.focus.focusChanged(undefined);
  }
    getHostCount(id: string): string {
    let cached = this.loader.getCachedAppInfo(id);
    if (cached) { return cached.hosts.length.toString(); }
    return '?'
  }

  getRating(id: string): string {
    let cached = this.loader.getCachedAppInfo(id);
    if (cached) { return cached.storeinfo.rating.toString(); }
    return '?'
  }

  // Regex from Stack Overflow. https://stackoverflow.com/questions/2901102/how-to-print-a-number-with-commas-as-thousands-separators-in-javascript
  getDownloads(id: string): string {
    let cached = this.loader.getCachedAppInfo(id);
    if (cached) { return cached.storeinfo.installs.max.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ","); }
    return '?'
  }
  
}
