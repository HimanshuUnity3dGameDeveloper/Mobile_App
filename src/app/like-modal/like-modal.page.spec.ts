import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LikeModalPage } from './like-modal.page';

describe('LikeModalPage', () => {
  let component: LikeModalPage;
  let fixture: ComponentFixture<LikeModalPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(LikeModalPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
