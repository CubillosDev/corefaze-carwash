import 'package:flutter/material.dart';

import '../../../../app/dependencias.dart';
import '../../../../app/tema.dart';
import '../../../../core/widgets/boton_primario.dart';
import '../../../../core/widgets/piezas.dart';
import '../widgets/encabezado_marca.dart';

/// Cuenta con rol pendiente: existe, pero aún no tiene acceso.
class PendienteScreen extends StatelessWidget {
  const PendienteScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final sesion = Dependencias.de(context).sesion;
    return Scaffold(
      body: SafeArea(
        bottom: false,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Padding(padding: EdgeInsets.fromLTRB(20, 16, 20, 0), child: EncabezadoMarca()),
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 26, 20, 22),
              child: Text(
                'Tu cuenta está pendiente de aprobación',
                style: estilo(24, peso: FontWeight.w600, color: Colores.blanco, espaciado: -0.02),
              ),
            ),
            Expanded(
              child: HojaClara(
                child: ListView(
                  padding: const EdgeInsets.fromLTRB(20, 24, 20, 40),
                  children: [
                    AvisoEnLinea(
                      'Un superadministrador debe asignarte un rol en el panel web (${sesion.usuario?.email ?? ''}). '
                      'Cuando lo haga, vuelve a ingresar.',
                    ),
                    const SizedBox(height: 16),
                    BotonSecundario(texto: 'Cerrar sesión', alPresionar: sesion.cerrarSesion),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
