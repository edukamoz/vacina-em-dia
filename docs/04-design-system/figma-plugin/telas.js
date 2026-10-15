// Plugin escrito à mão (o code.js, ao lado, é gerado por gerar.py).
// Constrói as telas da versão 2 do app (celular nos temas Claro, Escuro e Alto contraste, e web),
// ligadas às variáveis e aos estilos do arquivo. Rode antes o plugin "sincronizar design system".
// Não apaga nada: pula as telas que já existem pelo nome e continua se uma tela falhar.
(async () => {
// ===== Biblioteca de construção do design v2 (ligada às variáveis do arquivo) =====
const FONT = 'Atkinson Hyperlegible';
await figma.loadFontAsync({ family: FONT, style: 'Regular' });
await figma.loadFontAsync({ family: FONT, style: 'Bold' });
const ESTILOS_TEXTO = new Map((await figma.getLocalTextStylesAsync()).map((s) => [s.name, s]));
const ESTILOS_EFEITO = new Map((await figma.getLocalEffectStylesAsync()).map((s) => [s.name, s]));
const COLECOES = await figma.variables.getLocalVariableCollectionsAsync();
async function varsDe(nome) {
  const c = COLECOES.find((x) => x.name === nome);
  const vs = await Promise.all(c.variableIds.map((id) => figma.variables.getVariableByIdAsync(id)));
  return Object.fromEntries(vs.map((v) => [v.name, v]));
}
const MED = await varsDe('Medidas');
const ICONES = {
  doses: '<g transform="rotate(45 12 12)"><rect x="9" y="6" width="6" height="11" rx="1.5"/><path d="M12 17v4M12 6V3M9.5 3h5M9 10h2.5M9 13h2.5"/></g>',
  familia: '<circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><circle cx="17" cy="9" r="2.5"/><path d="M16.5 14.2c2.6.3 4.5 2.6 4.5 5.8"/>',
  historico: '<path d="M4 12a8 8 0 1 0 2.6-5.9M6.8 2.8v3.5H3.3M12 8v4.5l3 1.8"/>',
  conta: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="10" r="3"/><path d="M6.2 18.4c1.2-2.1 3.3-3.4 5.8-3.4s4.6 1.3 5.8 3.4"/>',
  assistente: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v8a2.5 2.5 0 0 1-2.5 2.5H11l-4.5 4v-4h0A2.5 2.5 0 0 1 4 13.5z"/><path d="M8.5 8.5h7M8.5 11.5h4"/>',
  mais: '<path d="M12 5v14M5 12h14"/>',
  seta: '<path d="M9 5l7 7-7 7"/>',
  fechar: '<path d="M6 6l12 12M18 6L6 18"/>',
  enviar: '<path d="M4 12h15M13 6l6 6-6 6"/>',
  voz: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3"/>',
  local: '<path d="M12 21s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0c0 5-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.3"/>',
  lembrete: '<path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2h-15zM10 21.5h4"/>',
  pendente: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  agendada: '<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
  atrasada: '<path d="M12 3.5 L21.5 20 H2.5 Z M12 10v4.5M12 17.2v.1"/>',
  aplicada: '<circle cx="12" cy="12" r="9"/><path d="M8 12.2l2.8 2.8L16 9.5"/>',
  cancelada: '<circle cx="12" cy="12" r="9"/><path d="M9 9l6 6M15 9l-6 6"/>',
};
const SELOS = {
  pendente: ['Pendente', 'pendente'], agendada: ['Agendada', 'agendada'], atrasada: ['Atrasada', 'atrasada'],
  aplicada: ['Aplicada', 'aplicada'], cancelada: ['Cancelada', 'cancelada'],
};
const NAV = [['Doses', 'doses'], ['Família', 'familia'], ['Histórico', 'historico'], ['Conta', 'conta']];

function novoAuto(dir) {
  const f = figma.createFrame();
  f.layoutMode = dir;
  f.primaryAxisSizingMode = 'AUTO';
  f.counterAxisSizingMode = 'AUTO';
  return f;
}

async function criarTema(colecao, sufixo, alto) {
  const V = await varsDe(colecao);
  const cor = (n) => { const v = V['cor/' + n]; if (!v) throw new Error('Cor inexistente: ' + n); return v; };
  const paint = (n) => figma.variables.setBoundVariableForPaint({ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }, 'color', cor(n));
  const T = { alto };
  const E = alto ? 3 : 2;
  T.fill = (node, n) => { node.fills = [paint(n)]; return node; };
  T.stroke = (node, n, w) => { node.strokes = [paint(n)]; node.strokeWeight = w; node.strokeAlign = 'INSIDE'; return node; };
  T.raio = (node, nome) => {
    const v = MED['raio/' + nome]; if (!v) throw new Error('Raio inexistente: ' + nome);
    for (const k of ['topLeftRadius', 'topRightRadius', 'bottomLeftRadius', 'bottomRightRadius']) node.setBoundVariable(k, v);
    return node;
  };
  T.put = (pai, filho, o = {}) => {
    pai.appendChild(filho);
    if (o.w === 'FILL') filho.layoutSizingHorizontal = 'FILL';
    if (o.h === 'FILL') filho.layoutSizingVertical = 'FILL';
    return filho;
  };
  T.af = (dir, nome, o = {}) => {
    const f = novoAuto(dir);
    f.name = nome; f.fills = [];
    f.itemSpacing = o.gap ?? 0;
    f.paddingTop = o.pt ?? o.py ?? o.p ?? 0; f.paddingBottom = o.pb ?? o.py ?? o.p ?? 0;
    f.paddingLeft = o.pl ?? o.px ?? o.p ?? 0; f.paddingRight = o.pr ?? o.px ?? o.p ?? 0;
    if (o.main) f.primaryAxisAlignItems = o.main;
    if (o.cross) f.counterAxisAlignItems = o.cross;
    return f;
  };
  T.txt = async (s, estilo, n, o = {}) => {
    const t = figma.createText();
    t.fontName = { family: FONT, style: 'Regular' };
    t.characters = s;
    const st = ESTILOS_TEXTO.get(estilo); if (!st) throw new Error('Estilo inexistente: ' + estilo);
    await t.setTextStyleIdAsync(st.id);
    t.fills = [paint(n)];
    if (o.wrap) { t.resize(100, t.height); t.textAutoResize = 'HEIGHT'; }
    if (o.sub) t.textDecoration = 'UNDERLINE';
    if (o.align) t.textAlignHorizontal = o.align;
    t.name = o.nome ?? s.slice(0, 40);
    return t;
  };
  T.ic = (nome, n, tam = 24) => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${tam}" height="${tam}" viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONES[nome]}</svg>`;
    const f = figma.createNodeFromSvg(svg); f.name = 'ícone/' + nome;
    f.findAll((x) => 'strokes' in x && x.strokes.length > 0).forEach((x) => { x.strokes = [paint(n)]; });
    return f;
  };
  T.cartao = async (nome, o = {}) => {
    const f = T.af(o.dir ?? 'VERTICAL', nome, { gap: o.gap ?? 12, p: o.p ?? 16, cross: o.cross, main: o.main });
    T.fill(f, o.suave ? 'superficie-suave' : 'superficie');
    if (alto) T.stroke(f, 'borda', 3); else T.stroke(f, 'borda-suave', 1);
    T.raio(f, 'cartao');
    if (!alto && !o.suave) await f.setEffectStyleIdAsync(ESTILOS_EFEITO.get('Sombra/1 ' + sufixo).id);
    return f;
  };
  T.chip = async (texto) => {
    const f = T.af('HORIZONTAL', 'Chip ' + texto, { px: 12, py: 4, cross: 'CENTER' });
    T.fill(f, 'superficie'); T.stroke(f, 'borda', E); T.raio(f, 'selo');
    f.appendChild(await T.txt(texto, 'Texto/Rotulo', 'texto-secundario'));
    return f;
  };
  T.selo = async (estado, texto) => {
    const [rot, k] = SELOS[estado];
    const f = T.af('HORIZONTAL', 'Selo ' + (texto ?? rot), { gap: 6, px: 12, py: 4, cross: 'CENTER' });
    T.fill(f, 'estado/' + k + '-suave'); T.stroke(f, 'estado/' + k, E); T.raio(f, 'selo');
    f.appendChild(T.ic(estado, 'estado/' + k, 18));
    f.appendChild(await T.txt(texto ?? rot, 'Texto/Rotulo', 'estado/' + k));
    return f;
  };
  T.botao = async (rotulo, tipo, iconeNome) => {
    const f = T.af('HORIZONTAL', 'Botão ' + rotulo, { gap: 8, px: 24, main: 'CENTER', cross: 'CENTER' });
    f.resize(120, 56);
    const cfg = { principal: ['primaria', null, 'sobre-primaria'], secundario: ['superficie', 'borda', 'texto'], perigo: ['superficie', 'erro', 'erro'] }[tipo];
    T.fill(f, cfg[0]); if (cfg[1]) T.stroke(f, cfg[1], E); T.raio(f, 'botao');
    if (iconeNome) f.appendChild(T.ic(iconeNome, cfg[2], 22));
    f.appendChild(await T.txt(rotulo, 'Texto/Botao', cfg[2]));
    return f;
  };
  T.campo = async (rotulo, valor, mostrar) => {
    const col = T.af('VERTICAL', 'Campo ' + rotulo, { gap: 8 });
    col.appendChild(await T.txt(rotulo, 'Texto/Rotulo', 'texto'));
    const caixa = T.af('HORIZONTAL', 'Caixa', { px: 16, cross: 'CENTER', main: 'SPACE_BETWEEN' });
    caixa.resize(100, 56);
    T.fill(caixa, 'superficie'); T.stroke(caixa, 'borda', 2); T.raio(caixa, 'campo');
    caixa.appendChild(await T.txt(valor || ' ', 'Texto/Corpo', 'texto'));
    if (mostrar) caixa.appendChild(await T.txt('Mostrar', 'Texto/Rotulo', 'primaria'));
    T.put(col, caixa, { w: 'FILL' });
    return col;
  };
  T.avatar = async (letra, k, tam, anel) => {
    const f = T.af('HORIZONTAL', 'Avatar ' + letra, { main: 'CENTER', cross: 'CENTER' });
    f.resize(tam, tam); f.cornerRadius = tam / 2; T.fill(f, 'avatar-' + k);
    if (anel) T.stroke(f, 'superficie', 3);
    f.appendChild(await T.txt(letra, tam >= 56 ? 'Titulo/3 Cartao' : 'Texto/Corpo negrito', 'sobre-avatar'));
    return f;
  };
  T.logo = async () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M8 19 L13 25" stroke="#000" stroke-width="5"/><path d="M13 25 L27 8" stroke="#000" stroke-width="5"/><circle cx="30" cy="5.5" r="3" fill="#000"/><circle cx="5" cy="15" r="2.5" fill="#000"/></svg>';
    const marca = figma.createNodeFromSvg(svg); marca.name = 'Marca';
    const els = marca.findAll((x) => x.type !== 'FRAME' && x.type !== 'GROUP');
    const rec = (x, tipo, n) => { if (!x) return; if (tipo === 'traco') x.strokes = [paint(n)]; else x.fills = [paint(n)]; };
    rec(els[0], 'traco', 'marca-crianca'); rec(els[1], 'traco', 'primaria'); rec(els[2], 'fill', 'primaria'); rec(els[3], 'fill', 'marca-ponto');
    const f = T.af('HORIZONTAL', 'Logo', { gap: 8, cross: 'CENTER' });
    f.appendChild(marca);
    f.appendChild(await T.txt('Vacina', 'Titulo/2 Secao', 'texto'));
    f.appendChild(await T.txt('em Dia', 'Titulo/2 Secao', 'primaria'));
    return f;
  };
  T.tela = (nome, w, h) => {
    const f = novoAuto('VERTICAL');
    f.name = nome; f.resize(w, h); f.itemSpacing = 0; T.fill(f, 'fundo'); f.clipsContent = true;
    return f;
  };
  T.conteudo = (tela, gap = 16) => {
    const c = T.af('VERTICAL', 'Conteúdo', { gap, pl: 16, pr: 16, pt: 16, pb: 24 });
    T.put(tela, c, { w: 'FILL', h: 'FILL' }); c.clipsContent = true;
    return c;
  };
  T.nav = async (ativo) => {
    const bar = T.af('HORIZONTAL', 'Barra de navegação', { gap: 4, p: 8, cross: 'CENTER' });
    T.fill(bar, 'superficie');
    bar.strokes = [paint(alto ? 'borda' : 'borda-suave')]; bar.strokeWeight = alto ? 3 : 1;
    bar.strokeTopWeight = alto ? 3 : 1; bar.strokeBottomWeight = 0; bar.strokeLeftWeight = 0; bar.strokeRightWeight = 0; bar.strokeAlign = 'INSIDE';
    for (const [rot, icone] of NAV) {
      const on = rot === ativo;
      const it = T.af('VERTICAL', 'Item ' + rot + (on ? ' (ativo)' : ''), { gap: 4, py: 8, main: 'CENTER', cross: 'CENTER' });
      if (on) { T.fill(it, 'primaria-suave'); T.raio(it, 'botao'); if (alto) T.stroke(it, 'primaria', 3); }
      it.appendChild(T.ic(icone, on ? 'primaria' : 'texto', 24));
      it.appendChild(await T.txt(rot, on ? 'Texto/Rotulo' : 'Texto/Apoio', on ? 'primaria' : 'texto'));
      T.put(bar, it, { w: 'FILL' });
    }
    return bar;
  };
  T.fab = async () => {
    const f = T.af('HORIZONTAL', 'Botão do assistente', { main: 'CENTER', cross: 'CENTER' });
    f.resize(64, 64); f.cornerRadius = 32; T.fill(f, 'primaria');
    if (alto) T.stroke(f, 'texto', 3); else await f.setEffectStyleIdAsync(ESTILOS_EFEITO.get('Sombra/2 ' + sufixo).id);
    f.appendChild(T.ic('assistente', 'sobre-primaria', 28));
    return f;
  };
  T.anel = async (feito, total, tam) => {
    const box = figma.createFrame(); box.name = 'Anel de progresso'; box.resize(tam, tam); box.fills = []; box.clipsContent = false;
    const trilha = figma.createEllipse(); trilha.resize(tam, tam); trilha.arcData = { startingAngle: 0, endingAngle: Math.PI * 2, innerRadius: 0.8 }; T.fill(trilha, 'borda-suave');
    const arco = figma.createEllipse(); arco.resize(tam, tam); const fr = total ? feito / total : 0;
    arco.arcData = { startingAngle: -Math.PI / 2, endingAngle: -Math.PI / 2 + fr * Math.PI * 2, innerRadius: 0.8 }; T.fill(arco, 'primaria');
    box.appendChild(trilha); box.appendChild(arco); trilha.x = 0; trilha.y = 0; arco.x = 0; arco.y = 0;
    const c = T.af('VERTICAL', 'Valor', { main: 'CENTER', cross: 'CENTER' });
    c.resize(tam, tam);
    c.appendChild(await T.txt(String(feito), 'Titulo/3 Cartao', 'texto'));
    c.appendChild(await T.txt('de ' + total, 'Texto/Apoio', 'texto-secundario'));
    box.appendChild(c); c.x = 0; c.y = 0;
    return box;
  };
  T.tile = async (estado, numero, rotulo) => {
    const k = SELOS[estado][1];
    const f = T.af('HORIZONTAL', 'Resumo ' + rotulo, { gap: 8, p: 12, cross: 'CENTER' });
    T.fill(f, 'estado/' + k + '-suave'); T.stroke(f, 'estado/' + k, E); T.raio(f, 'quadro');
    f.appendChild(T.ic(estado === 'agendada' ? 'lembrete' : estado, 'estado/' + k, 22));
    f.appendChild(await T.txt(String(numero), 'Titulo/2 Secao', 'estado/' + k));
    const r = await T.txt(rotulo, 'Texto/Rotulo', 'estado/' + k, { wrap: true }); T.put(f, r, { w: 'FILL' });
    return f;
  };
  T.cartaoDose = async (titulo, apoio, estado, data) => {
    const k = SELOS[estado][1];
    const c = await T.cartao('Cartão de dose ' + titulo, { dir: 'HORIZONTAL', gap: 16, cross: 'MIN' });
    const caixa = T.af('HORIZONTAL', 'Ícone do estado', { main: 'CENTER', cross: 'CENTER' });
    caixa.resize(48, 48); T.fill(caixa, 'estado/' + k + '-suave'); T.stroke(caixa, 'estado/' + k, E); T.raio(caixa, 'campo');
    caixa.appendChild(T.ic(estado, 'estado/' + k, 24));
    c.appendChild(caixa);
    const col = T.af('VERTICAL', 'Textos', { gap: 6 });
    col.appendChild(await T.txt(titulo, 'Titulo/3 Cartao', 'texto', { wrap: true })); col.children[0].layoutSizingHorizontal = 'FILL';
    if (apoio) { const a = await T.txt(apoio, 'Texto/Apoio', 'texto-secundario', { wrap: true }); col.appendChild(a); a.layoutSizingHorizontal = 'FILL'; }
    const linha = T.af('HORIZONTAL', 'Selos', { gap: 8 });
    linha.appendChild(await T.selo(estado)); linha.appendChild(await T.chip('Oficial'));
    col.appendChild(linha);
    if (data) { const d = await T.txt(data, 'Texto/Apoio', 'texto-secundario', { wrap: true }); col.appendChild(d); d.layoutSizingHorizontal = 'FILL'; }
    T.put(c, col, { w: 'FILL' });
    return c;
  };
  return T;
}
const posicionar = (pagina, frames, gap = 60, folga = 160) => {
  let x = Math.max(0, ...pagina.children.map((n) => n.x + n.width)) + folga;
  for (const f of frames) { f.x = x; f.y = 0; x += f.width + gap; }
};
async function telaEntrar(T) {
  const tela = T.tela('Entrar (celular, Claro)', 390, 844);
  const c = T.conteudo(tela, 16);
  c.paddingTop = 24;
  c.appendChild(await T.logo());
  c.appendChild(await T.txt('Entrar', 'Titulo/1 Titulo da tela', 'texto'));
  T.put(c, await T.campo('E-mail', '', false), { w: 'FILL' });
  T.put(c, await T.campo('Senha', '', true), { w: 'FILL' });
  T.put(c, await T.botao('Entrar', 'principal'), { w: 'FILL' });
  c.appendChild(await T.txt('Esqueci minha senha', 'Texto/Corpo negrito', 'primaria', { sub: true }));
  c.appendChild(await T.txt('Criar conta', 'Texto/Corpo negrito', 'primaria', { sub: true }));
  const lin = T.af('HORIZONTAL', 'Reduzir movimento', { gap: 12, cross: 'CENTER', pt: 8 });
  T.put(lin, await T.txt('Reduzir movimento', 'Texto/Corpo', 'texto', { wrap: true }), { w: 'FILL' });
  lin.appendChild(await T.txt('Desligado', 'Texto/Rotulo', 'texto-secundario'));
  const sw = T.af('HORIZONTAL', 'Alternar', { p: 4, cross: 'CENTER' });
  sw.resize(56, 32); sw.cornerRadius = 16; T.fill(sw, 'superficie-suave'); T.stroke(sw, 'borda', 2);
  const bola = figma.createEllipse(); bola.resize(20, 20); T.fill(bola, 'borda'); sw.appendChild(bola);
  lin.appendChild(sw);
  T.put(c, lin, { w: 'FILL' });
  return tela;
}

