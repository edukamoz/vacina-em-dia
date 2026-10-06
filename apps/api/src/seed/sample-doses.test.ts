import { doseResponseSchema } from '@vacina/shared';
import { SAMPLE_CALENDAR_SOURCE, createSampleDoses } from './sample-doses';

describe('seed de exemplo', () => {
  test('CT-API-D01: está marcado como fictício e traz o aviso da caderneta', () => {
    expect(SAMPLE_CALENDAR_SOURCE.isFictitious).toBe(true);
    expect(SAMPLE_CALENDAR_SOURCE.notice).toMatch(/não substitui a caderneta oficial/);
  });

  test('CT-API-D02: cobre os cinco estados e respeita o esquema de resposta', () => {
    const doses = createSampleDoses();
    expect(new Set(doses.map((d) => d.status)).size).toBe(5);
    for (const dose of doses) expect(doseResponseSchema.safeParse(dose).success).toBe(true);
  });

  test('CT-API-D03: é coerente com o domínio (datas conforme o estado)', () => {
    for (const d of createSampleDoses()) {
      expect(d.appliedDate !== null).toBe(d.status === 'APPLIED');
      expect(d.scheduledDate !== null).toBe(d.status === 'SCHEDULED');
    }
  });
});
