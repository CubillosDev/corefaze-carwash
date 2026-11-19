import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../../../app/dependencias.dart';
import '../../../../app/router.dart';
import '../../../../app/tema.dart';
import '../../../../core/constants/dominio.dart';
import '../../../../core/constants/etiquetas.dart';
import '../../../../core/utils/formato_fecha.dart';
import '../../../../core/utils/formato_moneda.dart';
import '../../../../core/widgets/boton_primario.dart';
import '../../../../core/widgets/piezas.dart';
import '../../../../core/widgets/placa.dart';
import '../../../jornadas/data/models/jornada.dart';
import '../../../servicios/data/models/servicio.dart';
import '../controllers/consulta_placa.dart';
import '../controllers/ordenes_lavado_form.dart';
import 'orden_registrada_screen.dart';
import 'placa_screen.dart';

/// "Nuevo ingreso" del diseño: vehículo (y su dueño si es nuevo), tipo,
/// servicio, colaborador, pago previsto y estado de recepción. No envía valor
/// ni estado: el valor lo calcula el servidor (R4) y la orden nace registrada.
class NuevaOrdenScreen extends StatefulWidget {
  const NuevaOrdenScreen({super.key, required this.jornada, required this.consulta});

  final Jornada jornada;
  final ResultadoConsulta consulta;

  @override
  State<NuevaOrdenScreen> createState() => _NuevaOrdenScreenState();
}

class _NuevaOrdenScreenState extends State<NuevaOrdenScreen> {
  late final NuevaOrdenForm _form;

  @override
  void initState() {
    super.initState();
    _form = NuevaOrdenForm(
      consulta: widget.consulta,
      jornada: widget.jornada,
      rol: Dependencias.leer(context).sesion.usuario!.rol,
    );
  }

  @override
  void dispose() {
    _form.dispose();
    super.dispose();
  }

  Future<void> _registrar() async {
    FocusScope.of(context).unfocus();
    final registrado = await _form.registrar(Dependencias.leer(context));
    if (registrado != null && mounted) {
      unawaited(reemplazarCon<void>(context, OrdenRegistradaScreen(jornada: widget.jornada, registrado: registrado)));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: ListenableBuilder(
        listenable: _form,
        builder: (context, _) => SafeArea(
          bottom: false,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              _Encabezado(form: _form, jornada: widget.jornada),
              Expanded(
                child: HojaClara(
                  child: ListView(
                    padding: const EdgeInsets.fromLTRB(14, 16, 14, 24),
                    children: [
                      for (final seccion in _secciones()) ...[seccion, const SizedBox(height: 12)],
                    ],
                  ),
                ),
              ),
              _Pie(form: _form, alRegistrar: _registrar),
            ],
          ),
        ),
      ),
    );
  }

  List<Widget> _secciones() {
    final form = _form;
    return [
      if (form.vehiculoNuevo && !form.puedeRegistrarVehiculo)
        const AvisoEnLinea(
          'Esta placa no está registrada y tu rol no registra vehículos. Pide a un administrador que la registre.',
        )
      else if (form.vehiculoNuevo)
        const AvisoEnLinea('Esta placa no está registrada en Corefaze. Completa los datos del vehículo y de su dueño.'),
      if (form.consulta.dueno != null) _TarjetaDueno(form: form),
      _SeccionVehiculo(form: form),
      if (form.vehiculoNuevo && form.puedeRegistrarVehiculo) _SeccionDueno(form: form),
      _SeccionTipo(form: form),
      _SeccionServicio(form: form),
      _SeccionColaborador(form: form),
      _SeccionPago(form: form),
      _SeccionRecepcion(form: form),
      if (form.error != null) AvisoEnLinea(form.error!, error: true),
    ];
  }
}

class _Encabezado extends StatelessWidget {
  const _Encabezado({required this.form, required this.jornada});

