/// Pesos enteros con separador de miles: 28000 -> "$ 28.000".
String formatoMoneda(num valor) {
  final entero = valor.round();
  final signo = entero < 0 ? '-' : '';
  final digitos = entero.abs().toString();
  final grupos = <String>[];
  for (var fin = digitos.length; fin > 0; fin -= 3) {
    grupos.insert(0, digitos.substring(fin - 3 < 0 ? 0 : fin - 3, fin));
  }
  return '$signo\$ ${grupos.join('.')}';
}
