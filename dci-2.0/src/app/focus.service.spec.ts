import { TestBed, inject } from '@angular/core/testing';

import { FocusService } from './focus.service';

describe('FocusService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [FocusService]
    });
  });

  it('should be created', inject([FocusService], (service: FocusService) => {
    expect(service).toBeTruthy();
  }));
});
