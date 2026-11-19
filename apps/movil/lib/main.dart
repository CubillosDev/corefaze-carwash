import 'package:flutter/material.dart';

import 'app/app.dart';
import 'app/dependencias.dart';
import 'app/tema.dart';
import 'core/config/entorno.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  final faltantes = Entorno.faltantes;
  if (faltantes.isNotEmpty) {
    runApp(_SinConfiguracion(faltantes));
    return;
  }
  runApp(
    CorefazeApp(
      dependencias: Dependencias(apiUrl: Entorno.apiUrl, apiKey: Entorno.apiKey),
    ),
  );
}

/// Si la app se compiló sin API_URL o API_KEY, lo dice en vez de fallar.
class _SinConfiguracion extends StatelessWidget {
  const _SinConfiguracion(this.faltantes);

  final List<String> faltantes;

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      theme: crearTema(),
      home: Scaffold(
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Text(
              'Falta configurar ${faltantes.join(' y ')}.\n'
              'Compila con --dart-define-from-file=config/desarrollo.json.',
              textAlign: TextAlign.center,
              style: estilo(14, color: Colores.blanco, altura: 1.5),
            ),
          ),
        ),
      ),
    );
  }
}
