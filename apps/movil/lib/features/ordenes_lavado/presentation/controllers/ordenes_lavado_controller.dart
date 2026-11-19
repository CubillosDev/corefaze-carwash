import 'package:flutter/foundation.dart';

import '../../../../app/dependencias.dart';
import '../../../jornadas/data/models/jornada.dart';
import '../../../servicios/data/models/servicio.dart';
import '../../../vehiculos/data/models/vehiculo.dart';
import '../../data/models/orden_lavado.dart';

enum Situacion { cargando, listo, error }

/// Una fila de "Ingresados hoy".
class IngresoDelDia {
  const IngresoDelDia({required this.orden, required this.vehiculo, required this.servicio});

  final OrdenLavado orden;
  final Vehiculo? vehiculo;
  final Servicio? servicio;
}

/// Estado de la recepción: la jornada abierta y lo que entró en ella, del más
/// reciente al más antiguo.
class OrdenesLavadoController extends ChangeNotifier {
  OrdenesLavadoController(this._dependencias);

  final Dependencias _dependencias;

  Situacion situacion = Situacion.cargando;
  String error = '';
  Jornada? jornada;
  List<IngresoDelDia> ingresos = const [];

  /// [silencioso]: refresca sin volver a "cargando" (lo que hay sigue en pantalla).
  Future<void> cargar({bool silencioso = false}) async {
    if (!silencioso) {
      situacion = Situacion.cargando;
      notifyListeners();
    }
    try {
      final abierta = await _dependencias.jornadas.abierta();
      var filas = <IngresoDelDia>[];
      if (abierta != null) {
        final resultados = await Future.wait<List<Object>>([
          _dependencias.ordenes.listarDeJornada(abierta.id),
          _dependencias.vehiculos.listar(),
          _dependencias.servicios.listar(),
        ]);
        final ordenes = resultados[0].cast<OrdenLavado>();
        final vehiculos = resultados[1].cast<Vehiculo>();
        final servicios = resultados[2].cast<Servicio>();
        final vehiculoPorId = {for (final v in vehiculos) v.id: v};
        final servicioPorId = {for (final s in servicios) s.id: s};
        filas = [
          for (final orden in ordenes)
            IngresoDelDia(
              orden: orden,
              vehiculo: vehiculoPorId[orden.vehiculoId],
              servicio: servicioPorId[orden.servicioId],
            ),
        ]..sort((a, b) => (b.orden.creadaEn ?? '').compareTo(a.orden.creadaEn ?? ''));
      }
      jornada = abierta;
      ingresos = filas;
      situacion = Situacion.listo;
    } catch (fallo) {
      error = fallo.toString();
      situacion = Situacion.error;
    }
    notifyListeners();
  }
}
