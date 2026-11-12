import type { CivilDate } from '../domain/civil-date';

/** Uma fonte oficial usada nas fichas. */
export interface VaccineInfoSource {
  readonly id: string;
  readonly name: string;
  readonly publisher: string;
  readonly edition: string;
  readonly url: string;
  /** Data em que o arquivo oficial foi lido. */
  readonly retrievedAt: CivilDate;
}

/** Onde, no manual de eventos adversos, estão as reações já conhecidas da vacina. */
export interface AdverseEventsPointer {
  readonly quadro: string;
  readonly page: number;
}

/** Ficha de uma vacina: trechos do manual do Ministério da Saúde, copiados sem alteração. */
export interface VaccineInfo {
  /** Nome da vacina como aparece no calendário do app. */
  readonly vaccine: string;
  /** Seção do Manual de Normas e Procedimentos para Vacinação. */
  readonly manualSection: string;
  /** Trecho "Composição" do manual. */
  readonly composition: string;
  /** Trecho "Contraindicação" do manual, um parágrafo ou item por posição. */
  readonly contraindication: readonly string[];
  /** Em que quadro do manual de vigilância de eventos adversos estão as reações. */
  readonly adverseEvents: AdverseEventsPointer;
}

/** Conjunto das fichas, com as fontes, o texto comum a todas e o aviso. */
export interface VaccineInfoSet {
  readonly sources: {
    readonly norms: VaccineInfoSource;
    readonly adverseEvents: VaccineInfoSource;
  };
  /** Contraindicações comuns a todos os imunobiológicos (seção 10.1.4.1 do Manual de Normas). */
  readonly commonContraindication: readonly string[];
  readonly notice: string;
  readonly items: readonly VaccineInfo[];
}

/**
 * Fichas "Sobre esta vacina" (B75, ADR-033). Os trechos de composição e contraindicação foram
 * copiados do Manual de Normas e Procedimentos para Vacinação (2ª edição revisada, 2024), capítulo
 * 12, sem resumir nem reescrever (só a primeira letra de cada trecho foi posta em maiúscula e as
 * quebras de linha do PDF foram desfeitas). Cada trecho foi conferido, por programa, contra o texto
 * extraído do PDF. As reações esperadas ficam no Manual de Vigilância Epidemiológica de Eventos
 * Adversos Pós-Vacinação: a ficha aponta o quadro e a página, em vez de copiar a tabela, porque a
 * tabela não pode ser transcrita com segurança por programa. Vacinas mais novas que os manuais
 * (pneumocócica 20-valente, covid-19, dengue e VSR) ainda não têm ficha.
 *
 * Isto é informação, não orientação médica: o app nunca cruza a ficha com os dados da pessoa.
 */
