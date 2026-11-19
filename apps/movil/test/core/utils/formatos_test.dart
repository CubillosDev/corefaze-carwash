import 'package:corefaze_movil/core/utils/formato_fecha.dart';
import 'package:corefaze_movil/core/utils/formato_moneda.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('dinero entero con separador de miles', () {
    expect(formatoMoneda(28000), r'$ 28.000');
    expect(formatoMoneda(1250000), r'$ 1.250.000');
    expect(formatoMoneda(0), r'$ 0');
    expect(formatoMoneda(-500), r'-$ 500');
  });

  test('fechas y horas en Bogotá, sin depender de la zona del teléfono', () {
    expect(formatoFecha('2026-08-03'), '03/08/2026');
    expect(formatoHora('2026-08-03T19:30:00Z'), '2:30 p. m.');
    expect(formatoHora('2026-08-03T05:05:00Z'), '12:05 a. m.');
    expect(formatoHora(null), '');
    expect(fechaEnBogota(DateTime.utc(2026, 11, 20, 3)), '2026-11-19');
    expect(fechaLarga(DateTime.utc(2026, 11, 19, 15)), 'Jueves, 19 de noviembre');
  });
}
