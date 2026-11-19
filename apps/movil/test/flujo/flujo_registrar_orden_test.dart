import 'package:flutter_test/flutter_test.dart';

import 'flujo_registrar_orden.dart';

void main() {
  testWidgets('registra un ingreso de principio a fin sin enviar valor ni estado', (tester) async {
    final api = await recorrerRegistroDeOrden(tester);

    final orden = api.cuerpos('POST', 'ordenes-lavado').single;
    expect(orden.keys, isNot(contains('valor')));
    expect(orden.keys, isNot(contains('estado')));
    expect(orden['servicioId'], 1);
    expect(orden['colaboradorId'], 7);
  });

  testWidgets('al volver al inicio, la recepción ya muestra el vehículo registrado', (tester) async {
    await recorrerRegistroDeOrden(tester);

    await tester.tap(find.text('Volver al inicio'));
    await tester.pumpAndSettle();

    expect(find.text('Recepción'), findsOneWidget);
    expect(find.bySemanticsLabel(RegExp(r'^ABC 123, Lavado simple, Registrada,')), findsOneWidget);
  });
}
