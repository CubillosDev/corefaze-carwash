import 'dart:convert';

import 'package:corefaze_movil/core/network/api_cliente.dart';
import 'package:corefaze_movil/core/network/api_excepcion.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

void main() {
  late http.Request ultima;

  ApiCliente cliente(int estado, Object cuerpo) => ApiCliente(
    urlBase: 'http://api.prueba/api/',
    llave: 'llave',
    cliente: MockClient((solicitud) async {
      ultima = solicitud;
      return http.Response(jsonEncode(cuerpo), estado, headers: {'content-type': 'application/json; charset=utf-8'});
    }),
  );

  test('envía la llave, el token y la consulta sin valores vacíos', () async {
    final api = cliente(200, {'ordenes': []})..token = 't0k3n';

    final cuerpo = await api.obtener('/ordenes-lavado', consulta: {'jornadaId': 6, 'fecha': null, 'vacio': ''});

    expect(cuerpo, {'ordenes': []});
    expect(ultima.url.toString(), 'http://api.prueba/api/ordenes-lavado?jornadaId=6');
    expect(ultima.headers['X-API-Key'], 'llave');
    expect(ultima.headers['Authorization'], 'Bearer t0k3n');
  });

  test('muestra el mensaje del negocio en un 409 y los errores por campo en un 400', () async {
    await expectLater(
      cliente(409, {'mensaje': 'Ya existe un cliente con ese documento'}).crear('clientes', {}),
      throwsA(isA<ApiExcepcion>().having((e) => e.mensaje, 'mensaje', 'Ya existe un cliente con ese documento')),
    );
    await expectLater(
      cliente(400, {
        'mensaje': 'Datos inválidos',
        'errores': [
          {'campo': 'placa', 'mensaje': 'Placa inválida'},
        ],
      }).crear('vehiculos', {}),
      throwsA(isA<ApiExcepcion>().having((e) => e.erroresPorCampo, 'por campo', {'placa': 'Placa inválida'})),
    );
  });

  test('un mensaje técnico no se muestra tal cual', () async {
    await expectLater(
      cliente(500, {'mensaje': 'relation "x" does not exist'}).obtener('servicios'),
      throwsA(isA<ApiExcepcion>().having((e) => e.mensaje, 'mensaje', contains('servidor presentó un error'))),
    );
  });

  test('un 401 con sesión avisa que la sesión venció', () async {
    var vencida = false;
    final api = cliente(401, {'mensaje': 'Token inválido'})
      ..token = 'viejo'
      ..alVencerSesion = () => vencida = true;

    await expectLater(api.obtener('jornadas'), throwsA(isA<ApiExcepcion>()));
    expect(vencida, isTrue);
  });

  test('sin conexión da un mensaje para la persona', () async {
    final api = ApiCliente(
      urlBase: 'http://api.prueba/api',
      llave: 'llave',
      cliente: MockClient((_) async => throw http.ClientException('sin red')),
    );
    await expectLater(
      api.obtener('jornadas'),
      throwsA(isA<ApiExcepcion>().having((e) => e.mensaje, 'mensaje', contains('No pudimos comunicarnos'))),
    );
  });
}