  final NuevaOrdenForm form;
  final Jornada jornada;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(14, 12, 14, 14),
      child: Row(
        children: [
          BotonRedondo(icono: Icons.chevron_left, etiqueta: 'Volver', alPresionar: () => Navigator.of(context).pop()),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Nuevo ingreso',
                  style: estilo(16, peso: FontWeight.w600, color: Colores.blanco),
                ),
                Text(
                  form.vehiculoNuevo ? 'Vehículo nuevo · completa sus datos' : 'Vehículo registrado en Corefaze',
                  style: estilo(12, color: Colores.sobreMarco),
                ),
              ],
            ),
          ),
          Semantics(
            button: true,
            label: 'Cambiar la placa',
            child: GestureDetector(
              onTap: () =>
                  reemplazarCon<void>(context, PlacaScreen(jornada: jornada, placaInicial: form.consulta.placa)),
              child: Placa(form.consulta.placa, tamano: 15, amarilla: true),
            ),
          ),
        ],
      ),
    );
  }
}

class _TarjetaDueno extends StatelessWidget {
  const _TarjetaDueno({required this.form});

  final NuevaOrdenForm form;

  @override
  Widget build(BuildContext context) {
    final dueno = form.consulta.dueno!;
    final consulta = form.consulta;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: Colores.blanco,
        border: Border.all(color: Colores.bordeTarjeta),
        borderRadius: BorderRadius.circular(Radios.tarjeta),
      ),
      child: Row(
        children: [
          Container(
            width: 36,
            height: 36,
            alignment: Alignment.center,
            decoration: const BoxDecoration(color: Colores.primario100, shape: BoxShape.circle),
            child: Text(
              dueno.iniciales,
              style: estilo(12, peso: FontWeight.w700, color: Colores.primario800),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Wrap(
                  spacing: 6,
                  crossAxisAlignment: WrapCrossAlignment.center,
                  children: [
                    Text(dueno.nombre, style: estilo(13.5, peso: FontWeight.w600)),
                    if (consulta.visitas > 0)
                      _Insignia('${consulta.visitas} ${consulta.visitas == 1 ? 'visita' : 'visitas'}'),
                    if (dueno.puedePagarACredito) const _Insignia('Crédito'),
                  ],
                ),
                const SizedBox(height: 1),
                Text(
                  consulta.ultimoServicio == null
                      ? 'Primera visita'
                      : 'Último servicio: ${consulta.ultimoServicio} · ${formatoFecha(consulta.ultimaFecha)}',
                  style: estilo(12, color: Colores.textoApoyo),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _Insignia extends StatelessWidget {
  const _Insignia(this.texto);

  final String texto;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 1),
      decoration: BoxDecoration(color: Colores.primario100, borderRadius: BorderRadius.circular(999)),
      child: Text(
        texto,
        style: estilo(10.5, peso: FontWeight.w600, color: Colores.primario),
      ),
    );
  }
}

class _SeccionVehiculo extends StatelessWidget {
  const _SeccionVehiculo({required this.form});

  final NuevaOrdenForm form;

  @override
  Widget build(BuildContext context) {
    final vehiculo = form.consulta.vehiculo;
    return TarjetaSeccion(
      titulo: 'Vehículo',
      relleno: false,
      adorno: vehiculo == null
          ? null
          : Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
              decoration: BoxDecoration(color: Colores.exitoSuave, borderRadius: BorderRadius.circular(999)),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.check_rounded, size: 11, color: Colores.exito),
                  const SizedBox(width: 5),
                  Text(
                    'Registrado',
                    style: estilo(11, peso: FontWeight.w600, color: Colores.exito),
                  ),
                ],
              ),
            ),
      child: Column(
        children: [
          _FilaCampo(
            etiqueta: 'Marca',
            valor: vehiculo?.marca ?? form.marca,
            marcador: 'Ej. Mazda',
            soloLectura: vehiculo != null,
            error: form.errores['marca'],
            alCambiar: (texto) => form.cambiarTexto('marca', texto),
          ),
          _FilaCampo(
            etiqueta: 'Color',
            valor: vehiculo?.color ?? form.color,
            marcador: 'Ej. Blanco',
            soloLectura: vehiculo != null,
            error: form.errores['color'],
            alCambiar: (texto) => form.cambiarTexto('color', texto),
          ),
        ],
      ),
    );
  }
}

