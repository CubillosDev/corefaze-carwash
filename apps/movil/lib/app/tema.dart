import 'package:flutter/material.dart';

/// Colores del diseño "Recepción Móvil". Es la única fuente de color de la
/// app: ningún widget escribe un hexadecimal suelto.
abstract final class Colores {
  /// Fondo oscuro de la app (marco del panel).
  static const marco = Color(0xFF0E1730);
  static const primario = Color(0xFF1268E8);
  static const primario600 = Color(0xFF0F5BCC);
  static const primario800 = Color(0xFF0B3D91);
  static const primario50 = Color(0xFFF1F6FE);
  static const primario100 = Color(0xFFE7EFFD);

  /// Línea de lectura y foco sobre el marco.
  static const brillo = Color(0xFF4D9BFF);

  /// Amarillo de placa física, siempre con texto oscuro encima.
  static const placa = Color(0xFFF2C230);
  static const textoPlaca = Color(0xFF111111);

  static const hoja = Color(0xFFF5F5F6);
  static const bloque = Color(0xFFF5F6F8);
  static const campo = Color(0xFFFAFBFC);
  static const chip = Color(0xFFF1F2F4);
  static const segmento = Color(0xFFEEEEF1);
  static const divisor = Color(0xFFEEF0F2);
  static const bordeTarjeta = Color(0xFFE9EAED);
  static const bordeFila = Color(0xFFECEEF1);
  static const bordeInterno = Color(0xFFF2F3F5);
  static const bordeOpcion = Color(0xFFE3E5E9);
  static const bordeBoton = Color(0xFFDFE1E6);

  static const texto = Color(0xFF171B24);
  static const textoControl = Color(0xFF4A4F5C);
  static const textoSecundario = Color(0xFF6B7080);
  static const textoApoyo = Color(0xFF7A7F8C);
  static const textoEtiqueta = Color(0xFF8C909C);
  static const textoAtenuado = Color(0xFF9A9FAD);
  static const marcador = Color(0xFFA3A7B3);
  static const textoQuitar = Color(0xFF7A86A3);
  static const textoSeleccion = Color(0xFF5C6B8A);

  /// Textos sobre el marco oscuro.
  static const sobreMarco = Color(0xFFA9B1C7);
  static const sobreMarcoTenue = Color(0xFF8D96AE);

  static const exito = Color(0xFF15803D);
  static const exitoSolido = Color(0xFF16A34A);
  static const exitoVivo = Color(0xFF22C55E);
  static const exitoSuave = Color(0xFFE8F6EE);

  static const advertenciaTexto = Color(0xFF8A5506);
  static const advertenciaSolido = Color(0xFFE59A0B);
  static const advertenciaSuave = Color(0xFFFDF3E1);

  static const error = Color(0xFFB91C1C);
  static const errorSuave = Color(0xFFFDECEC);

  static const blanco = Color(0xFFFFFFFF);
}

/// Radios del diseño.
abstract final class Radios {
  static const placa = 6.0;
  static const segmento = 7.0;
  static const opcion = 8.0;
  static const control = 9.0;
  static const campo = 11.0;
  static const bloque = 12.0;
  static const boton = 13.0;
  static const tarjeta = 14.0;
  static const seccion = 16.0;
  static const resumen = 18.0;
  static const hojaFlotante = 22.0;
  static const hoja = 24.0;
}

/// Sombras del diseño.
abstract final class Sombras {
  static const botonPrincipal = [BoxShadow(color: Color(0x661268E8), blurRadius: 26, offset: Offset(0, 10))];
  static const segmento = [BoxShadow(color: Color(0x1F101828), blurRadius: 3, offset: Offset(0, 1))];
  static const recuadro = [BoxShadow(color: Color(0x0F101828), blurRadius: 2, offset: Offset(0, 1))];
  static const confirmacion = [BoxShadow(color: Color(0x2916A34A), spreadRadius: 10)];
}

const _familia = 'DM Sans';
const _familiaMono = 'JetBrains Mono';

/// Estilo de texto con la fuente del diseño. DM Sans es variable: el peso se
/// aplica también como eje `wght` para que se vea igual en todas las
/// plataformas.
TextStyle estilo(
  double tamano, {
  FontWeight peso = FontWeight.w400,
  Color color = Colores.texto,
  double? espaciado,
  double? altura,
}) {
  return TextStyle(
    fontFamily: _familia,
    fontSize: tamano,
    fontWeight: peso,
    fontVariations: [FontVariation('wght', peso.value.toDouble())],
    color: color,
    letterSpacing: espaciado == null ? null : espaciado * tamano,
    height: altura,
  );
}

/// JetBrains Mono 600: placas, códigos de colaborador y turnos.
TextStyle estiloMono(double tamano, {Color color = Colores.texto, double espaciado = 0.06}) {
  return TextStyle(
    fontFamily: _familiaMono,
    fontSize: tamano,
    fontWeight: FontWeight.w600,
    fontVariations: const [FontVariation('wght', 600)],
    color: color,
    letterSpacing: espaciado * tamano,
  );
}

/// Tema de Material con la tipografía y los colores del diseño.
ThemeData crearTema() {
  final base = ThemeData(
    useMaterial3: true,
    fontFamily: _familia,
    colorScheme: ColorScheme.fromSeed(
      seedColor: Colores.primario,
      primary: Colores.primario,
      surface: Colores.hoja,
      error: Colores.error,
    ),
    scaffoldBackgroundColor: Colores.marco,
  );
  return base.copyWith(
    textSelectionTheme: const TextSelectionThemeData(
      cursorColor: Colores.primario,
      selectionColor: Color(0x331268E8),
      selectionHandleColor: Colores.primario,
    ),
    snackBarTheme: SnackBarThemeData(
      behavior: SnackBarBehavior.floating,
      backgroundColor: Colores.texto,
      contentTextStyle: estilo(13.5, peso: FontWeight.w500, color: Colores.blanco),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(Radios.bloque)),
    ),
  );
}
