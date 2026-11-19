import 'package:flutter/material.dart';

import '../../../../app/tema.dart';
import '../../../../core/constants/etiquetas.dart';
import '../../../../core/utils/formato_fecha.dart';
import '../../../../core/utils/validador_placa.dart';
import '../../../../core/widgets/piezas.dart';
import '../../../../core/widgets/placa.dart';
import '../controllers/ordenes_lavado_controller.dart';

/// Fila de "Ingresados hoy": placa, vehículo, servicio, hora y estado. Al
/// tocarla abre el detalle de la orden.
class TarjetaOrden extends StatelessWidget {
  const TarjetaOrden(this.ingreso, {super.key, this.alTocar});

  final IngresoDelDia ingreso;
  final VoidCallback? alTocar;

  @override
  Widget build(BuildContext context) {
    final orden = ingreso.orden;
    final color = colorEstadoOrden(orden.estado);
    final vehiculo = ingreso.vehiculo;
    final descripcion = vehiculo == null
        ? 'Vehículo'
        : (vehiculo.descripcion.isEmpty ? etiquetaTipoVehiculo(vehiculo.tipoVehiculo) : vehiculo.descripcion);
    return Semantics(
      label:
          '${formatoPlaca(vehiculo?.placa ?? '')}, ${ingreso.servicio?.nombre ?? ''}, '
          '${etiquetaEstadoOrden(orden.estado)}, ${formatoHora(orden.creadaEn)}',
      button: alTocar != null,
      hint: alTocar == null ? null : 'Ver la orden y cambiar su fase',
      excludeSemantics: true,
      child: Material(
        color: Colores.blanco,
        shape: RoundedRectangleBorder(
          side: const BorderSide(color: Colores.bordeFila),
          borderRadius: BorderRadius.circular(Radios.tarjeta),
        ),
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: alTocar,
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            child: Row(
              children: [
                Placa(vehiculo?.placa ?? '—'),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        descripcion,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: estilo(13.5, peso: FontWeight.w600),
                      ),
                      Text(
                        ingreso.servicio?.nombre ?? 'Servicio',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: estilo(12, color: Colores.textoApoyo),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 8),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text(formatoHora(orden.creadaEn), style: estilo(12, color: Colores.textoAtenuado)),
                    const SizedBox(height: 2),
                    Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Punto(color),
                        const SizedBox(width: 5),
                        Text(
                          etiquetaEstadoOrden(orden.estado),
                          style: estilo(11.5, peso: FontWeight.w600, color: color),
                        ),
                      ],
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
