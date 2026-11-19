import 'package:corefaze_movil/app/app.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import '../apoyo/api_falsa.dart';

/// Recorrido completo de la recepción contra la API falsa: ingresar, abrir el
/// registro, escribir la placa, ver la consulta, elegir servicio y
/// colaborador, y registrar. Lo usan la prueba de widgets y la de integración.
Future<ApiFalsa> recorrerRegistroDeOrden(WidgetTester tester) async {
  tester.view
    ..physicalSize = const Size(402, 874) * 3
    ..devicePixelRatio = 3;
  addTearDown(tester.view.reset);

  final api = ApiFalsa();
  await tester.pumpWidget(CorefazeApp(dependencias: api.dependencias()));
  await tester.pumpAndSettle();

  await tester.enterText(find.widgetWithText(TextField, 'nombre@empresa.com'), 'ana@prueba.co');
  await tester.enterText(find.byType(TextField).last, 'clave-correcta');
  await tester.tap(find.text('Ingresar'));
  await tester.pumpAndSettle();

  expect(find.text('Recepción'), findsOneWidget);
  expect(find.bySemanticsLabel('Jornada abierta'), findsOneWidget);

  await tester.tap(find.text('Registrar ingreso'));
  await tester.pumpAndSettle();
  await tester.enterText(find.byType(TextField), 'abc123');
  await tester.pump();
  expect(find.text('Placa válida'), findsOneWidget);

  await tester.tap(find.text('Buscar en Corefaze'));
  await tester.pump();
  await tester.pump(const Duration(milliseconds: 400));
  expect(find.text('Buscando en Corefaze'), findsOneWidget);
  await tester.pump(const Duration(seconds: 3));
  await tester.pumpAndSettle();

  expect(find.text('Nuevo ingreso'), findsOneWidget);
  expect(find.text('Cliente Prueba'), findsOneWidget);

  await tester.tap(find.bySemanticsLabel(RegExp(r'^1, Lavado simple')));
  await tester.pump();
  await tester.scrollUntilVisible(find.text('405'), 200, scrollable: find.byType(Scrollable).first);
  await tester.tap(find.text('405'));
  await tester.pump();
  await tester.tap(find.text('Ingresar al patio'));
  await tester.pumpAndSettle();

  expect(find.text('Vehículo ingresado'), findsOneWidget);
  expect(find.text('Turno #1'), findsOneWidget);
  return api;
}
