import '../../../../core/network/lectura_json.dart';

/// Persona con sesión. El rol decide qué puede hacer; la API lo valida igual.
class Usuario {
  const Usuario({required this.id, required this.nombre, required this.email, required this.rol});

  factory Usuario.desdeJson(Map<String, dynamic> json) => Usuario(
    id: leerEntero(json['id']),
    nombre: leerTexto(json['nombre']),
    email: leerTexto(json['email']),
    rol: leerTexto(json['rol']),
  );

  final int id;
  final String nombre;
  final String email;
  final String rol;

  Map<String, Object> aJson() => {'id': id, 'nombre': nombre, 'email': email, 'rol': rol};

  String get primerNombre => nombre.trim().split(RegExp(r'\s+')).first;
}
