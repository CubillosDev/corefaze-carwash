/// Error de una solicitud a la API con el mensaje ya listo para mostrar.
class ApiExcepcion implements Exception {
  const ApiExcepcion(this.mensaje, {this.estado = 0, this.erroresPorCampo = const {}, this.mensajeDelServidor = ''});

  final String mensaje;

  /// Código HTTP; 0 si no hubo respuesta.
  final int estado;

  /// En un 400: campo -> mensaje.
  final Map<String, String> erroresPorCampo;

  /// Texto original de la API. No se muestra tal cual: quien lo usa decide.
  final String mensajeDelServidor;

  @override
  String toString() => mensaje;
}
