import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { TiledGridComponent } from './tiled-grid.component';

describe('TiledGridComponent', () => {
  let component: TiledGridComponent;
  let fixture: ComponentFixture<TiledGridComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ TiledGridComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(TiledGridComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should be created', () => {
    expect(component).toBeTruthy();
  });
});
