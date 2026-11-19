/// Reglas del dominio que usa la app, copiadas de
/// packages/contratos/dominio.json (una prueba verifica que coincidan). La API
/// vuelve a validar todo: esto solo guía a quien registra.
abstract final class EstadosOrden {
  static const registrada = 'registrada';
  static const enProceso = 'en_proceso';
  static const terminada = 'terminada';
  static const entregada = 'entregada';
  static const cancelada = 'cancelada';

  static const todos = [registrada, enProceso, terminada, entregada, cancelada];

  /// Fases del patio, en orden: las que se ven y se mueven desde la app.
  static const fasesDelPatio = [registrada, enProceso, terminada];
}

/// A qué estados puede pasar una orden (`transicionesOrden` del contrato). Por
/// ahora una orden abierta puede volver una sola fase (ADR 0010); entregada y
/// cancelada no cambian (R10).
const transicionesOrden = {
  EstadosOrden.registrada: [EstadosOrden.enProceso, EstadosOrden.cancelada],
  EstadosOrden.enProceso: [EstadosOrden.terminada, EstadosOrden.registrada, EstadosOrden.cancelada],
  EstadosOrden.terminada: [EstadosOrden.entregada, EstadosOrden.enProceso],
  EstadosOrden.entregada: <String>[],
  EstadosOrden.cancelada: <String>[],
};

abstract final class MediosPago {
  static const efectivo = 'efectivo';
  static const nequi = 'nequi';
  static const daviplata = 'daviplata';
  static const bancolombia = 'bancolombia';
  static const datafono = 'datafono';
  static const credito = 'credito';

  static const todos = [efectivo, nequi, daviplata, bancolombia, datafono, credito];
}

abstract final class TiposVehiculo {
  static const automovil = 'automovil';
  static const camioneta = 'camioneta';
  static const platon = 'platon_7_pasajeros';
  static const motoHasta150 = 'moto_hasta_150cc';
  static const motoDesde150 = 'moto_desde_150cc';

  static const todos = [automovil, camioneta, platon, motoHasta150, motoDesde150];
  static const motos = [motoHasta150, motoDesde150];
}

abstract final class EstadosJornada {
  static const abierta = 'abierta';
  static const cerrada = 'cerrada';
}

abstract final class Roles {
  static const superadmin = 'superadmin';
  static const administrador = 'administrador';
  static const soporte = 'soporte';
  static const pendiente = 'pendiente';

  static const todos = [superadmin, administrador, soporte, pendiente];

  /// Registrar clientes y vehículos es de superadmin y administrador; soporte
  /// solo los consulta (la API le responde 403).
  static bool gestionaClientes(String rol) => rol == superadmin || rol == administrador;

  /// Anular (cancelar) una orden es de superadmin y administrador; soporte
  /// solo cambia la fase (la API le responde 403).
  static bool puedeCancelarOrdenes(String rol) => rol == superadmin || rol == administrador;
}

/// Servicios de lavado de motor: exigen la autorización del cliente (R7).
const serviciosConLavadoMotor = [5, 6, 7, 8];

/// Placa de carro (ABC123) y de moto (ABC12D).
final patronPlacaCarro = RegExp(r'^[A-Z]{3}[0-9]{3}$');
final patronPlacaMoto = RegExp(r'^[A-Z]{3}[0-9]{2}[A-Z]$');

abstract final class Limites {
  static const nombreMin = 3;
  static const nombreMax = 100;
  static const telefono = 10;
  static const documentoMin = 6;
  static const documentoMax = 15;
  static const observacionesMax = 255;
  static const marcaColorMin = 2;
  static const marcaColorMax = 30;
}