class _SeccionDueno extends StatelessWidget {
  const _SeccionDueno({required this.form});

  final NuevaOrdenForm form;

  @override
  Widget build(BuildContext context) {
    final encontrado = form.duenoEncontrado;
    return TarjetaSeccion(
      titulo: 'Dueño',
      relleno: false,
      adorno: form.buscandoDueno
          ? const SizedBox.square(
              dimension: 14,
              child: CircularProgressIndicator(strokeWidth: 2, color: Colores.primario),
            )
          : null,
      child: Column(
        children: [
          _FilaCampo(
            etiqueta: 'Documento',
            valor: form.documentoDueno,
            marcador: 'Solo números',
            teclado: TextInputType.number,
            formateadores: [
              FilteringTextInputFormatter.digitsOnly,
              LengthLimitingTextInputFormatter(Limites.documentoMax),
            ],
            error: form.errores['documento'],
            alCambiar: (texto) => form.cambiarDocumento(Dependencias.leer(context), texto),
          ),
          if (encontrado != null)
            _FilaInformativa(etiqueta: 'Cliente', texto: '${encontrado.nombre} · ya registrado')
          else ...[
            _FilaCampo(
              etiqueta: 'Nombre',
              valor: form.nombreDueno,
              marcador: 'Nombre completo',
              capitalizar: true,
              error: form.errores['nombre'],
              alCambiar: (texto) => form.cambiarTexto('nombre', texto),
            ),
            _FilaCampo(
              etiqueta: 'Celular',
              valor: form.telefonoDueno,
              marcador: '3001234567',
              teclado: TextInputType.phone,
              formateadores: [
                FilteringTextInputFormatter.digitsOnly,
                LengthLimitingTextInputFormatter(Limites.telefono),
              ],
              error: form.errores['telefono'],
              alCambiar: (texto) => form.cambiarTexto('telefono', texto),
            ),
          ],
        ],
      ),
    );
  }
}

/// Fila "Etiqueta ........ valor" del diseño, editable o de solo lectura.
class _FilaCampo extends StatelessWidget {
  const _FilaCampo({
    required this.etiqueta,
    required this.valor,
    required this.alCambiar,
    this.marcador,
    this.soloLectura = false,
    this.error,
    this.teclado,
    this.formateadores,
    this.capitalizar = false,
  });

  final String etiqueta;
  final String valor;
  final ValueChanged<String> alCambiar;
  final String? marcador;
  final bool soloLectura;
  final String? error;
  final TextInputType? teclado;
  final List<TextInputFormatter>? formateadores;
  final bool capitalizar;

