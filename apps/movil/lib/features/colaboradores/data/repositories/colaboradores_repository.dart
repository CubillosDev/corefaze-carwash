import '../../../../core/network/api_cliente.dart';
import '../../../../core/network/lectura_json.dart';
import '../models/colaborador.dart';

class ColaboradoresRepository {
  ColaboradoresRepository(this._api);

  final ApiCliente _api;

  /// GET /api/colaboradores: todos, también los inactivos (para mostrar quién
  /// atendió una orden).
  Future<List<Colaborador>> listar() async =>
      leerLista(await _api.obtener('colaboradores'), 'colaboradores').map(Colaborador.desdeJson).toList();

  /// Solo los activos (R2), por código: los que pueden recibir órdenes.
  Future<List<Colaborador>> listarActivos() async =>
      (await listar()).where((c) => c.activo).toList()..sort((a, b) => a.codigo.compareTo(b.codigo));
}
