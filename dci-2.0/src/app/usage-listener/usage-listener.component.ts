import { Component, OnInit } from '@angular/core';
import { UsageConnectorService } from '../usage-connector.service';
import { AppUsage } from '../usagetable/usagetable.component';

export class UsageListener {
  usage: AppUsage[];
  constructor(private connector: UsageConnectorService) { 
    console.log('UsageListenerComponent listening to UsageConnector');
    this.connector.usageChanged$.subscribe(appuse => {
        this.usage = appuse.concat();
    });
  }
}

@Component({
  selector: 'app-usage-listener',
  templateUrl: './usage-listener.component.html',
  styleUrls: ['./usage-listener.component.css']
})
export class UsageListenerComponent extends UsageListener implements OnInit {

  constructor(connector: UsageConnectorService) { 
    super(connector);
  }

  ngOnInit() {}

}
