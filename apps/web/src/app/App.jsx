import { RouterProvider } from 'react-router';

import { Providers } from '@/app/providers';
import { router } from '@/app/router';

/** Raíz de la aplicación: contextos globales y enrutador. */
export function App() {
  return (
    <Providers>
      <RouterProvider router={router} />
    </Providers>
  );
}
