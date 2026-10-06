import { civilDateSchema, doseEventInputSchema, doseStatusSchema } from './dose';

describe('civilDateSchema', () => {
  test('aceita data real', () => {
    expect(civilDateSchema.safeParse('2026-10-15').success).toBe(true);
  });

  test.each(['2026-02-30', '15/10/2026', '', 'x'])('rejeita %s', (value) => {
    expect(civilDateSchema.safeParse(value).success).toBe(false);
  });
});

describe('doseStatusSchema', () => {
  test('aceita os 5 estados e rejeita outros', () => {
    for (const s of ['PENDING', 'SCHEDULED', 'OVERDUE', 'APPLIED', 'CANCELLED']) {
      expect(doseStatusSchema.safeParse(s).success).toBe(true);
    }
    expect(doseStatusSchema.safeParse('DONE').success).toBe(false);
  });
});

describe('doseEventInputSchema', () => {
  test('aceita os eventos que o cliente pode enviar', () => {
    const inputs = [
      { type: 'SCHEDULE', date: '2026-10-20' },
      { type: 'UNSCHEDULE' },
      { type: 'RESCHEDULE', date: '2026-10-20' },
      { type: 'APPLY', date: '2026-10-15' },
      { type: 'CANCEL', confirmed: true },
    ];
    for (const input of inputs) expect(doseEventInputSchema.safeParse(input).success).toBe(true);
  });

  test('rejeita o evento MARK_OVERDUE vindo do cliente (CT-I09)', () => {
    expect(doseEventInputSchema.safeParse({ type: 'MARK_OVERDUE' }).success).toBe(false);
  });

  test('rejeita data inválida e corpo incompleto', () => {
    expect(doseEventInputSchema.safeParse({ type: 'APPLY', date: '2026-02-30' }).success).toBe(
      false,
    );
    expect(doseEventInputSchema.safeParse({ type: 'CANCEL' }).success).toBe(false);
    expect(doseEventInputSchema.safeParse({}).success).toBe(false);
  });
});
