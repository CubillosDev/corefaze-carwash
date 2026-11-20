import 'dart:convert';

import 'package:corefaze_movil/app/dependencias.dart';
import 'package:corefaze_movil/core/constants/dominio.dart';
import 'package:corefaze_movil/features/autenticacion/data/repositories/almacen_sesion.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

/// API de Corefaze en memoria para las pruebas: responde las rutas que usa la
/// app con datos ficticios y guarda cada solicitud para revisarla.
class ApiFalsa {
  ApiFalsa({this.jornadaAbierta = true, this.rol = 'administrador'});

  bool jornadaAbierta;

  /// Rol de quien ingresa.
  final String rol;

  /// Si es true, los cambios de estado responden 409 (otro equipo ya la movió).
  bool rechazarCambiosDeEstado = false;
  final solicitudes = <http.Request>[];

  /// Turnos que responden 409 la primera vez (otro equipo los tomó).
  final turnosOcupados = <int>{};

  final vehiculos = <Map<String, Object?>>[
    {'id': 1, 'placa': 'ABC123', 'tipoVehiculo': 'automovil', 'marca': 'Mazda', 'color': 'Gris', 'clienteId': 10},
  ];
  final clientes = <Map<String, Object?>>[
    {
      'id': 10,
      'nombre': 'Cliente Prueba',
      'documento': '1000000001',
      'tipo': 'particular',
      'telefono': '3000000001',
      'creditoHabilitado': false,
      'estado': 'activo',
    },
  ];
  final ordenes = <Map<String, Object?>>[
    {
      'id': 100,
      'jornadaId': 5,
      'fecha': '2026-11-18',
      'turno': 1,
      'vehiculoId': 1,
      'servicioId': 1,
      'colaboradorId': 7,
      'valor': 22000,
      'medioPago': 'efectivo',
      'estado': 'entregada',
      'creadaEn': '2026-11-18T14:00:00Z',
    },
  ];

  static const servicios = [
    {
      'id': 1,
      'numero': 1,
      'nombre': 'Lavado simple',
      'descripcion': 'Exterior',
      'categoria': 'lavado',
      'activo': true,
      'tarifas': [
        {'tipoVehiculo': 'automovil', 'valor': 22000},
        {'tipoVehiculo': 'moto_hasta_150cc', 'valor': 12000},
      ],
    },
    {
      'id': 5,
      'numero': 5,
      'nombre': 'Lavado con motor',
      'descripcion': null,
      'categoria': 'lavado',
      'activo': true,
      'tarifas': [
        {'tipoVehiculo': 'automovil', 'valor': 45000},
      ],
    },
    {
      'id': 12,
      'numero': 12,
      'nombre': 'Tapicería completa',
      'descripcion': null,
      'categoria': 'tapiceria',
      'activo': true,
      'tarifas': [
        {'tipoVehiculo': 'automovil', 'valor': 90000},
      ],
    },
  ];

  static const colaboradores = [
    {'id': 7, 'codigo': 405, 'nombre': 'Colaborador Uno', 'estado': 'activo'},
    {'id': 8, 'codigo': 412, 'nombre': 'Colaborador Dos', 'estado': 'activo'},
    {'id': 9, 'codigo': 499, 'nombre': 'Colaborador Inactivo', 'estado': 'inactivo'},
  ];

  /// Cuerpos JSON de las solicitudes a una ruta y método.
  List<Map<String, dynamic>> cuerpos(String metodo, String ruta) => [
    for (final s in solicitudes)
      if (s.method == metodo && s.url.path.endsWith(ruta)) jsonDecode(s.body) as Map<String, dynamic>,
  ];

