import { civilToday, type Clock } from '../clock';
import { renderCarteiraPdf } from '../pdf/carteira-pdf';
import type { DoseService } from './dose-service';
import { failure, success, type Result } from './errors';

/** PDF pronto para baixar: o nome do arquivo e os bytes. */
export interface CarteiraPdf {
  readonly filename: string;
  readonly bytes: Uint8Array;
}

/** Casos de uso da exportação da carteira de vacinação (RF11). */
export interface CarteiraService {
  /**
   * Gera o PDF da carteira de um membro do usuário. A posse é verificada pelo serviço de dose, que
   * devolve `NOT_FOUND` para membro de outra conta e `CONSENT_REQUIRED` sem consentimento.
   */
  exportPdf(ownerId: string, memberId: string): Promise<Result<CarteiraPdf>>;
}

/** Dependências do serviço, injetadas para testar sem rede. */
export interface CarteiraServiceDeps {
  readonly doses: DoseService;
  readonly clock: Clock;
}

/**
 * Nome de arquivo seguro: só letras ASCII, números e hífen (o nome da pessoa pode ter acentos,
 * espaços e símbolos que não valem num cabeçalho HTTP).
 *
 * @param name - Nome ou apelido da pessoa.
 */
export function carteiraFilename(name: string): string {
  const slug = name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  return `carteira-vacinacao-${slug || 'pessoa'}.pdf`;
}

/**
 * Cria o serviço de exportação. O "hoje" e o instante de emissão vêm do relógio injetado.
 *
 * @param deps - Serviço de dose e relógio.
 */
export function createCarteiraService(deps: CarteiraServiceDeps): CarteiraService {
  return {
    async exportPdf(ownerId, memberId) {
      const calendar = await deps.doses.listForMember(ownerId, memberId);
      if (!calendar.ok) return failure(calendar.error);
      const bytes = await renderCarteiraPdf(calendar.value, {
        today: civilToday(deps.clock),
        generatedAt: deps.clock(),
      });
      return success({ filename: carteiraFilename(calendar.value.member.name), bytes });
    },
  };
}
