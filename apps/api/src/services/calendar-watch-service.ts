import { createHash } from 'node:crypto';
import type { Clock } from '../clock';
import type { FileStorage } from '../storage/file-storage';
import type { EmailClient } from './email-ports';

/** Página do Ministério da Saúde com os cinco arquivos do calendário. */
export const CALENDAR_PAGE_URL = 'https://www.gov.br/saude/pt-br/vacinacao/calendario';

const FILES_BASE_URL = 'https://www.gov.br/saude/pt-br/vacinacao/arquivos/';

/** Um arquivo oficial vigiado e a impressão digital da versão que o projeto transcreveu. */
export interface CalendarSource {
  readonly id: string;
  /** Nome para o e-mail de aviso. */
  readonly label: string;
  readonly url: string;
  /** SHA-256 (hexadecimal) do arquivo que o calendário do projeto reflete. */
  readonly baselineSha256: string;
}

/**
 * Os cinco arquivos do Calendário Nacional de Vacinação 2026 e a impressão digital deles em
 * 10/11/2026 (revisão de 28/10/2026), a versão conferida em `docs/28`. Quando o projeto passar a
 * refletir uma versão nova, troque as impressões digitais aqui junto com o calendário.
 */
export const CALENDAR_SOURCES: readonly CalendarSource[] = [
  {
    id: 'crianca',
    label: 'Calendário da Criança',
    url: `${FILES_BASE_URL}calendario-nacional-de-vacinacao-crianca`,
    baselineSha256: '775ebe8f734afbd9c4dccfdac9a37fac057b599d7a9992687c505eca58374f6c',
  },
  {
    id: 'adolescentes-jovens',
    label: 'Calendário do Adolescente e do Jovem',
    url: `${FILES_BASE_URL}calendario-nacional-de-vacinacao-adolescentes-jovens`,
    baselineSha256: 'b7c994f360bc4850fe04ef71996e8c5933468ec6fa32fe98cb31eefe7849bf34',
  },
  {
    id: 'adulto',
    label: 'Calendário do Adulto',
    url: `${FILES_BASE_URL}calendario-nacional-de-vacinacao-adulto`,
    baselineSha256: 'd6ca03c7036efe9c76f763d3ea4d0d3fbebf0e72af273243bcf389daa87a27b5',
  },
  {
    id: 'idoso',
    label: 'Calendário do Idoso',
    url: `${FILES_BASE_URL}calendario-nacional-de-vacinacao-idoso`,
    baselineSha256: 'b95f057ff1e9b897e0744afc4c1ab248c3e03527ec9110314a3da693c56a0fd3',
  },
  {
    id: 'gestante',
    label: 'Calendário da Gestante',
    url: `${FILES_BASE_URL}calendario-nacional-de-vacinacao-gestante`,
    baselineSha256: 'd360af929f27e77f5610d61d3a02c566863bbc2dc04d9b2418b9c23ca4856d01',
  },
];

/** Resultado de uma verificação; só contagens e ids de arquivo, nunca dado pessoal. */
export interface WatchSummary {
  readonly checkedAt: string;
  /** Quantos arquivos têm o conteúdo que o projeto transcreveu. */
  readonly unchanged: number;
  /** Ids dos arquivos cujo conteúdo é diferente do transcrito. */
  readonly changed: readonly string[];
  /** Quantos arquivos não puderam ser baixados desta vez. */
  readonly failed: number;
  /** Verdadeiro quando este ciclo enviou o e-mail de aviso. */
  readonly alerted: boolean;
}

/** O que o app pode mostrar sem expor nada além da data e de "mudou". */
export interface WatchStatus {
  readonly checkedAt: string | null;
  readonly changed: boolean;
}

/** Casos de uso do vigia do calendário oficial (B72). */
export interface CalendarWatchService {
  /** Baixa os cinco arquivos, compara as impressões digitais, guarda o estado e avisa o autor. */
  check(): Promise<WatchSummary>;
  /** Data da última verificação e se algum arquivo difere do transcrito. */
  status(): Promise<WatchStatus>;
}

/** Dependências do serviço, todas injetadas para testar sem rede. */
export interface CalendarWatchDeps {
  readonly sources?: readonly CalendarSource[];
  /** Baixa os bytes de um arquivo; falha com exceção (rede, status, tamanho). */
  readonly fetchBytes: (url: string) => Promise<Uint8Array>;
  readonly storage: FileStorage;
  readonly email: EmailClient;
  /** Para onde vai o aviso. Sem endereço, a mudança só fica registrada. */
  readonly alertTo?: string | undefined;
  readonly clock: Clock;
  /** Registra uma falha sem dado pessoal (só o tipo). */
  readonly reportError?: (kind: string) => void;
}

