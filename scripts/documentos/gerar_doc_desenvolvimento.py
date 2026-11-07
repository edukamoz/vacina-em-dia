"""Gera doctos/Documentacao_de_Desenvolvimento.docx a partir de docs/09-documentacao-de-desenvolvimento.md.

O Markdown é a fonte. O Word sai no formato ABNT usado nas outras documentações (Arial 12, margens
3/2 cm, título numerado). Trechos `[a informar]` e `[a preencher ...]` saem destacados em amarelo para
quem for completar o documento (tempos, datas e reuniões são registros reais de cada integrante).
"""

import re
from pathlib import Path

from docx import Document
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_COLOR_INDEX
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Cm, Pt, RGBColor

REPO = Path(__file__).resolve().parents[2]
FONTE = REPO / 'docs' / '09-documentacao-de-desenvolvimento.md'
SAIDA = REPO / 'doctos' / 'Documentacao_de_Desenvolvimento.docx'

doc = Document()
sec = doc.sections[0]
sec.page_width, sec.page_height = Cm(21), Cm(29.7)
sec.left_margin = sec.top_margin = Cm(3)
sec.right_margin = sec.bottom_margin = Cm(2)

normal = doc.styles['Normal']
normal.font.name = 'Arial'
normal.font.size = Pt(12)
normal.element.rPr.rFonts.set(qn('w:eastAsia'), 'Arial')
normal.paragraph_format.space_after = Pt(6)
normal.paragraph_format.line_spacing = 1.3
normal.paragraph_format.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY

for nome, tam in (('Heading 1', 14), ('Heading 2', 12), ('Heading 3', 12)):
    estilo = doc.styles[nome]
    estilo.font.name = 'Arial'
    estilo.font.size = Pt(tam)
    estilo.font.bold = True
    estilo.font.color.rgb = RGBColor(0, 0, 0)
    rfonts = estilo.element.get_or_add_rPr().find(qn('w:rFonts'))
    if rfonts is None:
        rfonts = OxmlElement('w:rFonts')
        estilo.element.get_or_add_rPr().append(rfonts)
    for atributo in ('w:asciiTheme', 'w:hAnsiTheme', 'w:eastAsiaTheme', 'w:cstheme'):
        if rfonts.get(qn(atributo)) is not None:
            del rfonts.attrib[qn(atributo)]
    for atributo in ('w:ascii', 'w:hAnsi', 'w:eastAsia', 'w:cs'):
        rfonts.set(qn(atributo), 'Arial')
    estilo.paragraph_format.space_before = Pt(18 if nome == 'Heading 1' else 12)
    estilo.paragraph_format.space_after = Pt(6)
    estilo.paragraph_format.keep_with_next = True
    estilo.paragraph_format.alignment = WD_ALIGN_PARAGRAPH.LEFT

PADRAO = re.compile(r'(\*\*.+?\*\*|`.+?`|\[a informar[^\]]*\]|\[a preencher[^\]]*\]|\[A preencher[^\]]*\]|\[a realizar[^\]]*\]|\[Cada [^\]]*\])')


def runs(par, texto, tamanho=None):
    """Escreve o texto com **negrito**, `código` e destaque amarelo nos campos a preencher."""
    for trecho in PADRAO.split(texto):
        if not trecho:
            continue
        if trecho.startswith('**') and trecho.endswith('**'):
            run = par.add_run(trecho[2:-2])
            run.bold = True
        elif trecho.startswith('`') and trecho.endswith('`'):
            run = par.add_run(trecho[1:-1])
            run.font.name = 'Consolas'
            run.element.rPr.rFonts.set(qn('w:eastAsia'), 'Consolas')
            run.font.size = Pt((tamanho or 12) - 1)
            continue
        elif trecho.startswith('['):
            run = par.add_run(trecho)
            run.font.highlight_color = WD_COLOR_INDEX.YELLOW
        else:
            run = par.add_run(trecho)
        if tamanho:
            run.font.size = Pt(tamanho)


def sombrear(celula, cor):
    sombra = OxmlElement('w:shd')
    sombra.set(qn('w:val'), 'clear')
    sombra.set(qn('w:fill'), cor)
    celula._tc.get_or_add_tcPr().append(sombra)


quadros = 0


