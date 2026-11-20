import 'package:flutter/material.dart';

import '../../../../app/dependencias.dart';
import '../../../../app/router.dart';
import '../../../../app/tema.dart';
import '../../../../core/constants/dominio.dart';
import '../../../../core/constants/etiquetas.dart';
import '../../../../core/utils/formato_fecha.dart';
import '../../../../core/widgets/boton_primario.dart';
import '../../../../core/widgets/piezas.dart';
import '../../../autenticacion/presentation/widgets/encabezado_marca.dart';
import '../../../jornadas/presentation/screens/escanear_qr_screen.dart';
import '../controllers/ordenes_lavado_controller.dart';
import '../widgets/detalle_orden_hoja.dart';
import '../widgets/tarjeta_orden.dart';
import 'placa_screen.dart';

/// "Recepción" del diseño: estado de la jornada, la acción de registrar un
/// ingreso y lo que entró hoy. Sin jornada abierta, la acción es abrirla con
/// el QR del panel. Cada orden del día se abre para ver su detalle y cambiar
/// su fase.
class OrdenesLavadoScreen extends StatefulWidget {
  const OrdenesLavadoScreen({super.key});

  @override
  State<OrdenesLavadoScreen> createState() => _OrdenesLavadoScreenState();
}

class _OrdenesLavadoScreenState extends State<OrdenesLavadoScreen> {
  late final OrdenesLavadoController _controlador;

  @override
  void initState() {
    super.initState();
    _controlador = OrdenesLavadoController(Dependencias.leer(context))..cargar();
  }

  @override
  void dispose() {
    _controlador.dispose();
    super.dispose();
  }

  Future<void> _registrarIngreso() async {
    final jornada = _controlador.jornada;
    if (jornada == null) {
      return;
    }
    await irA<void>(context, PlacaScreen(jornada: jornada));
    if (mounted) {
      await _controlador.cargar(silencioso: true);
    }
  }

