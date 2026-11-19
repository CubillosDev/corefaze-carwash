import 'package:flutter/foundation.dart';

/// Configuración de la app, inyectada al compilar con el archivo del entorno:
///
///   flutter run --dart-define-from-file=config/desarrollo.json
///   flutter build apk --release --dart-define-from-file=config/pruebas.json
///
/// `API_KEY` es la API_KEY_MOVIL de la API: identifica a la aplicación, no a
/// la persona, y viaja dentro del binario, así que nunca es un secreto de
/// servidor. Los archivos reales de configuración no entran al repositorio.
abstract final class Entorno {
  static const apiUrl = String.fromEnvironment('API_URL');
  static const apiKey = String.fromEnvironment('API_KEY');

  /// Qué falta o está mal configurado; vacío si la app puede arrancar.
  static List<String> get faltantes =>
      problemasDeConfiguracion(apiUrl: apiUrl, apiKey: apiKey, publicacion: kReleaseMode);
}

/// Revisa la configuración. La variante de publicación solo habla con la API
/// por HTTPS: un APK de pruebas o de producción nunca envía datos en claro.
List<String> problemasDeConfiguracion({required String apiUrl, required String apiKey, required bool publicacion}) => [
  if (apiUrl.isEmpty) 'API_URL',
  if (apiUrl.isNotEmpty && publicacion && !apiUrl.startsWith('https://')) 'API_URL con HTTPS',
  if (apiKey.isEmpty) 'API_KEY',
];
