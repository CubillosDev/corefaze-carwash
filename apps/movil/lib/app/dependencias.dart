import 'package:flutter/widgets.dart';
import 'package:http/http.dart' as http;

import '../core/network/api_cliente.dart';
import '../features/autenticacion/data/repositories/almacen_sesion.dart';
import '../features/autenticacion/data/repositories/autenticacion_repository.dart';
import '../features/autenticacion/presentation/controllers/sesion_controller.dart';
import '../features/clientes/data/repositories/clientes_repository.dart';
import '../features/colaboradores/data/repositories/colaboradores_repository.dart';
import '../features/jornadas/data/repositories/jornadas_repository.dart';
import '../features/ordenes_lavado/data/repositories/ordenes_lavado_repository.dart';
import '../features/servicios/data/repositories/servicios_repository.dart';
import '../features/vehiculos/data/repositories/vehiculos_repository.dart';

/// Lo que comparten las pantallas: un solo cliente HTTP, los repositorios y
/// la sesión. Las pruebas lo arman con un cliente HTTP simulado.
class Dependencias {
  Dependencias({required String apiUrl, required String apiKey, http.Client? cliente, AlmacenSesion? almacen})
    : api = ApiCliente(urlBase: apiUrl, llave: apiKey, cliente: cliente) {
    sesion = SesionController(
      api: api,
      repositorio: AutenticacionRepository(api),
      almacen: almacen ?? AlmacenSesion.delSistema(),
    );
    jornadas = JornadasRepository(api);
    ordenes = OrdenesLavadoRepository(api);
    vehiculos = VehiculosRepository(api);
    clientes = ClientesRepository(api);
    servicios = ServiciosRepository(api);
    colaboradores = ColaboradoresRepository(api);
  }

  final ApiCliente api;
  late final SesionController sesion;
  late final JornadasRepository jornadas;
  late final OrdenesLavadoRepository ordenes;
  late final VehiculosRepository vehiculos;
  late final ClientesRepository clientes;
  late final ServiciosRepository servicios;
  late final ColaboradoresRepository colaboradores;

  static Dependencias de(BuildContext context) =>
      context.dependOnInheritedWidgetOfExactType<ProveedorDependencias>()!.dependencias;

  /// Igual que [de], sin suscribirse: para initState y callbacks.
  static Dependencias leer(BuildContext context) =>
      context.getInheritedWidgetOfExactType<ProveedorDependencias>()!.dependencias;
}

class ProveedorDependencias extends InheritedWidget {
  const ProveedorDependencias({super.key, required this.dependencias, required super.child});

  final Dependencias dependencias;

  @override
  bool updateShouldNotify(ProveedorDependencias anterior) => anterior.dependencias != dependencias;
}
