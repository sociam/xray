import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { CompanyinfoComponent } from './companyinfo.component';

describe('CompanyinfoComponent', () => {
  let component: CompanyinfoComponent;
  let fixture: ComponentFixture<CompanyinfoComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ CompanyinfoComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(CompanyinfoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should be created', () => {
    expect(component).toBeTruthy();
  });
});
