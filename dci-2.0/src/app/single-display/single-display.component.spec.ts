import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { SingleDisplayComponent } from './experiment.component';

describe('SingleDisplayComponent', () => {
  let component: SingleDisplayComponent;
  let fixture: ComponentFixture<SingleDisplayComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ SingleDisplayComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(SingleDisplayComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should be created', () => {
    expect(component).toBeTruthy();
  });
});