def tabela(linhas):
    global quadros
    dados = [
        [c.strip() for c in re.split(r'(?<!\\)\|', l.strip().strip('|'))]
        for l in linhas
        if not re.match(r'^\s*\|[\s:|-]+\|\s*$', l)
    ]
    quadros += 1
    leg = doc.add_paragraph()
    leg.alignment = WD_ALIGN_PARAGRAPH.CENTER
    leg.paragraph_format.keep_with_next = True
    r = leg.add_run(f'Quadro {quadros}')
    r.bold = True
    r.font.size = Pt(10)
    t = doc.add_table(rows=1, cols=len(dados[0]))
    t.style = 'Table Grid'
    t.alignment = WD_TABLE_ALIGNMENT.CENTER
    for i, texto in enumerate(dados[0]):
        c = t.rows[0].cells[i]
        c.text = ''
        par = c.paragraphs[0]
        par.alignment = WD_ALIGN_PARAGRAPH.LEFT
        run = par.add_run(texto.replace('**', ''))
        run.bold = True
        run.font.size = Pt(9)
        sombrear(c, 'E1F2EC')
    cab = t.rows[0]._tr.get_or_add_trPr()
    rep = OxmlElement('w:tblHeader')
    rep.set(qn('w:val'), 'true')
    cab.append(rep)
    for linha in dados[1:]:
        cells = t.add_row().cells
        for i, texto in enumerate(linha[: len(cells)]):
            cells[i].text = ''
            par = cells[i].paragraphs[0]
            par.alignment = WD_ALIGN_PARAGRAPH.LEFT
            par.paragraph_format.space_after = Pt(2)
            par.paragraph_format.line_spacing = 1.0
            runs(par, texto.replace('\\|', '|'), 9)
    fonte = doc.add_paragraph()
    fonte.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = fonte.add_run('Fonte: Elaborado pela equipe (2026).')
    r.font.size = Pt(10)


def rodape():
    par = sec.footer.paragraphs[0]
    par.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = par.add_run('Vacina em Dia: Documentação de Desenvolvimento. Página ')
    r.font.size = Pt(9)
    campo = OxmlElement('w:fldSimple')
    campo.set(qn('w:instr'), 'PAGE')
    run = OxmlElement('w:r')
    t = OxmlElement('w:t')
    t.text = '1'
    run.append(t)
    campo.append(run)
    par._p.append(campo)


def capa():
    for linha in ('FATEC VOTORANTIM', 'CENTRO PAULA SOUZA', 'CURSO SUPERIOR DE DESENVOLVIMENTO DE SOFTWARE MULTIPLATAFORMA'):
        par = doc.add_paragraph()
        par.alignment = WD_ALIGN_PARAGRAPH.CENTER
        par.add_run(linha).bold = True
    for _ in range(4):
        doc.add_paragraph()
    par = doc.add_paragraph()
    par.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = par.add_run('DOCUMENTAÇÃO DE DESENVOLVIMENTO')
    r.bold = True
    r.font.size = Pt(20)
    par = doc.add_paragraph()
    par.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = par.add_run('Vacina em Dia: carteira de vacinação digital com lembretes e assistente por voz')
    r.italic = True
    r.font.size = Pt(14)
    for _ in range(4):
        doc.add_paragraph()
    par = doc.add_paragraph()
    par.alignment = WD_ALIGN_PARAGRAPH.CENTER
    par.add_run(
        'Projeto Interdisciplinar VI (PI-VI)\nEduardo Kamo Iguei\nFernando Ribeiro dos Santos\n'
        'Gustavo Lopes Ferreira\nIago Yuri Rossan\nLucas Vinicios Consani\n'
        'Orientador: Prof. Dr. Cassio R. F. Riedo'
    )
    for _ in range(5):
        doc.add_paragraph()
    par = doc.add_paragraph()
    par.alignment = WD_ALIGN_PARAGRAPH.CENTER
    par.add_run('Votorantim\n2026')
    doc.add_page_break()


def converter(linhas):
    i = 0
    while i < len(linhas):
        linha = linhas[i].rstrip()
        if linha.startswith('# '):
            pass  # o título do documento está na capa
        elif linha.startswith('## '):
            doc.add_heading(linha[3:], level=1)
        elif linha.startswith('### '):
            doc.add_heading(linha[4:], level=2)
        elif linha.startswith('|'):
            bloco = []
            while i < len(linhas) and linhas[i].strip().startswith('|'):
                bloco.append(linhas[i])
                i += 1
            tabela(bloco)
            continue
        elif linha.startswith('>'):
            texto = linha.lstrip('> ').strip()
            if texto:
                par = doc.add_paragraph()
                runs(par, texto, 10)
        elif linha.startswith('- '):
            par = doc.add_paragraph(style='List Bullet')
            runs(par, linha[2:])
        elif linha.strip():
            par = doc.add_paragraph()
            runs(par, linha.strip())
        i += 1


rodape()
capa()
converter(FONTE.read_text(encoding='utf-8').splitlines())
SAIDA.parent.mkdir(exist_ok=True)
doc.save(SAIDA)
print('ok', SAIDA)
