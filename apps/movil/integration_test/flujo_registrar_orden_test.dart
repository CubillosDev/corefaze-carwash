import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';

import '../test/flujo/flujo_registrar_orden.dart';

/// El mismo recorrido de la prueba de widgets, en un dispositivo real:
///
///   `flutter test integration_test -d DISPOSITIVO`
void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  testWidgets('registra un ingreso de principio a fin', (tester) async {
    await recorrerRegistroDeOrden(tester);
  });
}
