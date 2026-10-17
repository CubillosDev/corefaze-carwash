import { IconoMenu } from '@/components/ui/iconos/IconoMenu';

/**
 * Barra superior del panel.
 *
 * En pantallas angostas trae el botón que abre el cajón de navegación y repite
 * la marca, porque allí la barra lateral está oculta.
 *
 * @param {object} props
 * @param {() => void} props.alAbrirMenu
 * @param {boolean} props.menuAbierto
 * @param {import('react').ReactNode} [props.acciones] Acciones de la página actual.
 */
export function Encabezado({ alAbrirMenu, menuAbierto, acciones }) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-neutro-200 bg-white px-4 escritorio:px-8">
      <button
        type="button"
        onClick={alAbrirMenu}
        aria-label="Abrir menú de navegación"
        aria-expanded={menuAbierto}
        className="-ml-1 rounded-control p-2 text-neutro-600 transition-colors hover:bg-neutro-100 hover:text-neutro-900 escritorio:hidden"
      >
        <IconoMenu />
      </button>

      <span className="flex min-w-0 items-center gap-2 escritorio:hidden">
        <img src="/favicon.svg" alt="" aria-hidden="true" className="size-7 shrink-0" />
        <span className="truncate text-control font-semibold text-neutro-900">Car Wash</span>
      </span>

      <p className="hidden text-control font-medium text-neutro-500 escritorio:block">Panel de gestión</p>

      <div className="ml-auto flex shrink-0 items-center gap-2">
        {import.meta.env.DEV ? (
          <span className="hidden rounded-full bg-resalte px-2.5 py-1 text-meta font-medium text-neutro-900 escritorio:inline">
            Desarrollo
          </span>
        ) : null}
        {acciones}
      </div>
    </header>
  );
}
