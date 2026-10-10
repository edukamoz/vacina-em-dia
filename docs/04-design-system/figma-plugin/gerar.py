"""Gera code.js (e o manifest) do plugin do Figma a partir de docs/04-design-system/tokens.json.

Rode `python docs/04-design-system/figma-plugin/gerar.py` sempre que os tokens mudarem.
"""
import json
import os
import re

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..')).replace(chr(92), '/') + '/'
t = json.load(open(ROOT + 'docs/04-design-system/tokens.json', encoding='utf-8'))
ESTADOS = {'pendente', 'agendada', 'atrasada', 'aplicada', 'cancelada'}


def kebab(s):
    return re.sub(r'([A-Z])', lambda m: '-' + m.group(1).lower(), s)


def nome(k):
    if k in ESTADOS or (k.endswith('Suave') and k[:-5] in ESTADOS):
        return 'cor/estado/' + kebab(k)
    return 'cor/' + kebab(k)


cores = {
    'Cor (Claro)': {nome(k): v for k, v in t['temas']['claro'].items()},
    'Cor (Escuro)': {nome(k): v for k, v in t['temas']['escuro'].items()},
    'Cor (Alto contraste)': {nome(k): v for k, v in t['temas']['altoContraste'].items()},
}
medidas = {}
for k, v in t['espacamento'].items():
    medidas['espacamento/' + k] = v
for k, v in t['raios'].items():
    medidas['raio/' + kebab(k)] = v
for k, v in t['bordas'].items():
    medidas['borda/' + kebab(k)] = v
for k, v in t['toque'].items():
    medidas['toque/' + kebab(k)] = v

estilos = {
    'Titulo/1 Titulo da tela': 'titulo1', 'Titulo/2 Secao': 'titulo2', 'Titulo/3 Cartao': 'titulo3',
    'Texto/Corpo': 'corpo', 'Texto/Corpo negrito': 'corpoNegrito', 'Texto/Rotulo': 'rotulo',
    'Texto/Apoio': 'apoio', 'Texto/Botao': 'botao', 'Titulo/Exibicao': 'exibicao', 'Texto/Destaque': 'destaque',
}
texto = {}
for nome_estilo, chave in estilos.items():
    e = t['tipografia']['estilos'][chave]
    texto[nome_estilo] = {
        'tamanho': e['tamanho'], 'linha': e['alturaDeLinha'], 'negrito': e['peso'] == 700,
        'letras': e.get('espacamentoLetras', 0),
    }


def sombra(css):
    """Converte 'x y blur rgba(r,g,b,a), ...' em efeitos de sombra do Figma."""
    if css == 'none':
        return []
    saida = []
    for parte in re.findall(r'(-?\d+)px (-?\d+)px (\d+)px rgba\((\d+),(\d+),(\d+),([\d.]+)\)', css):
        x, y, blur, r, g, b, a = parte
        saida.append({'x': int(x), 'y': int(y), 'blur': int(blur), 'r': int(r) / 255, 'g': int(g) / 255, 'b': int(b) / 255, 'a': float(a)})
    return saida


sombras = {}
for nivel, por_tema in t['sombras'].items():
    for tema, chave in [('Claro', 'claro'), ('Escuro', 'escuro')]:
        sombras['Sombra/%s %s' % (nivel, tema)] = sombra(por_tema[chave])

dados = {'cores': cores, 'medidas': medidas, 'texto': texto, 'sombras': sombras, 'familia': t['tipografia']['familia']}

