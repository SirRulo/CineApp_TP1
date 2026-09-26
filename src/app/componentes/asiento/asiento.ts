import { NgClass } from '@angular/common';
import { Component, input, output } from '@angular/core';
import { Butaca } from '../../models/butaca';

@Component({
  imports: [NgClass],
  selector: 'app-asiento',
  styleUrl: './asiento.css',
  templateUrl: './asiento.html',
})
export class Asiento {
  // Entran desde el padre (SeleccionButacas):
  // <app-asiento [butaca]="b" [ocupada]="..." [seleccionada]="..." (elegida)="alternar($event)" />
  butaca = input<Butaca>();
  ocupada = input(false);
  seleccionada = input(false);

  // Sale hacia el padre: el hijo solo avisa qué butaca tocaron; el padre decide qué hacer
  elegida = output<Butaca>();

  elegir() {
    this.elegida.emit(this.butaca()!);
  }
}
