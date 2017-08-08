import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { CompareContainerComponent } from './compare-container.component';

describe('CompareContainerComponent', () => {
  let component: CompareContainerComponent;
  let fixture: ComponentFixture<CompareContainerComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ CompareContainerComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(CompareContainerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should be created', () => {
    expect(component).toBeTruthy();
  });
});
