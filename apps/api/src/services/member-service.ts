import {
  ageInMonths,
  compareCivilDates,
  createDose,
  dueDateForRule,
  rulesForMember,
  selectDoseRulesToGenerate,
  type CalendarDataset,
  type MemberInput,
  type MemberResponse,
} from '@vacina/shared';
import { civilToday, type Clock } from '../clock';
import type {
  ConsentRepository,
  DoseRepository,
  MemberRepository,
  StoredMember,
} from '../repositories/repositories';
import { failure, success, type Result } from './errors';
import { toMemberResponse } from './mappers';

/** Quantidade máxima de membros por conta. */
export const MAX_MEMBERS = 20;

/** Idade (em meses) a partir da qual não é preciso declaração de responsável: 18 anos. */
const ADULT_AGE_MONTHS = 18 * 12;

/** Casos de uso dos membros da família (RF02). */
export interface MemberService {
  /** Lista os membros do dono. */
  list(ownerId: string): Promise<readonly MemberResponse[]>;
  /** Busca um membro do dono. */
  get(ownerId: string, id: string): Promise<Result<MemberResponse>>;
  /** Cadastra um membro e gera as doses do calendário para ele. */
  create(ownerId: string, input: MemberInput): Promise<Result<MemberResponse>>;
  /** Edita um membro e gera as doses que passaram a ser indicadas. */
  update(ownerId: string, id: string, input: MemberInput): Promise<Result<MemberResponse>>;
  /** Exclui o membro e as doses dele. */
  remove(ownerId: string, id: string): Promise<Result<null>>;
}

/** Dependências do serviço, todas injetadas para testar sem rede e sem relógio real. */
export interface MemberServiceDeps {
  readonly members: MemberRepository;
  readonly doses: DoseRepository;
  readonly consents: ConsentRepository;
  readonly clock: Clock;
  /** Gera identificadores novos (letras minúsculas, números e hífen). */
  readonly newId: () => string;
  readonly calendar: CalendarDataset;
}

/**
 * Cria os casos de uso dos membros. As regras do calendário vivem no `@vacina/shared`; aqui se
 * confere o consentimento, a data de nascimento e o limite, grava o membro e gera as doses.
 *
 * @param deps - Repositórios, relógio, gerador de id e calendário.
 */
export function createMemberService(deps: MemberServiceDeps): MemberService {
  const { members, doses, consents, clock, newId, calendar } = deps;

  /** Confere as regras comuns a criar e editar; devolve o erro ou `null` se estiver tudo certo. */
  async function validate(ownerId: string, input: MemberInput, today: string) {
    const consent = await consents.get(ownerId);
    if (!consent) return failure({ code: 'CONSENT_REQUIRED' });
    if (compareCivilDates(input.birthDate, today) > 0) {
      return failure({ code: 'INVALID_BIRTH_DATE' });
    }
    if (ageInMonths(input.birthDate, today) < ADULT_AGE_MONTHS && !consent.guardianDeclaration) {
      return failure({ code: 'GUARDIAN_DECLARATION_REQUIRED' });
    }
    return null;
  }

  /** Gera as doses que o membro ainda não tem (T1: Pendente). Não duplica nada. */
  async function generateDoses(ownerId: string, member: StoredMember, today: string) {
    const applicable = rulesForMember(calendar, member, today);
    const existing = await doses.listByMember(ownerId, member.id);
    const missing = new Set(
      selectDoseRulesToGenerate(
        applicable.map((rule) => rule.id),
        existing.map((dose) => dose.ruleId),
      ),
    );
    const created = applicable
      .filter((rule) => missing.has(rule.id))
      .map((rule) => ({
        id: newId(),
        memberId: member.id,
        ruleId: rule.id,
        ...createDose(dueDateForRule(rule, member.birthDate, today)),
      }));
    await doses.saveMany(ownerId, created);
  }

  return {
    async list(ownerId) {
      const today = civilToday(clock);
      return (await members.list(ownerId)).map((member) => toMemberResponse(member, today));
    },

    async get(ownerId, id) {
      const member = await members.get(ownerId, id);
      if (!member) return failure({ code: 'NOT_FOUND' });
      return success(toMemberResponse(member, civilToday(clock)));
    },

    async create(ownerId, input) {
      const today = civilToday(clock);
      const invalid = await validate(ownerId, input, today);
      if (invalid) return invalid;
      if ((await members.list(ownerId)).length >= MAX_MEMBERS) {
        return failure({ code: 'LIMIT_REACHED' });
      }
      const member: StoredMember = {
        id: newId(),
        name: input.name,
        birthDate: input.birthDate,
        isPregnant: input.isPregnant,
      };
      await members.save(ownerId, member);
      await generateDoses(ownerId, member, today);
      return success(toMemberResponse(member, today));
    },

    async update(ownerId, id, input) {
      const current = await members.get(ownerId, id);
      if (!current) return failure({ code: 'NOT_FOUND' });
      const today = civilToday(clock);
      const invalid = await validate(ownerId, input, today);
      if (invalid) return invalid;
      const member: StoredMember = {
        id: current.id,
        name: input.name,
        birthDate: input.birthDate,
        isPregnant: input.isPregnant,
      };
      await members.save(ownerId, member);
      await generateDoses(ownerId, member, today);
      return success(toMemberResponse(member, today));
    },

    async remove(ownerId, id) {
      if (!(await members.get(ownerId, id))) return failure({ code: 'NOT_FOUND' });
      await members.remove(ownerId, id);
      return success(null);
    },
  };
}
