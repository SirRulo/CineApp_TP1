import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SeleccionButacas } from './seleccion-butacas';

describe('SeleccionButacas', () => {
  let component: SeleccionButacas;
  let fixture: ComponentFixture<SeleccionButacas>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SeleccionButacas],
    }).compileComponents();

    fixture = TestBed.createComponent(SeleccionButacas);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
