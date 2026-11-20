import 'package:corefaze_movil/app/app.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../apoyo/api_falsa.dart';

/// API falsa con dos órdenes en la jornada abierta: ABC 123 registrada y
/// XYZ 98A terminada.
ApiFalsa apiConOrdenesDelDia({String rol = 'administrador'}) {
  final api = ApiFalsa(rol: rol);
  api.vehiculos.add({
    'id': 2,
    'placa': 'XYZ98A',
    'tipoVehiculo': 'moto_hasta_150cc',
    'marca': 'Yamaha',
    'color': 'Negro',
    'clienteId': 10,
  });
  api.ordenes.addAll([
    {
      'id': 201,
      'jornadaId': 6,
      'fecha': '2026-11-19',
      'turno': 1,
      'vehiculoId': 1,
      'servicioId': 1,
      'colaboradorId': 7,
      'valor': 22000,
      'medioPago': 'efectivo',
      'estado': 'registrada',
      'observaciones': 'Rayón en la puerta',
      'creadaEn': '2026-11-19T13:00:00Z',
    },
    {
      'id': 202,
      'jornadaId': 6,
      'fecha': '2026-11-19',
      'turno': 2,
      'vehiculoId': 2,
      'servicioId': 1,
      'colaboradorId': 8,
      'valor': 12000,
      'medioPago': 'nequi',
      'estado': 'terminada',
      'creadaEn': '2026-11-19T13:30:00Z',
    },
  ]);
  return api;
}

Future<void> ingresar(WidgetTester tester, ApiFalsa api) async {
  tester.view
    ..physicalSize = const Size(402, 874) * 3
    ..devicePixelRatio = 3;
  addTearDown(tester.view.reset);
  await tester.pumpWidget(CorefazeApp(dependencias: api.dependencias()));
  await tester.pumpAndSettle();
  await tester.enterText(find.widgetWithText(TextField, 'nombre@empresa.com'), 'ana@prueba.co');
  await tester.enterText(find.byType(TextField).last, 'clave-correcta');
  await tester.tap(find.text('Ingresar'));
  await tester.pumpAndSettle();
}

Future<void> abrirOrden(WidgetTester tester, String placa) async {
  await tester.tap(find.bySemanticsLabel(RegExp('^$placa,')));
  await tester.pumpAndSettle();
}

Finder estadoDe(String placa, String estado) => find.bySemanticsLabel(RegExp('^$placa, .*, $estado,'));

void main() {
  testWidgets('muestra el detalle y pasa una orden a la fase siguiente', (tester) async {
    final api = apiConOrdenesDelDia();
    await ingresar(tester, api);

    await abrirOrden(tester, 'ABC 123');
    expect(find.text('405 · Colaborador Uno'), findsOneWidget);
    expect(find.text(r'$ 22.000'), findsOneWidget);
    expect(find.text('Rayón en la puerta'), findsOneWidget);
    expect(find.text('Devolver a Registrada'), findsNothing);

    await tester.tap(find.text('Pasar a En proceso'));
    await tester.pumpAndSettle();

    expect(api.cuerpos('PATCH', 'ordenes-lavado/201/estado').single, {'estado': 'en_proceso'});
    expect(find.text('ABC 123 pasó a En proceso.'), findsOneWidget);
    expect(estadoDe('ABC 123', 'En proceso'), findsOneWidget);
  });

  testWidgets('devuelve una orden a la fase anterior', (tester) async {
    final api = apiConOrdenesDelDia();
    api.ordenes.firstWhere((o) => o['id'] == 201)['estado'] = 'en_proceso';
    await ingresar(tester, api);

    await abrirOrden(tester, 'ABC 123');
    expect(find.text('Pasar a Terminada'), findsOneWidget);
    await tester.tap(find.text('Devolver a Registrada'));
    await tester.pumpAndSettle();

    expect(api.cuerpos('PATCH', 'ordenes-lavado/201/estado').single, {'estado': 'registrada'});
    expect(find.text('ABC 123 volvió a Registrada.'), findsOneWidget);
    expect(estadoDe('ABC 123', 'Registrada'), findsOneWidget);
  });

  testWidgets('una orden terminada se entrega en caja, no desde la app', (tester) async {
    await ingresar(tester, apiConOrdenesDelDia());

    await abrirOrden(tester, 'XYZ 98A');
    expect(find.text('Se entrega al cobrarla en la caja del panel.'), findsOneWidget);
    expect(find.text('Devolver a En proceso'), findsOneWidget);
    expect(find.textContaining('Entregada'), findsNothing);
    expect(find.text('Cancelar orden'), findsNothing);
  });

  testWidgets('cancelar exige el motivo y lo envía', (tester) async {
    final api = apiConOrdenesDelDia();
    await ingresar(tester, api);

    await abrirOrden(tester, 'ABC 123');
    await tester.tap(find.text('Cancelar orden'));
    await tester.pumpAndSettle();

    final confirmar = find.widgetWithText(TextButton, 'Cancelar orden').last;
    expect(tester.widget<TextButton>(confirmar).onPressed, isNull);

    await tester.enterText(find.widgetWithText(TextField, 'Ej.: el cliente se retiró'), 'El cliente se retiró');
    await tester.pump();
    await tester.tap(confirmar);
    await tester.pumpAndSettle();

    expect(api.cuerpos('PATCH', 'ordenes-lavado/201/estado').single, {
      'estado': 'cancelada',
      'motivo': 'El cliente se retiró',
    });
    expect(find.text('La orden de ABC 123 quedó cancelada.'), findsOneWidget);
  });

  testWidgets('soporte cambia la fase pero no ve "Cancelar orden"', (tester) async {
    await ingresar(tester, apiConOrdenesDelDia(rol: 'soporte'));

    await abrirOrden(tester, 'ABC 123');
    expect(find.text('Pasar a En proceso'), findsOneWidget);
    expect(find.text('Cancelar orden'), findsNothing);
  });

  testWidgets('si la API rechaza el cambio, lo dice en la hoja y no cierra', (tester) async {
    final api = apiConOrdenesDelDia()..rechazarCambiosDeEstado = true;
    await ingresar(tester, api);

    await abrirOrden(tester, 'ABC 123');
    await tester.tap(find.text('Pasar a En proceso'));
    await tester.pumpAndSettle();

    expect(find.text('No se puede pasar de registrada a en_proceso'), findsOneWidget);
    expect(find.text('Pasar a En proceso'), findsOneWidget);
  });

  testWidgets('filtra las órdenes del día por fase', (tester) async {
    await ingresar(tester, apiConOrdenesDelDia());

    expect(find.text('Todas'), findsOneWidget);
    await tester.ensureVisible(find.text('Terminada 1'));
    await tester.tap(find.text('Terminada 1'));
    await tester.pumpAndSettle();

    expect(find.bySemanticsLabel(RegExp('^XYZ 98A,')), findsOneWidget);
    expect(find.bySemanticsLabel(RegExp('^ABC 123,')), findsNothing);

    await tester.ensureVisible(find.text('En proceso 0'));
    await tester.tap(find.text('En proceso 0'));
    await tester.pumpAndSettle();
    expect(find.text('No hay órdenes en esta fase.'), findsOneWidget);
  });
}
