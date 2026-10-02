import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CandyBar } from './candy-bar';

describe('CandyBar', () => {
  let component: CandyBar;
  let fixture: ComponentFixture<CandyBar>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CandyBar],
    }).compileComponents();

    fixture = TestBed.createComponent(CandyBar);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
