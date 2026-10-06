import { PNI_2026 } from '@vacina/shared';
import { createAccountHandlers } from './handlers/account';
import { createConsentHandlers } from './handlers/consent';
import { createDoseHandlers } from './handlers/doses';
import { createMemberHandlers } from './handlers/members';
import { createInMemoryStore } from './repositories/in-memory-store';
import { createAccountService } from './services/account-service';
import { createConsentService } from './services/consent-service';
import { createDoseService } from './services/dose-service';
import { createMemberService } from './services/member-service';

/** "Agora" padrão dos testes: o dia civil em Brasília é 2026-10-06. */
export const NOW = '2026-10-06T15:00:00.000Z';

/** Dono padrão dos testes. */
export const OWNER = 'sessao-de-teste-0001';

/** Outro dono, para provar que um usuário não alcança os dados de outro. */
export const OTHER_OWNER = 'sessao-de-teste-0002';

/**
 * Monta a aplicação inteira em memória, com relógio controlado e identificadores previsíveis
 * (`id-1`, `id-2`...), sem rede e sem Azure.
 *
 * @param startAt - Instante inicial do relógio.
 */
export function buildApp(startAt: string = NOW) {
  let now = startAt;
  let counter = 0;
  const clock = () => now;
  const newId = () => `id-${(counter += 1)}`;
  const store = createInMemoryStore();
  const calendar = PNI_2026;

  const consents = createConsentService({ consents: store.consents, clock });
  const members = createMemberService({
    members: store.members,
    doses: store.doses,
    consents: store.consents,
    clock,
    newId,
    calendar,
  });
  const doses = createDoseService({ members: store.members, doses: store.doses, clock, calendar });
  const accounts = createAccountService(store.accounts);

  return {
    store,
    consents,
    members,
    doses,
    accounts,
    handlers: {
      members: createMemberHandlers(members, doses),
      doses: createDoseHandlers(doses),
      consent: createConsentHandlers(consents),
      account: createAccountHandlers(accounts),
    },
    /** Avança (ou volta) o relógio dos serviços. */
    setNow: (value: string) => {
      now = value;
    },
    /** Registra o consentimento de um dono (com ou sem declaração de responsável). */
    consent: (ownerId: string = OWNER, guardianDeclaration = true) =>
      consents.accept(ownerId, { acceptedTerms: true, termVersion: '1', guardianDeclaration }),
  };
}
