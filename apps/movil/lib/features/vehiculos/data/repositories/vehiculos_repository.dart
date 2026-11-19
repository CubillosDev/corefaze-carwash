import '../../../../core/network/api_cliente.dart';
import '../../../../core/network/lectura_json.dart';
import '../../../../core/utils/validador_placa.dart';
import '../models/vehiculo.dart';

class VehiculosRepository {
  VehiculosRepository(this._api);

  final ApiCliente _api;

  Future<List<Vehiculo>> listar() async =>
      leerLista(await _api.obtener('vehiculos'), 'vehiculos').map(Vehiculo.desdeJson).toList();

  /// El vehículo con esa placa, si está registrado.
  Future<Vehiculo?> buscarPorPlaca(String placa) async {
    final buscada = normalizarPlaca(placa);
    for (final vehiculo in await listar()) {
      if (vehiculo.placa == buscada) {
        return vehiculo;
      }
    }
    return null;
  }

  /// POST /api/vehiculos.
  Future<Vehiculo> crear({
    required String placa,
    required String tipoVehiculo,
    required int clienteId,
    String? marca,
    String? color,
  }) async {
    final cuerpo = await _api.crear('vehiculos', {
      'placa': normalizarPlaca(placa),
      'tipoVehiculo': tipoVehiculo,
      'clienteId': clienteId,
      if (marca != null && marca.trim().isNotEmpty) 'marca': marca.trim(),
      if (color != null && color.trim().isNotEmpty) 'color': color.trim(),
    });
    return Vehiculo.desdeJson(leerObjeto(cuerpo, 'vehiculo'));
  }
}
