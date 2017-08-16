import { TestBed, inject } from '@angular/core/testing';

import { RerenderAnnouncerService } from './rerender-announcer.service';

describe('RerenderAnnouncerService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [RerenderAnnouncerService]
    });
  });

  it('should be created', inject([RerenderAnnouncerService], (service: RerenderAnnouncerService) => {
    expect(service).toBeTruthy();
  }));
});
