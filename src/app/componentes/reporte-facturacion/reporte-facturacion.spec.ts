import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReporteFacturacion } from './reporte-facturacion';

describe('ReporteFacturacion', () => {
  let component: ReporteFacturacion;
  let fixture: ComponentFixture<ReporteFacturacion>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReporteFacturacion],
    }).compileComponents();

    fixture = TestBed.createComponent(ReporteFacturacion);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