async function telaDoses(T, nome) {
  const tela = T.tela(nome, 390, 844);
  const c = T.conteudo(tela, 16);
  c.appendChild(await T.txt('Doses de Maria', 'Titulo/1 Titulo da tela', 'texto'));
  T.put(c, await T.botao('Adicionar dose', 'principal', 'mais'), { w: 'FILL' });
  const car = T.af('HORIZONTAL', 'Pessoas', { gap: 12 });
  for (const [l, k, n, sel] of [['M', 'a', 'Maria', true], ['J', 'b', 'Joaquim', false], ['C', 'c', 'Carla', false]]) {
    const it = T.af('VERTICAL', 'Pessoa ' + n, { gap: 6, p: 8, cross: 'CENTER' });
    if (sel) { T.stroke(it, 'primaria', 2); T.raio(it, 'botao'); }
    it.appendChild(await T.avatar(l, k, 56));
    it.appendChild(await T.txt(n, sel ? 'Texto/Rotulo' : 'Texto/Apoio', 'texto'));
    car.appendChild(it);
  }
  c.appendChild(car);
  const card = await T.cartao('Progresso das doses', { gap: 12 });
  card.appendChild(await T.anel(1, 4, 108));
  card.appendChild(await T.txt('Doses aplicadas', 'Titulo/3 Cartao', 'texto'));
  T.put(card, await T.txt('1 de 4 doses de Maria já foram aplicadas.', 'Texto/Apoio', 'texto-secundario', { wrap: true }), { w: 'FILL' });
  const linha = T.af('HORIZONTAL', 'Resumo', { gap: 12 });
  T.put(linha, await T.tile('atrasada', 1, 'Atrasada'), { w: 'FILL' });
  T.put(linha, await T.tile('agendada', 0, 'Em até 7 dias'), { w: 'FILL' });
  T.put(card, linha, { w: 'FILL' });
  T.put(c, card, { w: 'FILL' });
  c.appendChild(await T.txt('Precisam de atenção', 'Titulo/2 Secao', 'texto'));
  T.put(c, await T.cartaoDose('hepatite B, 1 dose', 'ao nascer', 'atrasada', 'Era para 10/02/2026'), { w: 'FILL' });
  T.put(tela, await T.nav('Doses'), { w: 'FILL' });
  const f = await T.fab(); tela.appendChild(f); f.layoutPositioning = 'ABSOLUTE'; f.x = 390 - 16 - 64; f.y = 844 - 84 - 16 - 64;
  return tela;
}

