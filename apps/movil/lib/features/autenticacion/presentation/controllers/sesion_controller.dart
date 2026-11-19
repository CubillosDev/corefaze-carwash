import 'dart:convert';

import 'package:flutter/foundation.dart';

import '../../../../core/network/api_cliente.dart';
import '../../data/models/usuario.dart';
import '../../data/repositories/almacen_sesion.dart';
import '../../data/repositories/autenticacion_repository.dart';

/// ¿Ya venció el JWT? Solo lee `exp` (no verifica la firma: eso lo hace la
/// API). Si no se puede leer, se deja decidir a la API.
bool tokenVencido(String token, {DateTime? ahora}) {
  final partes = token.split('.');
  if (partes.length != 3) {
    return false;
  }
  try {
    final carga = jsonDecode(utf8.decode(base64Url.decode(base64Url.normalize(partes[1]))));
    final exp = carga is Map ? carga['exp'] : null;
    if (exp is! num) {
      return false;
    }
    final vence = DateTime.fromMillisecondsSinceEpoch((exp * 1000).round(), isUtc: true);
    return !vence.isAfter((ahora ?? DateTime.now()).toUtc());
  } catch (_) {
    return false;
  }
}

/// Sesión de la app: quién ingresó, con qué token. Avisa a la interfaz cada
/// vez que cambia (ingreso, salida o sesión vencida).
class SesionController extends ChangeNotifier {
  SesionController({
    required ApiCliente api,
    required AutenticacionRepository repositorio,
    required AlmacenSesion almacen,
  }) : _api = api,
       _repositorio = repositorio,
       _almacen = almacen {
    _api.alVencerSesion = () => cerrarSesion(vencida: true);
  }

  final ApiCliente _api;
  final AutenticacionRepository _repositorio;
  final AlmacenSesion _almacen;

  Usuario? _usuario;
  bool _restaurando = true;
  bool _vencida = false;

  Usuario? get usuario => _usuario;

  /// Mientras se lee la sesión guardada al abrir la app.
  bool get restaurando => _restaurando;

  /// La última sesión terminó porque venció (para avisarlo en el ingreso).
  bool get vencida => _vencida;

  Future<void> restaurar() async {
    final guardada = await _almacen.leer();
    if (guardada != null && !tokenVencido(guardada.token)) {
      _abrir(guardada);
    } else if (guardada != null) {
      await _almacen.borrar();
      _vencida = true;
    }
    _restaurando = false;
    notifyListeners();
  }

  Future<void> iniciarSesion({required String email, required String password}) async {
    final sesion = await _repositorio.iniciarSesion(email: email, password: password);
    await _almacen.guardar(sesion);
    _vencida = false;
    _abrir(sesion);
    notifyListeners();
  }

  Future<void> cerrarSesion({bool vencida = false}) async {
    _api.token = null;
    _usuario = null;
    _vencida = vencida;
    await _almacen.borrar();
    notifyListeners();
  }

  void _abrir(SesionIniciada sesion) {
    _api.token = sesion.token;
    _usuario = sesion.usuario;
  }
}
