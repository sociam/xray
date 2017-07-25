import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { UsagetableComponent } from './usagetable.component';

describe('UsagetableComponent', () => {
  let component: UsagetableComponent;
  let fixture: ComponentFixture<UsagetableComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ UsagetableComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(UsagetableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should be created', () => {
    expect(component).toBeTruthy();
  });
});
