import 'dart:convert';

import 'package:corefaze_movil/features/autenticacion/presentation/controllers/sesion_controller.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../apoyo/api_falsa.dart';

String _jwt(DateTime vence) {
  String parte(Object datos) => base64Url.encode(utf8.encode(jsonEncode(datos))).replaceAll('=', '');
  return '${parte({'alg': 'HS256'})}.${parte({'exp': vence.millisecondsSinceEpoch ~/ 1000})}.firma';
}

void main() {
  test('reconoce un token vencido sin verificar la firma', () {
    final ahora = DateTime.utc(2026, 11, 19, 12);
    expect(tokenVencido(_jwt(ahora.subtract(const Duration(minutes: 1))), ahora: ahora), isTrue);
    expect(tokenVencido(_jwt(ahora.add(const Duration(hours: 1))), ahora: ahora), isFalse);
    expect(tokenVencido('no-es-un-jwt', ahora: ahora), isFalse);
  });

  test('inicia sesión, usa el token y lo olvida al cerrar', () async {
    final dependencias = ApiFalsa().dependencias();
    final sesion = dependencias.sesion;
    await sesion.restaurar();

    await sesion.iniciarSesion(email: 'ana@prueba.co', password: 'clave-correcta');
    expect(sesion.usuario?.primerNombre, 'Ana');
    expect(dependencias.api.token, 'token.de.prueba');

    await sesion.cerrarSesion();
    expect(sesion.usuario, isNull);
    expect(dependencias.api.token, isNull);
  });

  test('credenciales incorrectas dan un mensaje para la persona', () async {
    final sesion = ApiFalsa().dependencias().sesion;
    await expectLater(
      sesion.iniciarSesion(email: 'ana@prueba.co', password: 'otra'),
      throwsA(predicate((error) => error.toString() == 'Usuario o contraseña incorrectos')),
    );
  });
}