async function telaFamilia(T) {
  const tela = T.tela('Família (celular, Claro)', 390, 844);
  const c = T.conteudo(tela, 16);
  c.appendChild(await T.txt('Família', 'Titulo/1 Titulo da tela', 'texto'));
  T.put(c, await T.botao('Adicionar pessoa', 'principal', 'mais'), { w: 'FILL' });
  const pessoas = [
    ['M', 'a', 'Maria', '8 meses · Criança', 'atrasada', '1 dose atrasada'],
    ['J', 'b', 'Joaquim', '69 anos · Adulto', 'atrasada', '1 dose atrasada'],
    ['C', 'c', 'Carla', '35 anos · Adulto · gestante', 'aplicada', 'Nenhuma dose atrasada'],
  ];
  for (const [l, k, n, info, est, selo] of pessoas) {
    const card = await T.cartao('Pessoa ' + n, { dir: 'HORIZONTAL', gap: 16, cross: 'CENTER', p: 16 });
    card.appendChild(await T.avatar(l, k, 64));
    const col = T.af('VERTICAL', 'Dados', { gap: 8 });
    col.appendChild(await T.txt(n, 'Titulo/3 Cartao', 'texto'));
    col.appendChild(await T.txt(info, 'Texto/Apoio', 'texto-secundario'));
    col.appendChild(await T.selo(est, selo));
    col.appendChild(await T.txt('Editar ' + n, 'Texto/Rotulo', 'primaria', { sub: true }));
    T.put(card, col, { w: 'FILL' });
    card.appendChild(T.ic('seta', 'texto-secundario', 24));
    T.put(c, card, { w: 'FILL' });
  }
  T.put(tela, await T.nav('Família'), { w: 'FILL' });
  const f = await T.fab(); tela.appendChild(f); f.layoutPositioning = 'ABSOLUTE'; f.x = 390 - 16 - 64; f.y = 844 - 84 - 16 - 64;
  return tela;
}

