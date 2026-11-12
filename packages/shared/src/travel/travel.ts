import { addDays, compareCivilDates } from '../domain/civil-date';

/** Para onde a pessoa vai: dentro do Brasil ou para o exterior. */
export type TravelDestination = 'BRAZIL' | 'ABROAD';

/** Link oficial de um item. */
export interface TravelLink {
  readonly label: string;
  readonly url: string;
}

/** Um item do roteiro: o texto vem do Ministério da Saúde, com o prazo quando a fonte dá um. */
export interface TravelGuideItem {
  readonly id: string;
  readonly title: string;
  readonly text: string;
  /** Antecedência, em dias, que a fonte indica para vacinar antes da viagem. */
  readonly daysBefore?: number;
  /** Só para viagem ao exterior. */
  readonly abroadOnly?: boolean;
  readonly links: readonly TravelLink[];
}

/** Roteiro de preparação de viagem, versionado, com fonte e data da consulta. */
export interface TravelGuide {
  readonly source: {
    readonly name: string;
    readonly publisher: string;
    readonly url: string;
    /** Data em que o texto foi lido na fonte oficial. */
    readonly retrievedAt: string;
  };
  /** Aviso de que é um checklist e de que se deve procurar um serviço de saúde. */
  readonly notice: string;
  readonly items: readonly TravelGuideItem[];
}

/**
 * Roteiro "Vacinação para os Viajantes", do Ministério da Saúde, lido em 12/11/2026 em
 * <https://www.gov.br/saude/pt-br/vacinacao/viajantes> e
 * <https://www.gov.br/saude/pt-br/assuntos/saude-de-a-a-z/s/saude-do-viajante/vacina-para-viajantes>.
 * As páginas não informam data de atualização (só "©2025"), então a data é a da leitura. O app **não**
 * traz tabela de países nem de áreas de risco: isso muda com frequência e só vale na fonte oficial
 * (CLAUDE.md §8). Cada item é conferido pelo autor antes de ir para a produção.
 */
export const TRAVEL_GUIDE: TravelGuide = {
  source: {
    name: 'Vacinação para os Viajantes',
    publisher: 'Ministério da Saúde',
    url: 'https://www.gov.br/saude/pt-br/vacinacao/viajantes',
    retrievedAt: '2026-11-12',
  },
  notice:
    'Este roteiro é um checklist para se preparar, não orientação médica individual, e não substitui o serviço de saúde. Antes de viajar, procure um serviço de saúde (sala de vacina ou Secretaria de Saúde) e confira as regras do seu destino nas fontes oficiais.',
  items: [
    {
      id: 'febre-amarela',
      title: 'Febre amarela',
      text: 'O Ministério da Saúde indica a vacina a quem vai a Áreas com Recomendação de Vacinação (ACRV), com pelo menos 10 dias de antecedência da data da viagem.',
      daysBefore: 10,
      links: [
        {
          label: 'Febre amarela no Ministério da Saúde',
          url: 'https://www.gov.br/saude/pt-br/assuntos/saude-de-a-a-z/f/febre-amarela',
        },
      ],
    },
    {
      id: 'calendario-em-dia',
      title: 'Calendário de vacinação em dia',
      text: 'Brasileiros que viajam devem manter a situação vacinal atualizada, conforme o Calendário Nacional de Vacinação.',
      links: [
        {
          label: 'Calendário Nacional de Vacinação',
          url: 'https://www.gov.br/saude/pt-br/vacinacao/calendario',
        },
      ],
    },
    {
      id: 'cartao',
      title: 'Cartão de vacinação nos documentos da viagem',
      text: 'Leve o cartão de vacinação com os documentos da viagem: é ele que comprova, em território nacional, a vacinação. No app, a carteira em PDF fica na tela de Doses.',
      links: [
        {
          label: 'Vacinação para os Viajantes',
          url: 'https://www.gov.br/saude/pt-br/vacinacao/viajantes',
        },
      ],
    },
    {
      id: 'civp',
      title: 'Certificado Internacional de Vacinação (CIVP)',
      text: 'Em viagens internacionais, convém ter o CIVP quando o destino exigir na entrada ou em escala de voo. Quem decide a exigência é o país de destino: confira com a Anvisa e com o consulado.',
      abroadOnly: true,
      links: [{ label: 'Anvisa', url: 'https://www.gov.br/anvisa/pt-br' }],
    },
    {
      id: 'servicos',
      title: 'Onde se informar e se vacinar',
      text: 'As vacinas recomendadas pelo Ministério são oferecidas de graça nos serviços públicos de vacinação; leve um documento de identificação e o cartão de vacinação. Em caso de dúvida, procure a Secretaria Estadual ou Municipal de Saúde.',
      links: [
        {
          label: 'Centros de Apoio à Saúde do Viajante no Brasil',
          url: 'https://www.gov.br/saude/pt-br/vacinacao/viajantes/centros-de-apoio-a-saude-do-viajante-no-brasil',
        },
      ],
    },
  ],
};