  Future<void> _abrirOrden(IngresoDelDia ingreso) async {
    final mensaje = await mostrarDetalleOrden(
      context,
      ingreso: ingreso,
      rol: Dependencias.leer(context).sesion.usuario!.rol,
      alCambiar: (destino, {motivo}) => _controlador.cambiarEstado(ingreso, destino, motivo: motivo),
    );
    if (mensaje != null && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(mensaje)));
    }
  }

  Future<void> _abrirJornada() async {
    final abierta = await irA<bool>(context, const EscanearQrScreen());
    if (abierta == true && mounted) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Jornada abierta. Ya puedes registrar ingresos.')));
      await _controlador.cargar();
    }
  }

  @override
  Widget build(BuildContext context) {
    final sesion = Dependencias.de(context).sesion;
    final usuario = sesion.usuario!;
    return Scaffold(
      body: ListenableBuilder(
        listenable: _controlador,
        builder: (context, _) {
          final jornada = _controlador.jornada;
          final listo = _controlador.situacion == Situacion.listo;
          return SafeArea(
            bottom: false,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Padding(
                  padding: const EdgeInsets.fromLTRB(20, 16, 20, 0),
                  child: EncabezadoMarca(
                    derecha: [
                      if (listo) _ChipJornada(abierta: jornada != null),
                      _ChipUsuario(rol: etiquetaRol(usuario.rol), alCerrarSesion: sesion.cerrarSesion),
                    ],
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.fromLTRB(20, 26, 20, 22),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Semantics(
                        header: true,
                        child: Text(
                          'Recepción',
                          style: estilo(26, peso: FontWeight.w600, color: Colores.blanco, espaciado: -0.02),
                        ),
                      ),
                      const SizedBox(height: 3),
                      Text(
                        '${fechaLarga(DateTime.now())}'
                        '${listo && jornada != null ? ' · ${_controlador.ingresos.length} ingresos hoy' : ''}',
                        style: estilo(13, color: Colores.sobreMarco),
                      ),
                      const SizedBox(height: 22),
                      if (!listo || jornada != null)
                        BotonPrimario(
                          texto: 'Registrar ingreso',
                          icono: const Icon(Icons.document_scanner_outlined, size: 22, color: Colores.blanco),
                          alto: 60,
                          sombra: true,
                          alPresionar: listo ? _registrarIngreso : null,
                        )
                      else ...[
                        BotonPrimario(
                          texto: 'Abrir jornada con el QR',
                          icono: const Icon(Icons.qr_code_scanner, size: 22, color: Colores.blanco),
                          alto: 60,
                          sombra: true,
                          alPresionar: _abrirJornada,
                        ),
                        const SizedBox(height: 10),
                        Text(
                          'No hay jornada abierta. Escanea el código que muestra el panel en Inicio.',
                          style: estilo(12.5, color: Colores.sobreMarco, altura: 1.4),
                        ),
                      ],
                    ],
                  ),
                ),
                Expanded(
                  child: HojaClara(
                    child: _Ingresos(controlador: _controlador, alAbrir: _abrirOrden),
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}

class _Ingresos extends StatelessWidget {
  const _Ingresos({required this.controlador, required this.alAbrir});

  final OrdenesLavadoController controlador;
  final ValueChanged<IngresoDelDia> alAbrir;

  @override
  Widget build(BuildContext context) {
    return RefreshIndicator(
      color: Colores.primario,
      onRefresh: () => controlador.cargar(silencioso: true),
      child: ListView(
        padding: const EdgeInsets.fromLTRB(16, 20, 16, 40),
        physics: const AlwaysScrollableScrollPhysics(),
        children: [
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 4),
            child: Row(
              children: [
                Expanded(
                  child: Text(
                    'Ingresados hoy',
                    overflow: TextOverflow.ellipsis,
                    style: estilo(15, peso: FontWeight.w600),
                  ),
                ),
                const SizedBox(width: 8),
                Text('Más recientes', style: estilo(12, color: Colores.textoEtiqueta)),
              ],
            ),
          ),
          if (controlador.situacion == Situacion.listo && controlador.ingresos.isNotEmpty) ...[
            const SizedBox(height: 12),
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: ControlSegmentado<String?>(
                opciones: [
                  (null, 'Todas'),
                  for (final fase in EstadosOrden.fasesDelPatio)
                    (fase, '${etiquetaEstadoOrden(fase)} ${controlador.cuantosEn(fase)}'),
                ],
                valor: controlador.filtro,
                alCambiar: controlador.filtrar,
              ),
            ),
          ],
          const SizedBox(height: 12),
          ...switch (controlador.situacion) {
            Situacion.cargando => [
              const Padding(
                padding: EdgeInsets.symmetric(vertical: 40),
                child: Center(child: CircularProgressIndicator(color: Colores.primario)),
              ),
            ],
            Situacion.error => [
              AvisoEnLinea(controlador.error, error: true),
              const SizedBox(height: 12),
              BotonSecundario(texto: 'Reintentar', alPresionar: controlador.cargar),
            ],
            Situacion.listo when controlador.ingresos.isEmpty => [
              _Vacio(
                controlador.jornada == null
                    ? 'Abre la jornada para empezar a recibir vehículos.'
                    : 'Todavía no hay ingresos en esta jornada.',
              ),
            ],
            Situacion.listo when controlador.visibles.isEmpty => [const _Vacio('No hay órdenes en esta fase.')],
            Situacion.listo => [
              for (final ingreso in controlador.visibles)
                Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: TarjetaOrden(ingreso, alTocar: () => alAbrir(ingreso)),
                ),
            ],
          },
        ],
      ),
    );
  }
}

class _Vacio extends StatelessWidget {
  const _Vacio(this.texto);

  final String texto;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 28, horizontal: 18),
      decoration: BoxDecoration(
        border: Border.all(color: Colores.bordeOpcion, width: 1.5),
        borderRadius: BorderRadius.circular(Radios.tarjeta),
      ),
      child: Text(
        texto,
        textAlign: TextAlign.center,
        style: estilo(12.5, color: Colores.textoAtenuado),
      ),
    );
  }
}

class _ChipJornada extends StatelessWidget {
  const _ChipJornada({required this.abierta});

  final bool abierta;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      label: abierta ? 'Jornada abierta' : 'Sin jornada abierta',
      excludeSemantics: true,
      child: Container(
        height: 28,
        padding: const EdgeInsets.symmetric(horizontal: 10),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(999),
          border: Border.all(color: const Color(0x38FFFFFF)),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Punto(abierta ? Colores.exitoVivo : Colores.advertenciaSolido),
            const SizedBox(width: 7),
            Flexible(
              child: Text(
                abierta ? 'Abierta' : 'Sin jornada',
                overflow: TextOverflow.ellipsis,
                style: estilo(12, peso: FontWeight.w500, color: Colores.blanco),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ChipUsuario extends StatelessWidget {
  const _ChipUsuario({required this.rol, required this.alCerrarSesion});

  final String rol;
  final Future<void> Function() alCerrarSesion;

  @override
  Widget build(BuildContext context) {
    return PopupMenuButton<String>(
      tooltip: 'Tu cuenta',
      position: PopupMenuPosition.under,
      color: Colores.blanco,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(Radios.bloque)),
      onSelected: (_) => alCerrarSesion(),
      itemBuilder: (_) => [
        PopupMenuItem(
          value: 'salir',
          child: Text('Cerrar sesión', style: estilo(13.5, peso: FontWeight.w500)),
        ),
      ],
      child: Container(
        height: 30,
        padding: const EdgeInsets.symmetric(horizontal: 11),
        alignment: Alignment.center,
        decoration: BoxDecoration(color: Colores.primario, borderRadius: BorderRadius.circular(999)),
        child: Text(
          rol,
          overflow: TextOverflow.ellipsis,
          style: estilo(11.5, peso: FontWeight.w600, color: Colores.blanco),
        ),
      ),
    );
  }
}
