import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { TiledDisplayComponent } from './tiled-display.component';

describe('TiledDisplayComponent', () => {
  let component: TiledDisplayComponent;
  let fixture: ComponentFixture<TiledDisplayComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ TiledDisplayComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(TiledDisplayComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should be created', () => {
    expect(component).toBeTruthy();
  });
});
