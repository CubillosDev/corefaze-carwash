const path = require('path');
const {
  baseBloqueServicio,
  baseAleatoriaDeServicio,
  ARCHIVOS_CON_BLOQUE_DE_SERVICIO,
  USO_MAXIMO_DE_SERVICIO,
  TAMANO_BLOQUE_SERVICIO,
} = require('../../utils/valorUnico');

// apps/api: valorUnico.js vive en tests/utils/, dos niveles abajo de apps/api.
const RAIZ_API = path.resolve(__dirname, '..', '..', '..');
const rutaAbsoluta = (relativo) => path.join(RAIZ_API, ...relativo.split('/'));

describe('baseBloqueServicio', () => {
  it('da una base distinta y estable a cada archivo registrado', () => {
    const bases = ARCHIVOS_CON_BLOQUE_DE_SERVICIO.map((archivo) =>
      baseBloqueServicio(rutaAbsoluta(archivo)),
    );

    expect(new Set(bases).size).toBe(bases.length);
    // Llamarlo otra vez con el mismo archivo da la misma base (determinista).
    ARCHIVOS_CON_BLOQUE_DE_SERVICIO.forEach((archivo, indice) => {
      expect(baseBloqueServicio(rutaAbsoluta(archivo))).toBe(bases[indice]);
    });
  });

  it('los bloques no se solapan entre sí', () => {
    const bases = [...ARCHIVOS_CON_BLOQUE_DE_SERVICIO]
      .map((archivo) => baseBloqueServicio(rutaAbsoluta(archivo)))
      .sort((a, b) => a - b);

    for (let i = 1; i < bases.length; i += 1) {
      expect(bases[i]).toBeGreaterThanOrEqual(bases[i - 1] + TAMANO_BLOQUE_SERVICIO);
    }
  });

  it('todos los bloques caben en el rango de servicios.numero (smallint, 1-32767)', () => {
    ARCHIVOS_CON_BLOQUE_DE_SERVICIO.forEach((archivo) => {
      const base = baseBloqueServicio(rutaAbsoluta(archivo));
      expect(base).toBeGreaterThanOrEqual(1);
      expect(base + TAMANO_BLOQUE_SERVICIO - 1).toBeLessThanOrEqual(32767);
    });
  });

  it('todos los bloques quedan por encima de los numero 1-16 que ocupa el seed', () => {
    ARCHIVOS_CON_BLOQUE_DE_SERVICIO.forEach((archivo) => {
      expect(baseBloqueServicio(rutaAbsoluta(archivo))).toBeGreaterThan(16);
    });
  });

  it('rechaza un archivo sin bloque reservado con un error claro', () => {
    expect(() => baseBloqueServicio(rutaAbsoluta('tests/integration/noExiste.test.js'))).toThrow(
      /no tiene un bloque de numero de servicio reservado/,
    );
  });
});

describe('USO_MAXIMO_DE_SERVICIO', () => {
  it('tiene un uso máximo registrado, por debajo del tamaño del bloque, para cada archivo', () => {
    ARCHIVOS_CON_BLOQUE_DE_SERVICIO.forEach((archivo) => {
      expect(USO_MAXIMO_DE_SERVICIO[archivo]).toBeGreaterThan(0);
      expect(USO_MAXIMO_DE_SERVICIO[archivo]).toBeLessThan(TAMANO_BLOQUE_SERVICIO);
    });
  });
});

describe('baseAleatoriaDeServicio', () => {
  it('nunca se sale de su propio bloque, ni siquiera agotando el uso máximo registrado', () => {
    ARCHIVOS_CON_BLOQUE_DE_SERVICIO.forEach((archivo) => {
      const base = baseBloqueServicio(rutaAbsoluta(archivo));
      const usoMaximo = USO_MAXIMO_DE_SERVICIO[archivo];

      // Muestreo: el desplazamiento es aleatorio, así que se repite varias
      // veces para que una corrida con mala suerte no deje pasar un bug.
      for (let intento = 0; intento < 200; intento += 1) {
        const sello = baseAleatoriaDeServicio(rutaAbsoluta(archivo));
        expect(sello).toBeGreaterThanOrEqual(base);
        // El contador llega hasta usoMaximo: ni siquiera en el peor caso
        // (agotarlo entero) se debe tocar el bloque del archivo siguiente.
        expect(sello + usoMaximo - 1).toBeLessThan(base + TAMANO_BLOQUE_SERVICIO);
      }
    });
  });

  it('es aleatorio de una corrida a otra (no siempre el mismo desplazamiento)', () => {
    const archivo = rutaAbsoluta(ARCHIVOS_CON_BLOQUE_DE_SERVICIO[0]);
    const sellos = new Set(Array.from({ length: 30 }, () => baseAleatoriaDeServicio(archivo)));

    expect(sellos.size).toBeGreaterThan(1);
  });

  it('rechaza un archivo sin uso máximo registrado con un error claro', () => {
    expect(() =>
      baseAleatoriaDeServicio(rutaAbsoluta('tests/integration/noExiste.test.js')),
    ).toThrow(/no tiene un bloque de numero de servicio reservado/);
  });
});
