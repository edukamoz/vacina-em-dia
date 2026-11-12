import { PNI_2026 } from '../calendar';
import { VACCINE_INFO, vaccineInfoFor } from './vaccine-info';

describe('fichas "Sobre esta vacina" (B75)', () => {
  test('CT-INF-01: as fontes são os dois manuais oficiais, com edição, endereço e data de leitura', () => {
    for (const fonte of Object.values(VACCINE_INFO.sources)) {
      expect(fonte.publisher).toBe('Ministério da Saúde');
      expect(fonte.url).toMatch(/^https:\/\/www\.gov\.br\/saude\/.+\.pdf$/);
      expect(fonte.retrievedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(fonte.edition).toMatch(/\d{4}/);
    }
  });

  test('CT-INF-02: toda ficha tem composição, contraindicação e onde achar as reações', () => {
    expect(VACCINE_INFO.items.length).toBeGreaterThanOrEqual(15);
    for (const ficha of VACCINE_INFO.items) {
      expect([ficha.vaccine, ficha.composition.length > 20]).toEqual([ficha.vaccine, true]);
      expect([ficha.vaccine, ficha.contraindication.length > 0]).toEqual([ficha.vaccine, true]);
      expect(ficha.manualSection).toMatch(/^12\.2\.\d+$/);
      expect(ficha.adverseEvents.quadro).toMatch(/^Quadros? \d+/);
      expect(ficha.adverseEvents.page).toBeGreaterThan(0);
    }
  });

  test('CT-INF-03: cada ficha é de uma vacina que existe no calendário e não se repete', () => {
    const nomes = new Set(PNI_2026.rules.map((r) => r.vaccine));
    const vistos = new Set<string>();
    for (const ficha of VACCINE_INFO.items) {
      expect([ficha.vaccine, nomes.has(ficha.vaccine)]).toEqual([ficha.vaccine, true]);
      expect(vistos.has(ficha.vaccine)).toBe(false);
      vistos.add(ficha.vaccine);
    }
  });

  test('CT-INF-04: as vacinas do calendário sem ficha são só as mais novas que os manuais', () => {
    const sem = [...new Set(PNI_2026.rules.map((r) => r.vaccine))]
      .filter((nome) => vaccineInfoFor(nome) === undefined)
      .sort();
    expect(sem).toEqual(
      ['DNG4', 'covid-19', 'pneumocócica 20-valente', 'vírus sincicial respiratório (VVSR)'].sort(),
    );
  });

  test('CT-INF-05: busca pelo nome do calendário; dose avulsa ou desconhecida não tem ficha', () => {
    expect(vaccineInfoFor('hepatite B')?.composition).toMatch(/HBsAg/);
    expect(vaccineInfoFor('Vacina que eu inventei')).toBeUndefined();
    expect(vaccineInfoFor('')).toBeUndefined();
  });

  test('CT-INF-06: a ficha de febre amarela traz as contraindicações do manual (menores de 6 meses)', () => {
    const febre = vaccineInfoFor('febre amarela');
    expect(febre?.contraindication.join(' ')).toMatch(/menores de 6 meses/);
  });

  test('CT-INF-07: as contraindicações comuns citam a reação anafilática e a hipersensibilidade', () => {
    const comum = VACCINE_INFO.commonContraindication.join(' ');
    expect(comum).toMatch(/reação anafilática/);
    expect(comum).toMatch(/excipientes/);
  });

  test('CT-INF-08: o aviso diz que não substitui o profissional e que o app não diz quem pode tomar', () => {
    expect(VACCINE_INFO.notice).toMatch(/não substitui/i);
    expect(VACCINE_INFO.notice).toMatch(/não diz se você pode ou não tomar/);
    expect(VACCINE_INFO.notice).toMatch(/serviço de saúde/);
  });

  test('CT-INF-09: nenhum trecho tem quebra de linha, caractere de controle ou espaço duplo', () => {
    const textos = VACCINE_INFO.items.flatMap((f) => [f.composition, ...f.contraindication]);
    for (const texto of textos) {
      // eslint-disable-next-line no-control-regex
      expect(texto).not.toMatch(/[\u0000-\u001f\u0080-\u009f]|\s{2,}/);
      expect(texto).toBe(texto.trim());
    }
  });
});