async function telaHistorico(T) {
  const tela = T.tela('Histórico (celular, Claro)', 390, 844);
  const c = T.conteudo(tela, 16);
  c.appendChild(await T.txt('Histórico', 'Titulo/1 Titulo da tela', 'texto'));
  c.appendChild(await T.txt('2026', 'Titulo/2 Secao', 'texto'));
  T.put(c, await T.cartaoDose('BCG, dose única', 'Maria, 12/02/2026', 'aplicada', null), { w: 'FILL' });
  const fonte = await T.cartao('Fonte do calendário', { suave: true, p: 16 });
  T.put(fonte, await T.txt('Fonte: Calendário Nacional de Vacinação 2026, Ministério da Saúde (PNI), versão 2026. O aplicativo não substitui a caderneta oficial nem a orientação de profissionais de saúde.', 'Texto/Apoio', 'texto-secundario', { wrap: true }), { w: 'FILL' });
  T.put(c, fonte, { w: 'FILL' });
  T.put(tela, await T.nav('Histórico'), { w: 'FILL' });
  const f = await T.fab(); tela.appendChild(f); f.layoutPositioning = 'ABSOLUTE'; f.x = 390 - 16 - 64; f.y = 844 - 84 - 16 - 64;
  return tela;
}


function trocar(on, T) {
  const sw = T.af('HORIZONTAL', on ? 'Alternar (ligado)' : 'Alternar (desligado)', { p: 4, cross: 'CENTER', main: on ? 'MAX' : 'MIN' });
  sw.resize(56, 32); sw.cornerRadius = 16;
  T.fill(sw, on ? 'primaria' : 'superficie-suave'); T.stroke(sw, on ? 'primaria' : 'borda', 2);
  const bola = figma.createEllipse(); bola.resize(20, 20); T.fill(bola, on ? 'sobre-primaria' : 'borda'); sw.appendChild(bola);
  return sw;
}

