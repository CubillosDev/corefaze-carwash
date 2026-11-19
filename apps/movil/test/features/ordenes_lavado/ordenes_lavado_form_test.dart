import 'package:corefaze_movil/features/jornadas/data/models/jornada.dart';
import 'package:corefaze_movil/features/ordenes_lavado/presentation/controllers/consulta_placa.dart';
import 'package:corefaze_movil/features/ordenes_lavado/presentation/controllers/ordenes_lavado_form.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../apoyo/api_falsa.dart';

const _jornada = Jornada(id: 6, fecha: '2026-11-19', estado: 'abierta', abiertaEn: null);

void main() {
  test('la consulta encuentra el vehículo, su dueño, su historial y su servicio habitual', () async {
    final api = ApiFalsa();
    final pasos = <PasoConsulta>[];

    final consulta = await consultarPlaca(api.dependencias(), 'ABC123', alTerminarPaso: (paso, _) => pasos.add(paso));

    expect(pasos, PasoConsulta.values);
    expect(consulta.vehiculo?.marca, 'Mazda');
    expect(consulta.dueno?.nombre, 'Cliente Prueba');
    expect(consulta.visitas, 1);
    expect(consulta.ultimoServicio, 'Lavado simple');
    expect(consulta.servicioHabitualId, 1);
    expect(consulta.colaboradores.map((c) => c.codigo), [405, 412], reason: 'solo los activos (R2)');
  });

  test('un vehículo registrado: registra la orden sin valor ni estado, con el siguiente turno', () async {
    final api = ApiFalsa();
    final dependencias = api.dependencias();
    final form =
        NuevaOrdenForm(consulta: await consultarPlaca(dependencias, 'ABC123'), jornada: _jornada, rol: 'soporte')
          ..elegirServicio(1)
          ..elegirColaborador(7)
          ..alternarMarca('Rayones')
          ..cambiarTexto('nota', 'Trae silla de bebé');

    expect(form.valorEstimado, 22000);
    final registrado = await form.registrar(dependencias);

    expect(registrado?.orden.valor, 22000);
    final enviada = api.cuerpos('POST', 'ordenes-lavado').single;
    expect(enviada, {
      'turno': 1,
      'vehiculoId': 1,
      'servicioId': 1,
      'colaboradorId': 7,
      'medioPago': 'efectivo',
      'observaciones': 'Rayones · Trae silla de bebé',
    });
    expect(api.cuerpos('POST', 'vehiculos'), isEmpty);
  });

  test('un vehículo nuevo: crea el dueño, luego el vehículo y luego la orden', () async {
    final api = ApiFalsa();
    final dependencias = api.dependencias();
    final form = NuevaOrdenForm(
      consulta: await consultarPlaca(dependencias, 'XYZ98K'),
      jornada: _jornada,
      rol: 'administrador',
    );

    expect(
      form.validar().keys,
      containsAll(['tipoVehiculo', 'documento', 'nombre', 'telefono', 'servicioId', 'colaboradorId']),
    );

    form
      ..elegirTipo('moto_hasta_150cc')
      ..cambiarTexto('marca', 'Yamaha')
      ..cambiarTexto('nombre', 'Dueño Nuevo')
      ..cambiarTexto('telefono', '3001112233')
      ..elegirServicio(1)
      ..elegirColaborador(8);
    await form.cambiarDocumento(dependencias, '1234567890');
    final registrado = await form.registrar(dependencias);

    expect(registrado, isNotNull);
    expect(api.cuerpos('POST', 'clientes').single, {
      'nombre': 'Dueño Nuevo',
      'documento': '1234567890',
      'telefono': '3001112233',
      'tipo': 'particular',
    });
    expect(api.cuerpos('POST', 'vehiculos').single, {
      'placa': 'XYZ98K',
      'tipoVehiculo': 'moto_hasta_150cc',
      'clienteId': 301,
      'marca': 'Yamaha',
    });
    expect(api.cuerpos('POST', 'ordenes-lavado').single['vehiculoId'], 201);
  });

  test('si el documento ya es de un cliente, no lo vuelve a crear', () async {
    final api = ApiFalsa();
    final dependencias = api.dependencias();
    final form =
        NuevaOrdenForm(consulta: await consultarPlaca(dependencias, 'XYZ987'), jornada: _jornada, rol: 'superadmin')
          ..elegirTipo('automovil')
          ..elegirServicio(1)
          ..elegirColaborador(7);
    await form.cambiarDocumento(dependencias, '1000000001');

    expect(form.duenoEncontrado?.nombre, 'Cliente Prueba');
    expect(await form.registrar(dependencias), isNotNull);
    expect(api.cuerpos('POST', 'clientes'), isEmpty);
    expect(api.cuerpos('POST', 'vehiculos').single['clienteId'], 10);
  });

  test('R7: el lavado de motor exige la autorización del cliente', () async {
    final dependencias = ApiFalsa().dependencias();
    final form =
        NuevaOrdenForm(consulta: await consultarPlaca(dependencias, 'ABC123'), jornada: _jornada, rol: 'soporte')
          ..elegirServicio(5)
          ..elegirColaborador(7);

    expect(form.completo, isFalse);
    expect(form.validar()['autorizaMotor'], isNotNull);
    form.cambiarAutorizaMotor(true);
    expect(form.completo, isTrue);
  });

  test('R8: el crédito solo aparece si el dueño es una empresa con crédito', () async {
    final dependencias = ApiFalsa().dependencias();
    final form = NuevaOrdenForm(
      consulta: await consultarPlaca(dependencias, 'ABC123'),
      jornada: _jornada,
      rol: 'soporte',
    );

    expect(form.mediosDisponibles, isNot(contains('credito')));
  });

  test('soporte no puede registrar un vehículo nuevo', () async {
    final dependencias = ApiFalsa().dependencias();
    final form =
        NuevaOrdenForm(consulta: await consultarPlaca(dependencias, 'XYZ987'), jornada: _jornada, rol: 'soporte')
          ..elegirTipo('automovil')
          ..elegirServicio(1)
          ..elegirColaborador(7);

    expect(form.puedeRegistrarVehiculo, isFalse);
    expect(form.completo, isFalse);
  });

  test('R5: si otro equipo tomó el turno, pide el siguiente', () async {
    final api = ApiFalsa()..turnosOcupados.add(1);
    final dependencias = api.dependencias();
    final form =
        NuevaOrdenForm(consulta: await consultarPlaca(dependencias, 'ABC123'), jornada: _jornada, rol: 'soporte')
          ..elegirServicio(1)
          ..elegirColaborador(7);

    final registrado = await form.registrar(dependencias);

    expect(api.cuerpos('POST', 'ordenes-lavado').map((c) => c['turno']), [1, 2]);
    expect(registrado?.orden.turno, 2);
  });
}
