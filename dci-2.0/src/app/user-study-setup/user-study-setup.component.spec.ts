import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { UserStudySetupComponent } from './user-study-setup.component';

describe('UserStudySetupComponent', () => {
  let component: UserStudySetupComponent;
  let fixture: ComponentFixture<UserStudySetupComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ UserStudySetupComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(UserStudySetupComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should be created', () => {
    expect(component).toBeTruthy();
  });
});