export const VACCINE_INFO: VaccineInfoSet = {
  sources: {
    norms: {
      id: 'manual-de-normas',
      name: 'Manual de Normas e Procedimentos para Vacinação',
      publisher: 'Ministério da Saúde',
      edition: '2ª edição revisada, 2024',
      url: 'https://www.gov.br/saude/pt-br/centrais-de-conteudo/publicacoes/guias-e-manuais/2024/manual-de-normas-e-procedimentos-para-vacinacao.pdf',
      retrievedAt: '2026-11-12',
    },
    adverseEvents: {
      id: 'manual-de-eventos-adversos',
      name: 'Manual de Vigilância Epidemiológica de Eventos Adversos Pós-Vacinação',
      publisher: 'Ministério da Saúde',
      edition: '4ª edição atualizada, 2021',
      url: 'https://www.gov.br/saude/pt-br/vacinacao/manuais/manual_eventos-_adversos_pos_vacinacao_4ed_atualizada.pdf',
      retrievedAt: '2026-11-12',
    },
  },
  commonContraindication: [
    'A contraindicação é entendida como uma condição que potencializa o risco de evento adverso grave e torna o risco de complicações decorrentes da vacinação superior ao risco de contrair a doença a qual se propõe prevenir.',
    'O imunobiológico NÃO deve ser administrado quando o indivíduo possuir:',
    'Ocorrência de hipersensibilidade (reação anafilática) confirmada após o recebimento de dose anterior.',
    'Hipersensibilidade ao princípio ativo ou a qualquer dos excipientes da vacina.',
  ],
  notice:
    'Informação copiada dos manuais do Ministério da Saúde, para você se informar. Não substitui a conversa com um profissional de saúde, e o app não diz se você pode ou não tomar esta vacina. Em caso de dúvida, alergia ou condição de saúde especial, procure um serviço de saúde.',
  items: [
    {
      vaccine: 'BCG',
      manualSection: '12.2.1',
      composition:
        'A vacina BCG é preparada com bacilos vivos, a partir de cepas do Mycobacterium bovis, atenuadas com glutamato de sódio. As subcepas utilizadas no Brasil são a Moureau – Rio de Janeiro, e a estirpe Moscow 361 I.',
      contraindication: [
        'Além das contraindicações comuns a todo imunobiológico, esta vacina está também contraindicada para comunicantes de hanseníase nas seguintes situações:',
        'Usuários a partir dos 5 anos de idade portadores de HIV, mesmo que assintomáticos e sem sinais de imunodeficiência.',
        'Gestantes. A administração da vacina BCG deve ser adiada quando a criança apresentar peso inferior a 2 kg, devido à escassez do tecido cutâneo (panículo adiposo), e quando apresentar lesões graves de pele. Crianças expostas, durante a gestação, ao uso de anticorpo monoclonal pela mãe, por exemplo anti-TNFs e rituximabe, devem ter a vacinação adiada pelo período de 6 a 12 meses a contar da última dose da medicação recebida durante a gestação, pois essas medicações atravessam a barreira placentária, ocasionando imunossupressão temporária na criança. Durante o aleitamento materno, o anticorpo monoclonal administrado à mãe não é transferido à criança pela amamentação. Assim, crianças em aleitamento materno cuja mãe recebeu tratamento com anticorpo monoclonal no pós-parto (mas não durante a gestação) devem receber as vacinas vivas e inativadas do Calendário Nacional de Vacinação.',
      ],
      adverseEvents: { quadro: 'Quadros 11 e 12', page: 129 },
    },
    {
      vaccine: 'hepatite B',
      manualSection: '12.2.2',
      composition:
        'A vacina hepatite B (recombinante) contém o antígeno recombinante de superfície (HBsAg), que é purificado por vários métodos físico-químicos e adsorvido por hidróxido de alumínio, tendo o timerosal como conservante.',
      contraindication: [
        'Além das contraindicações comuns a todo imunobiológico, a vacina hepatite B (recombinante) não possui contraindicações específicas.',
      ],
      adverseEvents: { quadro: 'Quadro 26', page: 171 },
    },
    {
      vaccine: 'penta (DTP+Hib+HB)',
      manualSection: '12.2.3',
      composition:
        'A vacina é composta pela combinação de toxoides purificados de difteria e tétano, suspensão celular inativada de Bordetella pertussis (células inteiras), antígeno de superfície da hepatite B (recombinante) e oligossacarídeos conjugados de Haemophilus influenzae B (conjugada). Tem como adjuvante o fosfato de alumínio e como conservante o timerosal.',
      contraindication: [
        'Além das contraindicações comuns a todo imunobiológico, a vacina Penta está contraindicada a partir de 7 anos de idade e também para crianças que apresentarem quadro neurológico em atividade ou quando, após dose anterior, a criança registrar qualquer das seguintes manifestações:',
        'Convulsão nas primeiras 72 horas após a administração da vacina.',
        'Episódio hipotônico-hiporresponsivo nas primeiras 48 horas após a administração da vacina.',
        'Encefalopatia aguda grave depois de sete dias após a administração de dose anterior da vacina.',
        'Nas situações supracitadas, encaminhar para o Centro de Imunobiológico Especial ou solicitar ao município o imunobiológico especial para continuidade do esquema.',
      ],
      adverseEvents: { quadro: 'Quadro 4', page: 110 },
    },
    {
      vaccine: 'DTP',
      manualSection: '12.2.4',
      composition:
        'Esta vacina é composta pela combinação de toxoides purificados de difteria e tétano e suspensão celular inativada de Bordetella pertussis (células inteiras), tendo o hidróxido de alumínio como adjuvante e o timerosal como conservante.',
      contraindication: [
        'Além das contraindicações comuns a todo imunobiológico, a vacina DTP está contraindicada a partir de 7 anos de idade e também para crianças que apresentarem quadro neurológico em atividade ou quando, após dose anterior, a criança registrar qualquer das seguintes manifestações:',
        'Convulsão nas primeiras 72 horas após a administração da vacina.',
        'Episódio hipotônico-hiporresponsivo nas primeiras 48 horas após a administração da vacina.',
        'Encefalopatia aguda grave depois de sete dias após a administração de dose anterior da vacina.',
        'Nas situações supracitadas, encaminhar para o Centro de Imunobiológico Especial ou solicitar ao município o imunobiológico especial para continuidade do esquema.',
      ],
      adverseEvents: { quadro: 'Quadro 5', page: 112 },
    },
    {
      vaccine: 'poliomielite inativada VIP',
      manualSection: '12.2.5',
      composition:
        'A VIP contém os vírus da poliomielite dos tipos 1, 2 e 3, obtidos em cultura celular e inativados por formaldeído. Contém hidróxido de alumínio como adjuvante.',
      contraindication: [
        'Além das contraindicações comuns a todo imunobiológico, não há contraindicações específicas para a VIP.',
      ],
      adverseEvents: { quadro: 'Quadro 36', page: 212 },
    },
    {
      vaccine: 'pneumocócica 10-valente',
      manualSection: '12.2.7',
      composition:
        'A vacina pneumocócica 10-valente (conjugada) é preparada a partir de polissacarídeos capsulares bacterianos purificados do Streptococcus pneumoniae (pneumococo), com dez sorotipos de pneumococo (1, 4, 5, 6B, 7F, 9V, 14, 18C, 19F e 23F).',
      contraindication: [
        'Além das contraindicações comuns a todo imunobiológico, não há contraindicações específicas.',
      ],
      adverseEvents: { quadro: 'Quadro 32', page: 203 },
    },
    {
      vaccine: 'rotavírus humano',
      manualSection: '12.2.8',
      composition:
        'A vacina é constituída por um sorotipo do rotavírus humano atenuado da cepa (RIX4414). Apresenta como excipientes a sacarose e o adipato dissódico.',
      contraindication: [
        'Além das contraindicações comuns a todo imunobiológico, a vacina rotavírus está contraindicada:',
        'Na presença de imunodepressão severa.',
        'Na vigência do uso de corticosteroides em doses imunossupressoras ou quimioterápicos.',
        'Para crianças com histórico de invaginação intestinal ou com malformação congênita não corrigida do trato gastrointestinal. Para crianças fora da faixa etária preconizada.',
      ],
      adverseEvents: { quadro: 'Quadro 38', page: 223 },
    },
    {
      vaccine: 'meningocócica C',
      manualSection: '12.2.9',
      composition:
        'A vacina meningocócica C (conjugada) é constituída por polissacarídeos capsulares purificados da Neisseria meningitidis do sorogrupo C. Tem como adjuvante o hidróxido de alumínio.',
      contraindication: [
        'Além das contraindicações comuns a todo imunobiológico, não há contraindicações específicas para a vacina meningocócica C (conjugada).',
      ],
      adverseEvents: { quadro: 'Quadro 28', page: 188 },
    },
    {
      vaccine: 'meningocócica ACWY',
      manualSection: '12.2.10',
      composition:
        'A vacina meningocócica ACWY (conjugada) é constituída por polissacarídeos capsulares purificados da Neisseria meningitidis do sorogrupo ACWY, conjugados a uma proteína que, dependendo do fabricante, pode ser o toxoide tetânico, diftérico, ou o mutante atóxico da toxina diftérica, chamado CRM-197.',
      contraindication: [
        'Além das contraindicações comuns a todo imunobiológico, a vacina meningocócica ACWY (conjugada) não deve ser administrada em gestante, salvo em situação de risco epidemiológico. Uma dose: o volume da vacina a ser administrado é de 0,5 mL.',
      ],
      adverseEvents: { quadro: 'Quadro 29', page: 189 },
    },
    {
      vaccine: 'febre amarela',
      manualSection: '12.2.11',
      composition:
        'É composta de vírus vivos atenuados da febre amarela derivados da linhagem 17 DD. Tem como excipientes a sacarose, o glutamato de sódio, o sorbitol, a eritromicina e a canamicina.',
      contraindication: [
        'Crianças menores de 6 meses de vida.',
        'Pacientes em tratamento com biológicos (Infliximabe, Etarnecepte, Golimumabe, Certolizumabe, Abatacept, Belimumabe, Ustequinumabe, Canaquinumabe, Tocilizumabe, Rituximabe, inibidores de CCR5 como Maraviroc) e que interromperam o uso dessa medicação, é necessária avaliação médica para se definir o intervalo para vacinação, conforme Manual dos CRIE.',
        'Pacientes submetidos a transplante de órgãos sólidos.',
        'Pacientes com imunodeficiências primárias graves.',
        'Pacientes com história pregressa de doenças do timo (miastenia gravis, timoma, casos de ausência de timo ou remoção cirúrgica).',
        'Pacientes portadores de doença falciforme em uso de hidroxiureia e contagem de neutrófilos menor de 1.500 cels/mm³.',
        'Pacientes recebendo corticosteroides em doses imunossupressoras (prednisona 2 mg/kg por dia nas crianças até 10 kg por mais de 14 dias, ou 20 mg por dia por mais de 14 dias em adultos). Para informações adicionais sobre as contraindicações e precauções para vacinação, consultar o Manual dos CRIE.',
      ],
      adverseEvents: { quadro: 'Quadro 20', page: 159 },
    },
    {
      vaccine: 'tríplice viral SCR',
      manualSection: '12.2.12',
      composition:
        'A vacina é composta por vírus vivos atenuados do sarampo, da caxumba e da rubéola.',
      contraindication: [
        'Além das contraindicações comuns a todo imunobiológico, a vacina tríplice viral está contraindicada nas seguintes situações:',
        'Crianças menores de 6 meses de idade.',
        'Usuários com imunodeficiência clínica ou laboratorial grave.',
        'Gestação. A gestante não deve ser vacinada para evitar a associação entre a vacinação e possíveis complicações da gestação, incluindo aborto espontâneo ou malformação congênita no recém-nascido por outras causas não associadas à vacina. Na vacinação inadvertida da gestante, não está indicada a interrupção da gravidez. A gestante deve ser acompanhada durante o pré-natal e após o parto. Pessoas não vacinadas ou com esquema incompleto para a vacina tríplice viral e com história de alergia à proteína do leite de vaca (lactoalbumina), NÃO devem receber a vacina tríplice viral do laboratório Serum Institute of India Ltda.; elas devem receber vacinas que não contenham lactoalbumina em sua composição.',
      ],
      adverseEvents: { quadro: 'Quadro 41', page: 232 },
    },
    {
      vaccine: 'hepatite A',
      manualSection: '12.2.13',
      composition:
        'É composta pelo antígeno do vírus da hepatite A. Tem como adjuvante o hidróxido de alumínio e não contém antibióticos.',
      contraindication: [
        'Além das contraindicações comuns a todo imunobiológico, não há contraindicações específicas para a vacina hepatite A.',
      ],
      adverseEvents: { quadro: 'Quadro 9', page: 121 },
    },
    {
      vaccine: 'dT',
      manualSection: '12.2.15',
      composition:
        'A vacina dT é uma associação dos toxoides diftérico e tetânico, tendo o hidróxido ou o fosfato de alumínio como adjuvante e o timerosal como conservante.',
      contraindication: [
        'Além das contraindicações comuns a todos os imunobiológicos, não há contraindicações específicas para a vacina dT.',
      ],
      adverseEvents: { quadro: 'Quadro 8', page: 118 },
    },
    {
      vaccine: 'dTpa',
      manualSection: '12.2.16',
      composition:
        'A vacina é constituída de suspensão contendo toxoide diftérico, toxoide tetânico e antígeno Bordetella pertussis. Contém o hidróxido de alumínio hidratado e fosfato de alumínio como adjuvantes.',
      contraindication: [
        'Além das contraindicações comuns a todo imunobiológico, não há contraindicações específicas para a vacina dTpa.',
      ],
      adverseEvents: { quadro: 'Quadro 8', page: 118 },
    },
    {
      vaccine: 'HPV4',
      manualSection: '12.2.17',
      composition:
        'A vacina HPV quadrivalente recombinante é inativada, constituída por proteínas L1 do HPV tipos 6, 11, 16 e 18. Contém como excipientes o adjuvante sulfato hidroxifosfato de alumínio amorfo, cloreto de sódio, L-histidina, polissorbato 80, borato de sódio e água para injetáveis. O produto não contém conservantes ou antibióticos.',
      contraindication: [
        'Além das contraindicações comuns a todos os imunobiológicos, esta vacina está contraindicada para:',
        'Gestante, no entanto, em situação de vacinação inadvertida, não se recomenda a interrupção da gestação. A gestante deve ser acompanhada durante o pré-natal e o esquema deve ser completado após o parto, preferencialmente ainda no puerpério. A amamentação não contraindica o uso da vacina HPV quadrivalente, pois as informações disponíveis não demonstram nenhum efeito prejudicial para as crianças.',
      ],
      adverseEvents: { quadro: 'Quadro 31', page: 194 },
    },
    {
      vaccine: 'influenza trivalente',
      manualSection: '12.2.18',
      composition:
        'É composta por diferentes cepas do vírus Myxovirus influenzae inativado, fragmentado e purificado, cultivado em ovos embrionados de galinha, contendo, ainda, traços de neomicina ou polimixina, gentamicina e timerosal como conservantes. A composição e a concentração de antígenos de hemaglutinina (HA) são definidas a cada ano em função dos dados epidemiológicos, que apontam o tipo e a cepa do vírus influenza que está circulando de forma predominante nos hemisférios Norte e Sul.',
      contraindication: [
        'Além das contraindicações comuns a todos os imunobiológicos, a vacina influenza está contraindicada para:',
        'Crianças menores de 6 meses de idade.',
        'História de anafilaxia a componentes da vacina em doses anteriores.',
      ],
      adverseEvents: { quadro: 'Quadro 27', page: 178 },
    },
    {
      vaccine: 'varicela',
      manualSection: '12.2.21',
      composition:
        'A vacina varicela (atenuada) é composta de vírus vivo atenuado, proveniente da cepa Oka ou MAV/06, a depender do laboratório produtor. Pode conter gelatina e traços de neomicina, kanamicina e eritromicina.',
      contraindication: [
        'Além das contraindicações comuns a todo imunobiológico, a vacina varicela está contraindicada para gestantes, crianças menores de 9 meses de idade e pessoas imunodeprimidas.',
      ],
      adverseEvents: { quadro: 'Quadro 43', page: 237 },
    },
  ],
};

/**
 * Procura a ficha de uma vacina pelo nome do calendário do app.
 *
 * @param vaccine - Nome da vacina, como no calendário (por exemplo, "hepatite B").
 * @returns A ficha, ou `undefined` se a vacina ainda não tem ficha (ou é uma dose avulsa).
 */
export function vaccineInfoFor(vaccine: string): VaccineInfo | undefined {
  return VACCINE_INFO.items.find((item) => item.vaccine === vaccine);
}
