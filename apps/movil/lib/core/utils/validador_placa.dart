import '../constants/dominio.dart';

/// Placa sin espacios ni guiones y en mayúsculas: " abc-12 3" -> "ABC123".
String normalizarPlaca(String texto) => texto.replaceAll(RegExp(r'[\s-]'), '').toUpperCase();

bool esPlacaDeCarro(String placa) => patronPlacaCarro.hasMatch(placa);

bool esPlacaDeMoto(String placa) => patronPlacaMoto.hasMatch(placa);

/// ¿Es una placa válida de carro (ABC123) o de moto (ABC12D)? Recibe la placa
/// ya normalizada.
bool esPlacaValida(String placa) => esPlacaDeCarro(placa) || esPlacaDeMoto(placa);

/// Mensaje de error para quien escribe la placa, o null si es válida.
String? errorDePlaca(String texto) {
  final placa = normalizarPlaca(texto);
  if (placa.isEmpty) {
    return 'Escribe la placa.';
  }
  return esPlacaValida(placa) ? null : 'Placa de carro ABC123 o de moto ABC12D.';
}

/// Placa para mostrar: "ABC123" -> "ABC 123", "ABC12D" -> "ABC 12D".
String formatoPlaca(String placa) {
  final limpia = normalizarPlaca(placa);
  return limpia.length > 3 ? '${limpia.substring(0, 3)} ${limpia.substring(3)}' : limpia;
}
