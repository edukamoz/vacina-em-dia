"""Gera doctos/Documentacao_Tecnica.docx a partir do modelo "Documentação Técnica" do PI-VI."""

import re
from pathlib import Path

from docx import Document
from docx.enum.section import WD_ORIENT, WD_SECTION
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Cm, Pt, RGBColor

REPO = Path(__file__).resolve().parents[2]
DIAG = REPO / 'docs' / '03-uml'
SAIDA = REPO / 'doctos' / 'Documentacao_Tecnica.docx'
VERDE = RGBColor(0x0B, 0x6B, 0x52)
HOJE = '10/10/2026'

def fonte_do_titulo(estilo, nome='Arial'):
    # O estilo de título vem com fontes do tema (Calibri Light); troca por fonte fixa.
    rpr = estilo.element.get_or_add_rPr()
    rfonts = rpr.find(qn('w:rFonts'))
    if rfonts is None:
        rfonts = OxmlElement('w:rFonts')
        rpr.append(rfonts)
    for atributo in ('w:asciiTheme', 'w:hAnsiTheme', 'w:eastAsiaTheme', 'w:cstheme'):
        if rfonts.get(qn(atributo)) is not None:
            del rfonts.attrib[qn(atributo)]
    for atributo in ('w:ascii', 'w:hAnsi', 'w:eastAsia', 'w:cs'):
        rfonts.set(qn(atributo), nome)


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
    fonte_do_titulo(estilo)
    estilo.paragraph_format.space_before = Pt(18 if nome == 'Heading 1' else 12)
    estilo.paragraph_format.space_after = Pt(6)
    estilo.paragraph_format.keep_with_next = True
    estilo.paragraph_format.alignment = WD_ALIGN_PARAGRAPH.LEFT


contador = {'quadro': 0, 'figura': 0}


def rodape():
    p = sec.footer.paragraphs[0]
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = p.add_run('Vacina em Dia: Documentação Técnica, versão 1.0. Página ')
    r.font.size = Pt(9)
    campo = OxmlElement('w:fldSimple')
    campo.set(qn('w:instr'), 'PAGE')
    run = OxmlElement('w:r')
    texto_ = OxmlElement('w:t')
    texto_.text = '1'
    run.append(texto_)
    campo.append(run)
    p._p.append(campo)


def runs(par, partes, tamanho=None):
    """Escreve partes no parágrafo: **negrito**, `código` em fonte monoespaçada."""
    for i, trecho in enumerate(re.split(r'(\*\*.+?\*\*|`.+?`)', partes)):
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
        else:
            run = par.add_run(trecho)
        if tamanho:
            run.font.size = Pt(tamanho)


def p(partes, alinhar=None):
    par = doc.add_paragraph()
    runs(par, partes)
    if alinhar is not None:
        par.alignment = alinhar
    return par


def marcador(partes):
    par = doc.add_paragraph(style='List Bullet')
    runs(par, partes)
    return par


def h1(t):
    doc.add_heading(t, level=1)


def h2(t):
    doc.add_heading(t, level=2)


def legenda(tipo, titulo):
    contador[tipo] += 1
    nome = 'Quadro' if tipo == 'quadro' else 'Figura'
    par = doc.add_paragraph()
    par.alignment = WD_ALIGN_PARAGRAPH.CENTER
    par.paragraph_format.keep_with_next = tipo == 'quadro'
    r = par.add_run(f'{nome} {contador[tipo]} – {titulo}')
    r.bold = True
    r.font.size = Pt(10)


def fonte(texto='Elaborado pelo autor (2026).'):
    par = doc.add_paragraph()
    par.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = par.add_run(f'Fonte: {texto}')
    r.font.size = Pt(10)


def sombrear(celula, cor):
    sombra = OxmlElement('w:shd')
    sombra.set(qn('w:val'), 'clear')
    sombra.set(qn('w:fill'), cor)
    celula._tc.get_or_add_tcPr().append(sombra)


def tabela(titulo, cabecalho, linhas, larguras=None, tamanho=9, origem=None):
    legenda('quadro', titulo)
    t = doc.add_table(rows=1, cols=len(cabecalho))
    t.style = 'Table Grid'
    t.alignment = WD_TABLE_ALIGNMENT.CENTER
    for i, texto_ in enumerate(cabecalho):
        c = t.rows[0].cells[i]
        c.text = ''
        par = c.paragraphs[0]
        par.alignment = WD_ALIGN_PARAGRAPH.LEFT
        run = par.add_run(texto_)
        run.bold = True
        run.font.size = Pt(tamanho)
        sombrear(c, 'E1F2EC')
    # Repete o cabeçalho em cada página.
    tr_pr = t.rows[0]._tr.get_or_add_trPr()
    rep = OxmlElement('w:tblHeader')
    rep.set(qn('w:val'), 'true')
    tr_pr.append(rep)
    for linha in linhas:
        cells = t.add_row().cells
        for i, texto_ in enumerate(linha):
            cells[i].text = ''
            par = cells[i].paragraphs[0]
            par.alignment = WD_ALIGN_PARAGRAPH.LEFT
            par.paragraph_format.space_after = Pt(2)
            par.paragraph_format.line_spacing = 1.0
            runs(par, limpar(str(texto_)), tamanho)
    if larguras:
        t.autofit = False
        for linha in t.rows:
            for i, w in enumerate(larguras):
                linha.cells[i].width = Cm(w)
    fonte(origem or 'Elaborado pelo autor (2026).')


def limpar(texto_):
    return texto_.replace('\\|', '|').strip()


def ler_tabelas(caminho, titulo_secao=None, indice=0):
    """Lê a tabela Markdown de `caminho`: a de índice `indice` depois do título `titulo_secao`."""
    linhas = (REPO / caminho).read_text(encoding='utf-8').splitlines()
    inicio = 0
    if titulo_secao:
        inicio = next(i for i, l in enumerate(linhas) if l.startswith('#') and titulo_secao in l)
    tabelas, atual = [], []
    for linha in linhas[inicio:]:
        if linha.strip().startswith('|'):
            atual.append(linha)
        elif atual:
            tabelas.append(atual)
            atual = []
    if atual:
        tabelas.append(atual)
    bloco = tabelas[indice]
    linhas_dados = [
        [c.strip() for c in re.split(r'(?<!\\)\|', l.strip().strip('|'))]
        for l in bloco
        if not re.match(r'^\s*\|[\s:|-]+\|\s*$', l)
    ]
    cab = [c.replace('**', '') for c in linhas_dados[0]]
    return cab, linhas_dados[1:]


