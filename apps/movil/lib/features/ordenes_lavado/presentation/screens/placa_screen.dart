import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../../../app/router.dart';
import '../../../../app/tema.dart';
import '../../../../core/utils/validador_placa.dart';
import '../../../../core/widgets/boton_primario.dart';
import '../../../../core/widgets/piezas.dart';
import '../../../jornadas/data/models/jornada.dart';
import 'consulta_screen.dart';

/// "Escanear placa" del diseño, sin cámara: la placa se escribe sobre la
/// placa amarilla (el OCR está fuera del alcance) y se busca en Corefaze.
class PlacaScreen extends StatefulWidget {
  const PlacaScreen({super.key, required this.jornada, this.placaInicial = ''});

  final Jornada jornada;
  final String placaInicial;

  @override
  State<PlacaScreen> createState() => _PlacaScreenState();
}

class _PlacaScreenState extends State<PlacaScreen> {
  late final _placa = TextEditingController(text: widget.placaInicial);

  @override
  void initState() {
    super.initState();
    _placa.addListener(() => setState(() {}));
  }

  @override
  void dispose() {
    _placa.dispose();
    super.dispose();
  }

  String get _normalizada => normalizarPlaca(_placa.text);

  bool get _valida => esPlacaValida(_normalizada);

  void _buscar() {
    if (_valida) {
      reemplazarCon<void>(context, ConsultaScreen(jornada: widget.jornada, placa: _normalizada));
    }
  }

  @override
  Widget build(BuildContext context) {
    final colorRecuadro = _valida ? Colores.exitoVivo : const Color(0xD9FFFFFF);
    return Scaffold(
      resizeToAvoidBottomInset: true,
      body: DecoratedBox(
        decoration: const BoxDecoration(
          gradient: RadialGradient(
            center: Alignment(0, -0.1),
            radius: 1.2,
            colors: [Color(0xFF3A3D44), Color(0xFF1D1F24), Color(0xFF0C0D10)],
            stops: [0, 0.55, 1],
          ),
        ),
        child: SafeArea(
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
                      alPresionar: () => Navigator.of(context).pop(),
                    ),
                    Expanded(
                      child: Text(
                        'Placa del vehículo',
                        textAlign: TextAlign.center,
                        style: estilo(15, peso: FontWeight.w600, color: Colores.blanco),
                      ),
                    ),
                    const SizedBox(width: 40),
                  ],
                ),
              ),
              Expanded(
                child: Center(
                  child: SingleChildScrollView(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        SizedBox(
                          width: 300,
                          height: 150,
                          child: Stack(
                            alignment: Alignment.center,
                            children: [
                              Transform.rotate(
                                angle: -2 * math.pi / 180,
                                child: Container(
                                  width: 214,
                                  height: 72,
                                  decoration: BoxDecoration(
                                    color: Colores.placa,
                                    borderRadius: BorderRadius.circular(7),
                                    border: Border.all(color: const Color(0xFF1A1A1A), width: 2.5),
                                  ),
                                  child: Column(
                                    mainAxisAlignment: MainAxisAlignment.center,
                                    children: [
                                      SizedBox(
                                        height: 42,
                                        child: TextField(
                                          controller: _placa,
                                          autofocus: true,
                                          textAlign: TextAlign.center,
                                          textCapitalization: TextCapitalization.characters,
                                          keyboardType: TextInputType.visiblePassword,
                                          autocorrect: false,
                                          enableSuggestions: false,
                                          onSubmitted: (_) => _buscar(),
                                          inputFormatters: [
                                            FilteringTextInputFormatter.allow(RegExp('[A-Za-z0-9]')),
                                            LengthLimitingTextInputFormatter(6),
                                            TextInputFormatter.withFunction(
                                              (_, nuevo) => nuevo.copyWith(text: nuevo.text.toUpperCase()),
                                            ),
                                          ],
                                          cursorColor: Colores.textoPlaca,
                                          style: estilo(
                                            36,
                                            peso: FontWeight.w700,
                                            color: Colores.textoPlaca,
                                            espaciado: 0.06,
                                            altura: 1.1,
                                          ),
                                          decoration: InputDecoration(
                                            isCollapsed: true,
                                            border: InputBorder.none,
                                            hintText: 'ABC123',
                                            hintStyle: estilo(
                                              36,
                                              peso: FontWeight.w700,
                                              color: const Color(0x4D111111),
                                              espaciado: 0.06,
                                            ),
                                          ),
                                        ),
                                      ),
                                      Text(
                                        'COLOMBIA',
                                        style: estilo(
                                          8.5,
                                          peso: FontWeight.w700,
                                          color: Colores.textoPlaca,
                                          espaciado: 0.24,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                              IgnorePointer(
                                child: AnimatedContainer(
                                  duration: const Duration(milliseconds: 250),
                                  decoration: BoxDecoration(
                                    borderRadius: BorderRadius.circular(18),
                                    border: Border.all(color: colorRecuadro, width: 2),
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 24),
                        Container(
                          height: 30,
                          padding: const EdgeInsets.symmetric(horizontal: 14),
                          decoration: BoxDecoration(
                            color: const Color(0x80000000),
                            borderRadius: BorderRadius.circular(999),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Punto(colorRecuadro, tamano: 7),
                              const SizedBox(width: 8),
                              Text(
                                _valida ? 'Placa válida' : 'Carro ABC123 · moto ABC12D',
                                style: estilo(13, color: Colores.blanco),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
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
                    Row(
                      children: [
                        Container(
                          width: 38,
                          height: 38,
                          decoration: BoxDecoration(
                            color: _valida ? Colores.exitoSuave : Colores.chip,
                            borderRadius: BorderRadius.circular(Radios.bloque),
                          ),
                          child: Icon(
                            _valida ? Icons.check : Icons.keyboard_outlined,
                            size: 18,
                            color: _valida ? Colores.exito : Colores.textoApoyo,
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                _valida
                                    ? (esPlacaDeMoto(_normalizada) ? 'Placa de moto' : 'Placa de carro')
                                    : 'Escribe la placa en la placa amarilla',
                                style: estilo(12, color: Colores.textoSecundario),
                              ),
                              Text(
                                _normalizada.isEmpty ? '— — —' : formatoPlaca(_normalizada),
                                style: estiloMono(22, espaciado: 0.08),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    Row(
                      children: [
                        Expanded(
                          child: BotonSecundario(
                            texto: 'Borrar',
                            alPresionar: _placa.text.isEmpty ? null : _placa.clear,
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          flex: 2,
                          child: BotonPrimario(
                            texto: 'Buscar en Corefaze',
                            alto: 48,
                            alPresionar: _valida ? _buscar : null,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
