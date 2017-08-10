import { TestBed, inject } from '@angular/core/testing';

import { HostUtilsService } from './host-utils.service';

describe('HostUtilsService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [HostUtilsService]
    });
  });

  it('should be created', inject([HostUtilsService], (service: HostUtilsService) => {
    expect(service).toBeTruthy();
  }));
});
