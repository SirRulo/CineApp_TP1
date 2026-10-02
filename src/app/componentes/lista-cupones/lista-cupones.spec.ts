import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ListaCupones } from './lista-cupones';

describe('ListaCupones', () => {
  let component: ListaCupones;
  let fixture: ComponentFixture<ListaCupones>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ListaCupones],
    }).compileComponents();

    fixture = TestBed.createComponent(ListaCupones);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
