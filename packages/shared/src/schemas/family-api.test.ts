import {
  consentInputSchema,
  memberDosesResponseSchema,
  memberIdSchema,
  memberInputSchema,
} from './family-api';

describe('esquemas de família e consentimento', () => {
  test('CT-FAM-S01: aceita um membro e assume que não é gestante', () => {
    const parsed = memberInputSchema.parse({ name: ' Maria ', birthDate: '2024-05-20' });
    expect(parsed).toEqual({ name: 'Maria', birthDate: '2024-05-20', isPregnant: false });
  });

  test.each([
    ['nome vazio', { name: '   ', birthDate: '2024-05-20' }],
    ['nome longo demais', { name: 'a'.repeat(61), birthDate: '2024-05-20' }],
    ['data inexistente', { name: 'Maria', birthDate: '2024-02-30' }],
    ['data fora do formato', { name: 'Maria', birthDate: '20/05/2024' }],
    ['gestante que não é booleano', { name: 'Maria', birthDate: '2024-05-20', isPregnant: 'sim' }],
  ])('CT-FAM-S02: rejeita membro com %s', (_nome, value) => {
    expect(memberInputSchema.safeParse(value).success).toBe(false);
  });

  test.each(['3f1c2d4e-5a6b', 'm-1'])('CT-FAM-S03: aceita o identificador %s', (id) => {
    expect(memberIdSchema.safeParse(id).success).toBe(true);
  });

  test.each(['', 'M-1', 'a_b', '../x', 'a'.repeat(41)])(
    'CT-FAM-S04: rejeita o identificador %p',
    (id) => {
      expect(memberIdSchema.safeParse(id).success).toBe(false);
    },
  );

  test('CT-FAM-S05: o consentimento exige aceite explícito', () => {
    expect(consentInputSchema.safeParse({ acceptedTerms: true, termVersion: '1' }).success).toBe(
      true,
    );
    expect(consentInputSchema.safeParse({ acceptedTerms: false, termVersion: '1' }).success).toBe(
      false,
    );
    expect(consentInputSchema.safeParse({ termVersion: '1' }).success).toBe(false);
  });

  test('CT-FAM-S06: o calendário do membro exige fonte, membro e doses', () => {
    expect(memberDosesResponseSchema.safeParse({ items: [] }).success).toBe(false);
  });
});
