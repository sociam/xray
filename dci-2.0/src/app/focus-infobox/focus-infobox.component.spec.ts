import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { FocusInfoboxComponent } from './focus-infobox.component';

describe('FocusInfoboxComponent', () => {
  let component: FocusInfoboxComponent;
  let fixture: ComponentFixture<FocusInfoboxComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ FocusInfoboxComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(FocusInfoboxComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should be created', () => {
    expect(component).toBeTruthy();
  });
});
