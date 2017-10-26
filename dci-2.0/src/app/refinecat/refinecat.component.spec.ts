import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { RefinecatComponent } from './refinecat.component';

describe('RefinecatComponent', () => {
  let component: RefinecatComponent;
  let fixture: ComponentFixture<RefinecatComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ RefinecatComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(RefinecatComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should be created', () => {
    expect(component).toBeTruthy();
  });
});
