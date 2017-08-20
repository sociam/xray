import { TestBed, inject } from '@angular/core/testing';

import { HoverService } from './hover.service';

describe('HoverService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [HoverService]
    });
  });

  it('should be created', inject([HoverService], (service: HoverService) => {
    expect(service).toBeTruthy();
  }));
});