async function caixaIcone(T, icone) {
  const f = T.af('HORIZONTAL', 'Ícone ' + icone, { main: 'CENTER', cross: 'CENTER' });
  f.resize(48, 48); T.fill(f, 'primaria-suave'); T.stroke(f, 'primaria', T.alto ? 3 : 2); T.raio(f, 'campo');
  f.appendChild(T.ic(icone, 'primaria', 24));
  return f;
}

async function telaConta(T) {
  const tela = T.tela('Conta (celular, Claro)', 390, 844);
  const c = T.conteudo(tela, 16);
  c.appendChild(await T.txt('Conta', 'Titulo/1 Titulo da tela', 'texto'));
  const cab = T.af('HORIZONTAL', 'Seus dados', { gap: 16, p: 24, cross: 'CENTER' });
  T.fill(cab, 'primaria'); T.raio(cab, 'folha');
  if (T.alto) T.stroke(cab, 'texto', 3);
  cab.appendChild(await T.avatar('M', 'a', 80, true));
  const dados = T.af('VERTICAL', 'Dados', { gap: 4 });
  dados.appendChild(await T.txt('Seus dados', 'Titulo/2 Secao', 'sobre-primaria'));
  dados.appendChild(await T.txt('mariana@exemplo.com.br', 'Texto/Corpo', 'sobre-primaria'));
  T.put(cab, dados, { w: 'FILL' });
  T.put(c, cab, { w: 'FILL' });

  const fam = await T.cartao('Sua família', { gap: 12 });
  const topo = T.af('HORIZONTAL', 'Cabeçalho', { gap: 12, cross: 'CENTER' });
  topo.appendChild(await caixaIcone(T, 'familia'));
  const tx = T.af('VERTICAL', 'Textos', { gap: 2 });
  tx.appendChild(await T.txt('Sua família', 'Titulo/3 Cartao', 'texto'));
  tx.appendChild(await T.txt('3 pessoas acompanhadas', 'Texto/Apoio', 'texto-secundario'));
  topo.appendChild(tx);
  T.put(fam, topo, { w: 'FILL' });
  const linha = T.af('HORIZONTAL', 'Pessoas e ação', { gap: 12, cross: 'CENTER', main: 'SPACE_BETWEEN' });
  const pilha = T.af('HORIZONTAL', 'Avatares', { gap: -8 });
  for (const [l, k] of [['M', 'a'], ['J', 'b'], ['C', 'c']]) pilha.appendChild(await T.avatar(l, k, 40, true));
  linha.appendChild(pilha);
  const ver = await T.botao('Ver família', 'secundario'); ver.resize(130, 48);
  linha.appendChild(ver);
  T.put(fam, linha, { w: 'FILL' });
  T.put(c, fam, { w: 'FILL' });

  const lem = await T.cartao('Lembretes', { gap: 12 });
  const topo2 = T.af('HORIZONTAL', 'Cabeçalho', { gap: 12, cross: 'CENTER' });
  topo2.appendChild(await caixaIcone(T, 'lembrete'));
  const tx2 = T.af('VERTICAL', 'Textos', { gap: 2 });
  tx2.appendChild(await T.txt('Lembretes', 'Titulo/3 Cartao', 'texto'));
  const ap = await T.txt('O aviso dentro do aplicativo sempre aparece na aba Doses.', 'Texto/Apoio', 'texto-secundario', { wrap: true });
  T.put(tx2, ap, { w: 'FILL' });
  T.put(topo2, tx2, { w: 'FILL' });
  T.put(lem, topo2, { w: 'FILL' });
  T.put(lem, await T.txt('Se quiser, também enviamos um e-mail às 8h, no dia da vacina e 7 dias antes. O e-mail traz só a quantidade de vacinas, sem nomes.', 'Texto/Corpo', 'texto', { wrap: true }), { w: 'FILL' });
  const rec = T.af('HORIZONTAL', 'Receber por e-mail', { gap: 12, cross: 'CENTER' });
  T.put(rec, await T.txt('Receber lembretes por e-mail', 'Texto/Corpo', 'texto', { wrap: true }), { w: 'FILL' });
  rec.appendChild(await T.txt('Ligado', 'Texto/Rotulo', 'texto-secundario'));
  rec.appendChild(trocar(true, T));
  T.put(lem, rec, { w: 'FILL' });
  T.put(c, lem, { w: 'FILL' });

  T.put(tela, await T.nav('Conta'), { w: 'FILL' });
  const f = await T.fab(); tela.appendChild(f); f.layoutPositioning = 'ABSOLUTE'; f.x = 390 - 16 - 64; f.y = 844 - 84 - 16 - 64;
  return tela;
}

