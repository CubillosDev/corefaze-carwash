import '../../../../core/network/api_cliente.dart';
import '../../../../core/network/lectura_json.dart';
import '../models/servicio.dart';

class ServiciosRepository {
  ServiciosRepository(this._api);

  final ApiCliente _api;

  /// GET /api/servicios, por número.
  Future<List<Servicio>> listar() async {
    final cuerpo = await _api.obtener('servicios');
    return leerLista(cuerpo, 'servicios').map(Servicio.desdeJson).toList()
      ..sort((a, b) => a.numero.compareTo(b.numero));
  }
}
