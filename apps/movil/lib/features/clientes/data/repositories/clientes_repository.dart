import '../../../../core/network/api_cliente.dart';
import '../../../../core/network/lectura_json.dart';
import '../models/cliente.dart';

class ClientesRepository {
  ClientesRepository(this._api);

  final ApiCliente _api;

  Future<Cliente> obtener(int id) async => Cliente.desdeJson(leerObjeto(await _api.obtener('clientes/$id'), 'cliente'));

  /// Busca un cliente por su documento exacto.
  Future<Cliente?> buscarPorDocumento(String documento) async {
    final cuerpo = await _api.obtener('clientes');
    for (final cliente in leerLista(cuerpo, 'clientes').map(Cliente.desdeJson)) {
      if (cliente.documento == documento) {
        return cliente;
      }
    }
    return null;
  }

  /// POST /api/clientes: un particular nuevo.
  Future<Cliente> crearParticular({required String nombre, required String documento, required String telefono}) async {
    final cuerpo = await _api.crear('clientes', {
      'nombre': nombre,
      'documento': documento,
      'telefono': telefono,
      'tipo': 'particular',
    });
    return Cliente.desdeJson(leerObjeto(cuerpo, 'cliente'));
  }
}