  @override
  Widget build(BuildContext context) {
    if (soloLectura) {
      return _FilaInformativa(etiqueta: etiqueta, texto: valor.isEmpty ? '—' : valor);
    }
    return Container(
      decoration: const BoxDecoration(
        border: Border(top: BorderSide(color: Colores.bordeInterno)),
      ),
      padding: const EdgeInsets.symmetric(horizontal: 14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          MergeSemantics(
            child: SizedBox(
              height: 46,
              child: Row(
                children: [
                  SizedBox(
                    width: 74,
                    child: Text(etiqueta, style: estilo(12.5, color: Colores.textoApoyo)),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: TextFormField(
                      initialValue: valor,
                      onChanged: alCambiar,
                      keyboardType: teclado,
                      inputFormatters: formateadores,
                      textCapitalization: capitalizar ? TextCapitalization.words : TextCapitalization.sentences,
                      textAlign: TextAlign.right,
                      style: estilo(14, peso: FontWeight.w500),
                      decoration: InputDecoration(
                        isCollapsed: true,
                        border: InputBorder.none,
                        hintText: marcador,
                        hintStyle: estilo(14, color: Colores.marcador),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
          if (error != null)
            Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: Text(
                error!,
                textAlign: TextAlign.right,
                style: estilo(12, peso: FontWeight.w500, color: Colores.error),
              ),
            ),
        ],
      ),
    );
  }
}

class _FilaInformativa extends StatelessWidget {
  const _FilaInformativa({required this.etiqueta, required this.texto});

  final String etiqueta;
  final String texto;

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 46,
      padding: const EdgeInsets.symmetric(horizontal: 14),
      decoration: const BoxDecoration(
        border: Border(top: BorderSide(color: Colores.bordeInterno)),
      ),
      child: Row(
        children: [
          SizedBox(
            width: 74,
            child: Text(etiqueta, style: estilo(12.5, color: Colores.textoApoyo)),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              texto,
              textAlign: TextAlign.right,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: estilo(14, peso: FontWeight.w500),
            ),
          ),
        ],
      ),
    );
  }
}

class _SeccionTipo extends StatelessWidget {
  const _SeccionTipo({required this.form});

  final NuevaOrdenForm form;

  @override
  Widget build(BuildContext context) {
    return TarjetaSeccion(
      titulo: 'Tipo de vehículo',
      adorno: form.vehiculoNuevo
          ? null
          : Text(
              'Del registro',
              style: estilo(11.5, peso: FontWeight.w600, color: Colores.primario),
            ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const SizedBox(height: 10),
          _Cuadricula(
            columnas: 2,
            hijos: [
              for (final tipo in TiposVehiculo.todos)
                OpcionElegible(
                  elegida: form.tipoVehiculo == tipo,
                  alElegir: form.vehiculoNuevo ? () => form.elegirTipo(tipo) : null,
                  child: Text(etiquetaTipoVehiculo(tipo)),
                ),
            ],
          ),
          if (form.errores['tipoVehiculo'] != null) _Error(form.errores['tipoVehiculo']!),
        ],
      ),
    );
  }
}

class _SeccionServicio extends StatelessWidget {
  const _SeccionServicio({required this.form});

  final NuevaOrdenForm form;

