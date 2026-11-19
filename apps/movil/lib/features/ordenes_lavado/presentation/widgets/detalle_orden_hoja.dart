import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../../../app/tema.dart';
import '../../../../core/constants/dominio.dart';
import '../../../../core/constants/etiquetas.dart';
import '../../../../core/utils/formato_fecha.dart';
import '../../../../core/utils/formato_moneda.dart';
import '../../../../core/utils/validador_placa.dart';
import '../../../../core/widgets/boton_primario.dart';
import '../../../../core/widgets/campo_texto.dart';
import '../../../../core/widgets/piezas.dart';
import '../../../../core/widgets/placa.dart';
import '../controllers/movimientos_orden.dart';
import '../controllers/ordenes_lavado_controller.dart';

/// Cambia la fase de la orden en la API; con [motivo] la cancela.
typedef CambiarEstadoOrden = Future<void> Function(String destino, {String? motivo});

/// Abre la hoja con el detalle de una orden y sus cambios de fase. Devuelve el
/// mensaje para confirmar el cambio, o null si se cerró sin cambiar nada.
Future<String?> mostrarDetalleOrden(
  BuildContext context, {
  required IngresoDelDia ingreso,
  required String rol,
  required CambiarEstadoOrden alCambiar,
}) {
  return showModalBottomSheet<String>(
    context: context,
    isScrollControlled: true,
    showDragHandle: true,
    backgroundColor: Colores.hoja,
    shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(Radios.hojaFlotante))),
    builder: (_) => _DetalleOrden(ingreso: ingreso, rol: rol, alCambiar: alCambiar),
  );
}

class _DetalleOrden extends StatefulWidget {
  const _DetalleOrden({required this.ingreso, required this.rol, required this.alCambiar});

  final IngresoDelDia ingreso;
  final String rol;
  final CambiarEstadoOrden alCambiar;

  @override
  State<_DetalleOrden> createState() => _DetalleOrdenState();
}

class _DetalleOrdenState extends State<_DetalleOrden> {
  /// Estado al que se está moviendo la orden mientras responde la API.
  String? _enviando;
  String? _error;

  String get _placa => formatoPlaca(widget.ingreso.vehiculo?.placa ?? '');

  Future<void> _enviar(String destino, String confirmacion, {String? motivo}) async {
    setState(() {
      _enviando = destino;
      _error = null;
    });
    try {
      await widget.alCambiar(destino, motivo: motivo);
      if (mounted) {
        Navigator.of(context).pop(confirmacion);
      }
    } catch (fallo) {
      if (mounted) {
        setState(() {
          _enviando = null;
          _error = fallo.toString();
        });
      }
    }
  }

  void _mover(MovimientoOrden movimiento) {
    final fase = etiquetaEstadoOrden(movimiento.destino);
    _enviar(movimiento.destino, movimiento.devuelve ? '$_placa volvió a $fase.' : '$_placa pasó a $fase.');
  }

  Future<void> _cancelar() async {
    final motivo = await showDialog<String>(context: context, builder: (_) => const _DialogoCancelar());
    if (motivo != null && mounted) {
      await _enviar(EstadosOrden.cancelada, 'La orden de $_placa quedó cancelada.', motivo: motivo);
    }
  }

  @override
  Widget build(BuildContext context) {
    final orden = widget.ingreso.orden;
    final movimientos = movimientosDe(orden.estado);
    final avances = movimientos.where((m) => !m.devuelve);
    final devoluciones = movimientos.where((m) => m.devuelve);
    final cerrada = transicionesOrden[orden.estado]?.isEmpty ?? true;
    final ocupado = _enviando != null;
    return SafeArea(
      top: false,
      child: SingleChildScrollView(
        padding: EdgeInsets.fromLTRB(20, 0, 20, 20 + MediaQuery.viewInsetsOf(context).bottom),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            _Cabecera(ingreso: widget.ingreso),
            const SizedBox(height: 16),
            _Datos(ingreso: widget.ingreso),
            const SizedBox(height: 16),
            if (_error != null) ...[AvisoEnLinea(_error!, error: true), const SizedBox(height: 12)],
            if (orden.estado == EstadosOrden.terminada) ...[
              const AvisoEnLinea('Se entrega al cobrarla en la caja del panel.'),
              const SizedBox(height: 12),
            ],
            if (cerrada)
              Text(
                'Esta orden ya está cerrada: no cambia de fase.',
                textAlign: TextAlign.center,
                style: estilo(12.5, color: Colores.textoAtenuado),
              ),
            for (final movimiento in avances) ...[
              BotonPrimario(
                texto: movimiento.etiqueta,
                cargando: _enviando == movimiento.destino,
                alPresionar: ocupado ? null : () => _mover(movimiento),
              ),
              const SizedBox(height: 10),
            ],
            for (final movimiento in devoluciones) ...[
              BotonSecundario(texto: movimiento.etiqueta, alPresionar: ocupado ? null : () => _mover(movimiento)),
              const SizedBox(height: 10),
            ],
            if (sePuedeCancelar(orden.estado, widget.rol))
              TextButton(
                onPressed: ocupado ? null : _cancelar,
                style: TextButton.styleFrom(
                  foregroundColor: Colores.error,
                  minimumSize: const Size.fromHeight(44),
                  textStyle: estilo(13.5, peso: FontWeight.w600),
                ),
                child: const Text('Cancelar orden'),
              ),
          ],
        ),
      ),
    );
  }
}

