import { Link } from 'react-router';

import { IconoCredito } from '@/components/ui/iconos/IconoCredito';
import { ModuloProximamente } from '@/components/ui/ModuloProximamente';
import { RUTAS } from '@/constants/rutas';

/**
 * Crédito empresarial. La base de datos ya tiene los pagos de crédito, pero la
 * API no expone saldos, cupos ni pagos: no se muestran datos inventados.
 */
export function CreditoPage() {
  return (
    <ModuloProximamente
      titulo="Crédito"
      descripcion="Cuentas de clientes con crédito habilitado"
      icono={<IconoCredito className="size-5" />}
      motivo="La API todavía no ofrece saldos, cupos ni pagos de crédito. Mientras tanto, el crédito de cada cliente se habilita en Clientes y las órdenes a crédito se registran con el medio de pago Crédito."
      accion={
        <Link to={RUTAS.CLIENTES} className="text-detalle font-semibold">
          Ir a clientes
        </Link>
      }
    />
  );
}