codigo = """// Gerado por docs/04-design-system/figma-plugin/gerar.py a partir de tokens.json (versão %s).
// Atualiza o arquivo do Figma com o design system atual: variáveis de cor (3 temas), medidas,
// estilos de texto e estilos de sombra. Cria o que falta e corrige os valores do que já existe.
const DADOS = %s;

const rgb = (h) => ({ r: parseInt(h.slice(1, 3), 16) / 255, g: parseInt(h.slice(3, 5), 16) / 255, b: parseInt(h.slice(5, 7), 16) / 255 });

async function colecao(nome) {
  const todas = await figma.variables.getLocalVariableCollectionsAsync();
  return todas.find((c) => c.name === nome) || figma.variables.createVariableCollection(nome);
}

async function sincronizarVariaveis(nomeColecao, tabela, tipo, escopos) {
  const col = await colecao(nomeColecao);
  const modo = col.modes[0].modeId;
  const existentes = await Promise.all(col.variableIds.map((id) => figma.variables.getVariableByIdAsync(id)));
  const porNome = new Map(existentes.map((v) => [v.name, v]));
  let criadas = 0;
  let atualizadas = 0;
  for (const [nome, valor] of Object.entries(tabela)) {
    let v = porNome.get(nome);
    if (v) atualizadas++;
    else {
      v = figma.variables.createVariable(nome, col, tipo);
      v.scopes = escopos(nome);
      criadas++;
    }
    v.setValueForMode(modo, tipo === 'COLOR' ? rgb(valor) : valor);
  }
  return { colecao: nomeColecao, criadas, atualizadas };
}

const escopoMedida = (nome) =>
  nome.startsWith('raio') ? ['CORNER_RADIUS'] : nome.startsWith('borda') ? ['STROKE_FLOAT'] : ['GAP', 'WIDTH_HEIGHT'];

async function sincronizarTexto() {
  const estilos = await figma.getLocalTextStylesAsync();
  const porNome = new Map(estilos.map((s) => [s.name, s]));
  let n = 0;
  for (const [nome, e] of Object.entries(DADOS.texto)) {
    const fonte = { family: DADOS.familia, style: e.negrito ? 'Bold' : 'Regular' };
    await figma.loadFontAsync(fonte);
    const s = porNome.get(nome) || figma.createTextStyle();
    s.name = nome;
    s.fontName = fonte;
    s.fontSize = e.tamanho;
    s.lineHeight = { unit: 'PIXELS', value: e.linha };
    s.letterSpacing = { unit: 'PERCENT', value: e.letras * 100 };
    n++;
  }
  return n;
}

async function sincronizarSombras() {
  const estilos = await figma.getLocalEffectStylesAsync();
  const porNome = new Map(estilos.map((s) => [s.name, s]));
  let n = 0;
  for (const [nome, camadas] of Object.entries(DADOS.sombras)) {
    const s = porNome.get(nome) || figma.createEffectStyle();
    s.name = nome;
    s.effects = camadas.map((c) => ({
      type: 'DROP_SHADOW', color: { r: c.r, g: c.g, b: c.b, a: c.a }, offset: { x: c.x, y: c.y },
      radius: c.blur, spread: 0, visible: true, blendMode: 'NORMAL',
    }));
    n++;
  }
  return n;
}

const relatorio = [];
for (const [nome, tabela] of Object.entries(DADOS.cores)) {
  relatorio.push(await sincronizarVariaveis(nome, tabela, 'COLOR', () => ['ALL_FILLS', 'STROKE_COLOR']));
}
relatorio.push(await sincronizarVariaveis('Medidas', DADOS.medidas, 'FLOAT', escopoMedida));
const textos = await sincronizarTexto();
const sombras = await sincronizarSombras();
figma.closePlugin('Design system atualizado: ' + JSON.stringify(relatorio) + '; estilos de texto: ' + textos + '; sombras: ' + sombras);
""" % (t['versao'], json.dumps(dados, ensure_ascii=False))

pasta = ROOT + 'docs/04-design-system/figma-plugin/'
os.makedirs(pasta, exist_ok=True)
open(pasta + 'code.js', 'w', encoding='utf-8', newline='\n').write(codigo)
manifest = {
    'name': 'Vacina em Dia: sincronizar design system',
    'id': '1000000000000000001',
    'api': '1.0.0',
    'main': 'code.js',
    'editorType': ['figma'],
    'documentAccess': 'dynamic-page',
    'networkAccess': {'allowedDomains': ['none']},
}
open(pasta + 'manifest.json', 'w', encoding='utf-8', newline='\n').write(json.dumps(manifest, indent=2) + '\n')
print('ok', len(codigo))