def figura(arquivo, titulo, largura_cm, paisagem=False, origem=None):
    if paisagem:
        nova = doc.add_section(WD_SECTION.NEW_PAGE)
        nova.orientation = WD_ORIENT.LANDSCAPE
        nova.page_width, nova.page_height = Cm(29.7), Cm(21)
        nova.left_margin = nova.right_margin = Cm(2)
        nova.top_margin = nova.bottom_margin = Cm(2)
    legenda('figura', titulo)
    par = doc.add_paragraph()
    par.alignment = WD_ALIGN_PARAGRAPH.CENTER
    par.add_run().add_picture(str(arquivo), width=Cm(largura_cm))
    fonte(origem or 'Elaborado pelo autor (2026).')
    if paisagem:
        volta = doc.add_section(WD_SECTION.NEW_PAGE)
        volta.orientation = WD_ORIENT.PORTRAIT
        volta.page_width, volta.page_height = Cm(21), Cm(29.7)
        volta.left_margin = volta.top_margin = Cm(3)
        volta.right_margin = volta.bottom_margin = Cm(2)


rodape()

# ---------------------------------------------------------------- capa
for linha in ('FATEC VOTORANTIM', 'CENTRO PAULA SOUZA', 'CURSO SUPERIOR DE DESENVOLVIMENTO DE SOFTWARE MULTIPLATAFORMA'):
    par = doc.add_paragraph()
    par.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = par.add_run(linha)
    r.bold = True
for _ in range(4):
    doc.add_paragraph()
par = doc.add_paragraph()
par.alignment = WD_ALIGN_PARAGRAPH.CENTER
r = par.add_run('DOCUMENTAÇÃO TÉCNICA')
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
par.add_run('Projeto Interdisciplinar VI (PI-VI)\nEduardo Kamo Iguei\nOrientador: Prof. Dr. Cassio R. F. Riedo')
for _ in range(5):
    doc.add_paragraph()
par = doc.add_paragraph()
par.alignment = WD_ALIGN_PARAGRAPH.CENTER
par.add_run(f'Votorantim\n2026\nVersão 1.1, {HOJE}')
doc.add_page_break()

# ---------------------------------------------------------------- 1
h1('1. Identificação do Projeto')
p('**1.1. Nome do Projeto:** Vacina em Dia: carteira de vacinação digital com lembretes e assistente por voz.')
p('**1.2. Grupo/Equipe:** Eduardo Kamo Iguei, RA 3011392413005 (projeto individual).')
p(f'**1.3. Data da Elaboração:** 07/10/2026 (primeira versão); atualizado em {HOJE}.')
p(f'**1.4. Versão do Documento:** 1.1, {HOJE}. Documento mantido junto com o código; cada alteração significativa gera nova versão.')
p('O código-fonte, as decisões de arquitetura (ADRs) e as demais documentações ficam no repositório https://github.com/edukamoz/vacina-em-dia. O Product Backlog está no GitHub Projects ("proj-vacina-em-dia") e, em texto, em `docs/24-backlog.md`; o projeto usou o Jira até 10/10/2026.')

# ---------------------------------------------------------------- 2
h1('2. Visão Geral do Produto')
h2('2.1. Problema a ser Resolvido')
p('As famílias precisam acompanhar um calendário vacinal que varia conforme a idade e a condição de cada pessoa, e esse acompanhamento ainda depende, em grande parte, da caderneta de papel e da memória de quem cuida. O Quadro 1 relaciona os problemas às expectativas de solução; cada problema está associado a pelo menos uma expectativa. Os problemas são hipóteses de trabalho, a serem confirmadas com usuários.')
cab, linhas = ler_tabelas('docs/01-visao-e-escopo.md', '2.1 Problema')
tabela('Problemas, expectativas e metas propostas', cab, linhas, larguras=[1.2, 4.5, 4.5, 4.8])
h2('2.2. Solução Proposta')
p('O Vacina em Dia é um aplicativo multiplataforma (web, Android e iOS) que roda na Microsoft Azure. As expectativas de alto nível e o que foi entregue até a data deste documento são:')
marcador('**EX1 (para PR1), lembretes:** o cartão "Lembretes" mostra no app as doses atrasadas, as de hoje e as dos próximos 7 dias de toda a família, e um e-mail diário às 8h (opcional) avisa 7 dias antes e no dia da vacina. Entregue (ADR-017).')
marcador('**EX2 (para PR2), registro digital único:** cada pessoa da família tem seu calendário e seu histórico, com ciclo de vida da dose (pendente, agendada, atrasada, aplicada e cancelada) e vacinas adicionadas à mão. Entregue.')
marcador('**EX3 (para PR3), calendário oficial e dúvidas:** 100% das vacinas exibidas citam fonte e versão (Calendário Nacional de Vacinação 2026, Ministério da Saúde); o chatbot responde com texto curado e fonte, com F1 macro de 0,932 em 100 frases de teste (meta de 0,85). Entregue.')
marcador('**EX4 (para PR4), acesso:** pergunta por voz (web e Android; transcrição pelo Azure AI Speech), telas em linguagem simples, três temas (claro, escuro e alto contraste) com contraste calculado pelo WCAG 2.1 AA. Entregue, com ressalvas de teste em aparelho físico e iOS (seção 11).')
h2('2.3. Público-Alvo')
p('Os usuários finais são pais e responsáveis por crianças, idosos e cuidadores de familiares. A solução não é voltada a profissionais de saúde. O Quadro 2 apresenta as personas, construídas a partir do problema descrito.')
cab, linhas = ler_tabelas('docs/01-visao-e-escopo.md', '4 PÚBLICO-ALVO')
tabela('Personas do sistema', cab, linhas, larguras=[3, 4.2, 4.2, 3.6])

# ---------------------------------------------------------------- 3
h1('3. Requisitos Funcionais e Não Funcionais')
h2('3.1. Requisitos Funcionais (RFs)')
p('O escopo do MVP é RF01 a RF09. O RF10 (mapa de postos de saúde, versão completa) foi entregue em 10/10/2026; os RF11 e RF12 não foram iniciados. Cada requisito está associado a pelo menos uma persona e a pelo menos um requisito não funcional.')
cab, linhas = ler_tabelas('docs/02-requisitos.md', None, 0)
tabela('Requisitos funcionais', cab, linhas, larguras=[1.3, 7.2, 2.2, 2.7, 2.1])
h2('3.2. Requisitos Não Funcionais (RNFs)')
cab, linhas = ler_tabelas('docs/02-requisitos.md', None, 1)
tabela('Requisitos não funcionais', cab, linhas, larguras=[2.0, 3.0, 6.8, 4.0])
p('O mapa de rastreabilidade de cada requisito para as telas, as rotas da API e os testes está em `docs/19-rastreabilidade.md` do repositório.')

