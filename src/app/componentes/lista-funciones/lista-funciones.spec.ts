import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ListaFunciones } from './lista-funciones';

describe('ListaFunciones', () => {
  let component: ListaFunciones;
  let fixture: ComponentFixture<ListaFunciones>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ListaFunciones],
    }).compileComponents();

    fixture = TestBed.createComponent(ListaFunciones);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
