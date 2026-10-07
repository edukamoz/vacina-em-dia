import {
  ageInMonths,
  compareCivilDates,
  createDose,
  MAX_CUSTOM_DOSES,
  dueDateForRule,
  rulesForMember,
  selectDoseRulesToGenerate,
  type CalendarDataset,
  type CustomDoseInput,
  type DoseResponse,
  type MemberInput,
  type Relationship,
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
import { toCustomDoseResponse, toMemberResponse } from './mappers';

/** Dados de um membro vindos do cliente; o parentesco pode faltar (vale "não informado"). */
export type MemberData = Omit<MemberInput, 'relationship'> & {
  readonly relationship?: Relationship | null;
};

/** Quantidade máxima de membros por conta. */
export const MAX_MEMBERS = 20;

/** Até quantos anos à frente a data prevista de uma dose avulsa pode estar. */
const MAX_YEARS_AHEAD = 10;

/** Idade (em meses) a partir da qual não é preciso declaração de responsável: 18 anos. */
const ADULT_AGE_MONTHS = 18 * 12;

/** Casos de uso dos membros da família (RF02). */
export interface MemberService {
  /** Lista os membros do dono. */
  list(ownerId: string): Promise<readonly MemberResponse[]>;
  /** Busca um membro do dono. */
  get(ownerId: string, id: string): Promise<Result<MemberResponse>>;
  /** Cadastra um membro e gera as doses do calendário para ele. */
  create(ownerId: string, input: MemberData): Promise<Result<MemberResponse>>;
  /** Edita um membro e gera as doses que passaram a ser indicadas. */
  update(ownerId: string, id: string, input: MemberData): Promise<Result<MemberResponse>>;
  /** Exclui o membro e as doses dele. */
  remove(ownerId: string, id: string): Promise<Result<null>>;
  /** Cadastra uma dose avulsa (fora do calendário oficial) para o membro, em Pendente (T1). */
  addCustomDose(
    ownerId: string,
    memberId: string,
    input: CustomDoseInput,
  ): Promise<Result<DoseResponse>>;
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
  async function validate(ownerId: string, input: MemberData, today: string) {
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
        existing.flatMap((dose) => (dose.ruleId === null ? [] : [dose.ruleId])),
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
        return failure({ code: 'LIMIT_REACHED', scope: 'members' });
      }
      const member: StoredMember = {
        id: newId(),
        name: input.name,
        birthDate: input.birthDate,
        isPregnant: input.isPregnant,
        relationship: input.relationship ?? null,
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
        relationship: input.relationship ?? null,
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

    async addCustomDose(ownerId, memberId, input) {
      if (!(await consents.get(ownerId))) return failure({ code: 'CONSENT_REQUIRED' });
      if (!(await members.get(ownerId, memberId))) return failure({ code: 'NOT_FOUND' });
      const today = civilToday(clock);
      const lastYear = Number(today.slice(0, 4)) + MAX_YEARS_AHEAD;
      if (
        compareCivilDates(input.dueDate, today) < 0 ||
        Number(input.dueDate.slice(0, 4)) > lastYear
      ) {
        return failure({ code: 'INVALID_DOSE_DATE' });
      }
      const existing = await doses.listByMember(ownerId, memberId);
      if (existing.filter((dose) => dose.ruleId === null).length >= MAX_CUSTOM_DOSES) {
        return failure({ code: 'LIMIT_REACHED', scope: 'customDoses' });
      }
      const dose = {
        id: newId(),
        memberId,
        ruleId: null,
        custom: { vaccine: input.vaccine, doseLabel: input.doseLabel },
        ...createDose(input.dueDate),
      };
      await doses.saveMany(ownerId, [dose]);
      const response = toCustomDoseResponse(dose);
      return response ? success(response) : failure({ code: 'NOT_FOUND' });
    },
  };
}