# ---------------------------------------------------------------- 4
h1('4. Arquitetura do Sistema')
h2('4.1. Visão Geral da Arquitetura')
p('A arquitetura é **cliente-servidor serverless**: um aplicativo único (web, Android e iOS) conversa por HTTPS com uma API em Azure Functions, que usa o Azure SQL para os dados, um serviço de PLN separado (Python) para o chatbot e a busca, o Azure AI Speech para a voz e o Brevo para o e-mail. A Figura 1 mostra os blocos.')
figura(DIAG / 'arq.png', 'Arquitetura do sistema', 24.5, paisagem=True)
p('**Justificativa:** o modelo serverless cobra por uso e escala a zero, o que cabe no orçamento de um projeto acadêmico; a separação do PLN em Python permite usar scikit-learn sem forçar a API a sair do TypeScript; o pacote compartilhado (`packages/shared`) mantém tipos, esquemas Zod e regras de domínio (máquina de estados da dose, calendário) como fonte única para o app e a API. A API segue camadas: **handlers** (HTTP, finos) → **services** (casos de uso) → **domain** (regras puras) → **repositories** (acesso a dados). Regras de data recebem o "hoje" por parâmetro, para serem testadas sem relógio real.')
h2('4.2. Componentes Principais')
tabela('Componentes, tecnologias e versões', ['Componente', 'Tecnologias e versões', 'Responsabilidade'], [
    ['App (`apps/mobile`)', 'Expo SDK 57.0.27, React Native 0.86.3, React 19.2.3, expo-router 57.0.25, NativeWind 4.2.7, TanStack Query 5.104.1, expo-audio 57.0.5', 'Telas, navegação, sessão (Context API), cache de dados e captura de voz; web, Android e iOS'],
    ['API (`apps/api`)', 'Azure Functions 4 (`@azure/functions` 4.16.5), Node.js 24.21.0, TypeScript 6.0.3', 'Regras de negócio em camadas, login próprio, rotas REST, rotina diária de lembretes'],
    ['Compartilhado (`packages/shared`)', 'TypeScript 6.0.3, Zod 4.6.5, zod-to-openapi 9.1.0', 'Tipos, esquemas de entrada e saída, máquina de estados da dose, calendário vacinal e regras de lembrete'],
    ['PLN (`apps/nlp`)', 'Azure Functions (Python 3.13), scikit-learn 1.9.1, numpy 2.5.3, scipy 1.18.1', 'Classificador de intenções (TF-IDF + SVM), respostas curadas e busca de vacinas com LSA'],
    ['Banco de dados', 'Azure SQL Database (oferta gratuita, serverless), esquema T-SQL versionado em 5 migrações', 'Contas, tokens, consentimento, pessoas, doses e registro de lembretes'],
    ['Mapa de postos (RF10)', 'Leaflet 1.9.4 com mapas do OpenStreetMap, expo-location 57.0.20, react-native-webview 13.16.1, @react-native-async-storage/async-storage 2.2.0', 'Lista e mapa de unidades básicas de saúde por distância, localização só a pedido, lista guardada no aparelho (offline primeiro); sem chave de API'],
    ['Voz', 'Azure AI Speech (F0), API REST de áudio curto, pt-BR', 'Transcrição da fala; o áudio nunca é gravado'],
    ['E-mail', 'Brevo (API v3, plano gratuito)', 'Recuperação de senha e lembretes por e-mail'],
    ['Entrega e contêineres', 'GitHub Actions, Docker 29.7.2 e Compose 5.4.0, Azurite 3.37.0, nginx 1.31.6', 'CI, deploy por login federado (OIDC) e ambiente local completo'],
], larguras=[3.2, 6.8, 5.8])
h2('4.3. Tecnologias Utilizadas')
p('As versões abaixo foram conferidas nos registros oficiais (npm e PyPI) e estão fixadas nos arquivos de dependências. A lista atualizada fica em `docs/tech-versions.md`.')
for titulo_, secao_ in (('Ambiente', '## Ambiente'), ('Aplicativo', '## App'), ('API', '## API'), ('Compartilhado e qualidade', '## Compartilhado'), ('Serviço de PLN (Python)', '## Serviço de PLN')):
    cab, linhas = ler_tabelas('docs/tech-versions.md', secao_, 0)
    tabela(f'Tecnologias: {titulo_}', cab, linhas, larguras=[4.5, 3.3, 8.0] if len(cab) == 3 else None)

h2('4.4. Interface e Identidade Visual')
p('O app tem telas próprias para o computador (barra lateral fixa, duas colunas) e para o celular (barra inferior, uma coluna), com um terceiro formato intermediário. Segue o design system versão 2 (`docs/04-design-system.md`): verde-saúde como cor da marca, fonte Atkinson Hyperlegible (desenhada para baixa visão), três temas (Claro, Escuro e Alto contraste) com contraste calculado pelo WCAG 2.1 AA, estados da dose sempre com cor, ícone e texto, alvos de toque de 48 dp, superfícies com sombra suave e movimento com propósito. A pessoa pode aumentar o texto (Normal, Grande e Maior) e reduzir o movimento; o app também respeita a configuração do sistema. O assistente abre em uma janela de conversa sobre a tela atual. A justificativa de cada escolha de identidade está em `docs/22-identidade-visual.md`.')
h2('4.5. Mapa de Postos de Saúde (RF10)')
p('A tela de postos mostra as unidades básicas de saúde mais próximas, em lista e em mapa, na web e no celular, sem chave de API (ADR-018). A API guarda localmente os dados do cadastro oficial (CNES, 45.588 unidades com coordenadas) e consulta, quando há internet, a API oficial do Ministério da Saúde para completar telefone e turno (tempo máximo de 4 s e cache de 12 h). O app só pede a localização quando a pessoa toca em "Usar minha localização", envia a posição arredondada (cerca de 110 m), não a guarda e não a registra em log; a última lista recebida fica no aparelho para ser vista sem internet. O mapa usa Leaflet com imagens do OpenStreetMap (dentro de uma WebView no celular). A tela avisa que nem toda unidade tem sala de vacina e que é preciso ligar antes de ir.')

