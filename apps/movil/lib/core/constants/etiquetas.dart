import 'package:flutter/painting.dart';

import '../../app/tema.dart';
import 'dominio.dart';

/// Textos para mostrar los valores del dominio, los mismos del panel web.
const _estadosOrden = {
  EstadosOrden.registrada: 'Registrada',
  EstadosOrden.enProceso: 'En proceso',
  EstadosOrden.terminada: 'Terminada',
  EstadosOrden.entregada: 'Entregada',
  EstadosOrden.cancelada: 'Cancelada',
};

const _coloresEstadoOrden = {
  EstadosOrden.registrada: Colores.advertenciaSolido,
  EstadosOrden.enProceso: Colores.primario,
  EstadosOrden.terminada: Colores.exitoSolido,
  EstadosOrden.entregada: Colores.textoEtiqueta,
  EstadosOrden.cancelada: Colores.error,
};

const _mediosPago = {
  MediosPago.efectivo: 'Efectivo',
  MediosPago.nequi: 'Nequi',
  MediosPago.daviplata: 'Daviplata',
  MediosPago.bancolombia: 'Bancolombia',
  MediosPago.datafono: 'Datáfono',
  MediosPago.credito: 'Crédito',
};

const _tiposVehiculo = {
  TiposVehiculo.automovil: 'Automóvil',
  TiposVehiculo.camioneta: 'Camioneta',
  TiposVehiculo.platon: 'Platón / 7 pas.',
  TiposVehiculo.motoHasta150: 'Moto hasta 150 cc',
  TiposVehiculo.motoDesde150: 'Moto de 150 cc o más',
};

const _roles = {
  Roles.superadmin: 'Superadmin',
  Roles.administrador: 'Admin',
  Roles.soporte: 'Soporte',
  Roles.pendiente: 'Pendiente',
};

String etiquetaEstadoOrden(String estado) => _estadosOrden[estado] ?? estado;

Color colorEstadoOrden(String estado) => _coloresEstadoOrden[estado] ?? Colores.textoEtiqueta;

String etiquetaMedioPago(String medio) => _mediosPago[medio] ?? medio;

String etiquetaTipoVehiculo(String tipo) => _tiposVehiculo[tipo] ?? tipo;

String etiquetaRol(String rol) => _roles[rol] ?? rol;

/// Categorías conocidas con su tilde.
const _categorias = {'tapiceria': 'Tapicería', 'lavado': 'Lavado', 'motos': 'Motos'};

/// La categoría de un servicio es texto libre de la API ("lavado"): se muestra
/// con mayúscula inicial.
String etiquetaCategoria(String categoria) {
  final conocida = _categorias[categoria.trim().toLowerCase()];
  if (conocida != null) {
    return conocida;
  }
  final texto = categoria.trim().replaceAll('_', ' ');
  return texto.isEmpty ? 'Otros' : texto[0].toUpperCase() + texto.substring(1);
}
