/**
 * Preguntas frecuentes del botón de ayuda. El diseño trae su propia lista,
 * pero habla de funciones que este panel no tiene (escanear la placa,
 * trabajar sin internet); aquí cada respuesta describe lo que el panel hace.
 */
export const PREGUNTAS_FRECUENTES = Object.freeze([
  {
    pregunta: '¿Cómo registro una orden de lavado?',
    respuesta:
      'En Inicio u Órdenes toca “Nueva orden”: escribe la placa, elige el servicio y el colaborador. El valor lo calcula el sistema con la tarifa del tipo de vehículo y la orden entra como Registrada.',
  },
  {
    pregunta: '¿Cómo abro la jornada con el código QR?',
    respuesta:
      'Con la jornada cerrada, en Inicio verás un código que cambia cada 30 segundos. Escanéalo con la app móvil de Corefaze. Si no la tienes a mano, toca “Abrir desde aquí”.',
  },
  {
    pregunta: '¿Cómo cobro un vehículo terminado?',
    respuesta:
      'En Caja elige el vehículo en “Por cobrar”, el medio de pago y confirma. La orden queda Entregada y puedes imprimir el comprobante.',
  },
  {
    pregunta: '¿Cómo hago el cierre de caja?',
    respuesta:
      'En Caja toca “Cerrar caja” y escribe el efectivo contado. Antes de confirmar verás si la caja cuadra, sobra o falta.',
  },
  {
    pregunta: '¿Cómo reimprimo un comprobante?',
    respuesta: 'En Caja, en “Movimientos de hoy”, toca el cobro: se despliega el comprobante con el botón “Reimprimir”.',
  },
  {
    pregunta: '¿Cómo cargo un servicio a crédito?',
    respuesta:
      'Al cobrar en Caja elige Crédito, la empresa y el número de vale. Después, en Crédito, verificas los vales y registras los pagos de la empresa.',
  },
  {
    pregunta: '¿Puedo cambiar los precios de los servicios?',
    respuesta:
      'Sí, si tu rol lo permite. En Catálogo edita el servicio y su tarifa por tipo de vehículo; el cambio aplica a las órdenes nuevas.',
  },
  {
    pregunta: '¿Cómo agrego un colaborador?',
    respuesta:
      'En Colaboradores toca “Nuevo colaborador” con su código, documento y comisión. Los colaboradores no se borran: se desactivan.',
  },
  {
    pregunta: '¿Cómo le doy acceso a una persona nueva?',
    respuesta:
      'Pídele que toque “Solicitar acceso” en la pantalla de ingreso. Un superadministrador la aprueba en Usuarios y le asigna un rol.',
  },
]);
