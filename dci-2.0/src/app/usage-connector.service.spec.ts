import { TestBed, inject } from '@angular/core/testing';

import { UsageConnectorService } from './usage-connector.service';

describe('UsageConnectorService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [UsageConnectorService]
    });
  });

  it('should be created', inject([UsageConnectorService], (service: UsageConnectorService) => {
    expect(service).toBeTruthy();
  }));
});
