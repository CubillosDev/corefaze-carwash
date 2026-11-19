import 'package:flutter/material.dart';

import '../../../../app/tema.dart';
import '../../../../core/widgets/marca_corefaze.dart';

/// Cabecera de la app sobre el marco: ícono de Corefaze, divisor y "CarWash",
/// con lo que haga falta a la derecha. En pantallas angostas lo de la
/// derecha se encoge antes que la marca.
class EncabezadoMarca extends StatelessWidget {
  const EncabezadoMarca({super.key, this.derecha = const []});

  final List<Widget> derecha;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        const MarcaCorefaze(tamano: 24),
        const SizedBox(width: 12),
        Container(width: 1, height: 18, color: const Color(0x40FFFFFF)),
        const SizedBox(width: 12),
        Text(
          'CarWash',
          style: estilo(15, peso: FontWeight.w500, color: Colores.blanco),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Row(
            mainAxisAlignment: MainAxisAlignment.end,
            children: [
              for (final (indice, widget) in derecha.indexed) ...[
                if (indice > 0) const SizedBox(width: 8),
                Flexible(child: widget),
              ],
            ],
          ),
        ),
      ],
    );
  }
}
