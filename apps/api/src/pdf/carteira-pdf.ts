import type { DoseResponse, MemberDosesResponse } from '@vacina/shared';
import PDFDocument from 'pdfkit';

/** Opções do gerador. */
export interface CarteiraPdfOptions {
  /** Dia de hoje (`AAAA-MM-DD`), para a idade e a data de emissão. */
  readonly today: string;
  /** Instante da emissão (ISO 8601), gravado nas propriedades do arquivo. */
  readonly generatedAt: string;
  /** Comprime os fluxos do PDF (padrão). Os testes desligam para ler o texto. */
  readonly compress?: boolean;
}

const ROTULO_DA_FAIXA: Readonly<Record<string, string>> = {
  CHILD: 'Criança',
  ADOLESCENT_YOUTH: 'Adolescente ou jovem',
  ADULT: 'Adulto',
  ELDERLY: 'Pessoa idosa',
};

const ROTULO_DO_PARENTESCO: Readonly<Record<string, string>> = {
  SELF: 'Você mesmo',
  MOTHER: 'Mãe',
  FATHER: 'Pai',
  SON: 'Filho',
  DAUGHTER: 'Filha',
  GRANDMOTHER: 'Avó',
  GRANDFATHER: 'Avô',
  SISTER: 'Irmã',
  BROTHER: 'Irmão',
  SPOUSE: 'Cônjuge',
  OTHER: 'Outro parentesco',
};

const ROTULO_DO_ESTADO: Readonly<Record<DoseResponse['status'], string>> = {
  PENDING: 'Pendente',
  SCHEDULED: 'Agendada',
  OVERDUE: 'Atrasada',
  APPLIED: 'Aplicada',
  CANCELLED: 'Cancelada',
};

const COR_DO_ESTADO: Readonly<Record<DoseResponse['status'], string>> = {
  PENDING: '#4d4d4d',
  SCHEDULED: '#1f4e8c',
  OVERDUE: '#a4281c',
  APPLIED: '#0b6b52',
  CANCELLED: '#6b6b6b',
};

const VERDE = '#0b6b52';
const TEXTO = '#10241d';
const SUAVE = '#4d625a';
const LINHA = '#cfdcd6';
const MARGEM = 48;
const LARGURA = 595.28 - 2 * MARGEM;
const RODAPE = 70;

/** Converte `AAAA-MM-DD` em `DD/MM/AAAA`. */
export function formatCivilDate(date: string): string {
  const [ano, mes, dia] = date.split('-');
  return `${dia}/${mes}/${ano}`;
}

/**
 * Idade em texto simples, como o app mostra: meses até 2 anos incompletos, depois anos.
 *
 * @param birthDate - Nascimento (`AAAA-MM-DD`).
 * @param today - Hoje (`AAAA-MM-DD`).
 */
export function describeAge(birthDate: string, today: string): string {
  const [by = 0, bm = 0, bd = 0] = birthDate.split('-').map(Number);
  const [ty = 0, tm = 0, td = 0] = today.split('-').map(Number);
  let months = (ty - by) * 12 + (tm - bm);
  if (td < bd) months -= 1;
  months = Math.max(0, months);
  if (months < 24) return months === 1 ? '1 mês' : `${months} meses`;
  const years = Math.floor(months / 12);
  return years === 1 ? '1 ano' : `${years} anos`;
}

/** Texto da coluna "Situação": o estado e a data que importa para ele. */
export function describeSituation(dose: DoseResponse): { estado: string; data: string } {
  const estado = ROTULO_DO_ESTADO[dose.status];
  switch (dose.status) {
    case 'APPLIED':
      return { estado, data: dose.appliedDate ? formatCivilDate(dose.appliedDate) : '' };
    case 'SCHEDULED':
      return { estado, data: dose.scheduledDate ? formatCivilDate(dose.scheduledDate) : '' };
    case 'OVERDUE':
      return { estado, data: `era para ${formatCivilDate(dose.dueDate)}` };
    case 'CANCELLED':
      return { estado, data: '' };
    default:
      return { estado, data: `prevista ${formatCivilDate(dose.dueDate)}` };
  }
}

