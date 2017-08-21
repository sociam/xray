import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { GeobarComponent } from './geobar.component';

describe('GeobarComponent', () => {
  let component: GeobarComponent;
  let fixture: ComponentFixture<GeobarComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ GeobarComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(GeobarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should be created', () => {
    expect(component).toBeTruthy();
  });
});
