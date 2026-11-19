import 'package:flutter/material.dart';

/// Transición del diseño entre pantallas: entra deslizándose y aparece.
Route<T> ruta<T>(Widget pantalla) {
  return PageRouteBuilder<T>(
    transitionDuration: const Duration(milliseconds: 260),
    reverseTransitionDuration: const Duration(milliseconds: 200),
    pageBuilder: (_, _, _) => pantalla,
    transitionsBuilder: (_, animacion, _, hijo) {
      final curva = CurvedAnimation(parent: animacion, curve: const Cubic(0.22, 0.61, 0.36, 1));
      return FadeTransition(
        opacity: curva,
        child: SlideTransition(
          position: Tween(begin: const Offset(0, 0.03), end: Offset.zero).animate(curva),
          child: hijo,
        ),
      );
    },
  );
}

/// Abre una pantalla encima de la actual.
Future<T?> irA<T>(BuildContext context, Widget pantalla) => Navigator.of(context).push(ruta<T>(pantalla));

/// Reemplaza la pantalla actual (pasos de un flujo que no se deshacen).
Future<T?> reemplazarCon<T>(BuildContext context, Widget pantalla) =>
    Navigator.of(context).pushReplacement(ruta<T>(pantalla));

/// Vuelve a la primera pantalla (la recepción).
void volverAlInicio(BuildContext context) => Navigator.of(context).popUntil((ruta) => ruta.isFirst);
