import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const leer = (ruta) => readFileSync(fileURLToPath(new URL(ruta, import.meta.url)), 'utf8').replace(/\r\n/g, '\n');

const csp = JSON.parse(leer('../vercel.json'))
  .headers.flatMap((regla) => regla.headers)
  .find((encabezado) => encabezado.key === 'Content-Security-Policy').value;

describe('CSP de la landing (vercel.json)', () => {
  it('autoriza por hash cada script en línea de index.html', () => {
    const scripts = [...leer('../index.html').matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
    expect(scripts.length).toBeGreaterThan(0);
    for (const script of scripts) {
      const hash = createHash('sha256').update(script).digest('base64');
      expect(csp).toContain(`'sha256-${hash}'`);
    }
  });

  it('no permite scripts en línea sin hash ni eval', () => {
    const scriptSrc = csp.split(';').find((directiva) => directiva.trim().startsWith('script-src'));
    expect(scriptSrc).not.toContain("'unsafe-inline'");
    expect(scriptSrc).not.toContain("'unsafe-eval'");
  });
});
