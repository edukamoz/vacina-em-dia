import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/** Uma unidade básica de saúde do arquivo que acompanha a API. */
export interface UnitRecord {
  readonly cnes: string;
  readonly name: string;
  readonly address: string;
  readonly neighborhood: string;
  readonly municipalityCode: string;
  readonly latitude: number;
  readonly longitude: number;
}

/** Arquivo de unidades já lido: registros, fonte e versão. */
export interface UnitsDataset {
  readonly units: readonly UnitRecord[];
  readonly version: string;
  readonly source: {
    readonly name: string;
    readonly publisher: string;
    readonly url: string;
  };
}

/** Formato do `ubs.json` gerado por `scripts/importar-ubs.mjs`. */
interface RawDataset {
  readonly fonte: { readonly nome: string; readonly editor: string; readonly url: string };
  readonly versao: string;
  readonly rows: readonly (readonly [string, string, string, string, string, number, number])[];
}

/**
 * Converte o conteúdo do `ubs.json` em registros.
 *
 * @param text - Texto JSON do arquivo.
 * @throws Error se o conteúdo não tiver o formato esperado.
 */
export function parseUnitsDataset(text: string): UnitsDataset {
  const raw = JSON.parse(text) as RawDataset;
  if (!Array.isArray(raw.rows) || typeof raw.versao !== 'string') {
    throw new Error('Arquivo de unidades em formato inesperado.');
  }
  return {
    version: raw.versao,
    source: { name: raw.fonte.nome, publisher: raw.fonte.editor, url: raw.fonte.url },
    units: raw.rows.map(([cnes, name, address, neighborhood, municipalityCode, lat, lon]) => ({
      cnes,
      name,
      address,
      neighborhood,
      municipalityCode,
      latitude: lat,
      longitude: lon,
    })),
  };
}

let cached: UnitsDataset | undefined;

/**
 * Lê o arquivo de unidades que acompanha a API (`src/data/ubs.json`, copiado para `dist` no
 * build). A leitura é feita uma vez e guardada em memória.
 */
export function loadBundledUnits(): UnitsDataset {
  cached ??= parseUnitsDataset(readFileSync(join(__dirname, '..', 'data', 'ubs.json'), 'utf8'));
  return cached;
}
