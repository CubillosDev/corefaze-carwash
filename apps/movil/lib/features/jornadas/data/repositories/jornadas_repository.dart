import '../../../../core/network/api_cliente.dart';
import '../../../../core/network/lectura_json.dart';
import '../models/jornada.dart';

/// Prefijo del contenido del QR que muestra el panel web.
const prefijoQrJornada = 'corefaze-jornada:';

class JornadasRepository {
  JornadasRepository(this._api);

  final ApiCliente _api;

  /// La jornada abierta, si la hay.
  Future<Jornada?> abierta() async {
    final cuerpo = await _api.obtener('jornadas');
    final jornadas = leerLista(cuerpo, 'jornadas').map(Jornada.desdeJson);
    for (final jornada in jornadas) {
      if (jornada.abierta) {
        return jornada;
      }
    }
    return null;
  }

  /// POST /api/jornadas/qr/canje: abre la jornada con el código de un solo uso
  /// que muestra el panel. La API rechaza (409) un código vencido o usado.
  Future<void> abrirConQr(String contenido) => _api.crear('jornadas/qr/canje', {'contenido': contenido});

  /// POST /api/jornadas: abre la jornada de hoy sin código.
  Future<void> abrir() => _api.crear('jornadas');
}