function resumir(doses: readonly DoseResponse[]) {
  const contar = (estado: DoseResponse['status']) =>
    doses.filter((d) => d.status === estado).length;
  return {
    total: doses.length,
    aplicadas: contar('APPLIED'),
    atrasadas: contar('OVERDUE'),
    agendadas: contar('SCHEDULED'),
    pendentes: contar('PENDING'),
  };
}

/**
 * Gera o PDF da carteira de vacinação de uma pessoa (RF11): quem é, o resumo, a lista de doses com a
 * situação e a data, e, em todas as páginas, a fonte e a versão do calendário e o aviso de que o
 * documento **não substitui a caderneta oficial**. É uma cópia de conferência: não tem valor legal.
 * Usa só as fontes padrão do PDF (Helvetica), que cobrem os acentos do português.
 *
 * @param data - Calendário do membro, como devolve `GET /members/{id}/doses`.
 * @param options - Hoje, instante de emissão e compressão.
 * @returns Os bytes do arquivo PDF.
 */
export function renderCarteiraPdf(
  data: MemberDosesResponse,
  options: CarteiraPdfOptions,
): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margin: MARGEM,
      bufferPages: true,
      compress: options.compress ?? true,
      info: {
        Title: `Carteira de vacinação de ${data.member.name}`,
        Author: 'Vacina em Dia',
        Subject: 'Cópia de conferência. Não substitui a caderneta oficial de vacinação.',
        CreationDate: new Date(options.generatedAt),
      },
    });
    const pedacos: Buffer[] = [];
    doc.on('data', (pedaco: Buffer) => pedacos.push(pedaco));
    doc.on('error', reject);
    doc.on('end', () => resolve(new Uint8Array(Buffer.concat(pedacos))));

    const { member, items, source } = data;
    const topoDaPagina = () => MARGEM;
    const limiteDeBaixo = () => doc.page.height - RODAPE;

    // Cabeçalho.
    doc.fillColor(VERDE).font('Helvetica-Bold').fontSize(22).text('Vacina em Dia', MARGEM, 44);
    doc
      .fillColor(TEXTO)
      .font('Helvetica-Bold')
      .fontSize(15)
      .text('Carteira de vacinação (cópia de conferência)', MARGEM, doc.y + 2);
    doc
      .fillColor(SUAVE)
      .font('Helvetica')
      .fontSize(10)
      .text(`Emitida em ${formatCivilDate(options.today)}`, MARGEM, doc.y + 2);
    doc
      .moveTo(MARGEM, doc.y + 10)
      .lineTo(MARGEM + LARGURA, doc.y + 10)
      .strokeColor(VERDE)
      .lineWidth(2)
      .stroke();
    doc.moveDown(1.6);

    // Quem é.
    doc.fillColor(TEXTO).font('Helvetica-Bold').fontSize(18).text(member.name, MARGEM);
    const detalhes = [
      `Nascimento: ${formatCivilDate(member.birthDate)} (${describeAge(member.birthDate, options.today)})`,
      `Faixa do calendário: ${ROTULO_DA_FAIXA[member.ageGroup] ?? member.ageGroup}`,
      ...(member.relationship
        ? [`Parentesco: ${ROTULO_DO_PARENTESCO[member.relationship] ?? member.relationship}`]
        : []),
      ...(member.isPregnant ? ['Gestante: sim'] : []),
    ];
    doc.fillColor(SUAVE).font('Helvetica').fontSize(11);
    for (const linha of detalhes) doc.text(linha, MARGEM);
    doc.moveDown(0.8);

    // Resumo.
    const resumo = resumir(items);
    doc
      .fillColor(TEXTO)
      .font('Helvetica-Bold')
      .fontSize(12)
      .text(`${resumo.aplicadas} de ${resumo.total} doses aplicadas`, MARGEM, doc.y, {
        continued: true,
      })
      .font('Helvetica')
      .fillColor(SUAVE)
      .text(
        `   ${resumo.atrasadas} atrasadas, ${resumo.agendadas} agendadas, ${resumo.pendentes} pendentes`,
      );
    doc.moveDown(0.8);

    // Tabela.
    const colunas = [
      { titulo: 'Vacina e dose', x: MARGEM, largura: 200 },
      { titulo: 'Protege contra', x: MARGEM + 200, largura: 125 },
      { titulo: 'Situação', x: MARGEM + 325, largura: 62 },
      { titulo: 'Data', x: MARGEM + 387, largura: LARGURA - 387 },
    ] as const;

    const cabecalhoDaTabela = () => {
      const y = doc.y;
      doc.rect(MARGEM, y, LARGURA, 20).fill('#e6f2ed');
      doc.fillColor(TEXTO).font('Helvetica-Bold').fontSize(9.5);
      for (const c of colunas) doc.text(c.titulo, c.x + 6, y + 6, { width: c.largura - 8 });
      doc.y = y + 24;
    };
    cabecalhoDaTabela();

    for (const dose of items) {
      const { estado, data: quando } = describeSituation(dose);
      const nome = `${dose.vaccine}, ${dose.doseLabel}`;
      const nota = dose.conditional ? 'Só em algumas situações' : '';
      doc.font('Helvetica-Bold').fontSize(10);
      const alturaNome = doc.heightOfString(nome, { width: colunas[0].largura - 8 });
      doc.font('Helvetica').fontSize(9);
      const alturaContra = doc.heightOfString(dose.diseases, { width: colunas[1].largura - 8 });
      const alturaNota = nota ? 11 : 0;
      const altura = Math.max(alturaNome + alturaNota, alturaContra, 14) + 10;

      if (doc.y + altura > limiteDeBaixo()) {
        doc.addPage();
        doc.y = topoDaPagina();
        cabecalhoDaTabela();
      }
      const y = doc.y;
      doc.fillColor(TEXTO).font('Helvetica-Bold').fontSize(10);
      doc.text(nome, colunas[0].x + 6, y + 3, { width: colunas[0].largura - 8 });
      if (nota) {
        doc
          .fillColor(SUAVE)
          .font('Helvetica-Oblique')
          .fontSize(8.5)
          .text(nota, colunas[0].x + 6, y + 3 + alturaNome, { width: colunas[0].largura - 8 });
      }
      doc.fillColor(SUAVE).font('Helvetica').fontSize(9);
      doc.text(dose.diseases, colunas[1].x + 6, y + 4, { width: colunas[1].largura - 8 });
      doc.fillColor(COR_DO_ESTADO[dose.status]).font('Helvetica-Bold').fontSize(9.5);
      doc.text(estado, colunas[2].x + 6, y + 4, { width: colunas[2].largura - 8 });
      doc.fillColor(TEXTO).font('Helvetica').fontSize(9.5);
      doc.text(quando, colunas[3].x + 6, y + 4, { width: colunas[3].largura - 8 });
      doc
        .moveTo(MARGEM, y + altura)
        .lineTo(MARGEM + LARGURA, y + altura)
        .strokeColor(LINHA)
        .lineWidth(0.5)
        .stroke();
      doc.y = y + altura;
    }

    if (items.length === 0) {
      doc
        .fillColor(SUAVE)
        .font('Helvetica')
        .fontSize(11)
        .text('Nenhuma dose registrada.', MARGEM + 6);
    }

    // Rodapé de todas as páginas: fonte, versão, aviso e numeração.
    const paginas = doc.bufferedPageRange();
    for (let i = 0; i < paginas.count; i += 1) {
      doc.switchToPage(paginas.start + i);
      // O rodapé fica na margem de baixo; sem zerá-la o PDFKit abriria uma página nova para ele.
      doc.page.margins.bottom = 0;
      const base = doc.page.height - RODAPE + 14;
      doc
        .moveTo(MARGEM, base - 6)
        .lineTo(MARGEM + LARGURA, base - 6)
        .strokeColor(LINHA)
        .lineWidth(0.5)
        .stroke();
      doc
        .fillColor(SUAVE)
        .font('Helvetica')
        .fontSize(8)
        .text(
          `Fonte: ${source.name}, ${source.publisher}, versão ${source.version}. ${source.notice} ` +
            'Esta cópia serve para conferir e não tem valor legal.',
          MARGEM,
          base,
          { width: LARGURA - 60, lineBreak: true, height: RODAPE - 20 },
        );
      doc.text(`Página ${i + 1} de ${paginas.count}`, MARGEM + LARGURA - 60, base, {
        width: 60,
        align: 'right',
        lineBreak: false,
      });
    }
    doc.end();
  });
}