class _Cabecera extends StatelessWidget {
  const _Cabecera({required this.ingreso});

  final IngresoDelDia ingreso;

  @override
  Widget build(BuildContext context) {
    final vehiculo = ingreso.vehiculo;
    final estado = ingreso.orden.estado;
    final color = colorEstadoOrden(estado);
    final descripcion = vehiculo == null
        ? 'Vehículo'
        : (vehiculo.descripcion.isEmpty ? etiquetaTipoVehiculo(vehiculo.tipoVehiculo) : vehiculo.descripcion);
    return Row(
      children: [
        Placa(vehiculo?.placa ?? '—', tamano: 14),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Semantics(
                header: true,
                child: Text(
                  descripcion,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: estilo(16, peso: FontWeight.w600),
                ),
              ),
              Text(
                ingreso.servicio?.nombre ?? 'Servicio',
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: estilo(12.5, color: Colores.textoApoyo),
              ),
            ],
          ),
        ),
        const SizedBox(width: 8),
        Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Punto(color),
            const SizedBox(width: 5),
            Text(
              etiquetaEstadoOrden(estado),
              style: estilo(12, peso: FontWeight.w600, color: color),
            ),
          ],
        ),
      ],
    );
  }
}

class _Datos extends StatelessWidget {
  const _Datos({required this.ingreso});

  final IngresoDelDia ingreso;

  @override
  Widget build(BuildContext context) {
    final orden = ingreso.orden;
    final colaborador = ingreso.colaborador;
    final observaciones = orden.observaciones?.trim() ?? '';
    final filas = [
      ('Turno', '#${orden.turno}'),
      ('Colaborador', colaborador == null ? '—' : '${colaborador.codigo} · ${colaborador.nombre}'),
      ('Pago previsto', etiquetaMedioPago(orden.medioPago)),
      ('Valor', formatoMoneda(orden.valor)),
      ('Ingreso', formatoHora(orden.creadaEn)),
      if (observaciones.isNotEmpty) ('Observaciones', observaciones),
    ];
    return TarjetaSeccion(
      child: Column(
        children: [
          for (final (indice, (etiqueta, valor)) in filas.indexed) ...[
            if (indice > 0) const Divider(height: 18, color: Colores.divisor),
            MergeSemantics(
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  SizedBox(
                    width: 110,
                    child: Text(etiqueta, style: estilo(12.5, color: Colores.textoEtiqueta)),
                  ),
                  Expanded(
                    child: Text(
                      valor,
                      textAlign: TextAlign.right,
                      style: estilo(13, peso: FontWeight.w600),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }
}

/// Pide el motivo, obligatorio para anular una orden. Devuelve el motivo o
/// null si la persona se arrepiente.
class _DialogoCancelar extends StatefulWidget {
  const _DialogoCancelar();

  @override
  State<_DialogoCancelar> createState() => _DialogoCancelarState();
}

class _DialogoCancelarState extends State<_DialogoCancelar> {
  final _motivo = TextEditingController();

  @override
  void initState() {
    super.initState();
    _motivo.addListener(() => setState(() {}));
  }

  @override
  void dispose() {
    _motivo.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final motivo = _motivo.text.trim();
    return AlertDialog(
      backgroundColor: Colores.blanco,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(Radios.seccion)),
      title: Text('¿Cancelar la orden?', style: estilo(17, peso: FontWeight.w600)),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            'La orden queda anulada y ya no se puede cambiar.',
            style: estilo(13, color: Colores.textoSecundario, altura: 1.4),
          ),
          const SizedBox(height: 14),
          CampoTexto(
            etiqueta: 'Motivo',
            controlador: _motivo,
            marcador: 'Ej.: el cliente se retiró',
            formateadores: [LengthLimitingTextInputFormatter(Limites.observacionesMax)],
          ),
        ],
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(),
          style: TextButton.styleFrom(foregroundColor: Colores.textoControl),
          child: const Text('Volver'),
        ),
        TextButton(
          onPressed: motivo.isEmpty ? null : () => Navigator.of(context).pop(motivo),
          style: TextButton.styleFrom(foregroundColor: Colores.error),
          child: const Text('Cancelar orden'),
        ),
      ],
    );
  }
}