async function telaDetalhe(T) {
  const tela = T.tela('Detalhe da dose (celular, Claro)', 390, 844);
  const c = T.conteudo(tela, 16);
  c.appendChild(await T.txt('hepatite B, 1 dose', 'Titulo/1 Titulo da tela', 'texto'));
  c.appendChild(await T.txt('Voltar para Doses', 'Texto/Rotulo', 'primaria', { sub: true }));
  const selos = T.af('HORIZONTAL', 'Selos', { gap: 8 });
  selos.appendChild(await T.selo('atrasada')); selos.appendChild(await T.chip('Oficial'));
  c.appendChild(selos);
  const card = await T.cartao('Dados da dose', { gap: 12 });
  for (const [rot, val] of [['Para quem', 'Maria'], ['Era para', '10/02/2026'], ['Quando é indicada', 'ao nascer'], ['Protege contra', 'hepatite B']]) {
    const par = T.af('VERTICAL', rot, { gap: 2 });
    par.appendChild(await T.txt(rot, 'Texto/Rotulo', 'texto-secundario'));
    par.appendChild(await T.txt(val, 'Texto/Corpo negrito', 'texto'));
    T.put(card, par, { w: 'FILL' });
  }
  T.put(c, card, { w: 'FILL' });
  T.put(c, await T.botao('Reagendar', 'principal'), { w: 'FILL' });
  T.put(c, await T.botao('Registrar aplicação', 'secundario'), { w: 'FILL' });
  T.put(c, await T.botao('Cancelar dose', 'perigo'), { w: 'FILL' });
  T.put(c, await T.txt('O aplicativo não substitui a caderneta oficial nem a orientação de profissionais de saúde.', 'Texto/Apoio', 'texto-secundario', { wrap: true }), { w: 'FILL' });
  return tela;
}

