import '../../../../core/network/api_cliente.dart';
import '../../../../core/network/lectura_json.dart';
import '../models/colaborador.dart';

class ColaboradoresRepository {
  ColaboradoresRepository(this._api);

  final ApiCliente _api;

  /// GET /api/colaboradores: solo los activos (R2), por código.
  Future<List<Colaborador>> listarActivos() async {
    final cuerpo = await _api.obtener('colaboradores');
    return leerLista(cuerpo, 'colaboradores').map(Colaborador.desdeJson).where((c) => c.activo).toList()
      ..sort((a, b) => a.codigo.compareTo(b.codigo));
  }
}
