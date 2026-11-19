import '../../../../core/network/api_cliente.dart';
import '../../../../core/network/api_excepcion.dart';
import '../../../../core/network/lectura_json.dart';
import '../models/usuario.dart';

class SesionIniciada {
  const SesionIniciada({required this.usuario, required this.token});

  final Usuario usuario;
  final String token;
}

/// POST /api/auth/login.
class AutenticacionRepository {
  AutenticacionRepository(this._api);

  final ApiCliente _api;

  /// Ante 401 y 403 muestra un mensaje para la persona; los demás errores
  /// llegan tal cual del cliente HTTP.
  Future<SesionIniciada> iniciarSesion({required String email, required String password}) async {
    try {
      final cuerpo = await _api.crear('auth/login', {'email': email, 'password': password});
      return SesionIniciada(
        usuario: Usuario.desdeJson(leerObjeto(cuerpo, 'usuario')),
        token: leerTexto(cuerpo['token']),
      );
    } on ApiExcepcion catch (error) {
      if (error.estado == 401 && !_esDeLaLlave(error)) {
        throw const ApiExcepcion('Usuario o contraseña incorrectos', estado: 401);
      }
      if (error.estado == 403 && !_esDeLaLlave(error)) {
        throw const ApiExcepcion('Tu cuenta está deshabilitada. Comunícate con un administrador.', estado: 403);
      }
      rethrow;
    }
  }

  /// Un 401 o 403 por la llave habla de la configuración de la app, no de la persona.
  bool _esDeLaLlave(ApiExcepcion error) => RegExp('api key', caseSensitive: false).hasMatch(error.mensajeDelServidor);
}
