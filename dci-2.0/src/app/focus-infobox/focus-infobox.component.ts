import { Component, OnInit, Input, OnChanges, SimpleChanges, HostListener } from '@angular/core';
import { FocusTarget, FocusService } from "app/focus.service";
import { LoaderService } from '../loader.service';
import { ActivityLogService } from "app/activity-log.service";

@Component({
  selector: 'app-focus-infobox',
  templateUrl: './focus-infobox.component.html',
  styleUrls: ['./focus-infobox.component.scss']
})
export class FocusInfoboxComponent implements OnInit {

  @Input() target: FocusTarget;
  @Input() targettype: string;

  constructor(private focus: FocusService, private loader: LoaderService, private actlog: ActivityLogService) { }

  ngOnInit() {
  }

  close() {
    this.focus.focusChanged(undefined);
    this.actlog.log('close', 'focus');
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

  @HostListener('mouseenter')
  mouseEnter() {
    this.actlog.log('mouseenter', 'focus', this.target);
  }

  @HostListener('mouseleave')
  mouseLv() {
    this.actlog.log('mouseleave', 'focus', this.target);
  }  
  
}