/** O que se guarda de cada arquivo entre uma verificação e a seguinte. */
interface SeenFile {
  readonly sha256: string;
  /** Última impressão digital que já gerou e-mail (evita avisar de novo a mesma mudança). */
  readonly alertedSha256?: string;
}

interface WatchState {
  readonly checkedAt: string;
  readonly files: Readonly<Record<string, SeenFile>>;
}

const STATE_KEY = 'vigia/calendario.json';

/**
 * Cria o vigia. O calendário do projeto reflete uma versão conhecida dos PDFs (`baselineSha256`).
 * Como o portal não informa data de modificação nem `ETag`, a mudança se detecta pelo conteúdo: se
 * a impressão digital de hoje difere da conhecida, o autor recebe um e-mail (uma vez por mudança) e
 * o app pode mostrar que há conferência pendente. Quem atualiza o calendário continua sendo uma
 * pessoa, porque dado vacinal só entra com fonte oficial confirmada.
 *
 * @param deps - Fontes, download, armazenamento do estado, e-mail e relógio.
 */
export function createCalendarWatchService({
  sources = CALENDAR_SOURCES,
  fetchBytes,
  storage,
  email,
  alertTo,
  clock,
  reportError = () => undefined,
}: CalendarWatchDeps): CalendarWatchService {
  async function readState(): Promise<WatchState | null> {
    const file = await storage.get(STATE_KEY);
    if (!file) return null;
    try {
      return JSON.parse(new TextDecoder().decode(file.bytes)) as WatchState;
    } catch {
      return null;
    }
  }

  async function writeState(state: WatchState): Promise<void> {
    await storage.put(STATE_KEY, {
      bytes: new TextEncoder().encode(JSON.stringify(state)),
      contentType: 'application/json',
    });
  }

  const differs = (source: CalendarSource, seen: SeenFile | undefined) =>
    seen !== undefined && seen.sha256 !== source.baselineSha256;

  return {
    async check() {
      const checkedAt = clock();
      const before = await readState();
      const files: Record<string, SeenFile> = { ...before?.files };
      let failed = 0;
      for (const source of sources) {
        try {
          const bytes = await fetchBytes(source.url);
          const sha256 = createHash('sha256').update(bytes).digest('hex');
          const alertedSha256 = files[source.id]?.alertedSha256;
          files[source.id] = { sha256, ...(alertedSha256 ? { alertedSha256 } : {}) };
        } catch (error) {
          failed += 1;
          reportError(error instanceof Error ? error.name : 'desconhecida');
        }
      }

      const changed = sources.filter((s) => differs(s, files[s.id]));
      const toAlert = changed.filter((s) => files[s.id]?.sha256 !== files[s.id]?.alertedSha256);
      let alerted = false;
      if (toAlert.length > 0 && alertTo) {
        try {
          await email.send(buildAlert(alertTo, toAlert));
          for (const s of toAlert) {
            const seen = files[s.id];
            if (seen) files[s.id] = { ...seen, alertedSha256: seen.sha256 };
          }
          alerted = true;
        } catch (error) {
          // Sem dar o alerta por feito: a próxima verificação tenta de novo.
          reportError(error instanceof Error ? error.name : 'desconhecida');
        }
      }

      await writeState({ checkedAt, files });
      return {
        checkedAt,
        unchanged: sources.length - changed.length - failed,
        changed: changed.map((s) => s.id),
        failed,
        alerted,
      };
    },

    async status() {
      const state = await readState();
      if (!state) return { checkedAt: null, changed: false };
      return {
        checkedAt: state.checkedAt,
        changed: sources.some((s) => differs(s, state.files[s.id])),
      };
    },
  };
}

/** Monta o e-mail de aviso; só nomes de arquivo oficiais e o endereço da página. */
function buildAlert(to: string, changed: readonly CalendarSource[]) {
  const lista = changed.map((s) => `- ${s.label}`).join('\n');
  const itens = changed.map((s) => `<li>${s.label}</li>`).join('');
  return {
    to,
    subject: 'Vacina em Dia: o calendário oficial mudou',
    text: `O vigia do calendário encontrou conteúdo diferente do que o projeto transcreveu em:\n\n${lista}\n\nConfira a página oficial e, se for o caso, atualize o calendário (docs/28 e pni-2026.ts):\n${CALENDAR_PAGE_URL}\n\nO app continua mostrando a versão anterior até alguém atualizar.`,
    html: `<p>O vigia do calendário encontrou conteúdo diferente do que o projeto transcreveu em:</p><ul>${itens}</ul><p>Confira a <a href="${CALENDAR_PAGE_URL}">página oficial</a> e, se for o caso, atualize o calendário (<code>docs/28</code> e <code>pni-2026.ts</code>).</p><p>O app continua mostrando a versão anterior até alguém atualizar.</p>`,
  };
}
