/// Configuración de la app, inyectada al compilar:
///
///   flutter run --dart-define-from-file=config/desarrollo.json
///
/// `API_KEY` es la API_KEY_MOVIL de la API: identifica a la aplicación, no a
/// la persona, y viaja dentro del binario, así que nunca es un secreto de
/// servidor. El archivo real de configuración no entra al repositorio.
abstract final class Entorno {
  static const apiUrl = String.fromEnvironment('API_URL');
  static const apiKey = String.fromEnvironment('API_KEY');

  /// Qué falta configurar; vacío si la app puede arrancar.
  static List<String> get faltantes => [if (apiUrl.isEmpty) 'API_URL', if (apiKey.isEmpty) 'API_KEY'];
}