# ---------------------------------------------------------------- 5
h1('5. Modelo de Dados')
h2('5.1. Diagrama de Entidade-Relacionamento (DER)')
p('O banco é relacional (Azure SQL). O DER abaixo reflete o esquema real, criado pelas migrações `001` a `005` em `apps/api/db/migrations`. Todo dado pertence a uma conta; a exclusão da conta apaga tudo em cascata (LGPD). O **calendário vacinal oficial não fica no banco**: é um conjunto de dados versionado no pacote compartilhado (`rule_id` em `dose` aponta para a linha do calendário), o que permite testá-lo e citar a versão. Não há CPF nem Cartão Nacional de Saúde.')
figura(DIAG / 'der.png', 'Diagrama de entidade-relacionamento', 14.5)
h2('5.2. Descrição das Entidades Principais')
tabela('Entidades e atributos', ['Entidade', 'Atributos (tipo)', 'Função'], [
    ['app_account', 'id (PK, VARCHAR 64); email (NVARCHAR 254, único); password_hash (VARCHAR 200); created_at (DATETIME2); reminders_enabled (BIT, padrão 1)', 'Conta de login. A senha fica só como hash scrypt.'],
    ['refresh_token', 'token_hash (PK, CHAR 64); account_id (FK); expires_at; revoked_at', 'Tokens de renovação da sessão; só o hash é guardado; rotação e revogação por reuso.'],
    ['password_reset_token', 'token_hash (PK, CHAR 64); account_id (FK); expires_at; used_at', 'Link de redefinição de senha (validade de 60 min, uso único).'],
    ['consent', 'account_id (PK, FK); term_version (VARCHAR 20); accepted_at (DATETIME2); guardian_declaration (BIT)', 'Consentimento explícito (LGPD) e declaração de responsável legal.'],
    ['member', 'id (PK, VARCHAR 64); account_id (FK); display_name (NVARCHAR 80); birth_date (DATE); is_pregnant (BIT); relationship (VARCHAR 20, opcional, 11 códigos)', 'Pessoa da família. Nome ou apelido, nascimento, gestação e parentesco.'],
    ['dose', 'id (PK, VARCHAR 64); member_id (FK); rule_id (VARCHAR 80, nulo na dose avulsa); custom_vaccine (NVARCHAR 80); custom_dose_label (NVARCHAR 40); status (VARCHAR 10: PENDING, SCHEDULED, OVERDUE, APPLIED, CANCELLED); due_date, scheduled_date, applied_date (DATE)', 'Dose de cada pessoa, com o estado do ciclo de vida. A restrição `ck_dose_origin` garante que a dose é oficial (rule_id) ou avulsa (nome e dose digitados), nunca as duas.'],
    ['reminder_log', 'account_id (PK, FK); sent_on (PK, DATE)', 'No máximo um e-mail de lembrete por conta por dia (evita envio duplicado).'],
    ['schema_migration', 'name (PK); applied_at', 'Controle das migrações aplicadas.'],
], larguras=[3.0, 8.3, 4.5])
p('O dicionário de dados completo está em `docs/03-uml/dicionario-de-dados.md`. Os identificadores são gerados pela API (UUID), e as datas civis usam `DATE` no calendário do Brasil.')

# ---------------------------------------------------------------- 6
h1('6. APIs (Application Programming Interfaces)')
h2('6.1. Design da API')
p('A API é **REST sobre HTTPS**, em JSON, com prefixo `/api`, documentada em **OpenAPI 3.1** gerado dos mesmos esquemas Zod que validam as entradas (interface Swagger UI em `/api/docs` e especificação em `/api/openapi.json`). Um teste garante que toda rota registrada está na especificação. Erros seguem um formato único (`code` e `message` em português, sem detalhe interno). O quadro a seguir lista as rotas.')
rotas = [
    ['GET', '/api/health', 'Verificação de saúde do serviço', 'não'],
    ['GET', '/api/docs, /api/openapi.json', 'Documentação interativa e especificação', 'não'],
    ['POST', '/api/auth/register', 'Criar conta (e-mail e senha)', 'não'],
    ['POST', '/api/auth/login', 'Entrar; devolve token de acesso e de renovação', 'não'],
    ['POST', '/api/auth/refresh', 'Renovar a sessão (rotação do token)', 'não'],
    ['POST', '/api/auth/logout', 'Encerrar a sessão', 'sim'],
    ['POST', '/api/auth/forgot-password', 'Pedir link de redefinição por e-mail', 'não'],
    ['POST', '/api/auth/reset-password', 'Criar nova senha com o token do e-mail', 'não'],
    ['GET', '/api/auth/me', 'Dados da conta', 'sim'],
    ['GET, PUT', '/api/consent', 'Consultar e registrar o consentimento', 'sim'],
    ['DELETE', '/api/account', 'Excluir a conta e todos os dados', 'sim'],
    ['GET, POST', '/api/members', 'Listar e cadastrar pessoas', 'sim'],
    ['GET, PUT, DELETE', '/api/members/{id}', 'Consultar, editar e excluir uma pessoa', 'sim'],
    ['GET', '/api/members/{id}/doses', 'Calendário e doses da pessoa, com fonte e versão', 'sim'],
    ['POST', '/api/members/{id}/doses', 'Cadastrar dose avulsa', 'sim'],
    ['GET', '/api/doses/{id}', 'Consultar uma dose', 'sim'],
    ['POST', '/api/doses/{id}/events', 'Aplicar um evento do ciclo de vida (agendar, aplicar, cancelar...)', 'sim'],
    ['GET', '/api/units/nearby', 'Postos de saúde perto de uma posição (lat, lon, raio e limite), com dados oficiais do CNES', 'sim'],
    ['GET', '/api/warmup', 'Acorda o banco de dados pausado (no máximo uma consulta por minuto por instância)', 'não'],
    ['GET', '/api/reminders', 'Lembretes de hoje (atrasadas, hoje e próximos 7 dias)', 'sim'],
    ['PUT', '/api/reminders/preferences', 'Ligar ou desligar o e-mail de lembretes', 'sim'],
    ['POST', '/api/assistant/message', 'Pergunta por texto ao assistente', 'sim'],
    ['POST', '/api/assistant/voice', 'Pergunta por voz (WAV 16 kHz, mono)', 'sim'],
]
tabela('Rotas da API principal', ['Método', 'Rota', 'Função', 'Exige login'], rotas, larguras=[2.6, 5.2, 6.8, 1.5])
p('O serviço de PLN expõe, só para a API (chave da função), `POST /api/chat`, `POST /api/search` e `GET /api/health`. O aplicativo nunca o chama diretamente.')
h2('6.2. Autenticação e Autorização')
p('O login é **próprio** (ADR-014), porque o diretório da instituição não permite criar o tenant do Microsoft Entra External ID. O desenho é:')
marcador('**Senha:** mínimo de 8 caracteres, com recusa das mais comuns (NIST SP 800-63B); guardada só como hash **scrypt** (N=2^15, r=8, p=3, sal aleatório, comparação em tempo constante).')
marcador('**Sessão:** JWT de acesso (HS256, 15 minutos) e token de renovação opaco, guardado só como hash, com **rotação** a cada uso e **revogação de todos os tokens ao detectar reuso**.')
marcador('**Limites:** bloqueio por e-mail e por origem após falhas repetidas; limite de uso no assistente (60 mensagens por hora; voz com 20 por hora e 60 por dia por usuário); pedidos de recuperação limitados a 3 por hora por e-mail.')
marcador('**Autorização:** todo método de repositório recebe o dono; as consultas SQL filtram por `account_id`. O ID vindo do cliente nunca basta (não há acesso a dados de outra conta).')
marcador('**No app:** token em armazenamento seguro no celular (`expo-secure-store`) e em `sessionStorage` na web, com Content Security Policy (ADR-009).')
marcador('**Recursos de nuvem:** a API acessa o Azure SQL por **identidade gerenciada**, sem senha de banco (autenticação somente Entra); deploy por **login federado (OIDC)**, sem segredo guardado; HTTPS obrigatório, TLS 1.2, FTPS apenas, CORS restrito ao endereço do app web; cabeçalhos de segurança (`nosniff`, `no-store`, HSTS) em todas as respostas.')
p('O checklist OWASP Top 10 completo, com lacunas e recomendações, está em `docs/21-seguranca-owasp-e-carga.md`.')

