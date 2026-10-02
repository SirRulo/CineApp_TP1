import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ProgramarFunciones } from './programar-funciones';

describe('ProgramarFunciones', () => {
  let component: ProgramarFunciones;
  let fixture: ComponentFixture<ProgramarFunciones>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProgramarFunciones],
    }).compileComponents();

    fixture = TestBed.createComponent(ProgramarFunciones);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