  @override
  Widget build(BuildContext context) {
    final servicio = form.servicio;
    final categorias = form.categorias;
    final disponibles = form.serviciosDeLaCategoria;
    final habitual = form.consulta.servicioHabitualId;
    return TarjetaSeccion(
      titulo: 'Servicio',
      adorno: categorias.length > 1
          ? ControlSegmentado<String>(
              opciones: [for (final c in categorias) (c, etiquetaCategoria(c))],
              valor: form.categoria,
              alCambiar: form.elegirCategoria,
            )
          : null,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const SizedBox(height: 12),
          if (form.tipoVehiculo == null)
            Text('Elige primero el tipo de vehículo.', style: estilo(12, color: Colores.textoAtenuado))
          else if (disponibles.isEmpty)
            Text('No hay servicios de esta categoría para este tipo.', style: estilo(12, color: Colores.textoAtenuado))
          else
            _Cuadricula(
              columnas: 5,
              hijos: [
                for (final s in disponibles)
                  _NumeroServicio(
                    servicio: s,
                    elegido: s.id == form.servicioId,
                    habitual: s.id == habitual,
                    alElegir: () => form.elegirServicio(s.id),
                  ),
              ],
            ),
          if (servicio != null) ...[
            const SizedBox(height: 10),
            Container(
              padding: const EdgeInsets.fromLTRB(8, 10, 6, 10),
              decoration: BoxDecoration(color: Colores.primario50, borderRadius: BorderRadius.circular(Radios.bloque)),
              child: Row(
                children: [
                  Container(
                    constraints: const BoxConstraints(minWidth: 30),
                    height: 30,
                    padding: const EdgeInsets.symmetric(horizontal: 5),
                    alignment: Alignment.center,
                    decoration: BoxDecoration(
                      color: Colores.primario,
                      borderRadius: BorderRadius.circular(Radios.opcion),
                    ),
                    child: Text(
                      '${servicio.numero}',
                      style: estilo(12, peso: FontWeight.w700, color: Colores.blanco),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          servicio.nombre,
                          style: estilo(13.5, peso: FontWeight.w600, color: Colores.primario800),
                        ),
                        Text(
                          (servicio.descripcion ?? '').trim().isEmpty
                              ? etiquetaCategoria(servicio.categoria)
                              : servicio.descripcion!,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: estilo(11.5, color: Colores.textoSeleccion),
                        ),
                      ],
                    ),
                  ),
                  if (form.valorEstimado != null)
                    Text(formatoMoneda(form.valorEstimado!), style: estilo(13.5, peso: FontWeight.w600)),
                  IconButton(
                    tooltip: 'Quitar',
                    onPressed: () => form.elegirServicio(null),
                    icon: const Icon(Icons.close, size: 16, color: Colores.textoQuitar),
                    visualDensity: VisualDensity.compact,
                  ),
                ],
              ),
            ),
            if (servicio.exigeAutorizacionMotor)
              CheckboxListTile(
                value: form.autorizaMotor,
                onChanged: (valor) => form.cambiarAutorizaMotor(valor ?? false),
                contentPadding: EdgeInsets.zero,
                controlAffinity: ListTileControlAffinity.leading,
                activeColor: Colores.primario,
                title: Text('El cliente autoriza el lavado de motor', style: estilo(13, peso: FontWeight.w500)),
              ),
          ] else
            Padding(
              padding: const EdgeInsets.only(top: 10),
              child: Text(
                habitual == null
                    ? 'Toca un número para ver el servicio'
                    : 'Toca un número · el punto azul marca su servicio habitual',
                style: estilo(12, color: Colores.textoAtenuado),
              ),
            ),
          for (final campo in ['servicioId', 'autorizaMotor'])
            if (form.errores[campo] != null) _Error(form.errores[campo]!),
        ],
      ),
    );
  }
}

class _NumeroServicio extends StatelessWidget {
  const _NumeroServicio({
    required this.servicio,
    required this.elegido,
    required this.habitual,
    required this.alElegir,
  });

