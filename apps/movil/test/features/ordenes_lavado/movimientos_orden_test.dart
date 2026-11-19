import 'package:corefaze_movil/features/ordenes_lavado/presentation/controllers/movimientos_orden.dart';
import 'package:flutter_test/flutter_test.dart';

List<String> etiquetas(String estado) => movimientosDe(estado).map((m) => m.etiqueta).toList();

void main() {
  group('movimientosDe', () {
    test('una orden registrada solo avanza a En proceso', () {
      expect(etiquetas('registrada'), ['Pasar a En proceso']);
    });

    test('una orden en proceso avanza a Terminada o vuelve a Registrada', () {
      expect(etiquetas('en_proceso'), ['Pasar a Terminada', 'Devolver a Registrada']);
      expect(movimientosDe('en_proceso').map((m) => m.devuelve), [false, true]);
    });

    test('una orden terminada no se entrega desde la app: solo vuelve a En proceso', () {
      expect(etiquetas('terminada'), ['Devolver a En proceso']);
    });

    test('una orden cerrada no tiene movimientos', () {
      expect(movimientosDe('entregada'), isEmpty);
      expect(movimientosDe('cancelada'), isEmpty);
    });
  });

  group('sePuedeCancelar', () {
    test('administración cancela órdenes registradas o en proceso', () {
      for (final rol in ['superadmin', 'administrador']) {
        expect(sePuedeCancelar('registrada', rol), isTrue);
        expect(sePuedeCancelar('en_proceso', rol), isTrue);
      }
    });

    test('soporte no cancela', () {
      expect(sePuedeCancelar('registrada', 'soporte'), isFalse);
    });

    test('una orden terminada o cerrada no se cancela', () {
      expect(sePuedeCancelar('terminada', 'administrador'), isFalse);
      expect(sePuedeCancelar('entregada', 'administrador'), isFalse);
      expect(sePuedeCancelar('cancelada', 'administrador'), isFalse);
    });
  });
}