# ---------------------------------------------------------------- 7
h1('7. Computação em Nuvem (Azure)')
h2('7.1. Serviços Azure Utilizados')
p('Tudo foi criado em 06/10/2026 na assinatura Azure for Students, região Brazil South (exceto o Static Web Apps, que não existe no Brasil e fica em Central US), no grupo de recursos `rg-vacinaemdia`.')
cab, linhas = ler_tabelas('docs/08-infraestrutura-azure.md', None, 0)
tabela('Recursos criados na Azure', cab, linhas, larguras=[3.0, 4.0, 4.4, 4.4], tamanho=8)
p('Fora da Azure, o projeto usa o **Brevo** (e-mail transacional, plano gratuito) e o **GitHub** (código e Actions). O **Key Vault** existe e a identidade da API tem o papel de leitura, mas as chaves do login e do Brevo ainda estão como configuração da Function App, porque falta ao autor o papel de escrita no cofre (pendência registrada).')
h2('7.2. Arquitetura de Deploy')
p('O **CI** (GitHub Actions) roda em todo push e pull request: instalação, formatação, lint, tipos, build, testes com cobertura (mínimo de 80%), TypeDoc, `npm audit`, `pip-audit` e construção das imagens Docker com teste de fumaça. O **deploy** roda ao integrar na `main`: login federado (OIDC) com papel Contributor só no grupo de recursos, publicação da API e do app web. As **migrações do banco** não vão no deploy; são aplicadas à mão com `scripts/db-migrate.mjs` (com `az login`), antes de publicar código que dependa delas. O ambiente local completo sobe com `docker compose up --build` (API, PLN, app web e Azurite).')
figura(DIAG / 'deploy.png', 'Fluxo de entrega e implantação', 24.5, paisagem=True)
h2('7.3. Monitoramento e Logs')
p('O **Application Insights** (ligado ao workspace `log-vacinaemdia`, retenção de 30 dias e teto diário de 0,1 GB) coleta logs e métricas da API e do PLN. Por regra do projeto, **logs não contêm dados pessoais** (nem nome, nem e-mail, nem texto de mensagem): só o tipo do erro e contagens; a rotina de lembretes registra apenas totais. Os serviços respondem em `/api/health`.')
p('**Limitações verificadas em 07/10/2026:** ainda não há painéis nem alertas, e a consulta à tabela de requisições do Application Insights veio vazia, de modo que é preciso conferir se a telemetria está chegando. Isso consta como risco e recomendação em `docs/21-seguranca-owasp-e-carga.md`.')
h2('7.4. Estimativa de Custos')
p('Os preços foram obtidos da API de preços oficial da Azure em 07/10/2026 (detalhes e contas em `docs/16-custos-azure.md`). O custo mensal estimado hoje é de **cerca de US$ 13**, quase todo das duas instâncias sempre prontas (PLN e API, cerca de US$ 6,50 cada, 512 MB). Sem elas, o custo seria perto de zero, mas a primeira pergunta ao assistente após ociosidade levaria cerca de 50 s (partida a frio do serviço de ML), e a API apresentou respostas 503 intermitentes sob rajadas.')
tabela('Estimativa mensal por serviço', ['Serviço', 'Camada', 'Estimativa mensal'], [
    ['Azure Functions, API', 'Flex Consumption, 1 instância sempre pronta, 512 MB', 'cerca de US$ 6,50'],
    ['Azure Functions, PLN', 'Flex Consumption, 1 instância sempre pronta, 512 MB', 'cerca de US$ 6,50'],
    ['Azure SQL Database', 'Uso Geral serverless, oferta gratuita (pausa automática)', 'US$ 0 dentro da franquia'],
    ['Static Web Apps', 'Free', 'US$ 0'],
    ['Azure AI Speech', 'F0 (gratuita)', 'US$ 0 dentro da franquia'],
    ['Key Vault, Application Insights, Armazenamento', 'Standard, por uso, LRS', 'menos de US$ 1'],
    ['Brevo (e-mail)', 'Plano gratuito (300 e-mails por dia), fora da Azure', 'US$ 0'],
    ['**Total estimado**', '', '**cerca de US$ 13**'],
], larguras=[5.0, 7.0, 3.8])
p('**Primeiro acesso depois de ociosidade:** o banco gratuito pausa após 60 minutos parado e a primeira consulta leva até cerca de 1 minuto. O app chama `GET /api/warmup` ao abrir para acordar o banco enquanto a pessoa digita o login. Manter o banco sempre ligado esgotaria a franquia gratuita em poucas semanas, por isso não é feito.')
p('Valores a confirmar na calculadora oficial: limites exatos das ofertas gratuitas (SQL e Speech) e o saldo do crédito do Azure for Students.')

