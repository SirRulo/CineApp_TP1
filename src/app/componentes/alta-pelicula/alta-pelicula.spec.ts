import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AltaPelicula } from './alta-pelicula';

describe('AltaPelicula', () => {
  let component: AltaPelicula;
  let fixture: ComponentFixture<AltaPelicula>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AltaPelicula],
    }).compileComponents();

    fixture = TestBed.createComponent(AltaPelicula);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
