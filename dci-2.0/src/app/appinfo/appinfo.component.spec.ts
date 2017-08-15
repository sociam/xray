import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { AppinfoComponent } from './appinfo.component';

describe('AppinfoComponent', () => {
  let component: AppinfoComponent;
  let fixture: ComponentFixture<AppinfoComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ AppinfoComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(AppinfoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should be created', () => {
    expect(component).toBeTruthy();
  });
});
