import 'package:corefaze_movil/core/config/entorno.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('problemasDeConfiguracion', () {
    test('acepta una configuración completa', () {
      expect(
        problemasDeConfiguracion(apiUrl: 'https://api.ejemplo.test/api', apiKey: 'llave', publicacion: true),
        isEmpty,
      );
    });

    test('señala lo que falta', () {
      expect(problemasDeConfiguracion(apiUrl: '', apiKey: '', publicacion: false), ['API_URL', 'API_KEY']);
    });

    test('en desarrollo permite HTTP para la API local', () {
      expect(
        problemasDeConfiguracion(apiUrl: 'http://10.0.2.2:3100/api', apiKey: 'llave', publicacion: false),
        isEmpty,
      );
    });

    test('la variante de publicación exige HTTPS', () {
      expect(problemasDeConfiguracion(apiUrl: 'http://api.ejemplo.test/api', apiKey: 'llave', publicacion: true), [
        'API_URL con HTTPS',
      ]);
    });
  });
}
