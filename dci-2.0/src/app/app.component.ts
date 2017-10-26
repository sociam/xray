import { Component } from '@angular/core';
import { Router, NavigationEnd } from "@angular/router";
import { ActivityLogService } from "app/activity-log.service";

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = 'app';
  
  constructor(private router: Router, private actlog: ActivityLogService) {
    this.router.events.subscribe(routeEvent => {
      // console.info('routeEvent ', routeEvent);
      if (routeEvent instanceof NavigationEnd) {
        console.log("nav end");
        try { this.actlog.log('routeChange', routeEvent.url); } catch(e) { }
      }      
    });
  }

  // isActive(instruction: any[]): boolean {
  //   console.log('create tree > ', instruction, this.router.createUrlTree(instruction), "active? ", this.router.isActive(this.router.createUrlTree(instruction), true));
  //   console.log('create tree document location ', document.location.href);
  //   return this.router.isActive(this.router.createUrlTree(instruction), true);
  // }

  isActive(s: string): boolean {    
    return document.location.href.endsWith(s);
  }



}
