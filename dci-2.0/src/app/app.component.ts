import { Component } from '@angular/core';
import { Router } from "@angular/router";

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = 'app';

  constructor(private router: Router) {
    
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
