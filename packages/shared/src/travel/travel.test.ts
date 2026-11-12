import { addDays } from '../domain/civil-date';
import { TRAVEL_GUIDE, buildTravelChecklist, type TravelDose } from './travel';

const HOJE = '2026-11-12';
const dose = (patch: Partial<TravelDose>): TravelDose => ({
  vaccine: 'tríplice viral SCR',
  status: 'PENDING',
  dueDate: '2027-03-01',
  ...patch,
});
const item = (list: ReturnType<typeof buildTravelChecklist>, id: string) => {
  const found = list.items.find((i) => i.id === id);
  if (!found) throw new Error(`sem item ${id}`);
  return found;
};

describe('checklist de viagem (B74)', () => {
  test('CT-VIA-01: o guia cita a fonte oficial, a data da consulta e manda procurar um serviço de saúde', () => {
    expect(TRAVEL_GUIDE.source.publisher).toBe('Ministério da Saúde');
    expect(TRAVEL_GUIDE.source.url).toMatch(/^https:\/\/www\.gov\.br\/saude\//);
    expect(TRAVEL_GUIDE.source.retrievedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(TRAVEL_GUIDE.notice).toMatch(/serviço de saúde/i);
    expect(TRAVEL_GUIDE.notice).toMatch(/não substitui/i);
    for (const it of TRAVEL_GUIDE.items) {
      expect(it.links.length).toBeGreaterThan(0);
      for (const link of it.links) expect(link.url).toMatch(/^https:\/\/www\.gov\.br\//);
    }
  });

  test('CT-VIA-02: viagem dentro do Brasil não traz o item do certificado internacional (CIVP)', () => {
    const dentro = buildTravelChecklist({
      destination: 'BRAZIL',
      departure: '2026-12-20',
      today: HOJE,
      doses: [],
    });
    const fora = buildTravelChecklist({
      destination: 'ABROAD',
      departure: '2026-12-20',
      today: HOJE,
      doses: [],
    });
    expect(dentro.items.map((i) => i.id)).not.toContain('civp');
    expect(fora.items.map((i) => i.id)).toContain('civp');
  });

  test('CT-VIA-03: febre amarela sem dose registrada: fazer até 10 dias antes da viagem', () => {
    const lista = buildTravelChecklist({
      destination: 'BRAZIL',
      departure: '2026-12-20',
      today: HOJE,
      doses: [],
    });
    expect(item(lista, 'febre-amarela')).toMatchObject({
      status: 'TODO',
      deadline: addDays('2026-12-20', -10),
    });
  });

  test('CT-VIA-04: com a dose de febre amarela aplicada no histórico, o item aparece como registrado', () => {
    const lista = buildTravelChecklist({
      destination: 'BRAZIL',
      departure: '2026-12-20',
      today: HOJE,
      doses: [dose({ vaccine: 'febre amarela', status: 'APPLIED', dueDate: '2020-01-01' })],
    });
    expect(item(lista, 'febre-amarela').status).toBe('DONE');
  });

  test('CT-VIA-05: dose de febre amarela só agendada ou cancelada não conta como registrada', () => {
    for (const status of ['SCHEDULED', 'PENDING', 'OVERDUE', 'CANCELLED'] as const) {
      const lista = buildTravelChecklist({
        destination: 'BRAZIL',
        departure: '2026-12-20',
        today: HOJE,
        doses: [dose({ vaccine: 'febre amarela', status })],
      });
      expect(item(lista, 'febre-amarela').status).not.toBe('DONE');
    }
  });

  test('CT-VIA-06: viagem a menos de 10 dias: o prazo já passou e o item pede conversar com o serviço de saúde', () => {
    const lista = buildTravelChecklist({
      destination: 'BRAZIL',
      departure: '2026-11-18',
      today: HOJE,
      doses: [],
    });
    const fa = item(lista, 'febre-amarela');
    expect(fa.status).toBe('LATE');
    expect(fa.deadline).toBe('2026-11-08');
  });

  test('CT-VIA-07: calendário em dia: sem dose atrasada, o item está em ordem', () => {
    const lista = buildTravelChecklist({
      destination: 'BRAZIL',
      departure: '2027-03-10',
      today: HOJE,
      doses: [dose({ dueDate: '2027-06-01' })],
    });
    expect(item(lista, 'calendario-em-dia')).toMatchObject({ status: 'DONE' });
  });

  test('CT-VIA-08: doses atrasadas ou que vencem antes da viagem entram na contagem do item', () => {
    const lista = buildTravelChecklist({
      destination: 'ABROAD',
      departure: '2027-01-30',
      today: HOJE,
      doses: [
        dose({ status: 'OVERDUE', dueDate: '2026-10-01' }),
        dose({ status: 'PENDING', dueDate: '2027-01-10' }),
        dose({ status: 'PENDING', dueDate: '2027-06-01' }),
        dose({ status: 'APPLIED', dueDate: '2026-01-01' }),
      ],
    });
    const cal = item(lista, 'calendario-em-dia');
    expect(cal.status).toBe('TODO');
    expect(cal.detail).toMatch(/1 dose atrasada/);
    expect(cal.detail).toMatch(/1 dose.*até a viagem/);
  });

  test('CT-VIA-09: cartão de vacinação, CIVP e serviços são só orientação (nunca "feito" nem "pendente")', () => {
    const lista = buildTravelChecklist({
      destination: 'ABROAD',
      departure: '2026-12-20',
      today: HOJE,
      doses: [],
    });
    expect(item(lista, 'cartao').status).toBe('INFO');
    expect(item(lista, 'civp').status).toBe('INFO');
    expect(item(lista, 'servicos').status).toBe('INFO');
  });

  test('CT-VIA-10: nunca diz que a pessoa pode ou não viajar, nem dá orientação médica individual', () => {
    const lista = buildTravelChecklist({
      destination: 'ABROAD',
      departure: '2026-12-20',
      today: HOJE,
      doses: [],
    });
    const texto = JSON.stringify(lista).toLowerCase();
    expect(texto).not.toMatch(/pode viajar|não pode viajar|está liberad|está apto/);
  });

  test('CT-VIA-11: a lista vem com a data de partida, o destino e a fonte', () => {
    const lista = buildTravelChecklist({
      destination: 'ABROAD',
      departure: '2026-12-20',
      today: HOJE,
      doses: [],
    });
    expect(lista).toMatchObject({ destination: 'ABROAD', departure: '2026-12-20' });
    expect(lista.source).toBe(TRAVEL_GUIDE.source);
  });
});
