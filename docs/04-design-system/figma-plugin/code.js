// Gerado por docs/04-design-system/figma-plugin/gerar.py a partir de tokens.json (versão 2.0.0).
// Atualiza o arquivo do Figma com o design system atual: variáveis de cor (3 temas), medidas,
// estilos de texto e estilos de sombra. Cria o que falta e corrige os valores do que já existe.
const DADOS = {"cores": {"Cor (Claro)": {"cor/fundo": "#f6faf8", "cor/superficie": "#ffffff", "cor/texto": "#12201b", "cor/texto-secundario": "#40524b", "cor/borda": "#6b7d75", "cor/primaria": "#0b6b52", "cor/sobre-primaria": "#ffffff", "cor/primaria-suave": "#e1f2ec", "cor/estado/pendente": "#44525f", "cor/estado/pendente-suave": "#eceff3", "cor/estado/agendada": "#0a5c9e", "cor/estado/agendada-suave": "#e3eff9", "cor/estado/atrasada": "#b3261e", "cor/estado/atrasada-suave": "#fce8e6", "cor/estado/aplicada": "#2f6a1d", "cor/estado/aplicada-suave": "#e4f2dc", "cor/estado/cancelada": "#5b6670", "cor/estado/cancelada-suave": "#eeeeee", "cor/foco": "#0a5c9e", "cor/erro": "#b3261e", "cor/erro-suave": "#fce8e6", "cor/fundo-profundo": "#e7f3ee", "cor/superficie-suave": "#eef6f2", "cor/borda-suave": "#d5e2dc", "cor/primaria-profunda": "#084c46", "cor/decor-menta": "#bfe9d8", "cor/decor-sol": "#f2b84b", "cor/avatar-a": "#bfe9d8", "cor/avatar-b": "#f6dfa6", "cor/avatar-c": "#cfe4f7", "cor/avatar-d": "#f4d3d0", "cor/sobre-avatar": "#12201b", "cor/marca-crianca": "#37a882", "cor/marca-ponto": "#eba92a", "cor/marca-inv-crianca": "#bfe9d8", "cor/marca-inv-ponto": "#f2b84b"}, "Cor (Escuro)": {"cor/fundo": "#0b1512", "cor/superficie": "#15231e", "cor/texto": "#ecf4f0", "cor/texto-secundario": "#b3c4bc", "cor/borda": "#7f928a", "cor/primaria": "#6fd0aa", "cor/sobre-primaria": "#06231a", "cor/primaria-suave": "#16372d", "cor/estado/pendente": "#b4c0cc", "cor/estado/pendente-suave": "#25303c", "cor/estado/agendada": "#8cc4f2", "cor/estado/agendada-suave": "#14304a", "cor/estado/atrasada": "#ffb4ab", "cor/estado/atrasada-suave": "#4a1f1b", "cor/estado/aplicada": "#a5d98f", "cor/estado/aplicada-suave": "#203a16", "cor/estado/cancelada": "#a5b0bb", "cor/estado/cancelada-suave": "#2a323a", "cor/foco": "#8cc4f2", "cor/erro": "#ffb4ab", "cor/erro-suave": "#4a1f1b", "cor/fundo-profundo": "#0f1d18", "cor/superficie-suave": "#1c2d27", "cor/borda-suave": "#2a3d35", "cor/primaria-profunda": "#4db991", "cor/decor-menta": "#1f4a3c", "cor/decor-sol": "#f2b84b", "cor/avatar-a": "#bfe9d8", "cor/avatar-b": "#f6dfa6", "cor/avatar-c": "#cfe4f7", "cor/avatar-d": "#f4d3d0", "cor/sobre-avatar": "#12201b", "cor/marca-crianca": "#bfe9d8", "cor/marca-ponto": "#f2b84b", "cor/marca-inv-crianca": "#0f4a39", "cor/marca-inv-ponto": "#06231a"}, "Cor (Alto contraste)": {"cor/fundo": "#ffffff", "cor/superficie": "#ffffff", "cor/texto": "#000000", "cor/texto-secundario": "#1f2a25", "cor/borda": "#000000", "cor/primaria": "#00432f", "cor/sobre-primaria": "#ffffff", "cor/primaria-suave": "#ffffff", "cor/estado/pendente": "#26323b", "cor/estado/pendente-suave": "#ffffff", "cor/estado/agendada": "#064477", "cor/estado/agendada-suave": "#ffffff", "cor/estado/atrasada": "#8c1007", "cor/estado/atrasada-suave": "#ffffff", "cor/estado/aplicada": "#1b4d0e", "cor/estado/aplicada-suave": "#ffffff", "cor/estado/cancelada": "#3a444d", "cor/estado/cancelada-suave": "#ffffff", "cor/foco": "#000000", "cor/erro": "#8c1007", "cor/erro-suave": "#ffffff", "cor/fundo-profundo": "#ffffff", "cor/superficie-suave": "#ffffff", "cor/borda-suave": "#000000", "cor/primaria-profunda": "#00432f", "cor/decor-menta": "#ffffff", "cor/decor-sol": "#ffffff", "cor/avatar-a": "#ffffff", "cor/avatar-b": "#ffffff", "cor/avatar-c": "#ffffff", "cor/avatar-d": "#ffffff", "cor/sobre-avatar": "#000000", "cor/marca-crianca": "#00432f", "cor/marca-ponto": "#00432f", "cor/marca-inv-crianca": "#ffffff", "cor/marca-inv-ponto": "#ffffff"}}, "medidas": {"espacamento/xs": 4, "espacamento/sm": 8, "espacamento/md": 12, "espacamento/lg": 16, "espacamento/xl": 24, "espacamento/xxl": 32, "espacamento/xxxl": 48, "raio/campo": 12, "raio/botao": 16, "raio/quadro": 18, "raio/cartao": 20, "raio/folha": 28, "raio/selo": 999, "borda/fina": 1, "borda/padrao": 2, "borda/estado": 6, "borda/alto-contraste": 3, "borda/foco": 3, "toque/minimo": 48, "toque/principal": 56, "toque/folga": 8}, "texto": {"Titulo/1 Titulo da tela": {"tamanho": 32, "linha": 40, "negrito": true, "letras": 0}, "Titulo/2 Secao": {"tamanho": 26, "linha": 34, "negrito": true, "letras": 0}, "Titulo/3 Cartao": {"tamanho": 22, "linha": 30, "negrito": true, "letras": 0}, "Texto/Corpo": {"tamanho": 18, "linha": 27, "negrito": false, "letras": 0}, "Texto/Corpo negrito": {"tamanho": 18, "linha": 27, "negrito": true, "letras": 0}, "Texto/Rotulo": {"tamanho": 16, "linha": 24, "negrito": true, "letras": 0}, "Texto/Apoio": {"tamanho": 16, "linha": 24, "negrito": false, "letras": 0}, "Texto/Botao": {"tamanho": 18, "linha": 24, "negrito": true, "letras": 0}, "Titulo/Exibicao": {"tamanho": 56, "linha": 60, "negrito": true, "letras": -0.02}, "Texto/Destaque": {"tamanho": 22, "linha": 30, "negrito": false, "letras": 0}}, "sombras": {"Sombra/1 Claro": [], "Sombra/1 Escuro": [], "Sombra/2 Claro": [], "Sombra/2 Escuro": [], "Sombra/3 Claro": [], "Sombra/3 Escuro": []}, "familia": "Atkinson Hyperlegible"};

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
