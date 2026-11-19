import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../core/constants/dominio.dart';
import '../features/autenticacion/presentation/screens/ingreso_screen.dart';
import '../features/autenticacion/presentation/screens/pendiente_screen.dart';
import '../features/ordenes_lavado/presentation/screens/ordenes_lavado_screen.dart';
import 'dependencias.dart';
import 'tema.dart';

class CorefazeApp extends StatelessWidget {
  const CorefazeApp({super.key, required this.dependencias});

  final Dependencias dependencias;

  @override
  Widget build(BuildContext context) {
    return ProveedorDependencias(
      dependencias: dependencias,
      child: AnnotatedRegion<SystemUiOverlayStyle>(
        value: SystemUiOverlayStyle.light.copyWith(statusBarColor: Colors.transparent),
        child: MaterialApp(
          title: 'Corefaze CarWash',
          debugShowCheckedModeBanner: false,
          theme: crearTema(),
          locale: const Locale('es', 'CO'),
          home: const _PuertaDeSesion(),
        ),
      ),
    );
  }
}

/// Muestra el ingreso, la cuenta pendiente o la recepción según la sesión. Al
/// cerrar la sesión (o si vence) vuelve al ingreso desde cualquier pantalla.
class _PuertaDeSesion extends StatefulWidget {
  const _PuertaDeSesion();

  @override
  State<_PuertaDeSesion> createState() => _PuertaDeSesionState();
}

class _PuertaDeSesionState extends State<_PuertaDeSesion> {
  int? _usuarioAnterior;

  @override
  void initState() {
    super.initState();
    Dependencias.leer(context).sesion.restaurar();
  }

  @override
  Widget build(BuildContext context) {
    final sesion = Dependencias.de(context).sesion;
    return ListenableBuilder(
      listenable: sesion,
      builder: (context, _) {
        final usuario = sesion.usuario;
        if (usuario?.id != _usuarioAnterior) {
          _usuarioAnterior = usuario?.id;
          WidgetsBinding.instance.addPostFrameCallback((_) {
            if (mounted) {
              Navigator.of(context).popUntil((ruta) => ruta.isFirst);
            }
          });
        }
        if (sesion.restaurando) {
          return const Scaffold(
            body: Center(child: CircularProgressIndicator(color: Colores.blanco)),
          );
        }
        if (usuario == null) {
          return const IngresoScreen();
        }
        if (usuario.rol == Roles.pendiente) {
          return const PendienteScreen();
        }
        return const OrdenesLavadoScreen();
      },
    );
  }
}
