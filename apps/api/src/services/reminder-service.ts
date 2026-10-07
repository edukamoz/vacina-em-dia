import {
  REMINDER_LEAD_DAYS,
  addDays,
  isEmailReminderDay,
  reminderDate,
  reminderKind,
  type ReminderItem,
  type ReminderListResponse,
} from '@vacina/shared';
import { civilToday, type Clock } from '../clock';
import type { MemberRepository, ReminderRepository } from '../repositories/repositories';
import type { DoseService } from './dose-service';
import type { EmailClient } from './email-ports';
import { buildReminderEmail } from './reminder-email';

/** Resumo de uma execução da rotina; só contagens, nunca dado pessoal. */
export interface ReminderRunSummary {
  readonly recipients: number;
  readonly sent: number;
  readonly failed: number;
}

/** Casos de uso dos lembretes (RF05). */
export interface ReminderService {
  /** Lembretes do dono para hoje: doses atrasadas, de hoje e dos próximos 7 dias. */
  list(ownerId: string): Promise<ReminderListResponse>;
  /** Liga ou desliga os lembretes por e-mail. */
  setEmailEnabled(ownerId: string, enabled: boolean): Promise<{ emailEnabled: boolean }>;
  /** Rotina diária: envia o e-mail de lembrete a quem tem dose hoje ou daqui a 7 dias. */
  runDailyEmails(): Promise<ReminderRunSummary>;
}

/** Dependências do serviço, injetadas para testar sem rede. */
export interface ReminderServiceDeps {
  readonly members: MemberRepository;
  readonly doseService: DoseService;
  readonly reminders: ReminderRepository;
  readonly email: EmailClient;
  readonly clock: Clock;
  /** Endereço do app web, para o link do e-mail. */
  readonly webBaseUrl?: string;
  /** Registra uma falha sem dado pessoal (só o tipo). */
  readonly reportError?: (kind: string) => void;
}

const KIND_ORDER = { OVERDUE: 0, TODAY: 1, UPCOMING: 2 } as const;

/**
 * Cria os casos de uso dos lembretes. A lista do app reaproveita o serviço de doses (que já aplica
 * o atraso); o e-mail sai pela rotina diária, no máximo um por conta por dia.
 *
 * @param deps - Repositórios, serviço de doses, e-mail e relógio.
 */
export function createReminderService({
  members,
  doseService,
  reminders,
  email,
  clock,
  webBaseUrl,
  reportError = () => undefined,
}: ReminderServiceDeps): ReminderService {
  const kindOfError = (error: unknown) => (error instanceof Error ? error.name : 'desconhecida');

  return {
    async list(ownerId) {
      const today = civilToday(clock);
      const items: ReminderItem[] = [];
      for (const member of await members.list(ownerId)) {
        const result = await doseService.listForMember(ownerId, member.id);
        if (!result.ok) continue;
        for (const dose of result.value.items) {
          const kind = reminderKind(dose, today);
          if (!kind) continue;
          items.push({
            doseId: dose.id,
            memberId: member.id,
            memberName: member.name,
            vaccine: dose.vaccine,
            doseLabel: dose.doseLabel,
            date: reminderDate(dose),
            kind,
          });
        }
      }
      items.sort(
        (a, b) =>
          KIND_ORDER[a.kind] - KIND_ORDER[b.kind] ||
          a.date.localeCompare(b.date) ||
          a.memberName.localeCompare(b.memberName),
      );
      return {
        leadDays: REMINDER_LEAD_DAYS,
        emailEnabled: await reminders.getEmailEnabled(ownerId),
        items,
      };
    },

    async setEmailEnabled(ownerId, enabled) {
      await reminders.setEmailEnabled(ownerId, enabled);
      return { emailEnabled: enabled };
    },

    async runDailyEmails() {
      const today = civilToday(clock);
      const inAWeek = addDays(today, REMINDER_LEAD_DAYS);
      const byAccount = new Map<string, { email: string; today: number; inAWeek: number }>();
      for (const candidate of await reminders.listEmailCandidates(today)) {
        if (!isEmailReminderDay(candidate.dose, today)) continue;
        const entry = byAccount.get(candidate.accountId) ?? {
          email: candidate.email,
          today: 0,
          inAWeek: 0,
        };
        const date = reminderDate(candidate.dose);
        if (date === today) entry.today += 1;
        else if (date === inAWeek) entry.inAWeek += 1;
        byAccount.set(candidate.accountId, entry);
      }

      let sent = 0;
      let failed = 0;
      for (const [accountId, entry] of byAccount) {
        try {
          // Reserva o dia antes de enviar: se a rotina rodar duas vezes ao mesmo tempo, só uma envia.
          if (!(await reminders.claimEmailDay(accountId, today))) continue;
          try {
            await email.send(buildReminderEmail(entry.email, entry, webBaseUrl));
            sent += 1;
          } catch (error) {
            failed += 1;
            reportError(kindOfError(error));
            await reminders.releaseEmailDay(accountId, today);
          }
        } catch (error) {
          failed += 1;
          reportError(kindOfError(error));
        }
      }
      return { recipients: byAccount.size, sent, failed };
    },
  };
}
