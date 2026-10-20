import logoCorefaze from '@/assets/images/logo-corefaze.webp';
import { Boton } from '@/components/ui/Boton';
import { IconoMenu } from '@/components/ui/iconos/IconoMenu';

/**
 * Cabecera del panel sobre el fondo del marco: logo, divisor y nombre de la
 * aplicación. Al pasar el puntero, el logo se despliega y muestra la palabra
 * COREFAZE.
 *
 * En pantallas angostas suma el botón que abre el cajón de navegación.
 *
 * @param {object} props
 * @param {() => void} props.alAbrirMenu
 * @param {boolean} props.menuAbierto
 * @param {string} props.idMenu Id del elemento que abre el botón (aria-controls).
 */
export function Encabezado({ alAbrirMenu, menuAbierto, idMenu }) {
  return (
    <header className="flex h-encabezado shrink-0 items-center px-3 escritorio:px-4.5">
      <div className="flex items-center gap-3.5">
        <Boton
          variante="marco"
          tamano="icono"
          onClick={alAbrirMenu}
          aria-label="Abrir menú de navegación"
          aria-expanded={menuAbierto}
          aria-controls={idMenu}
          className="-mr-1 escritorio:hidden"
        >
          <IconoMenu />
        </Boton>

        <div
          title="Corefaze"
          className="h-6 w-6 shrink-0 overflow-hidden transition-[width] duration-380 ease-suave hover:w-29.75"
        >
          <img src={logoCorefaze} alt="Corefaze" className="block h-6 w-auto max-w-none" />
        </div>

        <span aria-hidden="true" className="h-5 w-px shrink-0 bg-white/25" />

        <span className="text-marca text-white">CarWash</span>
      </div>
    </header>
  );
}
