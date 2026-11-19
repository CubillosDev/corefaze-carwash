import 'package:flutter/material.dart';

import '../../app/tema.dart';

/// Botón azul del diseño. `alto` sigue los tamaños del prototipo: 60 (acción
/// principal de la recepción), 56, 50 (pie del formulario) y 48.
class BotonPrimario extends StatelessWidget {
  const BotonPrimario({
    super.key,
    required this.texto,
    required this.alPresionar,
    this.icono,
    this.alto = 50,
    this.cargando = false,
    this.sombra = false,
    this.expandido = true,
  });

  final String texto;
  final VoidCallback? alPresionar;
  final Widget? icono;
  final double alto;
  final bool cargando;
  final bool sombra;
  final bool expandido;

  @override
  Widget build(BuildContext context) {
    final activo = alPresionar != null && !cargando;
    final radio = alto >= 56 ? Radios.seccion : (alto >= 50 ? Radios.tarjeta : Radios.boton);
    final tamanoTexto = alto >= 60 ? 16.0 : (alto >= 56 ? 15.0 : 14.5);
    return Semantics(
      button: true,
      enabled: activo,
      label: texto,
      excludeSemantics: true,
      child: AnimatedOpacity(
        duration: const Duration(milliseconds: 150),
        opacity: alPresionar == null ? 0.45 : 1,
        child: Container(
          height: alto,
          width: expandido ? double.infinity : null,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(radio),
            boxShadow: sombra && activo ? Sombras.botonPrincipal : null,
          ),
          child: Material(
            color: Colores.primario,
            borderRadius: BorderRadius.circular(radio),
            child: InkWell(
              borderRadius: BorderRadius.circular(radio),
              onTap: activo ? alPresionar : null,
              highlightColor: Colores.primario600,
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: Row(
                  mainAxisSize: expandido ? MainAxisSize.max : MainAxisSize.min,
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    if (cargando)
                      const SizedBox.square(
                        dimension: 18,
                        child: CircularProgressIndicator(strokeWidth: 2.2, color: Colores.blanco),
                      )
                    else ...[
                      if (icono != null) ...[icono!, const SizedBox(width: 10)],
                      Flexible(
                        child: Text(
                          texto,
                          overflow: TextOverflow.ellipsis,
                          style: estilo(tamanoTexto, peso: FontWeight.w600, color: Colores.blanco),
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// Botón secundario sobre el marco oscuro: borde translúcido.
class BotonSobreMarco extends StatelessWidget {
  const BotonSobreMarco({
    super.key,
    required this.texto,
    required this.alPresionar,
    this.alto = 46,
    this.conBorde = true,
  });

  final String texto;
  final VoidCallback? alPresionar;
  final double alto;
  final bool conBorde;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: alto,
      width: double.infinity,
      child: Material(
        color: conBorde ? const Color(0x0AFFFFFF) : Colors.transparent,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(Radios.tarjeta),
          side: conBorde ? const BorderSide(color: Color(0x2EFFFFFF)) : BorderSide.none,
        ),
        child: InkWell(
          customBorder: RoundedRectangleBorder(borderRadius: BorderRadius.circular(Radios.tarjeta)),
          highlightColor: const Color(0x1AFFFFFF),
          onTap: alPresionar,
          child: Center(
            child: Text(
              texto,
              style: estilo(14, peso: FontWeight.w500, color: Colores.blanco),
            ),
          ),
        ),
      ),
    );
  }
}

/// Botón blanco con borde, sobre fondo claro ("Reintentar").
class BotonSecundario extends StatelessWidget {
  const BotonSecundario({super.key, required this.texto, required this.alPresionar, this.alto = 48});

  final String texto;
  final VoidCallback? alPresionar;
  final double alto;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: alto,
      child: OutlinedButton(
        onPressed: alPresionar,
        style: OutlinedButton.styleFrom(
          backgroundColor: Colores.blanco,
          foregroundColor: Colores.textoControl,
          side: const BorderSide(color: Colores.bordeBoton),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(Radios.boton)),
          textStyle: estilo(14, peso: FontWeight.w600),
        ),
        child: Text(texto),
      ),
    );
  }
}
