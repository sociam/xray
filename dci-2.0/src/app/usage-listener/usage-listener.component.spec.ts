import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { UsageListenerComponent } from './usage-listener.component';

describe('UsageListenerComponent', () => {
  let component: UsageListenerComponent;
  let fixture: ComponentFixture<UsageListenerComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ UsageListenerComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(UsageListenerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should be created', () => {
    expect(component).toBeTruthy();
  });
});