  late final cliente = MockClient((solicitud) async {
    solicitudes.add(solicitud);
    if (solicitud.headers['X-API-Key'] != 'llave-de-prueba') {
      return _json(401, {'mensaje': 'API Key inválida'});
    }
    final ruta = solicitud.url.path.replaceFirst('/api/', '');
    final cuerpo = solicitud.body.isEmpty ? <String, dynamic>{} : jsonDecode(solicitud.body) as Map<String, dynamic>;
    return switch ((solicitud.method, ruta)) {
      ('POST', 'auth/login') =>
        cuerpo['password'] == 'clave-correcta'
            ? _json(200, {
                'usuario': {'id': 1, 'nombre': 'Ana Prueba', 'email': cuerpo['email'], 'rol': rol},
                'token': 'token.de.prueba',
              })
            : _json(401, {'mensaje': 'Credenciales inválidas'}),
      ('GET', 'jornadas') => _json(200, {
        'jornadas': [
          {
            'id': 6,
            'fecha': '2026-11-19',
            'estado': jornadaAbierta ? 'abierta' : 'cerrada',
            'abiertaEn': '2026-11-19T12:00:00Z',
          },
        ],
      }),
      ('POST', 'jornadas/qr/canje') => _abrirJornada(),
      ('POST', 'jornadas') => _abrirJornada(),
      ('GET', 'servicios') => _json(200, {'servicios': servicios}),
      ('GET', 'colaboradores') => _json(200, {'colaboradores': colaboradores}),
      ('GET', 'vehiculos') => _json(200, {'vehiculos': vehiculos}),
      ('POST', 'vehiculos') => _crear(vehiculos, cuerpo, 'vehiculo', 200),
      ('GET', 'clientes') => _json(200, {'clientes': clientes}),
      ('POST', 'clientes') => _crear(
        clientes,
        {...cuerpo, 'creditoHabilitado': false, 'estado': 'activo'},
        'cliente',
        300,
      ),
      ('GET', 'ordenes-lavado') => _json(200, {
        'ordenes': [
          for (final o in ordenes)
            if (solicitud.url.queryParameters['jornadaId'] == null ||
                '${o['jornadaId']}' == solicitud.url.queryParameters['jornadaId'])
              o,
        ],
      }),
      ('POST', 'ordenes-lavado') => _registrarOrden(cuerpo),
      ('PATCH', final ruta) when RegExp(r'^ordenes-lavado/\d+/estado$').hasMatch(ruta) => _cambiarEstado(
        int.parse(ruta.split('/')[1]),
        cuerpo,
      ),
      ('GET', final ruta) when ruta.startsWith('clientes/') => _json(200, {
        'cliente': clientes.firstWhere((c) => '${c['id']}' == ruta.split('/').last),
      }),
      _ => _json(404, {'mensaje': 'Ruta no encontrada'}),
    };
  });

  http.Response _abrirJornada() {
    jornadaAbierta = true;
    return _json(201, {
      'jornada': {'id': 6, 'fecha': '2026-11-19', 'estado': 'abierta'},
    });
  }

  http.Response _crear(List<Map<String, Object?>> lista, Map<String, dynamic> datos, String clave, int base) {
    final nuevo = {...datos, 'id': base + lista.length};
    lista.add(nuevo);
    return _json(201, {clave: nuevo});
  }

  http.Response _registrarOrden(Map<String, dynamic> datos) {
    final turno = datos['turno'] as int;
    if (turnosOcupados.remove(turno)) {
      ordenes.add({...ordenes.last, 'id': 900 + turno, 'jornadaId': 6, 'turno': turno, 'estado': 'registrada'});
      return _json(409, {'mensaje': 'El turno ya está ocupado para esa fecha'});
    }
    final tarifas = servicios.firstWhere((s) => s['id'] == datos['servicioId'])['tarifas']! as List;
    final nueva = {
      ...datos,
      'id': 500 + ordenes.length,
      'jornadaId': 6,
      'fecha': '2026-11-19',
      'valor': (tarifas.first as Map)['valor'],
      'estado': 'registrada',
      'creadaEn': '2026-11-19T15:30:00Z',
    };
    ordenes.add(nueva);
    return _json(201, {'orden': nueva});
  }

  /// Las mismas reglas de la API: transiciones del contrato (R9), orden
  /// cerrada (R10), motivo obligatorio y anular solo para administración.
  http.Response _cambiarEstado(int id, Map<String, dynamic> datos) {
    final orden = ordenes.firstWhere((o) => o['id'] == id);
    final destino = datos['estado'] as String;
    if (destino == EstadosOrden.cancelada && rol == Roles.soporte) {
      return _json(403, {'mensaje': 'Solo superadmin o administrador pueden anular una orden'});
    }
    if (destino == EstadosOrden.cancelada && (datos['motivo'] as String? ?? '').isEmpty) {
      return _json(400, {'mensaje': 'El motivo es obligatorio para cancelar una orden'});
    }
    if (rechazarCambiosDeEstado || !transicionesOrden[orden['estado']]!.contains(destino)) {
      return _json(409, {'mensaje': 'No se puede pasar de ${orden['estado']} a $destino'});
    }
    orden['estado'] = destino;
    return _json(200, {'orden': orden});
  }

  static http.Response _json(int estado, Object cuerpo) =>
      http.Response(jsonEncode(cuerpo), estado, headers: {'content-type': 'application/json; charset=utf-8'});

  /// Dependencias de la app apuntando a esta API falsa.
  Dependencias dependencias() => Dependencias(
    apiUrl: 'http://api.prueba/api',
    apiKey: 'llave-de-prueba',
    cliente: cliente,
    almacen: AlmacenEnMemoria(),
  );
}
