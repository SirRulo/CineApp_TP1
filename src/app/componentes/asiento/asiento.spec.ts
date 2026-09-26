import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Asiento } from './asiento';

describe('Asiento', () => {
  let component: Asiento;
  let fixture: ComponentFixture<Asiento>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Asiento],
    }).compileComponents();

    fixture = TestBed.createComponent(Asiento);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
