import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { exportVaccineInfoForNlp } from './export';
import { VACCINE_INFO } from './vaccine-info';

const NLP_FILE = join(__dirname, '../../../../apps/nlp/vacina_nlp/data/vaccine-info.json');

describe('fichas para o assistente (B75)', () => {
  test('CT-INF-10: o arquivo do serviço de PLN é idêntico ao exportado das fichas do app', () => {
    const arquivo: unknown = JSON.parse(readFileSync(NLP_FILE, 'utf8'));
    expect(arquivo).toEqual(JSON.parse(JSON.stringify(exportVaccineInfoForNlp(VACCINE_INFO))));
  });

  test('CT-INF-11: só vai o ponteiro das reações, nunca o texto da ficha', () => {
    const exportado = exportVaccineInfoForNlp(VACCINE_INFO);
    expect(exportado.items).toHaveLength(VACCINE_INFO.items.length);
    expect(Object.keys(exportado.items[0] ?? {}).sort()).toEqual(['page', 'quadro', 'vaccine']);
    expect(exportado.adverseEventsSource.url).toMatch(/^https:\/\/www\.gov\.br\/saude\//);
  });
});
