import 'dart:async';

import 'package:flutter/material.dart';

import '../../../../app/dependencias.dart';
import '../../../../app/router.dart';
import '../../../../app/tema.dart';
import '../../../../core/constants/etiquetas.dart';
import '../../../../core/utils/formato_fecha.dart';
import '../../../../core/utils/validador_placa.dart';
import '../../../../core/widgets/boton_primario.dart';
import '../../../../core/widgets/piezas.dart';
import '../../../jornadas/data/models/jornada.dart';
import '../controllers/consulta_placa.dart';
import 'nueva_orden_screen.dart';
import 'placa_screen.dart';

/// Lo mínimo que se ve cada paso, para que la consulta se pueda leer.
const _pausaPorPaso = Duration(milliseconds: 320);

/// Consulta de la placa en Corefaze (en el diseño, "Consultando bases de
/// datos públicas": el RUNT está fuera del alcance). Al terminar, abre el
/// formulario con lo encontrado.
class ConsultaScreen extends StatefulWidget {
  const ConsultaScreen({super.key, required this.jornada, required this.placa});

  final Jornada jornada;
  final String placa;

  @override
  State<ConsultaScreen> createState() => _ConsultaScreenState();
}

class _ConsultaScreenState extends State<ConsultaScreen> {
  final Map<PasoConsulta, (String, bool)> _terminados = {};
  String? _error;

  @override
  void initState() {
    super.initState();
    _consultar();
  }

  Future<void> _consultar() async {
    setState(() {
      _terminados.clear();
      _error = null;
    });
    final dependencias = Dependencias.leer(context);
    var espera = Future<void>.value();
    try {
      final resultado = await consultarPlaca(
        dependencias,
        widget.placa,
        alTerminarPaso: (paso, parcial) {
          espera = espera.then((_) => Future.delayed(_pausaPorPaso)).then((_) {
            if (mounted) {
              setState(() => _terminados[paso] = _textoDelPaso(paso, parcial));
            }
          });
        },
      );
      await espera;
      await Future<void>.delayed(_pausaPorPaso);
      if (mounted) {
        unawaited(reemplazarCon<void>(context, NuevaOrdenScreen(jornada: widget.jornada, consulta: resultado)));
      }
    } catch (error) {
      if (mounted) {
        setState(() => _error = error.toString());
      }
    }
  }

  /// Texto de apoyo de un paso y si es un aviso (ámbar) en vez de un visto.
  (String, bool) _textoDelPaso(PasoConsulta paso, ResultadoParcial parcial) => switch (paso) {
    PasoConsulta.vehiculo =>
      parcial.vehiculo == null
          ? ('No está registrado: lo registras ahora', true)
          : (
              [
                etiquetaTipoVehiculo(parcial.vehiculo!.tipoVehiculo),
                if (parcial.vehiculo!.descripcion.isNotEmpty) parcial.vehiculo!.descripcion,
              ].join(' · '),
              false,
            ),
    PasoConsulta.dueno =>
      parcial.dueno == null
          ? ('Lo registras con el vehículo', true)
          : (
              parcial.dueno!.puedePagarACredito
                  ? '${parcial.dueno!.nombre} · empresa con crédito'
                  : parcial.dueno!.nombre,
              false,
            ),
    PasoConsulta.historial =>
      parcial.visitas == 0
          ? ('Primera visita', false)
          : (
              '${parcial.visitas} ${parcial.visitas == 1 ? 'visita' : 'visitas'} · última el ${formatoFecha(parcial.ultimaFecha)}',
              false,
            ),
    PasoConsulta.catalogo => ('${parcial.servicios} servicios · ${parcial.colaboradores} colaboradores', false),
  };

  @override
  Widget build(BuildContext context) {
    const etiquetas = {
      PasoConsulta.vehiculo: 'Vehículo',
      PasoConsulta.dueno: 'Dueño',
      PasoConsulta.historial: 'Historial',
      PasoConsulta.catalogo: 'Servicios y colaboradores',
    };
    final actual = PasoConsulta.values.where((paso) => !_terminados.containsKey(paso)).firstOrNull;
    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(26, 40, 26, 40),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Center(
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 10),
                  decoration: BoxDecoration(
                    color: const Color(0x14FFFFFF),
                    borderRadius: BorderRadius.circular(Radios.bloque),
                    border: Border.all(color: const Color(0x24FFFFFF)),
                  ),
                  child: Text(formatoPlaca(widget.placa), style: estiloMono(30, color: Colores.blanco, espaciado: 0.1)),
                ),
              ),
              const SizedBox(height: 12),
              Text(
                _error == null ? 'Buscando en Corefaze' : 'No pudimos terminar la búsqueda',
                textAlign: TextAlign.center,
                style: estilo(13, color: Colores.sobreMarco),
              ),
              const SizedBox(height: 30),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                decoration: BoxDecoration(
                  color: const Color(0x0DFFFFFF),
                  borderRadius: BorderRadius.circular(Radios.resumen),
                  border: Border.all(color: const Color(0x14FFFFFF)),
                ),
                child: Column(
                  children: [
                    for (final paso in PasoConsulta.values)
                      _FilaPaso(
                        etiqueta: etiquetas[paso]!,
                        terminado: _terminados[paso],
                        enCurso: _error == null && paso == actual,
                        alcanzado: _terminados.containsKey(paso) || paso == actual,
                      ),
                  ],
                ),
              ),
              if (_error != null) ...[
                const SizedBox(height: 20),
                AvisoEnLinea(_error!, error: true),
                const SizedBox(height: 12),
                BotonPrimario(texto: 'Reintentar', alto: 48, alPresionar: _consultar),
                const SizedBox(height: 4),
                BotonSobreMarco(
                  texto: 'Cambiar la placa',
                  conBorde: false,
                  alPresionar: () =>
                      reemplazarCon<void>(context, PlacaScreen(jornada: widget.jornada, placaInicial: widget.placa)),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

class _FilaPaso extends StatelessWidget {
  const _FilaPaso({required this.etiqueta, required this.terminado, required this.enCurso, required this.alcanzado});

  final String etiqueta;
  final (String, bool)? terminado;
  final bool enCurso;
  final bool alcanzado;

  @override
  Widget build(BuildContext context) {
    final (apoyo, aviso) = terminado ?? (enCurso ? 'Consultando…' : 'En espera', false);
    final color = terminado == null ? null : (aviso ? Colores.advertenciaSolido : Colores.exitoSolido);
    return AnimatedOpacity(
      duration: const Duration(milliseconds: 250),
      opacity: alcanzado ? 1 : 0.4,
      child: ConstrainedBox(
        constraints: const BoxConstraints(minHeight: 52),
        child: Row(
          children: [
            AnimatedContainer(
              duration: const Duration(milliseconds: 250),
              width: 26,
              height: 26,
              decoration: BoxDecoration(
                color: color ?? Colors.transparent,
                shape: BoxShape.circle,
                border: Border.all(color: color ?? (enCurso ? Colores.brillo : const Color(0x40FFFFFF)), width: 2),
              ),
              child: terminado == null
                  ? null
                  : aviso
                  ? Center(
                      child: Text(
                        '!',
                        style: estilo(13, peso: FontWeight.w800, color: Colores.blanco),
                      ),
                    )
                  : const Icon(Icons.check_rounded, size: 14, color: Colores.blanco),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    etiqueta,
                    style: estilo(14, peso: FontWeight.w500, color: Colores.blanco),
                  ),
                  Text(
                    apoyo,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: estilo(12, color: Colores.sobreMarcoTenue),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