# ---------------------------------------------------------------- 8
h1('8. Qualidade e Testes de Software')
h2('8.1. Estratégia de Testes')
p('Seguimos a pirâmide de testes, com testes escritos junto com o código e o ID do caso (`CT-...`) no nome de cada teste, para rastreabilidade (`docs/19-rastreabilidade.md`).')
marcador('**Unitários:** domínio puro (máquina de estados da dose com `test.each` na matriz de transições, geração de doses, calendário, regras de lembrete), serviços, validação Zod e utilidades do app, com relógio controlado nos limites de data.')
marcador('**De estados e transições:** 42 casos (estados, 12 transições, guardas, inválidas e caminhos) automatizados e documentados (`docs/07-testes/casos-teste-estados-dose.md`).')
marcador('**Caixa preta:** 179 casos de partição de equivalência e análise de valor limite sobre os handlers reais (cadastro, login, recuperação de senha, consentimento, pessoas, parentesco, doses, dose avulsa e assistente), com tabela de execução do resultado obtido (`docs/07-testes/caixa-preta-execucao.md`); 179 de 179 aprovados.')
marcador('**De integração e de contrato:** API com repositórios em memória e, à parte, testes de contrato contra o Azure SQL real (executados com o banco disponível); telas do app com Testing Library.')
marcador('**Do serviço de PLN:** pytest com conjunto de teste separado do treino (100 frases), testes de segurança do chatbot e da busca.')
marcador('**De segurança e desempenho:** checklist OWASP Top 10 (`docs/21`), `npm audit` e `pip-audit` no CI, GitGuardian para segredos, e carga leve com `scripts/carga-leve.mjs`.')
marcador('**De acessibilidade:** contraste calculado dos tokens (WCAG 2.1 AA) e medido no navegador nos temas escuro e alto contraste. Leitor de tela ainda não foi testado.')
h2('8.2. Ferramentas de Teste')
tabela('Ferramentas de teste e versões', ['Ferramenta', 'Versão', 'Uso'], [
    ['Jest', '30.5.2', 'Testes e cobertura da API, do pacote compartilhado e do app'],
    ['ts-jest', '29.4.14', 'TypeScript no Jest (API e compartilhado)'],
    ['jest-expo', '57.0.5', 'Ambiente de teste do app'],
    ['@testing-library/react-native', '14.0.1', 'Testes das telas'],
    ['pytest / pytest-cov', '9.1.1 / 7.1.0', 'Testes e cobertura do serviço de PLN'],
    ['ESLint / Prettier / TypeScript', '10.12.0 / 3.9.9 / 6.0.3', 'Análise estática e formatação'],
    ['npm audit / pip-audit', 'npm 11.19.0 / 2.10.1', 'Vulnerabilidades de dependências'],
    ['scripts/carga-leve.mjs', 'n/a (Node 24)', 'Carga leve (p50, p90, p95 e falhas)'],
    ['GitHub Actions', 'n/a', 'Pipeline de integração contínua'],
], larguras=[5.2, 3.6, 7.0])
h2('8.3. Cobertura de Testes')
p('A meta própria é de **90%** e o mínimo exigido é de **80%**; o limite de 80% está configurado no Jest e **o pipeline falha abaixo dele**. Em 10/10/2026, todos os testes passam: 236 no pacote compartilhado, 552 na API (mais 12 de contrato do Azure SQL, que só rodam com o banco), 404 no app e as funções de teste do PLN (pytest, com exigência de 80% também). A cobertura de linhas dos três pacotes TypeScript ficou entre 94% e 97% na última medição.')
p('Pendências de qualidade: leitor de tela, execução em iOS e teste de carga das rotas autenticadas da produção; a tabela de execução dos testes de estados e dos demais testes automatizados vem do CI.')

# ---------------------------------------------------------------- 9
h1('9. Processamento de Linguagem Natural (PLN)')
h2('9.1. Funcionalidades de PLN')
marcador('**Reconhecimento de voz (RF06):** a pergunta falada é transcrita pelo Azure AI Speech (pt-BR) e vira uma busca por vacinas e calendário.')
marcador('**Chatbot (RF07):** responde dúvidas frequentes sobre o app e sobre vacinas do calendário oficial, por **regras e classificação de intenções**, **sem IA generativa**. Perguntas de saúde individual (sintoma, reação, remédio) não passam pelo modelo: o assistente diz que não dá orientação médica e orienta procurar um profissional ou a unidade de saúde (SAMU 192).')
marcador('**Busca semântica (voz):** devolve até 5 vacinas parecidas com a pergunta, com doenças e indicações do calendário.')
h2('9.2. Tecnologias e Modelos')
tabela('Tecnologias de PLN', ['Item', 'Tecnologia', 'Detalhe'], [
    ['Classificador de intenções', 'scikit-learn 1.9.1: TF-IDF + SVM (com calibração)', '20 intenções; limiar de confiança de 0,40 (abaixo, devolve a resposta padrão que orienta procurar um profissional)'],
    ['Busca semântica', 'TF-IDF de n-gramas de caracteres (3 a 5) + LSA (SVD truncado, 12 temas)', 'Peso de 0,3 para o LSA; nota mínima de 0,35; índice montado na partida'],
    ['Respostas', 'Texto curado em `responses.json` e montado a partir do calendário oficial', 'Sempre com fonte e versão'],
    ['Segurança', 'Regras em `safety.py`', 'Antes do modelo'],
    ['Fala para texto', 'Azure AI Speech, REST de áudio curto', 'WAV PCM 16 kHz, mono, até 60 s; o app grava até 30 s'],
    ['Hospedagem', 'Azure Functions Python 3.13 (Flex Consumption)', '1 instância sempre pronta e paralelismo HTTP 8'],
], larguras=[3.6, 6.0, 6.2])
h2('9.3. Dataset e Treinamento')
p('O **dataset de intenções** tem **490 frases em 20 intenções**, escritas e revisadas à mão, sem dados pessoais (origem: criação própria do autor, com apoio de rascunho que ele revisa). O **conjunto de teste** tem **100 frases separadas** do treino; o script de avaliação recusa o teste se houver frase repetida nos dois conjuntos. A semente é fixa (42), então o resultado é reprodutível.')
tabela('Avaliação do classificador de intenções', ['Métrica', 'Valor'], [
    ['Acurácia no conjunto de teste', '94,0%'],
    ['F1 macro', '0,932 (meta de 0,85, a validar com o professor: atingida)'],
    ['F1 ponderado', '0,932'],
    ['Validação cruzada em 5 partes, só no treino: acurácia e F1 macro', '68,8% e 0,670'],
], larguras=[8.0, 7.8])
p('A validação cruzada é bem menor que o teste porque o modelo ainda depende de haver exemplos parecidos com a pergunta; o dataset é pequeno, e isso está registrado como limitação em `docs/07-testes/avaliacao-chatbot.md`.')
p('**Busca semântica:** em 63 consultas de teste, o acerto na primeira posição subiu de **68,3%** (índice inicial) para **88,9%** e o MRR de 0,722 para 0,928, com a melhoria vinda sobretudo do enriquecimento dos documentos (apelidos e doenças); o efeito isolado do LSA é pequeno (`docs/07-testes/avaliacao-busca-semantica.md`). Embeddings de modelo ficam como evolução, dependendo de custo aprovado.')

