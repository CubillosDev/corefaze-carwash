import 'package:flutter/widgets.dart';

import '../../app/tema.dart';

/// Ícono de Corefaze (el cubo isométrico abierto del logo), en vectores: el
/// mismo trazado del panel web, sin depender de una imagen.
class MarcaCorefaze extends StatelessWidget {
  const MarcaCorefaze({super.key, this.tamano = 24, this.color = Colores.blanco});

  final double tamano;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      label: 'Corefaze',
      image: true,
      child: SizedBox(
        width: tamano * 77 / 85,
        height: tamano,
        child: CustomPaint(painter: _PintorMarca(color)),
      ),
    );
  }
}

class _PintorMarca extends CustomPainter {
  const _PintorMarca(this.color);

  final Color color;

  @override
  void paint(Canvas canvas, Size size) {
    canvas.scale(size.width / 77, size.height / 85);
    final pincel = Paint()..color = color;
    Path poligono(List<Offset> puntos) => Path()..addPolygon(puntos, true);
    canvas
      ..drawPath(poligono(const [Offset(49.5, 1), Offset(75.5, 14.5), Offset(49.5, 28), Offset(23.5, 14.5)]), pincel)
      ..drawPath(poligono(const [Offset(49.5, 57), Offset(75.5, 70.5), Offset(49.5, 84), Offset(23.5, 70.5)]), pincel)
      ..drawPath(poligono(const [Offset(1, 28.5), Offset(17.5, 20), Offset(17.5, 67.5), Offset(1, 59.5)]), pincel);
  }

  @override
  bool shouldRepaint(_PintorMarca anterior) => anterior.color != color;
}
