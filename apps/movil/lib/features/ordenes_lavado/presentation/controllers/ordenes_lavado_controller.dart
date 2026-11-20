import 'package:flutter/foundation.dart';

import '../../../../app/dependencias.dart';
import '../../../colaboradores/data/models/colaborador.dart';
import '../../../jornadas/data/models/jornada.dart';
import '../../../servicios/data/models/servicio.dart';
import '../../../vehiculos/data/models/vehiculo.dart';
import '../../data/models/orden_lavado.dart';

enum Situacion { cargando, listo, error }

/// Una fila de "Ingresados hoy".
class IngresoDelDia {
  const IngresoDelDia({required this.orden, required this.vehiculo, required this.servicio, this.colaborador});

  final OrdenLavado orden;
  final Vehiculo? vehiculo;
  final Servicio? servicio;
  final Colaborador? colaborador;
}

/// Estado de la recepción: la jornada abierta y lo que entró en ella, del más
/// reciente al más antiguo, con el filtro por fase y los cambios de fase.
class OrdenesLavadoController extends ChangeNotifier {
  OrdenesLavadoController(this._dependencias);

  final Dependencias _dependencias;

  Situacion situacion = Situacion.cargando;
  String error = '';
  Jornada? jornada;
  List<IngresoDelDia> ingresos = const [];

  /// Fase que se está viendo; null muestra todas.
  String? filtro;

  List<IngresoDelDia> get visibles =>
      filtro == null ? ingresos : ingresos.where((i) => i.orden.estado == filtro).toList();

  int cuantosEn(String estado) => ingresos.where((i) => i.orden.estado == estado).length;

  void filtrar(String? estado) {
    filtro = estado;
    notifyListeners();
  }

  /// Cambia la fase en la API y recarga la lista. Si la API lo rechaza, la
  /// excepción sube a quien lo pidió para mostrar el mensaje.
  Future<void> cambiarEstado(IngresoDelDia ingreso, String destino, {String? motivo}) async {
    await _dependencias.ordenes.cambiarEstado(ingreso.orden.id, destino, motivo: motivo);
    await cargar(silencioso: true);
  }

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
          _dependencias.colaboradores.listar(),
        ]);
        final ordenes = resultados[0].cast<OrdenLavado>();
        final vehiculos = resultados[1].cast<Vehiculo>();
        final servicios = resultados[2].cast<Servicio>();
        final colaboradores = resultados[3].cast<Colaborador>();
        final vehiculoPorId = {for (final v in vehiculos) v.id: v};
        final servicioPorId = {for (final s in servicios) s.id: s};
        final colaboradorPorId = {for (final c in colaboradores) c.id: c};
        filas = [
          for (final orden in ordenes)
            IngresoDelDia(
              orden: orden,
              vehiculo: vehiculoPorId[orden.vehiculoId],
              servicio: servicioPorId[orden.servicioId],
              colaborador: colaboradorPorId[orden.colaboradorId],
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
