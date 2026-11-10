import { PNI_2026 } from '@vacina/shared';
import { createAccountHandlers } from './handlers/account';
import { createConsentHandlers } from './handlers/consent';
import { createDoseHandlers } from './handlers/doses';
import { createHouseholdHandlers } from './handlers/household';
import { createMemberHandlers } from './handlers/members';
import { createInMemoryAuthRepository } from './repositories/in-memory-auth';
import { createInMemoryStore } from './repositories/in-memory-store';
import { createAccountService } from './services/account-service';
import { createCarteiraService } from './services/carteira-service';
import { createConsentService } from './services/consent-service';
import { createDoseService } from './services/dose-service';
import { createHouseholdService } from './services/household-service';
import { createMemberService } from './services/member-service';
import { createFixedWindowLimiter } from './services/rate-limiter';

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
  let draw = 0;
  const clock = () => now;
  const newId = () => `id-${(counter += 1)}`;
  const store = createInMemoryStore(undefined, newId, () => now);
  const auth = createInMemoryAuthRepository();
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
  const doses = createDoseService({
    members: store.members,
    doses: store.doses,
    clock,
    calendar,
    newId,
  });
  const accounts = createAccountService(store.accounts);
  const carteira = createCarteiraService({ doses, clock });
  const household = createHouseholdService({
    households: store.households,
    consents: store.consents,
    accounts: auth,
    clock,
    limiter: createFixedWindowLimiter(clock),
    // Sorteio previsível só nos testes: cada convite sai diferente, sempre na mesma ordem.
    random: (max) => (draw += 7) % max,
  });

  return {
    store,
    auth,
    household,
    consents,
    members,
    doses,
    accounts,
    carteira,
    handlers: {
      members: createMemberHandlers(members, doses, carteira),
      doses: createDoseHandlers(doses),
      consent: createConsentHandlers(consents),
      household: createHouseholdHandlers(household),
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
