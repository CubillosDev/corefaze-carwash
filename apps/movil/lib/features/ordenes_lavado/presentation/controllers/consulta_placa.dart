import '../../../../app/dependencias.dart';
import '../../../clientes/data/models/cliente.dart';
import '../../../colaboradores/data/models/colaborador.dart';
import '../../../servicios/data/models/servicio.dart';
import '../../../vehiculos/data/models/vehiculo.dart';

/// Lo que se sabe de una placa en Corefaze: el vehículo y su dueño (si está
/// registrado), su historial, y el catálogo con los colaboradores activos.
class ResultadoConsulta {
  const ResultadoConsulta({
    required this.placa,
    required this.vehiculo,
    required this.dueno,
    required this.visitas,
    required this.ultimoServicio,
    required this.ultimaFecha,
    required this.servicioHabitualId,
    required this.servicios,
    required this.colaboradores,
  });

  final String placa;
  final Vehiculo? vehiculo;
  final Cliente? dueno;

  /// Órdenes no anuladas del vehículo.
  final int visitas;
  final String? ultimoServicio;
  final String? ultimaFecha;

  /// El servicio que más ha tomado (el punto azul del diseño).
  final int? servicioHabitualId;
  final List<Servicio> servicios;
  final List<Colaborador> colaboradores;

  bool get registrado => vehiculo != null;
}

/// Pasos de la consulta, en el orden en que se muestran.
enum PasoConsulta { vehiculo, dueno, historial, catalogo }

/// Busca la placa paso a paso y avisa cada paso terminado (para la pantalla
/// de consulta).
Future<ResultadoConsulta> consultarPlaca(
  Dependencias dependencias,
  String placa, {
  void Function(PasoConsulta paso, ResultadoParcial parcial)? alTerminarPaso,
}) async {
  final catalogo = (dependencias.servicios.listar(), dependencias.colaboradores.listarActivos()).wait;

  final vehiculo = await dependencias.vehiculos.buscarPorPlaca(placa);
  alTerminarPaso?.call(PasoConsulta.vehiculo, ResultadoParcial(vehiculo: vehiculo));

  final clienteId = vehiculo?.clienteId;
  final dueno = clienteId == null ? null : await dependencias.clientes.obtener(clienteId);
  alTerminarPaso?.call(PasoConsulta.dueno, ResultadoParcial(vehiculo: vehiculo, dueno: dueno));

  var visitas = 0;
  int? ultimoServicioId;
  String? ultimaFecha;
  int? habitual;
  final (servicios, colaboradores) = await catalogo;
  if (vehiculo != null) {
    final historial =
        (await dependencias.ordenes.listarTodas())
            .where((orden) => orden.vehiculoId == vehiculo.id && orden.estado != 'cancelada')
            .toList()
          ..sort((a, b) => (b.creadaEn ?? b.fecha).compareTo(a.creadaEn ?? a.fecha));
    visitas = historial.length;
    if (historial.isNotEmpty) {
      ultimoServicioId = historial.first.servicioId;
      ultimaFecha = historial.first.fecha;
      final conteo = <int, int>{};
      for (final orden in historial) {
        conteo[orden.servicioId] = (conteo[orden.servicioId] ?? 0) + 1;
      }
      habitual = conteo.entries.reduce((a, b) => b.value > a.value ? b : a).key;
    }
  }
  final nombreUltimo = ultimoServicioId == null
      ? null
      : servicios.where((s) => s.id == ultimoServicioId).map((s) => s.nombre).firstOrNull;
  alTerminarPaso?.call(
    PasoConsulta.historial,
    ResultadoParcial(vehiculo: vehiculo, dueno: dueno, visitas: visitas, ultimaFecha: ultimaFecha),
  );
  alTerminarPaso?.call(
    PasoConsulta.catalogo,
    ResultadoParcial(
      vehiculo: vehiculo,
      dueno: dueno,
      servicios: servicios.length,
      colaboradores: colaboradores.length,
    ),
  );

  return ResultadoConsulta(
    placa: placa,
    vehiculo: vehiculo,
    dueno: dueno,
    visitas: visitas,
    ultimoServicio: nombreUltimo,
    ultimaFecha: ultimaFecha,
    servicioHabitualId: habitual,
    servicios: servicios.where((s) => s.activo).toList(),
    colaboradores: colaboradores,
  );
}

/// Lo que ya se sabe en cada paso, para el texto de apoyo de la pantalla.
class ResultadoParcial {
  const ResultadoParcial({
    this.vehiculo,
    this.dueno,
    this.visitas = 0,
    this.ultimaFecha,
    this.servicios = 0,
    this.colaboradores = 0,
  });

  final Vehiculo? vehiculo;
  final Cliente? dueno;
  final int visitas;
  final String? ultimaFecha;
  final int servicios;
  final int colaboradores;
}
