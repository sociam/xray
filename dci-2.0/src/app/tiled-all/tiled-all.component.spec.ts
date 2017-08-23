import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { TiledAllComponent } from './tiled-all.component';

describe('TiledAllComponent', () => {
  let component: TiledAllComponent;
  let fixture: ComponentFixture<TiledAllComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ TiledAllComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(TiledAllComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should be created', () => {
    expect(component).toBeTruthy();
  });
});