/** O que o roteiro precisa saber de cada dose da pessoa (um recorte de `DoseResponse`). */
export interface TravelDose {
  readonly vaccine: string;
  readonly status: 'PENDING' | 'SCHEDULED' | 'APPLIED' | 'OVERDUE' | 'CANCELLED';
  readonly dueDate: string;
}

/**
 * Situação de um item: `DONE` (já consta no histórico), `TODO` (há o que fazer), `LATE` (o prazo
 * indicado pela fonte já passou), `INFO` (só orientação, sem como saber pelo histórico).
 */
export type TravelItemStatus = 'DONE' | 'TODO' | 'LATE' | 'INFO';

/** Um item já avaliado para a pessoa e a viagem. */
export interface TravelChecklistItem {
  readonly id: string;
  readonly title: string;
  readonly text: string;
  readonly status: TravelItemStatus;
  /** Última data para vacinar, quando a fonte indica antecedência. */
  readonly deadline: string | null;
  /** Frase sobre a situação da pessoa (por exemplo, quantas doses estão atrasadas). */
  readonly detail: string | null;
  readonly links: readonly TravelLink[];
}

/** Checklist montado para uma viagem. */
export interface TravelChecklist {
  readonly destination: TravelDestination;
  readonly departure: string;
  readonly source: TravelGuide['source'];
  readonly notice: string;
  readonly items: readonly TravelChecklistItem[];
}

const plural = (n: number, um: string, varios: string) => (n === 1 ? `1 ${um}` : `${n} ${varios}`);

/**
 * Monta o checklist de uma viagem a partir do histórico da pessoa. Só olha o que o app sabe (doses
 * registradas e prazos do calendário); **nunca** diz se a pessoa pode ou não viajar nem se deve
 * tomar uma vacina: isso é com o serviço de saúde.
 *
 * @param input.destination - Dentro do Brasil ou exterior.
 * @param input.departure - Data da partida (dia civil).
 * @param input.today - Hoje (dia civil), vindo de fora para testar.
 * @param input.doses - Doses da pessoa.
 * @param input.guide - Roteiro a usar; por padrão, o do Ministério da Saúde.
 */
export function buildTravelChecklist({
  destination,
  departure,
  today,
  doses,
  guide = TRAVEL_GUIDE,
}: {
  destination: TravelDestination;
  departure: string;
  today: string;
  doses: readonly TravelDose[];
  guide?: TravelGuide;
}): TravelChecklist {
  const items = guide.items
    .filter((item) => destination === 'ABROAD' || !item.abroadOnly)
    .map((item): TravelChecklistItem => {
      const deadline = item.daysBefore === undefined ? null : addDays(departure, -item.daysBefore);
      const base = { id: item.id, title: item.title, text: item.text, links: item.links, deadline };

      if (item.id === 'febre-amarela') {
        const aplicada = doses.some(
          (d) => d.status === 'APPLIED' && d.vaccine.toLowerCase().includes('febre amarela'),
        );
        if (aplicada) {
          return {
            ...base,
            status: 'DONE',
            detail:
              'Há uma dose de febre amarela registrada no histórico. Confira com o serviço de saúde se ela basta para o seu destino.',
          };
        }
        const passou = deadline !== null && compareCivilDates(deadline, today) < 0;
        return {
          ...base,
          status: passou ? 'LATE' : 'TODO',
          detail: passou
            ? 'O prazo de 10 dias antes da viagem já passou. Procure um serviço de saúde para saber o que fazer.'
            : 'Nenhuma dose de febre amarela registrada no histórico. Se o seu destino for uma área com recomendação, vacine até essa data.',
        };
      }

      if (item.id === 'calendario-em-dia') {
        const atrasadas = doses.filter((d) => d.status === 'OVERDUE').length;
        const ateAViagem = doses.filter(
          (d) =>
            (d.status === 'PENDING' || d.status === 'SCHEDULED') &&
            compareCivilDates(d.dueDate, departure) <= 0,
        ).length;
        if (atrasadas === 0 && ateAViagem === 0) {
          return {
            ...base,
            status: 'DONE',
            detail: 'Nenhuma dose atrasada nem prevista até a viagem.',
          };
        }
        const partes = [
          atrasadas > 0 ? plural(atrasadas, 'dose atrasada', 'doses atrasadas') : null,
          ateAViagem > 0
            ? `${plural(ateAViagem, 'dose prevista', 'doses previstas')} até a viagem`
            : null,
        ].filter(Boolean);
        return { ...base, status: 'TODO', detail: `${partes.join(' e ')}.` };
      }

      return { ...base, status: 'INFO', detail: null };
    });

  return {
    destination,
    departure,
    source: guide.source,
    notice: guide.notice,
    items,
  };
}
