import { doseEventInputSchema, civilDateSchema } from '../schemas/dose';
import { memberInputSchema } from '../schemas/family-api';
import { loginInputSchema, registerInputSchema } from '../schemas/auth-api';
import { addDays, isValidCivilDate } from './civil-date';
import type { DoseEvent, DoseSnapshot, DoseStatus, TransitionId } from './dose-state';
import { DOSE_STATUSES, createDose, transitionDose } from './dose-state';

/**
 * Testes aleatórios (Random Testing) de robustez, no sentido da aula de caixa preta: entradas
 * geradas sem roteiro, para ver se o sistema se comporta diante do inesperado.
 *
 * São determinísticos: o gerador usa uma semente fixa, então uma falha se repete igual e pode ser
 * investigada (CLAUDE.md §11). Para investigar outro cenário, troque a semente aqui.
 */
const SEMENTE = 20261022;
const HOJE = '2026-10-15';

/** Gerador pseudoaleatório pequeno e conhecido (mulberry32), com semente. */
function criarSorteio(semente: number) {
  let estado = semente >>> 0;
  const proximo = (): number => {
    estado = (estado + 0x6d2b79f5) >>> 0;
    let t = estado;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    /** Inteiro de `min` a `max`, inclusive. */
    inteiro: (min: number, max: number) => min + Math.floor(proximo() * (max - min + 1)),
    /** Um elemento da lista. */
    escolher: <T>(lista: readonly T[]): T => lista[Math.floor(proximo() * lista.length)]!,
    booleano: () => proximo() < 0.5,
  };
}

describe('máquina de estados com sequências aleatórias de eventos (RF04)', () => {
  /**
   * Tabela das transições T2 a T12 escrita à parte, a partir do diagrama de estados, para o teste
   * não depender da tabela interna que ele está conferindo.
   */
  const TRANSICOES: Record<Exclude<TransitionId, 'T1'>, [DoseStatus, DoseStatus]> = {
    T2: ['PENDING', 'SCHEDULED'],
    T3: ['PENDING', 'APPLIED'],
    T4: ['PENDING', 'OVERDUE'],
    T5: ['PENDING', 'CANCELLED'],
    T6: ['SCHEDULED', 'APPLIED'],
    T7: ['SCHEDULED', 'OVERDUE'],
    T8: ['SCHEDULED', 'PENDING'],
    T9: ['SCHEDULED', 'CANCELLED'],
    T10: ['OVERDUE', 'SCHEDULED'],
    T11: ['OVERDUE', 'APPLIED'],
    T12: ['OVERDUE', 'CANCELLED'],
  };

  function sortearEvento(sorteio: ReturnType<typeof criarSorteio>, hoje: string): DoseEvent {
    const data = addDays(hoje, sorteio.inteiro(-40, 40));
    switch (sorteio.inteiro(0, 5)) {
      case 0:
        return { type: 'SCHEDULE', date: data };
      case 1:
        return { type: 'UNSCHEDULE' };
      case 2:
        return { type: 'RESCHEDULE', date: data };
      case 3:
        return { type: 'APPLY', date: data };
      case 4:
        return { type: 'MARK_OVERDUE' };
      default:
        return { type: 'CANCEL', confirmed: sorteio.booleano() };
    }
  }

  test('CT-ALE-01: 3.000 sequências aleatórias respeitam as invariantes e visitam as 11 transições', () => {
    const sorteio = criarSorteio(SEMENTE);
    const vistas = new Set<TransitionId>();

    for (let sequencia = 0; sequencia < 3000; sequencia++) {
      let dose: DoseSnapshot = Object.freeze(createDose(addDays(HOJE, sorteio.inteiro(-30, 30))));
      let estadoFinal: DoseStatus | null = null;
      // O tempo passa entre os passos: sem isso, uma data agendada nunca venceria (T7).
      let hoje: string = HOJE;

      for (let passo = 0; passo < 10; passo++) {
        hoje = addDays(hoje, sorteio.inteiro(0, 12));
        const evento = sortearEvento(sorteio, hoje);
        const actor = sorteio.booleano() ? 'USER' : 'SCHEDULER';
        const antes = JSON.stringify(dose);

        const resultado = transitionDose(dose, evento, { today: hoje, actor });

        // Pureza: a dose recebida não muda, haja sucesso ou erro.
        expect(JSON.stringify(dose)).toBe(antes);

        if (!resultado.ok) {
          expect(['INVALID_TRANSITION', 'GUARD_VIOLATION']).toContain(resultado.error.code);
          expect(resultado.error.from).toBe(dose.status);
          expect(resultado.error.message.length).toBeGreaterThan(0);
          if (dose.status === 'APPLIED' || dose.status === 'CANCELLED') {
            expect(resultado.error.code).toBe('INVALID_TRANSITION');
          }
          continue;
        }

        const proximo = resultado.dose;
        const [de, para] = TRANSICOES[resultado.transition as Exclude<TransitionId, 'T1'>];
        expect([dose.status, proximo.status]).toEqual([de, para]);
        expect(DOSE_STATUSES).toContain(proximo.status);
        expect(proximo.dueDate).toBe(dose.dueDate);
        vistas.add(resultado.transition);

        if (proximo.status === 'APPLIED') {
          expect(proximo.appliedDate).not.toBeNull();
          expect(proximo.appliedDate! <= hoje).toBe(true);
        }
        if (proximo.status === 'SCHEDULED') {
          expect(proximo.scheduledDate).not.toBeNull();
          expect(proximo.scheduledDate! >= hoje).toBe(true);
        }
        if (proximo.status === 'OVERDUE') expect(actor).toBe('SCHEDULER');
        if (proximo.status === 'CANCELLED') {
          expect(evento).toEqual({ type: 'CANCEL', confirmed: true });
        }
        if (estadoFinal !== null) throw new Error('estado final não pode mudar');

        dose = Object.freeze(proximo);
        if (dose.status === 'APPLIED' || dose.status === 'CANCELLED') estadoFinal = dose.status;
      }
    }

    expect([...vistas].sort()).toEqual(Object.keys(TRANSICOES).sort());
  });
});

