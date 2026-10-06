import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { exportCalendarForNlp } from './export';
import { PNI_2026 } from './pni-2026';

const NLP_FILE = join(__dirname, '../../../../apps/nlp/vacina_nlp/data/pni-2026.json');

describe('calendário exportado para o serviço de PLN', () => {
  test('CT-NLP-01: o JSON do serviço Python é idêntico ao calendário oficial (sem divergência)', () => {
    const file: unknown = JSON.parse(readFileSync(NLP_FILE, 'utf8'));
    // Se falhar, regere com `npm run export:calendar` e confira a diferença antes de commitar.
    expect(file).toEqual(JSON.parse(JSON.stringify(exportCalendarForNlp(PNI_2026))));
  });

  test('CT-NLP-02: cada linha leva o texto do momento já pronto e a fonte não é fictícia', () => {
    const exported = exportCalendarForNlp(PNI_2026);
    expect(exported.rules).toHaveLength(PNI_2026.rules.length);
    expect(exported.rules.find((r) => r.id === 'crianca-bcg')?.timingLabel).toBe('Ao nascer');
    expect(exported.rules.find((r) => r.id === 'adulto-dt')?.timingKind).toBe('HISTORY');
    expect(exported.rules.find((r) => r.id === 'crianca-hpv')?.ageMonths).toBe(108);
    expect(exported.rules.find((r) => r.id === 'adulto-dt')?.ageMonths).toBeNull();
    expect(exported.source.isFictitious).toBe(false);
  });
});
