import 'package:flutter/material.dart';

import '../../app/tema.dart';

/// Hoja clara redondeada arriba que sube sobre el marco oscuro.
class HojaClara extends StatelessWidget {
  const HojaClara({super.key, required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: const BoxDecoration(
        color: Colores.hoja,
        borderRadius: BorderRadius.vertical(top: Radius.circular(Radios.hoja)),
      ),
      child: ClipRRect(
        borderRadius: const BorderRadius.vertical(top: Radius.circular(Radios.hoja)),
        child: child,
      ),
    );
  }
}

/// Tarjeta blanca de sección del formulario, con su título y algo a la derecha.
class TarjetaSeccion extends StatelessWidget {
  const TarjetaSeccion({super.key, this.titulo, this.adorno, required this.child, this.relleno = true});

  final String? titulo;
  final Widget? adorno;
  final Widget child;
  final bool relleno;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: Colores.blanco,
        border: Border.all(color: Colores.bordeTarjeta),
        borderRadius: BorderRadius.circular(Radios.seccion),
      ),
      clipBehavior: Clip.antiAlias,
      padding: relleno ? const EdgeInsets.fromLTRB(14, 13, 14, 14) : EdgeInsets.zero,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (titulo != null)
            Padding(
              padding: relleno ? EdgeInsets.zero : const EdgeInsets.fromLTRB(14, 13, 14, 6),
              child: Row(
                children: [
                  Expanded(
                    child: Semantics(
                      header: true,
                      child: Text(titulo!, style: estilo(14, peso: FontWeight.w600)),
                    ),
                  ),
                  ?adorno,
                ],
              ),
            ),
          child,
        ],
      ),
    );
  }
}

/// Opción que se elige tocándola: tipo de vehículo, colaborador, medio de pago.
class OpcionElegible extends StatelessWidget {
  const OpcionElegible({
    super.key,
    required this.elegida,
    required this.alElegir,
    required this.child,
    this.alto = 46,
    this.etiqueta,
  });

  final bool elegida;
  final VoidCallback? alElegir;
  final Widget child;
  final double alto;
  final String? etiqueta;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      selected: elegida,
      label: etiqueta,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 150),
        height: alto,
        decoration: BoxDecoration(
          color: elegida ? Colores.primario50 : Colores.blanco,
          border: Border.all(color: elegida ? Colores.primario : Colores.bordeOpcion, width: 1.5),
          borderRadius: BorderRadius.circular(Radios.bloque),
        ),
        child: Material(
          type: MaterialType.transparency,
          child: InkWell(
            borderRadius: BorderRadius.circular(Radios.bloque),
            onTap: alElegir,
            child: Center(
              child: DefaultTextStyle(
                style: estilo(13, peso: FontWeight.w600, color: elegida ? Colores.primario800 : Colores.textoControl),
                textAlign: TextAlign.center,
                child: child,
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// Control segmentado del diseño: fondo gris y la opción elegida en blanco.
class ControlSegmentado<T> extends StatelessWidget {
  const ControlSegmentado({super.key, required this.opciones, required this.valor, required this.alCambiar});

  final List<(T, String)> opciones;
  final T valor;
  final ValueChanged<T> alCambiar;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(3),
      decoration: BoxDecoration(color: Colores.segmento, borderRadius: BorderRadius.circular(10)),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          for (final (opcion, texto) in opciones)
            Padding(
              padding: const EdgeInsets.only(left: 2),
              child: Semantics(
                button: true,
                selected: opcion == valor,
                child: GestureDetector(
                  onTap: () => alCambiar(opcion),
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 180),
                    height: 28,
                    padding: const EdgeInsets.symmetric(horizontal: 10),
                    alignment: Alignment.center,
                    decoration: BoxDecoration(
                      color: opcion == valor ? Colores.blanco : Colors.transparent,
                      borderRadius: BorderRadius.circular(Radios.segmento),
                      boxShadow: opcion == valor ? Sombras.segmento : null,
                    ),
                    child: Text(
                      texto,
                      style: estilo(
                        12,
                        peso: FontWeight.w600,
                        color: opcion == valor ? Colores.texto : Colores.textoSecundario,
                      ),
                    ),
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

/// Botón redondo translúcido sobre el marco (volver, cerrar).
class BotonRedondo extends StatelessWidget {
  const BotonRedondo({
    super.key,
    required this.icono,
    required this.etiqueta,
    required this.alPresionar,
    this.tamano = 38,
  });

  final IconData icono;
  final String etiqueta;
  final VoidCallback alPresionar;
  final double tamano;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      label: etiqueta,
      excludeSemantics: true,
      child: Material(
        color: const Color(0x1AFFFFFF),
        shape: const CircleBorder(),
        child: InkWell(
          customBorder: const CircleBorder(),
          onTap: alPresionar,
          child: SizedBox.square(
            dimension: tamano,
            child: Icon(icono, size: 18, color: Colores.blanco),
          ),
        ),
      ),
    );
  }
}

/// Aviso en línea (ámbar o rojo) con su signo de exclamación.
class AvisoEnLinea extends StatelessWidget {
  const AvisoEnLinea(this.texto, {super.key, this.error = false});

  final String texto;
  final bool error;

  @override
  Widget build(BuildContext context) {
    final color = error ? Colores.error : Colores.advertenciaTexto;
    return Semantics(
      liveRegion: true,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        decoration: BoxDecoration(
          color: error ? Colores.errorSuave : Colores.advertenciaSuave,
          borderRadius: BorderRadius.circular(Radios.tarjeta),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              '!',
              style: estilo(12.5, peso: FontWeight.w700, color: color, altura: 1.4),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Text(texto, style: estilo(12.5, color: color, altura: 1.4)),
            ),
          ],
        ),
      ),
    );
  }
}

/// Punto de color de un estado.
class Punto extends StatelessWidget {
  const Punto(this.color, {super.key, this.tamano = 6});

  final Color color;
  final double tamano;

  @override
  Widget build(BuildContext context) => Container(
    width: tamano,
    height: tamano,
    decoration: BoxDecoration(color: color, shape: BoxShape.circle),
  );
}
