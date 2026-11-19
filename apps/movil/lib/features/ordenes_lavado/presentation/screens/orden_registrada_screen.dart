import 'package:flutter/material.dart';

import '../../../../app/router.dart';
import '../../../../app/tema.dart';
import '../../../../core/constants/etiquetas.dart';
import '../../../../core/utils/formato_moneda.dart';
import '../../../../core/widgets/boton_primario.dart';
import '../../../../core/widgets/placa.dart';
import '../../../jornadas/data/models/jornada.dart';
import '../controllers/ordenes_lavado_form.dart';
import 'placa_screen.dart';

/// "Vehículo ingresado" del diseño. El valor que muestra es el que calculó el
/// servidor (R4).
class OrdenRegistradaScreen extends StatelessWidget {
  const OrdenRegistradaScreen({super.key, required this.jornada, required this.registrado});

  final Jornada jornada;
  final IngresoRegistrado registrado;

  @override
  Widget build(BuildContext context) {
    final orden = registrado.orden;
    final vehiculo = registrado.vehiculo;
    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 24, 20, 24),
          child: Column(
            children: [
              Expanded(
                child: Center(
                  child: SingleChildScrollView(
                    child: Column(
                      children: [
                        Container(
                          width: 76,
                          height: 76,
                          decoration: const BoxDecoration(
                            color: Colores.exitoSolido,
                            shape: BoxShape.circle,
                            boxShadow: Sombras.confirmacion,
                          ),
                          child: const Icon(Icons.check_rounded, size: 38, color: Colores.blanco),
                        ),
                        const SizedBox(height: 22),
                        Semantics(
                          liveRegion: true,
                          child: Text(
                            'Vehículo ingresado',
                            style: estilo(22, peso: FontWeight.w600, color: Colores.blanco),
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'Ya aparece en el tablero como ${etiquetaEstadoOrden(orden.estado)}',
                          textAlign: TextAlign.center,
                          style: estilo(13.5, color: Colores.sobreMarco),
                        ),
                        Container(
                          width: double.infinity,
                          margin: const EdgeInsets.only(top: 26),
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: Colores.blanco,
                            borderRadius: BorderRadius.circular(Radios.resumen),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Placa(vehiculo.placa, tamano: 16, amarilla: true),
                                  Text('Turno #${orden.turno}', style: estilo(12, color: Colores.textoEtiqueta)),
                                ],
                              ),
                              const SizedBox(height: 12),
                              Text(
                                vehiculo.descripcion.isEmpty
                                    ? etiquetaTipoVehiculo(vehiculo.tipoVehiculo)
                                    : vehiculo.descripcion,
                                style: estilo(15, peso: FontWeight.w600),
                              ),
                              const SizedBox(height: 2),
                              Text(registrado.servicio.nombre, style: estilo(12.5, color: Colores.textoApoyo)),
                              Container(
                                margin: const EdgeInsets.only(top: 14),
                                padding: const EdgeInsets.only(top: 12),
                                decoration: const BoxDecoration(
                                  border: Border(top: BorderSide(color: Colores.divisor)),
                                ),
                                child: Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    Text(
                                      'Colaborador ${registrado.colaborador.codigo}',
                                      style: estilo(13, color: Colores.textoSecundario),
                                    ),
                                    Text(formatoMoneda(orden.valor), style: estilo(13, peso: FontWeight.w600)),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
              BotonPrimario(
                texto: 'Registrar otro',
                alto: 56,
                alPresionar: () => reemplazarCon<void>(context, PlacaScreen(jornada: jornada)),
              ),
              const SizedBox(height: 8),
              BotonSobreMarco(texto: 'Volver al inicio', conBorde: false, alPresionar: () => volverAlInicio(context)),
            ],
          ),
        ),
      ),
    );
  }
}
