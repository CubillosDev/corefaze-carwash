import 'dart:convert';
import 'dart:io';

import 'package:corefaze_movil/core/constants/dominio.dart';
import 'package:flutter_test/flutter_test.dart';

/// La app copia reglas de packages/contratos/dominio.json: si el contrato
/// cambia, esta prueba lo avisa.
void main() {
  final contrato = jsonDecode(File('../../packages/contratos/dominio.json').readAsStringSync()) as Map<String, dynamic>;

  test('los estados, medios de pago, tipos de vehículo y roles coinciden con el contrato', () {
    expect(EstadosOrden.todos, contrato['estadosOrden']);
    expect(MediosPago.todos, contrato['mediosPago']);
    expect(TiposVehiculo.todos, contrato['tiposVehiculo']);
    expect(TiposVehiculo.motos, contrato['tiposVehiculoMoto']);
    expect(Roles.todos, contrato['roles']);
    expect(serviciosConLavadoMotor, contrato['serviciosConLavadoMotor']);
  });

  test('los patrones de placa y los límites coinciden con el contrato', () {
    final patrones = contrato['patronesPlaca'] as Map<String, dynamic>;
    final limites = contrato['limites'] as Map<String, dynamic>;
    expect(patronPlacaCarro.pattern, patrones['carro']);
    expect(patronPlacaMoto.pattern, patrones['moto']);
    expect(Limites.nombreMin, (limites['nombre'] as Map)['min']);
    expect(Limites.nombreMax, (limites['nombre'] as Map)['max']);
    expect(Limites.telefono, (limites['telefono'] as Map)['longitud']);
    expect(Limites.documentoMin, (limites['documento'] as Map)['min']);
    expect(Limites.documentoMax, (limites['documento'] as Map)['max']);
    expect(Limites.observacionesMax, (limites['observaciones'] as Map)['max']);
    expect(Limites.marcaColorMin, (limites['marcaColor'] as Map)['min']);
    expect(Limites.marcaColorMax, (limites['marcaColor'] as Map)['max']);
  });
}