async function telaAssistente(T) {
  const tela = T.tela('Assistente (celular, Claro)', 390, 844);
  const c = T.conteudo(tela, 16);
  c.appendChild(await T.txt('Doses de Maria', 'Titulo/1 Titulo da tela', 'texto'));
  const veu = figma.createRectangle(); veu.name = 'Fundo escurecido'; veu.resize(390, 844); T.fill(veu, 'texto'); veu.opacity = 0.4;
  tela.appendChild(veu); veu.layoutPositioning = 'ABSOLUTE'; veu.x = 0; veu.y = 0;
  const jan = T.af('VERTICAL', 'Janela do assistente', { gap: 0 });
  jan.resize(390, 788); T.fill(jan, 'superficie');
  for (const k of ['topLeftRadius', 'topRightRadius']) jan.setBoundVariable(k, MED['raio/folha']);
  const cab = T.af('HORIZONTAL', 'Cabeçalho', { gap: 12, p: 16, cross: 'CENTER' });
  const marca = T.af('HORIZONTAL', 'Selo do assistente', { main: 'CENTER', cross: 'CENTER' });
  marca.resize(48, 48); T.fill(marca, 'primaria-suave'); T.raio(marca, 'campo');
  marca.appendChild(T.ic('assistente', 'primaria', 26));
  cab.appendChild(marca);
  const tt = T.af('VERTICAL', 'Textos', { gap: 2 });
  tt.appendChild(await T.txt('Assistente', 'Titulo/3 Cartao', 'texto'));
  T.put(tt, await T.txt('Dúvidas sobre o aplicativo e o calendário', 'Texto/Apoio', 'texto-secundario', { wrap: true }), { w: 'FILL' });
  T.put(cab, tt, { w: 'FILL' });
  cab.appendChild(T.ic('fechar', 'texto', 24));
  T.put(jan, cab, { w: 'FILL' });
  const linhaDiv = figma.createRectangle(); linhaDiv.name = 'Divisor'; linhaDiv.resize(390, 1); T.fill(linhaDiv, 'borda-suave');
  jan.appendChild(linhaDiv); linhaDiv.layoutSizingHorizontal = 'FILL';
  const corpo = T.af('VERTICAL', 'Conversa', { gap: 12, p: 16 });
  const bolha = await T.cartao('Mensagem do assistente', { p: 16 });
  T.put(bolha, await T.txt('Olá! Eu sou o assistente do Vacina em Dia. Posso explicar como usar o aplicativo e contar o que diz o Calendário Nacional de Vacinação. Você pode escrever ou falar.', 'Texto/Corpo', 'texto', { wrap: true }), { w: 'FILL' });
  T.put(corpo, bolha, { w: 'FILL' });
  for (const s of ['O que significa dose atrasada?', 'Para que serve a BCG?', 'Como registro que tomei a vacina?']) {
    const ch = T.af('HORIZONTAL', 'Sugestão', { px: 16, py: 10, cross: 'CENTER' });
    T.fill(ch, 'superficie'); T.stroke(ch, 'borda', 2); T.raio(ch, 'selo');
    ch.appendChild(await T.txt(s, 'Texto/Rotulo', 'texto'));
    corpo.appendChild(ch);
  }
  T.put(corpo, await T.txt('O assistente não dá orientação médica e não substitui a caderneta oficial nem um profissional de saúde. Em emergência, ligue 192 (SAMU).', 'Texto/Apoio', 'texto-secundario', { wrap: true }), { w: 'FILL' });
  T.put(jan, corpo, { w: 'FILL', h: 'FILL' });
  const rod = T.af('HORIZONTAL', 'Escrever', { gap: 8, p: 12, cross: 'CENTER' });
  const caixa = T.af('HORIZONTAL', 'Campo', { px: 20, cross: 'CENTER' });
  caixa.resize(100, 56); T.fill(caixa, 'superficie'); T.stroke(caixa, 'borda', 2); T.raio(caixa, 'selo');
  caixa.appendChild(await T.txt('Escreva sua pergunta', 'Texto/Corpo', 'texto-secundario'));
  T.put(rod, caixa, { w: 'FILL' });
  const mic = T.af('HORIZONTAL', 'Falar', { main: 'CENTER', cross: 'CENTER' });
  mic.resize(56, 56); mic.cornerRadius = 28; T.fill(mic, 'superficie'); T.stroke(mic, 'borda', 2); mic.appendChild(T.ic('voz', 'texto', 24));
  rod.appendChild(mic);
  const env = T.af('HORIZONTAL', 'Enviar', { main: 'CENTER', cross: 'CENTER' });
  env.resize(56, 56); env.cornerRadius = 28; T.fill(env, 'primaria'); env.opacity = 0.55; env.appendChild(T.ic('enviar', 'sobre-primaria', 24));
  rod.appendChild(env);
  T.put(jan, rod, { w: 'FILL' });
  tela.appendChild(jan); jan.layoutPositioning = 'ABSOLUTE'; jan.x = 0; jan.y = 56;
  return tela;
}

async function navLateral(T, ativo) {
  const col = T.af('VERTICAL', 'Menu lateral', { gap: 8 });
  for (const [rot, ic] of [['Doses', 'doses'], ['Família', 'familia'], ['Histórico', 'historico'], ['Conta', 'conta'], ['Postos', 'local']]) {
    const on = rot === ativo;
    const it = T.af('HORIZONTAL', 'Item ' + rot + (on ? ' (ativo)' : ''), { gap: 14, px: 20, py: 14, cross: 'CENTER' });
    if (on) { T.fill(it, 'primaria-suave'); T.raio(it, 'botao'); if (T.alto) T.stroke(it, 'primaria', 3); }
    it.appendChild(T.ic(ic, on ? 'primaria' : 'texto', 24));
    it.appendChild(await T.txt(rot, on ? 'Texto/Corpo negrito' : 'Texto/Corpo', on ? 'primaria' : 'texto'));
    T.put(col, it, { w: 'FILL' });
  }
  return col;
}

