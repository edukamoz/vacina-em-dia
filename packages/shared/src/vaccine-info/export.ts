import type { VaccineInfoSet, VaccineInfoSource } from './vaccine-info';

/** Fonte como o assistente (Python) a cita. */
export interface NlpVaccineInfoSource {
  readonly name: string;
  readonly publisher: string;
  readonly edition: string;
  readonly url: string;
}

/** O que o assistente precisa de cada ficha: só onde estão as reações no manual oficial. */
export interface NlpVaccineInfoItem {
  readonly vaccine: string;
  readonly quadro: string;
  readonly page: number;
}

/** Fichas no formato lido pelo serviço de PLN. */
export interface NlpVaccineInfo {
  readonly adverseEventsSource: NlpVaccineInfoSource;
  readonly items: readonly NlpVaccineInfoItem[];
}

const citar = (source: VaccineInfoSource): NlpVaccineInfoSource => ({
  name: source.name,
  publisher: source.publisher,
  edition: source.edition,
  url: source.url,
});

/**
 * Formato das fichas lido pelo assistente (`apps/nlp/vacina_nlp/data/vaccine-info.json`), gerado por
 * `npm run export:calendar`. O assistente **não** copia composição nem contraindicação: só sabe em
 * que quadro e página do manual de eventos adversos estão as reações de cada vacina. Um teste
 * confere que o arquivo não diverge das fichas do app.
 *
 * @param set - Fichas das vacinas.
 */
export function exportVaccineInfoForNlp(set: VaccineInfoSet): NlpVaccineInfo {
  return {
    adverseEventsSource: citar(set.sources.adverseEvents),
    items: set.items.map((item) => ({
      vaccine: item.vaccine,
      quadro: item.adverseEvents.quadro,
      page: item.adverseEvents.page,
    })),
  };
}
