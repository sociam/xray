import { Component, OnInit } from '@angular/core';
import { UsageConnectorService } from '../usage-connector.service';
import { AppUsage } from '../usagetable/usagetable.component';

@Component({
  selector: 'app-usage-listener',
  templateUrl: './usage-listener.component.html',
  styleUrls: ['./usage-listener.component.css']
})
export class UsageListenerComponent implements OnInit {

  usage: AppUsage[];

  constructor(private connector: UsageConnectorService) { }

  ngOnInit() {    
    console.log('UsageListenerComponent listneing to UsageConnector');
    this.connector.usageChanged$.subscribe(appuse => {
        this.usage = appuse.concat();
    });
  }

}