describe('entradas inesperadas nos esquemas de validação', () => {
  /** Valor JSON qualquer: texto com caracteres estranhos, números, nulo, listas e objetos. */
  function sortearValor(sorteio: ReturnType<typeof criarSorteio>, profundidade = 0): unknown {
    const alfabeto = [
      'a',
      'Z',
      '0',
      '9',
      ' ',
      '-',
      '/',
      '@',
      '.',
      'é',
      'ñ',
      '😀',
      '\n',
      '\u0000',
      "'",
      '"',
      '<',
      '%',
    ];
    switch (sorteio.inteiro(0, profundidade >= 2 ? 5 : 7)) {
      case 0:
        return null;
      case 1:
        return sorteio.booleano();
      case 2:
        return sorteio.inteiro(-1_000_000, 1_000_000) / sorteio.inteiro(1, 7);
      case 3:
        return '';
      case 4:
        return Array.from({ length: sorteio.inteiro(1, 80) }, () =>
          sorteio.escolher(alfabeto),
        ).join('');
      case 5:
        return sorteio.escolher([
          Number.NaN,
          Infinity,
          -0,
          'a'.repeat(5000),
          '2026-02-30',
          '9999-12-31',
        ]);
      case 6:
        return Array.from({ length: sorteio.inteiro(0, 3) }, () =>
          sortearValor(sorteio, profundidade + 1),
        );
      default: {
        const objeto: Record<string, unknown> = {};
        for (const chave of [
          'name',
          'birthDate',
          'email',
          'password',
          'type',
          'date',
          'confirmed',
          '__proto__',
        ]) {
          if (sorteio.booleano()) objeto[chave] = sortearValor(sorteio, profundidade + 1);
        }
        return objeto;
      }
    }
  }

  test('CT-ALE-02: nenhum esquema lança exceção diante de lixo, e o que passa respeita as regras', () => {
    const sorteio = criarSorteio(SEMENTE + 1);
    let aceitos = 0;

    for (let i = 0; i < 4000; i++) {
      const entrada = sortearValor(sorteio);
      for (const esquema of [
        memberInputSchema,
        doseEventInputSchema,
        registerInputSchema,
        loginInputSchema,
        civilDateSchema,
      ]) {
        const resultado = esquema.safeParse(entrada);
        if (resultado.success) aceitos += 1;
      }

      const membro = memberInputSchema.safeParse(entrada);
      if (membro.success) {
        expect(membro.data.name.length).toBeGreaterThanOrEqual(1);
        expect(membro.data.name.length).toBeLessThanOrEqual(60);
        expect(membro.data.name).toBe(membro.data.name.trim());
        expect(isValidCivilDate(membro.data.birthDate)).toBe(true);
      }
      const evento = doseEventInputSchema.safeParse(entrada);
      if (evento.success && 'date' in evento.data) {
        expect(isValidCivilDate(evento.data.date)).toBe(true);
      }
      const senha = registerInputSchema.safeParse(entrada);
      if (senha.success) {
        expect(senha.data.password.length).toBeGreaterThanOrEqual(8);
        expect(senha.data.password.length).toBeLessThanOrEqual(128);
      }
      const data = civilDateSchema.safeParse(entrada);
      if (data.success) expect(isValidCivilDate(data.data)).toBe(true);
    }

    // Garante que o sorteio também gera entradas válidas (senão o teste não provaria nada).
    expect(aceitos).toBeGreaterThan(0);
  });

  /** Dias de um mês, calculados à parte da implementação testada. */
  function diasDoMes(ano: number, mes: number): number {
    if (mes === 2) {
      const bissexto = (ano % 4 === 0 && ano % 100 !== 0) || ano % 400 === 0;
      return bissexto ? 29 : 28;
    }
    return [4, 6, 9, 11].includes(mes) ? 30 : 31;
  }

  test('CT-ALE-03: datas AAAA-MM-DD sorteadas são válidas exatamente quando o dia existe', () => {
    const sorteio = criarSorteio(SEMENTE + 2);
    let validas = 0;
    let invalidas = 0;

    for (let i = 0; i < 5000; i++) {
      const ano = sorteio.inteiro(1900, 2100);
      const mes = sorteio.inteiro(0, 13);
      const dia = sorteio.inteiro(0, 32);
      const texto = `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
      const esperado = mes >= 1 && mes <= 12 && dia >= 1 && dia <= diasDoMes(ano, mes);
      expect({ texto, valida: isValidCivilDate(texto) }).toEqual({ texto, valida: esperado });
      if (esperado) validas += 1;
      else invalidas += 1;
    }

    expect(validas).toBeGreaterThan(1000);
    expect(invalidas).toBeGreaterThan(500);
  });

  test('CT-ALE-04: somar e depois subtrair os mesmos dias devolve a data original', () => {
    const sorteio = criarSorteio(SEMENTE + 3);
    for (let i = 0; i < 2000; i++) {
      const base = addDays('2000-01-01', sorteio.inteiro(0, 40000));
      const dias = sorteio.inteiro(-3000, 3000);
      expect(isValidCivilDate(addDays(base, dias))).toBe(true);
      expect(addDays(addDays(base, dias), -dias)).toBe(base);
    }
  });
});
