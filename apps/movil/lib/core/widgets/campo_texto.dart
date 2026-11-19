import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../app/tema.dart';

/// Campo con su etiqueta encima, como en el panel: alto 44 en formularios de
/// una columna (ingreso) y bordes del sistema de diseño.
class CampoTexto extends StatelessWidget {
  const CampoTexto({
    super.key,
    required this.etiqueta,
    required this.controlador,
    this.error,
    this.marcador,
    this.teclado,
    this.oculto = false,
    this.accion,
    this.autocompletar,
    this.alEnviar,
    this.formateadores,
    this.accionTeclado,
  });

  final String etiqueta;
  final TextEditingController controlador;
  final String? error;
  final String? marcador;
  final TextInputType? teclado;
  final bool oculto;
  final Widget? accion;
  final Iterable<String>? autocompletar;
  final ValueChanged<String>? alEnviar;
  final List<TextInputFormatter>? formateadores;
  final TextInputAction? accionTeclado;

  @override
  Widget build(BuildContext context) {
    OutlineInputBorder borde(Color color, [double ancho = 1]) => OutlineInputBorder(
      borderRadius: BorderRadius.circular(Radios.control),
      borderSide: BorderSide(color: color, width: ancho),
    );
    // La etiqueta visible y el campo forman un solo nodo para el lector de pantalla.
    return MergeSemantics(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            etiqueta,
            style: estilo(12, peso: FontWeight.w600, color: Colores.textoControl),
          ),
          const SizedBox(height: 6),
          TextField(
            controller: controlador,
            obscureText: oculto,
            keyboardType: teclado,
            autofillHints: autocompletar,
            onSubmitted: alEnviar,
            inputFormatters: formateadores,
            textInputAction: accionTeclado,
            style: estilo(14, peso: FontWeight.w500),
            decoration: InputDecoration(
              isDense: true,
              filled: true,
              fillColor: Colores.blanco,
              hintText: marcador,
              hintStyle: estilo(14, color: Colores.marcador),
              contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 13),
              suffixIcon: accion,
              enabledBorder: borde(error == null ? Colores.bordeBoton : Colores.error),
              focusedBorder: borde(error == null ? Colores.primario : Colores.error, 1.5),
              errorText: error,
              errorStyle: estilo(12, peso: FontWeight.w500, color: Colores.error),
              errorBorder: borde(Colores.error),
              focusedErrorBorder: borde(Colores.error, 1.5),
            ),
          ),
        ],
      ),
    );
  }
}