async function telaWebDoses(T, nome) {
  const tela = T.tela(nome, 1280, 800);
  tela.layoutMode = 'HORIZONTAL';
  const lado = T.af('VERTICAL', 'Barra lateral', { gap: 24, p: 16, pt: 28 });
  lado.resize(248, 800); T.fill(lado, 'superficie');
  T.stroke(lado, T.alto ? 'borda' : 'borda-suave', T.alto ? 3 : 1);
  lado.strokeTopWeight = 0; lado.strokeBottomWeight = 0; lado.strokeLeftWeight = 0;
  lado.appendChild(await T.logo());
  T.put(lado, await navLateral(T, 'Doses'), { w: 'FILL' });
  tela.appendChild(lado); lado.layoutSizingVertical = 'FILL';
  const c = T.af('VERTICAL', 'Conteúdo', { gap: 24, p: 36, pt: 32 });
  tela.appendChild(c); c.layoutSizingHorizontal = 'FILL'; c.layoutSizingVertical = 'FILL'; c.clipsContent = true;
  const topo = T.af('HORIZONTAL', 'Título e ação', { cross: 'CENTER', main: 'SPACE_BETWEEN' });
  topo.appendChild(await T.txt('Doses de Maria', 'Titulo/1 Titulo da tela', 'texto'));
  const b = await T.botao('Adicionar dose', 'principal', 'mais'); b.resize(190, 56); topo.appendChild(b);
  T.put(c, topo, { w: 'FILL' });
  const car = T.af('HORIZONTAL', 'Pessoas', { gap: 12 });
  for (const [l, k, n, sel] of [['M', 'a', 'Maria', true], ['J', 'b', 'Joaquim', false], ['C', 'c', 'Carla', false]]) {
    const it = T.af('VERTICAL', 'Pessoa ' + n, { gap: 6, p: 8, cross: 'CENTER' });
    if (sel) { T.stroke(it, 'primaria', 2); T.raio(it, 'botao'); }
    it.appendChild(await T.avatar(l, k, 56));
    it.appendChild(await T.txt(n, sel ? 'Texto/Rotulo' : 'Texto/Apoio', 'texto'));
    car.appendChild(it);
  }
  c.appendChild(car);
  const card = await T.cartao('Progresso das doses', { dir: 'HORIZONTAL', gap: 20, p: 20, cross: 'CENTER' });
  card.appendChild(await T.anel(1, 4, 108));
  const col = T.af('VERTICAL', 'Resumo', { gap: 8 });
  col.appendChild(await T.txt('Doses aplicadas', 'Titulo/3 Cartao', 'texto'));
  col.appendChild(await T.txt('1 de 4 doses de Maria já foram aplicadas.', 'Texto/Apoio', 'texto-secundario'));
  const linha = T.af('HORIZONTAL', 'Resumo', { gap: 12 });
  T.put(linha, await T.tile('atrasada', 1, 'Atrasada'), { w: 'FILL' });
  T.put(linha, await T.tile('agendada', 0, 'Em até 7 dias'), { w: 'FILL' });
  T.put(col, linha, { w: 'FILL' });
  T.put(card, col, { w: 'FILL' });
  T.put(c, card, { w: 'FILL' });
  c.appendChild(await T.txt('Precisam de atenção', 'Titulo/2 Secao', 'texto'));
  const l1 = T.af('HORIZONTAL', 'Atenção', { gap: 16 });
  const d1 = await T.cartaoDose('hepatite B, 1 dose', 'ao nascer', 'atrasada', 'Era para 10/02/2026'); d1.resize(470, 100);
  l1.appendChild(d1);
  c.appendChild(l1);
  const fab = await T.fab(); tela.appendChild(fab); fab.layoutPositioning = 'ABSOLUTE'; fab.x = 1280 - 24 - 64; fab.y = 800 - 24 - 64;
  return tela;
}

// ===== Execução =====
const resultado = { criadas: [], puladas: [], erros: [] };
function pagina(nome) {
  return figma.root.children.find((p) => p.name === nome) ?? Object.assign(figma.createPage(), { name: nome });
}
async function gerar(nomePagina, lista) {
  const pg = pagina(nomePagina);
  await figma.setCurrentPageAsync(pg);
  const existentes = new Set(pg.children.map((n) => n.name));
  const novos = [];
  for (const [nome, fn] of lista) {
    if (existentes.has(nome)) { resultado.puladas.push(nome); continue; }
    try { const f = await fn(); f.name = nome; novos.push(f); resultado.criadas.push(nome); }
    catch (e) { resultado.erros.push(nome + ': ' + (e && e.message ? e.message : String(e))); }
  }
  posicionar(pg, novos);
}

const claro = await criarTema('Cor (Claro)', 'Claro', false);
const escuro = await criarTema('Cor (Escuro)', 'Escuro', false);
const alto = await criarTema('Cor (Alto contraste)', 'Claro', true);

await gerar('Telas: celular', [
  ['Entrar (celular, Claro)', () => telaEntrar(claro)],
  ['Doses (celular, Claro)', () => telaDoses(claro, 'Doses (celular, Claro)')],
  ['Família (celular, Claro)', () => telaFamilia(claro)],
  ['Histórico (celular, Claro)', () => telaHistorico(claro)],
  ['Conta (celular, Claro)', () => telaConta(claro)],
  ['Detalhe da dose (celular, Claro)', () => telaDetalhe(claro)],
  ['Assistente (celular, Claro)', () => telaAssistente(claro)],
  ['Doses (celular, Escuro)', () => telaDoses(escuro, 'Doses (celular, Escuro)')],
  ['Doses (celular, Alto contraste)', () => telaDoses(alto, 'Doses (celular, Alto contraste)')],
]);
await gerar('Telas: tablet e web', [
  ['Doses (web, Claro)', () => telaWebDoses(claro, 'Doses (web, Claro)')],
  ['Doses (web, Escuro)', () => telaWebDoses(escuro, 'Doses (web, Escuro)')],
]);
return resultado;

})()
  .then((r) => {
    console.log(JSON.stringify(r));
    const msg = `Telas criadas: ${r.criadas.length}; puladas: ${r.puladas.length}; erros: ${r.erros.length}.` + (r.erros.length ? ' ' + r.erros.join(' | ') : '');
    figma.closePlugin(msg);
  })
  .catch((e) => figma.closePlugin('Erro: ' + (e && e.message ? e.message : String(e))));
