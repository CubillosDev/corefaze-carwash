import 'dart:async';
import 'dart:convert';

import 'package:http/http.dart' as http;

import 'api_excepcion.dart';

const _mensajeSinConexion = 'No pudimos comunicarnos con el servidor. Revisa tu conexión e inténtalo de nuevo.';
const _mensajeTiempoAgotado = 'El servidor tardó demasiado en responder. Inténtalo de nuevo en unos segundos.';
const _mensajeGenerico = 'Ocurrió un error inesperado. Inténtalo de nuevo más tarde.';
const _mensajePorEstado = {
  400: 'Hay datos que no son válidos. Revisa el formulario e inténtalo de nuevo.',
  401: 'Tu sesión terminó. Vuelve a ingresar.',
  403: 'No tienes permiso para realizar esta acción.',
  404: 'No encontramos lo que buscas.',
  409: 'No se puede completar porque choca con información que ya está registrada.',
  429: 'Hiciste demasiadas solicitudes seguidas. Espera un momento e inténtalo de nuevo.',
  500: 'El servidor presentó un error. Inténtalo de nuevo en unos minutos.',
};

/// En estos estados el mensaje de la API habla del negocio ("Ya existe un
/// cliente con ese documento") y se muestra tal cual.
const _estadosConMensajeDelServidor = {400, 404, 409};

/// Cliente HTTP único de la app: el único lugar que habla con la API.
///
/// - Todo pedido lleva `X-API-Key` (la llave de la app móvil).
/// - Con sesión, agrega `Authorization: Bearer <token>`.
/// - Las respuestas de éxito vienen envueltas ({ ordenes }, { orden }...) y se
///   devuelven tal cual; los errores llegan como { mensaje } y, en un 400,
///   { errores: [{ campo, mensaje }] }.
/// - Un 401 con sesión avisa a `alVencerSesion` para volver al ingreso.
/// - Nunca registra llaves, tokens ni respuestas.
class ApiCliente {
  ApiCliente({
    required String urlBase,
    required String llave,
    http.Client? cliente,
    this.tiempoMaximo = const Duration(seconds: 15),
  }) : _urlBase = urlBase.replaceAll(RegExp(r'/+$'), ''),
       _llave = llave,
       _cliente = cliente ?? http.Client();

  final String _urlBase;
  final String _llave;
  final http.Client _cliente;
  final Duration tiempoMaximo;

  /// Token de la sesión; null sin sesión.
  String? token;

  /// Se llama cuando la API rechaza el token (401 con sesión).
  void Function()? alVencerSesion;

  Future<Map<String, dynamic>> obtener(String ruta, {Map<String, Object?> consulta = const {}}) =>
      _solicitar('GET', ruta, consulta: consulta);

  Future<Map<String, dynamic>> crear(String ruta, [Object? datos]) => _solicitar('POST', ruta, datos: datos);

  Future<Map<String, dynamic>> actualizar(String ruta, Object? datos) => _solicitar('PATCH', ruta, datos: datos);

  Uri _construirUrl(String ruta, Map<String, Object?> consulta) {
    final parametros = <String, String>{
      for (final MapEntry(:key, :value) in consulta.entries)
        if (value != null && value.toString().isNotEmpty) key: value.toString(),
    };
    final url = Uri.parse('$_urlBase/${ruta.replaceAll(RegExp(r'^/+'), '')}');
    return parametros.isEmpty ? url : url.replace(queryParameters: parametros);
  }

  Future<Map<String, dynamic>> _solicitar(
    String metodo,
    String ruta, {
    Map<String, Object?> consulta = const {},
    Object? datos,
  }) async {
    final conSesion = token != null;
    final solicitud = http.Request(metodo, _construirUrl(ruta, consulta))
      ..headers.addAll({
        'Accept': 'application/json',
        'X-API-Key': _llave,
        if (conSesion) 'Authorization': 'Bearer $token',
        if (datos != null) 'Content-Type': 'application/json',
      });
    if (datos != null) {
      solicitud.body = jsonEncode(datos);
    }

    final http.Response respuesta;
    try {
      respuesta = await http.Response.fromStream(await _cliente.send(solicitud).timeout(tiempoMaximo));
    } on TimeoutException {
      throw const ApiExcepcion(_mensajeTiempoAgotado);
    } catch (_) {
      throw const ApiExcepcion(_mensajeSinConexion);
    }

    final cuerpo = _leerCuerpo(respuesta);
    if (respuesta.statusCode >= 200 && respuesta.statusCode < 300) {
      return cuerpo;
    }

    if (respuesta.statusCode == 401 && conSesion) {
      alVencerSesion?.call();
    }
    throw _error(respuesta.statusCode, cuerpo);
  }

  Map<String, dynamic> _leerCuerpo(http.Response respuesta) {
    if (respuesta.bodyBytes.isEmpty) {
      return const {};
    }
    try {
      final datos = jsonDecode(utf8.decode(respuesta.bodyBytes));
      return datos is Map<String, dynamic> ? datos : const {};
    } on FormatException {
      return const {};
    }
  }

  ApiExcepcion _error(int estado, Map<String, dynamic> cuerpo) {
    final delServidor = cuerpo['mensaje'] is String ? cuerpo['mensaje'] as String : '';
    final porCampo = <String, String>{
      if (cuerpo['errores'] is List)
        for (final error in cuerpo['errores'] as List)
          if (error is Map && error['campo'] is String && error['mensaje'] is String)
            error['campo'] as String: error['mensaje'] as String,
    };
    final mensaje = delServidor.isNotEmpty && _estadosConMensajeDelServidor.contains(estado)
        ? delServidor
        : _mensajePorEstado[estado] ?? (estado >= 500 ? _mensajePorEstado[500]! : _mensajeGenerico);
    return ApiExcepcion(mensaje, estado: estado, erroresPorCampo: porCampo, mensajeDelServidor: delServidor);
  }
}
