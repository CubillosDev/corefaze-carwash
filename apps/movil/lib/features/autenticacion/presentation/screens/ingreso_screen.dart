import 'package:flutter/material.dart';

import '../../../../app/dependencias.dart';
import '../../../../app/tema.dart';
import '../../../../core/widgets/boton_primario.dart';
import '../../../../core/widgets/campo_texto.dart';
import '../../../../core/widgets/piezas.dart';
import '../widgets/encabezado_marca.dart';

final _patronCorreo = RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]+$');

/// Ingreso con correo y contraseña. El diseño móvil no lo trae: sigue su
/// lenguaje (marco oscuro arriba, hoja clara con el formulario).
class IngresoScreen extends StatefulWidget {
  const IngresoScreen({super.key});

  @override
  State<IngresoScreen> createState() => _IngresoScreenState();
}

class _IngresoScreenState extends State<IngresoScreen> {
  final _correo = TextEditingController();
  final _clave = TextEditingController();
  String? _errorCorreo;
  String? _errorClave;
  String? _errorDeApi;
  bool _enviando = false;
  bool _verClave = false;

  @override
  void dispose() {
    _correo.dispose();
    _clave.dispose();
    super.dispose();
  }

  Future<void> _enviar() async {
    final correo = _correo.text.trim();
    setState(() {
      _errorCorreo = correo.isEmpty
          ? 'Escribe tu correo electrónico.'
          : (_patronCorreo.hasMatch(correo) ? null : 'Escribe un correo válido, por ejemplo nombre@empresa.com.');
      _errorClave = _clave.text.isEmpty ? 'Escribe tu contraseña.' : null;
      _errorDeApi = null;
    });
    if (_errorCorreo != null || _errorClave != null) {
      return;
    }
    setState(() => _enviando = true);
    try {
      await Dependencias.leer(context).sesion.iniciarSesion(email: correo, password: _clave.text);
    } catch (error) {
      if (mounted) {
        setState(() {
          _errorDeApi = error.toString();
          _clave.clear();
          _enviando = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final vencida = Dependencias.de(context).sesion.vencida;
    return Scaffold(
      resizeToAvoidBottomInset: true,
      body: SafeArea(
        bottom: false,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Padding(padding: EdgeInsets.fromLTRB(20, 16, 20, 0), child: EncabezadoMarca()),
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 26, 20, 22),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Recepción',
                    style: estilo(26, peso: FontWeight.w600, color: Colores.blanco, espaciado: -0.02),
                  ),
                  const SizedBox(height: 3),
                  Text('Ingresa para registrar los vehículos del día.', style: estilo(13, color: Colores.sobreMarco)),
                ],
              ),
            ),
            Expanded(
              child: HojaClara(
                child: ListView(
                  padding: const EdgeInsets.fromLTRB(20, 24, 20, 40),
                  children: [
                    if (vencida && _errorDeApi == null) ...[
                      const AvisoEnLinea('Tu sesión terminó. Vuelve a ingresar para continuar.'),
                      const SizedBox(height: 16),
                    ],
                    if (_errorDeApi != null) ...[AvisoEnLinea(_errorDeApi!, error: true), const SizedBox(height: 16)],
                    AutofillGroup(
                      child: Column(
                        children: [
                          CampoTexto(
                            etiqueta: 'Correo electrónico',
                            controlador: _correo,
                            teclado: TextInputType.emailAddress,
                            marcador: 'nombre@empresa.com',
                            autocompletar: const [AutofillHints.username, AutofillHints.email],
                            accionTeclado: TextInputAction.next,
                            error: _errorCorreo,
                          ),
                          const SizedBox(height: 14),
                          CampoTexto(
                            etiqueta: 'Contraseña',
                            controlador: _clave,
                            oculto: !_verClave,
                            autocompletar: const [AutofillHints.password],
                            accionTeclado: TextInputAction.done,
                            alEnviar: (_) => _enviar(),
                            error: _errorClave,
                            accion: IconButton(
                              tooltip: _verClave ? 'Ocultar contraseña' : 'Mostrar contraseña',
                              onPressed: () => setState(() => _verClave = !_verClave),
                              icon: Icon(
                                _verClave ? Icons.visibility_off_outlined : Icons.visibility_outlined,
                                size: 19,
                                color: Colores.textoEtiqueta,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 20),
                    BotonPrimario(texto: 'Ingresar', alPresionar: _enviar, cargando: _enviando, alto: 50, sombra: true),
                    const SizedBox(height: 18),
                    Text(
                      '¿Aún no tienes acceso? Solicítalo desde el panel web y espera a que un superadministrador te asigne un rol.',
                      textAlign: TextAlign.center,
                      style: estilo(12, color: Colores.textoApoyo, altura: 1.45),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
