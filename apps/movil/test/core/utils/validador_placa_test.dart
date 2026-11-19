import 'package:corefaze_movil/core/utils/validador_placa.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('normaliza a mayúsculas sin espacios ni guiones', () {
    expect(normalizarPlaca(' abc-12 3'), 'ABC123');
  });

  test('acepta placas de carro y de moto, y rechaza las demás', () {
    expect(esPlacaValida('ABC123'), isTrue);
    expect(esPlacaValida('ABC12D'), isTrue);
    expect(esPlacaDeMoto('ABC12D'), isTrue);
    expect(esPlacaValida('AB1234'), isFalse);
    expect(errorDePlaca(''), 'Escribe la placa.');
    expect(errorDePlaca('abc 123'), isNull);
    expect(errorDePlaca('1234'), 'Placa de carro ABC123 o de moto ABC12D.');
  });

  test('separa las letras de los números para mostrarla', () {
    expect(formatoPlaca('abc123'), 'ABC 123');
    expect(formatoPlaca('ABC12D'), 'ABC 12D');
  });
}
