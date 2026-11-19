import 'package:flutter/widgets.dart';

import '../../app/tema.dart';
import '../utils/validador_placa.dart';

/// Placa del vehículo: amarilla como la física, o gris en las listas.
class Placa extends StatelessWidget {
  const Placa(this.placa, {super.key, this.tamano = 12, this.amarilla = false});

  final String placa;
  final double tamano;
  final bool amarilla;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      label: 'Placa ${formatoPlaca(placa)}',
      excludeSemantics: true,
      child: Container(
        padding: EdgeInsets.symmetric(horizontal: tamano * 0.58, vertical: tamano * 0.3),
        decoration: BoxDecoration(
          color: amarilla ? Colores.placa : Colores.chip,
          borderRadius: BorderRadius.circular(amarilla ? 7 : Radios.placa),
        ),
        child: Text(
          formatoPlaca(placa),
          style: estiloMono(
            tamano,
            color: amarilla ? Colores.textoPlaca : Colores.texto,
            espaciado: amarilla ? 0.08 : 0.05,
          ),
        ),
      ),
    );
  }
}