  final Servicio servicio;
  final bool elegido;
  final bool habitual;
  final VoidCallback alElegir;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      selected: elegido,
      label: '${servicio.numero}, ${servicio.nombre}${habitual ? ', su servicio habitual' : ''}',
      excludeSemantics: true,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 150),
        height: 48,
        decoration: BoxDecoration(
          color: elegido ? Colores.primario : Colores.blanco,
          border: Border.all(color: elegido ? Colores.primario : Colores.bordeOpcion, width: 1.5),
          borderRadius: BorderRadius.circular(Radios.bloque),
        ),
        child: Material(
          type: MaterialType.transparency,
          child: InkWell(
            borderRadius: BorderRadius.circular(Radios.bloque),
            onTap: alElegir,
            child: Stack(
              children: [
                Center(
                  child: Text(
                    '${servicio.numero}',
                    style: estilo(16, peso: FontWeight.w700, color: elegido ? Colores.blanco : Colores.primario800),
                  ),
                ),
                if (habitual) Positioned(top: 5, right: 5, child: Punto(elegido ? Colores.blanco : Colores.primario)),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _SeccionColaborador extends StatelessWidget {
  const _SeccionColaborador({required this.form});

  final NuevaOrdenForm form;

  @override
  Widget build(BuildContext context) {
    final colaboradores = form.consulta.colaboradores;
    return TarjetaSeccion(
      titulo: 'Colaborador',
      adorno: form.colaborador == null
          ? null
          : Text(form.colaborador!.nombre, style: estilo(11.5, color: Colores.textoEtiqueta)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const SizedBox(height: 10),
          if (colaboradores.isEmpty)
            Text('No hay colaboradores activos.', style: estilo(12, color: Colores.textoAtenuado))
          else
            _Cuadricula(
              columnas: 4,
              hijos: [
                for (final colaborador in colaboradores)
                  OpcionElegible(
                    alto: 44,
                    etiqueta: '${colaborador.codigo}, ${colaborador.nombre}',
                    elegida: form.colaboradorId == colaborador.id,
                    alElegir: () => form.elegirColaborador(colaborador.id),
                    child: Text(
                      '${colaborador.codigo}',
                      style: estiloMono(
                        14,
                        espaciado: 0,
                        color: form.colaboradorId == colaborador.id ? Colores.primario800 : Colores.textoControl,
                      ),
                    ),
                  ),
              ],
            ),
          if (form.errores['colaboradorId'] != null) _Error(form.errores['colaboradorId']!),
        ],
      ),
    );
  }
}

class _SeccionPago extends StatelessWidget {
  const _SeccionPago({required this.form});

  final NuevaOrdenForm form;

  @override
  Widget build(BuildContext context) {
    return TarjetaSeccion(
      titulo: 'Pago',
      adorno: Text('Se confirma al cobrar en caja', style: estilo(11.5, color: Colores.textoEtiqueta)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const SizedBox(height: 10),
          _Cuadricula(
            columnas: 3,
            hijos: [
              for (final medio in form.mediosDisponibles)
                OpcionElegible(
                  alto: 40,
                  elegida: form.medioPago == medio,
                  alElegir: () => form.elegirMedioPago(medio),
                  child: Text(etiquetaMedioPago(medio)),
                ),
            ],
          ),
          if (form.errores['medioPago'] != null) _Error(form.errores['medioPago']!),
        ],
      ),
    );
  }
}

class _SeccionRecepcion extends StatefulWidget {
  const _SeccionRecepcion({required this.form});

  final NuevaOrdenForm form;

  @override
  State<_SeccionRecepcion> createState() => _SeccionRecepcionState();
}

class _SeccionRecepcionState extends State<_SeccionRecepcion> {
  bool _abierta = false;

  @override
  Widget build(BuildContext context) {
    final form = widget.form;
    final resumen = [
      if (form.marcas.isNotEmpty) '${form.marcas.length} ${form.marcas.length == 1 ? 'aviso' : 'avisos'}',
      if (form.nota.trim().isNotEmpty) 'Con nota',
    ].join(' · ');
    return TarjetaSeccion(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Semantics(
            button: true,
            expanded: _abierta,
            child: InkWell(
              onTap: () => setState(() => _abierta = !_abierta),
              child: Row(
                children: [
                  Expanded(
                    child: Text.rich(
                      TextSpan(
                        children: [
                          TextSpan(
                            text: 'Estado de recepción',
                            style: estilo(14, peso: FontWeight.w600),
                          ),
                          TextSpan(
                            text: '   Opcional',
                            style: estilo(11.5, color: Colores.textoEtiqueta),
                          ),
                        ],
                      ),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  if (resumen.isNotEmpty) ...[
                    const SizedBox(width: 8),
                    Text(resumen, style: estilo(11.5, color: Colores.textoEtiqueta)),
                  ],
                  const SizedBox(width: 8),
                  AnimatedRotation(
                    turns: _abierta ? 0.5 : 0,
                    duration: const Duration(milliseconds: 200),
                    child: const Icon(Icons.expand_more, size: 18, color: Colores.textoEtiqueta),
                  ),
                ],
              ),
            ),
          ),
          if (_abierta) ...[
            const SizedBox(height: 12),
            Wrap(
              spacing: 6,
              runSpacing: 6,
              children: [
                for (final marca in marcasDeRecepcion)
                  _MarcaRecepcion(
                    texto: marca,
                    elegida: form.marcas.contains(marca),
                    alElegir: () => form.alternarMarca(marca),
                  ),
              ],
            ),
            const SizedBox(height: 10),
            TextFormField(
              initialValue: form.nota,
              onChanged: (texto) => form.cambiarTexto('nota', texto),
              maxLength: Limites.observacionesMax,
              style: estilo(13.5),
              decoration: InputDecoration(
                hintText: 'Observaciones (opcional)',
                hintStyle: estilo(13.5, color: Colores.marcador),
                counterText: '',
                isDense: true,
                filled: true,
                fillColor: Colores.campo,
                contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(Radios.campo),
                  borderSide: const BorderSide(color: Colores.bordeOpcion),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(Radios.campo),
                  borderSide: const BorderSide(color: Colores.primario),
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _MarcaRecepcion extends StatelessWidget {
  const _MarcaRecepcion({required this.texto, required this.elegida, required this.alElegir});

  final String texto;
  final bool elegida;
  final VoidCallback alElegir;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      selected: elegida,
      child: GestureDetector(
        onTap: alElegir,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 150),
          height: 32,
          padding: const EdgeInsets.symmetric(horizontal: 12),
          decoration: BoxDecoration(
            color: elegida ? Colores.texto : Colores.blanco,
            border: Border.all(color: elegida ? Colores.texto : Colores.bordeOpcion),
            borderRadius: BorderRadius.circular(999),
          ),
          // widthFactor 1: la píldora mide lo que su texto, no el ancho de la fila.
          child: Center(
            widthFactor: 1,
            child: Text(
              texto,
              style: estilo(12.5, peso: FontWeight.w500, color: elegida ? Colores.blanco : Colores.textoControl),
            ),
          ),
        ),
      ),
    );
  }
}

class _Pie extends StatelessWidget {
  const _Pie({required this.form, required this.alRegistrar});

  final NuevaOrdenForm form;
  final VoidCallback alRegistrar;

  @override
  Widget build(BuildContext context) {
    final abajo = MediaQuery.paddingOf(context).bottom;
    return Container(
      padding: EdgeInsets.fromLTRB(16, 12, 16, 12 + (abajo > 0 ? abajo : 10)),
      decoration: const BoxDecoration(
        color: Colores.blanco,
        border: Border(top: BorderSide(color: Colores.bordeFila)),
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  form.servicio?.nombre ?? 'Selecciona un servicio',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: estilo(11.5, color: Colores.textoSecundario),
                ),
                Tooltip(
                  message: 'Tarifa vigente; el valor lo confirma el sistema',
                  child: Text(
                    form.valorEstimado == null ? r'$ 0' : formatoMoneda(form.valorEstimado!),
                    style: estilo(19, peso: FontWeight.w600, espaciado: -0.01),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 12),
          BotonPrimario(
            texto: 'Ingresar al patio',
            alto: 50,
            expandido: false,
            cargando: form.enviando,
            alPresionar: form.completo ? alRegistrar : null,
          ),
        ],
      ),
    );
  }
}

/// Cuadrícula de opciones del mismo ancho, como las del diseño.
class _Cuadricula extends StatelessWidget {
  const _Cuadricula({required this.columnas, required this.hijos});

  final int columnas;
  final List<Widget> hijos;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, limites) {
        const espacio = 6.0;
        final ancho = (limites.maxWidth - espacio * (columnas - 1)) / columnas;
        return Wrap(
          spacing: espacio,
          runSpacing: espacio,
          children: [for (final hijo in hijos) SizedBox(width: ancho, child: hijo)],
        );
      },
    );
  }
}

class _Error extends StatelessWidget {
  const _Error(this.texto);

  final String texto;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(top: 8),
      child: Text(
        texto,
        style: estilo(12, peso: FontWeight.w500, color: Colores.error),
      ),
    );
  }
}
