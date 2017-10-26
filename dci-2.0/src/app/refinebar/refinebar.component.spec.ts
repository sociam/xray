import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { RefinebarComponent } from './refinebar.component';

describe('RefinebarComponent', () => {
  let component: RefinebarComponent;
  let fixture: ComponentFixture<RefinebarComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ RefinebarComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(RefinebarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should be created', () => {
    expect(component).toBeTruthy();
  });
});
