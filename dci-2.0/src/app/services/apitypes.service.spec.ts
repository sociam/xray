import { TestBed, inject } from '@angular/core/testing';

import { APITypesService } from './apitypes.service';

describe('APITypesService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [APITypesService]
    });
  });

  it('should be created', inject([APITypesService], (service: APITypesService) => {
    expect(service).toBeTruthy();
  }));
});
