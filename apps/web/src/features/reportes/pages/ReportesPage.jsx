import { Link } from 'react-router';

import { IconoReportes } from '@/components/ui/iconos/IconoReportes';
import { ModuloProximamente } from '@/components/ui/ModuloProximamente';
import { RUTAS } from '@/constants/rutas';

/**
 * Reportes. El diseño muestra ventas por día, mezcla de servicios y ranking
 * de colaboradores: la API no entrega esos agregados y el panel no los
 * calcula. Los totales por jornada sí existen y se ven en Jornadas.
 */
export function ReportesPage() {
  return (
    <ModuloProximamente
      titulo="Reportes"
      descripcion="Ventas, servicios y colaboradores por periodo"
      icono={<IconoReportes className="size-5" />}
      motivo="La API todavía no entrega reportes por periodo. Los servicios y la venta de cada jornada, calculados por el servidor, están en Jornadas."
      accion={
        <Link to={RUTAS.JORNADAS} className="text-detalle font-semibold">
          Ir a jornadas
        </Link>
      }
    />
  );
}
