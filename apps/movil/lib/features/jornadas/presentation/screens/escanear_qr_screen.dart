import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';

import '../../../../app/dependencias.dart';
import '../../../../app/tema.dart';
import '../../../../core/widgets/boton_primario.dart';
import '../../../../core/widgets/piezas.dart';
import '../../data/repositories/jornadas_repository.dart';

/// Abre la jornada leyendo el QR que muestra el panel web en Inicio. El código
/// es de un solo uso y vence a los 30 s: la API lo valida. Devuelve true al
/// abrirla. Si no hay cámara, se puede abrir sin código.
class EscanearQrScreen extends StatefulWidget {
  const EscanearQrScreen({super.key});

  @override
  State<EscanearQrScreen> createState() => _EscanearQrScreenState();
}

class _EscanearQrScreenState extends State<EscanearQrScreen> {
  final _camara = MobileScannerController(formats: const [BarcodeFormat.qrCode]);
  bool _enviando = false;
  String? _error;

  @override
  void dispose() {
    _camara.dispose();
    super.dispose();
  }

  Future<void> _alDetectar(BarcodeCapture captura) async {
    if (_enviando) {
      return;
    }
    final contenido = captura.barcodes.map((codigo) => codigo.rawValue).whereType<String>().firstOrNull;
    if (contenido == null) {
      return;
    }
    if (!contenido.startsWith(prefijoQrJornada)) {
      setState(() => _error = 'Ese código no es el de la jornada. Escanea el que muestra el panel en Inicio.');
      return;
    }
    await _abrir(() => Dependencias.leer(context).jornadas.abrirConQr(contenido));
  }

  Future<void> _abrir(Future<void> Function() accion) async {
    setState(() {
      _enviando = true;
      _error = null;
    });
    try {
      await accion();
      if (mounted) {
        Navigator.of(context).pop(true);
      }
    } catch (error) {
      if (mounted) {
        setState(() {
          _error = error.toString();
          _enviando = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      body: Stack(
        fit: StackFit.expand,
        children: [
          MobileScanner(controller: _camara, onDetect: _alDetectar, errorBuilder: (context, _) => const _SinCamara()),
          const _VeloConRecuadro(),
          SafeArea(
            child: Column(
              children: [
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
                  child: Row(
                    children: [
                      BotonRedondo(
                        icono: Icons.close,
                        etiqueta: 'Cerrar',
                        tamano: 40,
                        alPresionar: () => Navigator.of(context).pop(false),
                      ),
                      Expanded(
                        child: Text(
                          'Abrir jornada',
                          textAlign: TextAlign.center,
                          style: estilo(15, peso: FontWeight.w600, color: Colores.blanco),
                        ),
                      ),
                      const SizedBox(width: 40),
                    ],
                  ),
                ),
                const Spacer(),
                Container(
                  height: 30,
                  padding: const EdgeInsets.symmetric(horizontal: 14),
                  decoration: BoxDecoration(color: const Color(0x80000000), borderRadius: BorderRadius.circular(999)),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Punto(_enviando ? Colores.exitoVivo : const Color(0xD9FFFFFF), tamano: 7),
                      const SizedBox(width: 8),
                      Text(
                        _enviando ? 'Abriendo la jornada…' : 'Apunta al código del panel',
                        style: estilo(13, color: Colores.blanco),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 24),
                Container(
                  margin: const EdgeInsets.fromLTRB(10, 0, 10, 20),
                  padding: const EdgeInsets.fromLTRB(18, 18, 18, 16),
                  decoration: BoxDecoration(
                    color: Colores.blanco,
                    borderRadius: BorderRadius.circular(Radios.hojaFlotante),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      if (_error != null) ...[AvisoEnLinea(_error!, error: true), const SizedBox(height: 12)],
                      Text(
                        'El código cambia cada 30 segundos. Si no tienes cámara a mano, ábrela desde aquí.',
                        style: estilo(12.5, color: Colores.textoSecundario, altura: 1.4),
                      ),
                      const SizedBox(height: 12),
                      BotonSecundario(
                        texto: 'Abrir sin código',
                        alPresionar: _enviando ? null : () => _abrir(Dependencias.leer(context).jornadas.abrir),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// Oscurece todo menos el recuadro donde va el código.
class _VeloConRecuadro extends StatelessWidget {
  const _VeloConRecuadro();

  @override
  Widget build(BuildContext context) {
    return IgnorePointer(
      child: Center(
        child: Container(
          width: 240,
          height: 240,
          margin: const EdgeInsets.only(bottom: 120),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(18),
            border: Border.all(color: const Color(0xD9FFFFFF), width: 2),
            boxShadow: const [BoxShadow(color: Color(0x59000000), spreadRadius: 999)],
          ),
        ),
      ),
    );
  }
}

class _SinCamara extends StatelessWidget {
  const _SinCamara();

  @override
  Widget build(BuildContext context) {
    return const DecoratedBox(
      decoration: BoxDecoration(
        gradient: RadialGradient(
          center: Alignment(0, -0.1),
          radius: 1.2,
          colors: [Color(0xFF3A3D44), Color(0xFF1D1F24), Color(0xFF0C0D10)],
          stops: [0, 0.55, 1],
        ),
      ),
    );
  }
}
