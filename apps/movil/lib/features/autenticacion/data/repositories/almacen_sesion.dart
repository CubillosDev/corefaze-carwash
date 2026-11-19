import 'dart:convert';

import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import '../models/usuario.dart';
import 'autenticacion_repository.dart';

/// Dónde sobrevive la sesión al cerrar la app. Solo guarda { usuario, token }.
abstract interface class AlmacenSesion {
  Future<SesionIniciada?> leer();
  Future<void> guardar(SesionIniciada sesion);
  Future<void> borrar();

  /// En Android e iOS, el almacén cifrado del sistema (Keystore / Keychain).
  /// En el navegador no hay un lugar seguro: la sesión vive solo en memoria.
  factory AlmacenSesion.delSistema() => kIsWeb ? AlmacenEnMemoria() : _AlmacenSeguro();
}

const _clave = 'corefaze.sesion';

class _AlmacenSeguro implements AlmacenSesion {
  final _almacen = const FlutterSecureStorage();

  @override
  Future<SesionIniciada?> leer() async {
    try {
      final texto = await _almacen.read(key: _clave);
      if (texto == null) {
        return null;
      }
      final datos = jsonDecode(texto) as Map<String, dynamic>;
      return SesionIniciada(
        usuario: Usuario.desdeJson(datos['usuario'] as Map<String, dynamic>),
        token: datos['token'] as String,
      );
    } catch (_) {
      await borrar();
      return null;
    }
  }

  @override
  Future<void> guardar(SesionIniciada sesion) =>
      _almacen.write(key: _clave, value: jsonEncode({'usuario': sesion.usuario.aJson(), 'token': sesion.token}));

  @override
  Future<void> borrar() => _almacen.delete(key: _clave);
}

/// Sin persistencia: para el navegador y para las pruebas.
class AlmacenEnMemoria implements AlmacenSesion {
  SesionIniciada? _sesion;

  @override
  Future<SesionIniciada?> leer() async => _sesion;

  @override
  Future<void> guardar(SesionIniciada sesion) async => _sesion = sesion;

  @override
  Future<void> borrar() async => _sesion = null;
}