# ---------------------------------------------------------------- 10
h1('10. Integração entre Componentes')
h2('10.1. Fluxo de Dados')
p('O fluxo da pergunta por voz, o mais completo, está na Figura 4. O app captura o microfone e monta o WAV no próprio aparelho; a API valida o token, o tipo e o tamanho do áudio, aplica o limite de uso e envia o áudio ao Azure AI Speech; com a transcrição, consulta o PLN em paralelo (resposta curada e busca) e devolve tudo ao app. O áudio fica só em memória, durante a chamada.')
figura(DIAG / 'voz.png', 'Fluxo da pergunta por voz', 23.5, paisagem=True)
p('Os demais fluxos seguem o mesmo caminho: app → API (token) → serviço → repositório → Azure SQL. O ciclo de vida da dose é uma máquina de estados pura em `packages/shared` (Figura 5, seção 13.2), e a rotina diária de lembretes (função agendada às 8h de Brasília) lê as doses de contas com consentimento e envia, pelo Brevo, no máximo um e-mail por conta por dia.')
h2('10.2. Contratos de Interface')
tabela('Contratos entre componentes', ['De → para', 'Protocolo e formato', 'Contrato'], [
    ['App → API', 'HTTPS, JSON (WAV na voz); cabeçalho `Authorization: Bearer`', 'OpenAPI 3.1 gerado dos esquemas Zod do pacote compartilhado; mesmos esquemas validam app e API'],
    ['API → PLN', 'HTTPS, JSON; chave da função', '`POST /api/chat` e `/api/search` com `{"text": "..."}` (até 300 caracteres); respostas validadas por Zod; erro 400 com mensagem fixa'],
    ['API → Azure AI Speech', 'HTTPS, `audio/wav` (PCM 16 kHz, mono)', 'API REST de áudio curto, `language=pt-BR`; resposta com `RecognitionStatus` e `DisplayText`'],
    ['API → Brevo', 'HTTPS, JSON (`POST /v3/smtp/email`, cabeçalho `api-key`)', 'Remetente verificado; o e-mail traz só link de redefinição ou quantidade de vacinas'],
    ['API → Azure SQL', 'TDS com TLS, autenticação Entra por identidade gerenciada', 'Consultas parametrizadas; esquema versionado em migrações'],
    ['Erros', 'JSON `{code, message}` com HTTP 400, 401, 403, 404, 409, 413, 415, 422, 429, 500 ou 503', 'Mensagens em português, sem detalhe interno'],
], larguras=[3.3, 5.6, 6.9])

# ---------------------------------------------------------------- 11
h1('11. Riscos e Mitigações')
h2('11.1. Identificação de Riscos')
cab, linhas = ler_tabelas('docs/01-visao-e-escopo.md', '10 RISCOS')
novos = [
    ['R9', 'Respostas 503 intermitentes da API sob rajadas (instância única que desliga por ociosidade), medidas em 07/10/2026.', 'Alta / Médio', '**Tratado:** 1 instância sempre pronta na API (cerca de US$ 6,50 por mês); 0 falhas em cerca de 1.000 requisições depois. Restam poucos casos de 10 a 20 s em rajadas. Atenção: o Bicep mantém 0 por padrão.'],
    ['R10', 'Voz no celular não testada em aparelho físico nem em iOS (testada no navegador e no emulador Android).', 'Média / Médio', 'Testar em celular físico antes da apresentação; a captura usa `expo-audio` (PCM) e o mesmo WAV da web; texto continua como alternativa.'],
    ['R11', 'Partida a frio do serviço de PLN (cerca de 50 s) ao reiniciar.', 'Média / Médio', '1 instância sempre pronta no PLN; fazer uma pergunta de aquecimento antes de apresentar.'],
    ['R12', 'Entrega do e-mail (Brevo) depende de remetente verificado; provedores gratuitos podem cair em spam; limite de 300 e-mails por dia.', 'Média / Médio', 'Verificar o remetente; avisar o usuário para olhar o spam; o aviso dentro do app não depende do e-mail.'],
    ['R13', 'Chaves do login e do Brevo como configuração da aplicação, e não no Key Vault; regra do SQL `AllowAzureServices` ampla.', 'Baixa / Alto', 'Migrar para o Key Vault quando houver o papel de escrita; trocar por regra específica (`docs/21`).'],
]
tabela('Riscos e mitigações', cab, linhas + novos, larguras=[1.1, 5.4, 2.4, 6.9], tamanho=8)
h2('11.2. Plano de Mitigação')
p('A mitigação de cada risco está na última coluna do quadro. Os riscos são revisados a cada semana; os registrados em 07/10/2026 (R9 a R13) vêm da verificação da qualidade e da segurança (`docs/21`).')

