import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AltaFuncion } from './alta-funcion';

describe('AltaFuncion', () => {
  let component: AltaFuncion;
  let fixture: ComponentFixture<AltaFuncion>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AltaFuncion],
    }).compileComponents();

    fixture = TestBed.createComponent(AltaFuncion);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
