import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-error',
  templateUrl: './error.component.html',
  styleUrls: ['./error.component.css']
})
export class ErrorComponent implements OnInit {

  msg: string;

  constructor(private route: ActivatedRoute) { }

  ngOnInit() {
    this.route.data.toPromise().then((routedata) => this.msg = routedata.msg);
  }

}