# ---------------------------------------------------------------- 12
h1('12. Itens do Product Backlog (PBI)')
p('O backlog está organizado em nove épicos e 47 itens, cada um com história de usuário, prioridade (MoSCoW), personas, requisitos, critérios de aceite, estado e sprint. A fonte é `docs/24-backlog.md` e o acompanhamento vivo fica no GitHub Projects ("proj-vacina-em-dia"), que substituiu o Jira em 10/10/2026. O quadro mostra o estado na data deste documento. **O estado segue a convenção do professor (A fazer, Em andamento, Em análise e Concluído): nenhum item foi marcado como Concluído, o que só acontece na reunião de encerramento da sprint.**')
import json as _json
_dados = _json.loads((REPO / 'docs' / 'backlog' / 'itens.json').read_text(encoding='utf-8'))
_epicos = {e[0]: e[1] for e in _dados['epicos']}
tabela('Itens do backlog, prioridade e estado', ['Item', 'Descrição', 'Requisitos', 'Prioridade', 'Estado'],
       [[i['id'], i['curto'], i['requisitos'] or '-', i['prioridade'], i['estado']] for i in _dados['itens']],
       larguras=[1.2, 6.4, 3.4, 2.4, 2.4], tamanho=8)
p('Os épicos são: ' + '; '.join(f'{k} {v}' for k, v in _epicos.items()) + '.')
p('**Mudanças em relação à primeira versão do backlog e do escopo, com justificativa:**')
marcador('**Login:** passou de Microsoft Entra External ID para login próprio (ADR-014), porque o diretório do Centro Paula Souza não permite criar o tenant.')
marcador('**Lembretes:** passou de notificação push do Expo para aviso no app e e-mail diário (ADR-017), por não exigir serviço novo nem aparelho físico e funcionar na web. A antecedência mudou de "7 dias e 1 dia" para "7 dias e no dia".')
marcador('**Limite de uso:** passou de Table Storage para contadores em memória por instância (ADR-010), por simplicidade e custo, com a ressalva de valer por instância.')
marcador('**Itens acrescentados:** parentesco da pessoa, dose avulsa (ADR-016), Termos de uso e Política de privacidade, cabeçalhos de segurança, checklist OWASP e carga leve, mapa de postos de saúde (RF10, ADR-018), redesenho visual, preferências de texto e de movimento e aquecimento do banco.')
marcador('**Gestão do backlog:** do Jira para o GitHub Projects (10/10/2026), com prioridades e critérios de aceite por item. A validação das personas com usuários reais foi abandonada por decisão do autor e as personas seguem como hipóteses de trabalho.')
marcador('**Voz no celular:** captura em PCM com `expo-audio` e mesmo WAV da web, em vez de gravar arquivo comprimido, porque o Android não grava WAV em arquivo e a API de áudio curto só lê WAV.')

# ---------------------------------------------------------------- 13
h1('13. Anexos')
h2('13.1. Backlog do Produto')
p('GitHub Projects "proj-vacina-em-dia" (https://github.com/edukamoz?tab=projects) e `docs/24-backlog.md`. Código e histórico: https://github.com/edukamoz/vacina-em-dia, repositório público desde 10/10/2026.')
h2('13.2. Outros Diagramas')
p('Além dos diagramas das seções 4, 5, 7 e 10, a Figura 5 mostra os estados da dose. Os casos de uso, as classes e as sequências (login, registrar dose e lembretes) estão em `docs/03-uml/` do repositório; a sequência de lembretes prevista originalmente com push foi substituída pelo desenho da ADR-017.')
figura(REPO / 'docs' / '03-uml' / 'estados-dose.png', 'Estados do ciclo de vida da dose', 24.5, paisagem=True)
h2('13.3. Referências')
refs = [
    'AGUIAR, F.; CAROLI, P. **Product Backlog Building**: um guia prático para criação e refinamento de backlog para produtos de sucesso. Rio de Janeiro: Caroli, 2021.',
    'BRASIL. **Lei nº 13.709, de 14 de agosto de 2018**. Lei Geral de Proteção de Dados Pessoais (LGPD). Brasília, DF: Presidência da República, 2018. Disponível em: https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm. Acesso em: 6 out. 2026.',
    'BRASIL. Ministério da Saúde. **Programa Nacional de Imunizações (PNI)**: Calendário Nacional de Vacinação. Brasília, DF: Ministério da Saúde, [s. d.]. Disponível em: https://www.gov.br/saude/pt-br/vacinacao/calendario. Acesso em: 6 out. 2026.',
    'BREVO. **Transactional email API**: send a transactional email. [S. l.]: Brevo, [s. d.]. Disponível em: https://developers.brevo.com/reference/sendtransacemail. Acesso em: 7 out. 2026.',
    'DYNOWSKI, L.; DULAK, M. **Dominando estilos de APIs**: compreendendo as vantagens e desvantagens dos principais estilos de APIs e escolhendo as soluções corretas. São Paulo: Novatec, 2025.',
    'EXPO. **Audio (expo-audio)**. [S. l.]: Expo, [s. d.]. Disponível em: https://docs.expo.dev/versions/latest/sdk/audio/. Acesso em: 7 out. 2026.',
    'FACULDADE DE TECNOLOGIA DE VOTORANTIM. **Projeto Interdisciplinar VI (PI-VI)**: Curso Superior de Desenvolvimento de Software Multiplataforma. Versão 1.0. Votorantim: Fatec Votorantim, 2026.',
    'MICROSOFT. **Azure AI Speech**: documentação. Redmond: Microsoft, [s. d.]. Disponível em: https://learn.microsoft.com/azure/ai-services/speech-service/. Acesso em: 7 out. 2026.',
    'MICROSOFT. **Azure Functions**: plano Flex Consumption. Redmond: Microsoft, [s. d.]. Disponível em: https://learn.microsoft.com/azure/azure-functions/flex-consumption-plan. Acesso em: 7 out. 2026.',
    'NATIONAL INSTITUTE OF STANDARDS AND TECHNOLOGY. **NIST Special Publication 800-63B**: digital identity guidelines, authentication and lifecycle management. Gaithersburg: NIST, 2017. Disponível em: https://pages.nist.gov/800-63-3/sp800-63b.html.',
    'OWASP FOUNDATION. **OWASP Top 10:2021**. [S. l.]: OWASP, 2021. Disponível em: https://owasp.org/Top10/.',
    'WORLD WIDE WEB CONSORTIUM. **Web Content Accessibility Guidelines (WCAG) 2.1**. [S. l.]: W3C, 2018. Disponível em: https://www.w3.org/TR/WCAG21/. Acesso em: 6 out. 2026.',
]
for r_ in refs:
    par = doc.add_paragraph()
    par.alignment = WD_ALIGN_PARAGRAPH.LEFT
    runs(par, r_)
p('Nota: as referências sem data de acesso (NIST e OWASP) devem ter a data de acesso preenchida pelo autor.')

doc.save(SAIDA)
print('ok', SAIDA)
