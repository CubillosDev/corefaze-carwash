import 'package:flutter/foundation.dart';

import '../../../../app/dependencias.dart';
import '../../../../core/constants/dominio.dart';
import '../../../../core/network/api_excepcion.dart';
import '../../../clientes/data/models/cliente.dart';
import '../../../colaboradores/data/models/colaborador.dart';
import '../../../jornadas/data/models/jornada.dart';
import '../../../servicios/data/models/servicio.dart';
import '../../../vehiculos/data/models/vehiculo.dart';
import '../../data/models/orden_lavado.dart';
import '../../data/repositories/ordenes_lavado_repository.dart';
import 'consulta_placa.dart';

/// Avisos del "Estado de recepción" del diseño. Se guardan en las
/// observaciones de la orden (no hay fotos).
const marcasDeRecepcion = ['Rayones', 'Golpes', 'Objetos de valor', 'Accesorios', 'Llaves entregadas'];

final _soloDigitos = RegExp(r'^\d+$');

/// Lo que queda registrado, para la pantalla de confirmación.
class IngresoRegistrado {
  const IngresoRegistrado({
    required this.orden,
    required this.vehiculo,
    required this.servicio,
    required this.colaborador,
  });

  final OrdenLavado orden;
  final Vehiculo vehiculo;
  final Servicio servicio;
  final Colaborador colaborador;
}

/// Estado y reglas del formulario "Nuevo ingreso". La API vuelve a validar
/// todo; aquí solo se guía a quien registra (R2, R3, R7, R8 y los límites del
/// dominio) y se arma el registro en orden: dueño, vehículo y orden.
class NuevaOrdenForm extends ChangeNotifier {
  NuevaOrdenForm({required this.consulta, required this.jornada, required this.rol})
    : tipoVehiculo = consulta.vehiculo?.tipoVehiculo {
    final categorias = this.categorias;
    final habitual = consulta.servicios.where((s) => s.id == consulta.servicioHabitualId).firstOrNull;
    categoria = habitual?.categoria ?? (categorias.isEmpty ? '' : categorias.first);
  }

  final ResultadoConsulta consulta;
  final Jornada jornada;
  final String rol;

  String? tipoVehiculo;
  String marca = '';
  String color = '';
  String documentoDueno = '';
  String nombreDueno = '';
  String telefonoDueno = '';

  /// Cliente ya registrado con el documento escrito (vehículo nuevo).
  Cliente? duenoEncontrado;
  bool buscandoDueno = false;

  late String categoria;
  int? servicioId;
  bool autorizaMotor = false;
  int? colaboradorId;
  String medioPago = MediosPago.efectivo;
  final Set<String> marcas = {};
  String nota = '';

  /// Vehículo creado en un intento anterior que falló al registrar la orden.
  Vehiculo? _vehiculoCreado;

  bool enviando = false;
  String? error;
  Map<String, String> errores = const {};

  bool get vehiculoNuevo => !consulta.registrado;

  /// Soporte consulta clientes y vehículos, pero no los registra.
  bool get puedeRegistrarVehiculo => Roles.gestionaClientes(rol);

  Cliente? get dueno => consulta.dueno ?? duenoEncontrado;

  List<String> get categorias {
    final vistas = <String>{};
    return [
      for (final s in consulta.servicios)
        if (vistas.add(s.categoria)) s.categoria,
    ];
  }

  /// Servicios de la categoría elegida, disponibles para el tipo (R3).
  List<Servicio> get serviciosDeLaCategoria => [
    for (final s in consulta.servicios)
      if (s.categoria == categoria && (tipoVehiculo == null || s.disponiblePara(tipoVehiculo!))) s,
  ];

  Servicio? get servicio => consulta.servicios.where((s) => s.id == servicioId).firstOrNull;

  Colaborador? get colaborador => consulta.colaboradores.where((c) => c.id == colaboradorId).firstOrNull;

  /// Valor de la tarifa vigente. Es una guía: el valor lo calcula el servidor (R4).
  int? get valorEstimado => tipoVehiculo == null ? null : servicio?.tarifas[tipoVehiculo];

  /// R8: crédito solo si el dueño es una empresa activa con crédito.
  bool get puedePagarACredito => dueno?.puedePagarACredito ?? false;

  List<String> get mediosDisponibles => [
    for (final medio in MediosPago.todos)
      if (medio != MediosPago.credito || puedePagarACredito) medio,
  ];

  String get observaciones {
    final partes = [if (marcas.isNotEmpty) marcas.join(', '), if (nota.trim().isNotEmpty) nota.trim()];
    final texto = partes.join(' · ');
    return texto.length > Limites.observacionesMax ? texto.substring(0, Limites.observacionesMax) : texto;
  }

  bool get completo =>
      tipoVehiculo != null &&
      servicioId != null &&
      colaboradorId != null &&
      (!(servicio?.exigeAutorizacionMotor ?? false) || autorizaMotor) &&
      (!vehiculoNuevo || puedeRegistrarVehiculo);

  void elegirTipo(String tipo) {
    if (!vehiculoNuevo) {
      return;
    }
    tipoVehiculo = tipo;
    if (servicio != null && !servicio!.disponiblePara(tipo)) {
      servicioId = null;
    }
    _cambio('tipoVehiculo');
  }

  void elegirCategoria(String valor) {
    categoria = valor;
    notifyListeners();
  }

  void elegirServicio(int? id) {
    servicioId = servicioId == id ? null : id;
    autorizaMotor = false;
    _cambio('servicioId');
  }

  void cambiarAutorizaMotor(bool valor) {
    autorizaMotor = valor;
    _cambio('autorizaMotor');
  }

  void elegirColaborador(int id) {
    colaboradorId = id;
    _cambio('colaboradorId');
  }

  void elegirMedioPago(String medio) {
    medioPago = medio;
    _cambio('medioPago');
  }

  void alternarMarca(String marcaRecepcion) {
    if (!marcas.remove(marcaRecepcion)) {
      marcas.add(marcaRecepcion);
    }
    notifyListeners();
  }

  void cambiarTexto(String campo, String valor) {
    switch (campo) {
      case 'marca':
        marca = valor;
      case 'color':
        color = valor;
      case 'nombre':
        nombreDueno = valor;
      case 'telefono':
        telefonoDueno = valor;
      case 'nota':
        nota = valor;
    }
    _cambio(campo);
  }

  /// Escribir el documento busca si el dueño ya es cliente.
  Future<void> cambiarDocumento(Dependencias dependencias, String valor) async {
    documentoDueno = valor.trim();
    duenoEncontrado = null;
    _cambio('documento');
    if (documentoDueno.length < Limites.documentoMin || !_soloDigitos.hasMatch(documentoDueno)) {
      return;
    }
    final buscado = documentoDueno;
    buscandoDueno = true;
    notifyListeners();
    try {
      final cliente = await dependencias.clientes.buscarPorDocumento(buscado);
      if (buscado == documentoDueno) {
        duenoEncontrado = cliente;
      }
    } catch (_) {
      // Si no se pudo buscar, se registra como cliente nuevo y la API decide.
    } finally {
      buscandoDueno = false;
      notifyListeners();
    }
  }

  /// Errores de formato por campo; vacío si se puede enviar.
  Map<String, String> validar() {
    final errores = <String, String>{};
    if (vehiculoNuevo) {
      if (tipoVehiculo == null) {
        errores['tipoVehiculo'] = 'Elige el tipo de vehículo.';
      }
      for (final (campo, valor) in [('marca', marca), ('color', color)]) {
        final texto = valor.trim();
        if (texto.isNotEmpty && (texto.length < Limites.marcaColorMin || texto.length > Limites.marcaColorMax)) {
          errores[campo] = 'Entre ${Limites.marcaColorMin} y ${Limites.marcaColorMax} caracteres.';
        }
      }
      if (documentoDueno.length < Limites.documentoMin ||
          documentoDueno.length > Limites.documentoMax ||
          !_soloDigitos.hasMatch(documentoDueno)) {
        errores['documento'] = 'Documento de ${Limites.documentoMin} a ${Limites.documentoMax} dígitos.';
      }
      if (duenoEncontrado == null) {
        final nombre = nombreDueno.trim();
        if (nombre.length < Limites.nombreMin || nombre.length > Limites.nombreMax) {
          errores['nombre'] = 'Escribe el nombre del dueño.';
        }
        if (telefonoDueno.length != Limites.telefono || !_soloDigitos.hasMatch(telefonoDueno)) {
          errores['telefono'] = 'Celular de ${Limites.telefono} dígitos.';
        }
      }
    }
    if (servicioId == null) {
      errores['servicioId'] = 'Elige un servicio.';
    } else if (servicio!.exigeAutorizacionMotor && !autorizaMotor) {
      errores['autorizaMotor'] = 'El lavado de motor necesita la autorización del cliente.';
    }
    if (colaboradorId == null) {
      errores['colaboradorId'] = 'Elige quién atiende el vehículo.';
    }
    if (medioPago == MediosPago.credito && !puedePagarACredito) {
      errores['medioPago'] = 'Solo una empresa con crédito paga a crédito.';
    }
    return errores;
  }

  /// Registra el ingreso: dueño (si es nuevo), vehículo (si es nuevo) y la
  /// orden con el siguiente turno. Devuelve null si hay errores de formato o
  /// si la API lo rechazó (el mensaje queda en [error]).
  Future<IngresoRegistrado?> registrar(Dependencias dependencias) async {
    errores = validar();
    error = null;
    if (errores.isNotEmpty) {
      notifyListeners();
      return null;
    }
    enviando = true;
    notifyListeners();
    try {
      var vehiculo = consulta.vehiculo ?? _vehiculoCreado;
      var duenoFinal = dueno;
      if (vehiculo == null) {
        duenoFinal ??= await dependencias.clientes.crearParticular(
          nombre: nombreDueno.trim(),
          documento: documentoDueno,
          telefono: telefonoDueno,
        );
        duenoEncontrado = duenoFinal;
        vehiculo = await dependencias.vehiculos.crear(
          placa: consulta.placa,
          tipoVehiculo: tipoVehiculo!,
          clienteId: duenoFinal.id,
          marca: marca,
          color: color,
        );
        _vehiculoCreado = vehiculo;
      }
      final orden = await dependencias.ordenes.registrar(
        jornada.id,
        NuevaOrden(
          vehiculoId: vehiculo.id,
          servicioId: servicioId!,
          colaboradorId: colaboradorId!,
          medioPago: medioPago,
          clienteId: medioPago == MediosPago.credito ? duenoFinal?.id : null,
          autorizaMotor: autorizaMotor,
          observaciones: observaciones,
        ),
      );
      return IngresoRegistrado(orden: orden, vehiculo: vehiculo, servicio: servicio!, colaborador: colaborador!);
    } on ApiExcepcion catch (fallo) {
      error = fallo.mensaje;
      errores = fallo.erroresPorCampo;
      return null;
    } catch (fallo) {
      error = fallo.toString();
      return null;
    } finally {
      enviando = false;
      notifyListeners();
    }
  }

  void _cambio(String campo) {
    if (errores.containsKey(campo)) {
      errores = {...errores}..remove(campo);
    }
    notifyListeners();
  }
}
