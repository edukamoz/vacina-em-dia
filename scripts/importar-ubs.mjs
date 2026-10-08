#!/usr/bin/env node
/**
 * Gera `apps/api/src/data/ubs.json` a partir do CSV oficial de Unidades Básicas de Saúde do
 * Ministério da Saúde (CNES), para o mapa de postos (RF10).
 *
 * Uso:
 *   1. Baixe e descompacte o arquivo:
 *      https://s3.sa-east-1.amazonaws.com/ckan.saude.gov.br/CNES/Unidades_Basicas_Saude-UBS_csv.zip
 *   2. node scripts/importar-ubs.mjs <caminho do Unidades_Basicas_Saude-UBS.csv> [AAAA-MM-DD]
 *      (a data é a da versão do arquivo; sem ela, usa a data de hoje)
 *
 * O que faz: lê o CSV (separado por ponto e vírgula, com vírgula decimal em parte das
 * coordenadas), descarta unidades sem coordenada ou com coordenada imprecisa (menos de 3 casas
 * decimais, erro de mais de 100 m) ou fora do Brasil, arruma os nomes (maiúsculas e acentos) e
 * grava um arquivo compacto, uma linha por unidade, ordenado pelo código CNES.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const aqui = dirname(fileURLToPath(import.meta.url));
const saida = join(aqui, '..', 'apps', 'api', 'src', 'data', 'ubs.json');

const [, , arquivo, dataArg] = process.argv;
if (!arquivo) {
  console.error(
    'Informe o caminho do CSV. Exemplo: node scripts/importar-ubs.mjs ubs.csv 2026-10-07',
  );
  process.exit(1);
}
const versao = dataArg ?? new Date().toISOString().slice(0, 10);

/** Palavras do cadastro (sem acento) e como devem aparecer. */
const PALAVRAS = new Map(
  Object.entries({
    SAUDE: 'Saúde',
    ESTRATEGIA: 'Estratégia',
    FAMILIA: 'Família',
    BASICA: 'Básica',
    MEDICO: 'Médico',
    MEDICA: 'Médica',
    AMBULATORIO: 'Ambulatório',
    AMBULATORIAL: 'Ambulatorial',
    ESPECIALIDADES: 'Especialidades',
    CONCEICAO: 'Conceição',
    JOSE: 'José',
    JOAO: 'João',
    MARIA: 'Maria',
    SAO: 'São',
    SEBASTIAO: 'Sebastião',
    ANTONIO: 'Antônio',
    GONCALVES: 'Gonçalves',
    GONCALO: 'Gonçalo',
    LUIS: 'Luís',
    LUIZ: 'Luiz',
    VIRGINIA: 'Virgínia',
    LUCIA: 'Lúcia',
    CECILIA: 'Cecília',
    JULIA: 'Júlia',
    SOFIA: 'Sofia',
    ARARAS: 'Araras',
    CENTRO: 'Centro',
    BAIRRO: 'Bairro',
    COMUNIDADE: 'Comunidade',
    MUNICIPAL: 'Municipal',
    PUBLICA: 'Pública',
    PUBLICO: 'Público',
    RURAL: 'Rural',
    URBANA: 'Urbana',
    JARDIM: 'Jardim',
    PARQUE: 'Parque',
    VILA: 'Vila',
    NOSSA: 'Nossa',
    SENHORA: 'Senhora',
    SANTA: 'Santa',
    SANTO: 'Santo',
    UNIDADE: 'Unidade',
    POSTO: 'Posto',
    CENTROS: 'Centros',
    IPES: 'Ipês',
    ACACIAS: 'Acácias',
    AGUAS: 'Águas',
    PRACA: 'Praça',
    PRAÇA: 'Praça',
    AVENIDA: 'Avenida',
    RODOVIA: 'Rodovia',
    ESTRADA: 'Estrada',
    TRAVESSA: 'Travessa',
    QUADRA: 'Quadra',
    LOTE: 'Lote',
    ZONA: 'Zona',
    NORTE: 'Norte',
    SUL: 'Sul',
    LESTE: 'Leste',
    OESTE: 'Oeste',
    SERVICO: 'Serviço',
    SERVICOS: 'Serviços',
    ATENCAO: 'Atenção',
    PRIMARIA: 'Primária',
    ORGAO: 'Órgão',
    REGIAO: 'Região',
    HOSPITAL: 'Hospital',
    CRIANCA: 'Criança',
    MULHER: 'Mulher',
    IDOSO: 'Idoso',
    PREFEITURA: 'Prefeitura',
    SECRETARIA: 'Secretaria',
    EDUCACAO: 'Educação',
    ASSISTENCIA: 'Assistência',
    SOCIAL: 'Social',
    COMUNITARIO: 'Comunitário',
    COMUNITARIA: 'Comunitária',
    MODULO: 'Módulo',
    NUCLEO: 'Núcleo',
    LAGOA: 'Lagoa',
    JACARE: 'Jacaré',
    TUCURUI: 'Tucuruí',
    PARA: 'Pará',
    GOIAS: 'Goiás',
    BRASILIA: 'Brasília',
    ITAPEVA: 'Itapeva',
    CAFE: 'Café',
    CAPAO: 'Capão',
    BOA: 'Boa',
    ALTA: 'Alta',
    BAIXA: 'Baixa',
  }),
);
/** Siglas que ficam em maiúsculas. */
const SIGLAS = new Set([
  'UBS',
  'USF',
  'UBSF',
  'UESF',
  'ESF',
  'PSF',
  'UPA',
  'SUS',
  'CAIC',
  'CS',
  'PA',
  'II',
  'III',
  'IV',
  'VI',
  'VII',
  'VIII',
  'IX',
  'XI',
  'XII',
  'XIII',
  'RJ',
  'SP',
  'MG',
  'DF',
]);
/** Palavras de ligação, sempre em minúsculas (menos a primeira). */
const LIGACAO = new Set([
  'DE',
  'DA',
  'DO',
  'DAS',
  'DOS',
  'E',
  'EM',
  'NA',
  'NO',
  'NAS',
  'NOS',
  'A',
  'O',
  'COM',
]);

function embelezar(texto) {
  return texto
    .trim()
    .replace(/\s+/g, ' ')
    .split(' ')
    .map((palavra, i) => {
      const chave = palavra.toUpperCase();
      if (SIGLAS.has(chave)) return chave;
      if (i > 0 && LIGACAO.has(chave)) return chave.toLowerCase();
      const conhecida = PALAVRAS.get(chave);
      if (conhecida) return conhecida;
      return chave.charAt(0) + chave.slice(1).toLowerCase();
    })
    .join(' ');
}

/** Separa uma linha do CSV (campos entre aspas, separador ponto e vírgula). */
function campos(linha) {
  const saida = [];
  let atual = '';
  let dentro = false;
  for (let i = 0; i < linha.length; i++) {
    const c = linha[i];
    if (c === '"') {
      if (dentro && linha[i + 1] === '"') {
        atual += '"';
        i++;
      } else dentro = !dentro;
    } else if (c === ';' && !dentro) {
      saida.push(atual);
      atual = '';
    } else atual += c;
  }
  saida.push(atual);
  return saida;
}

const numero = (texto) => {
  const n = Number(
    String(texto ?? '')
      .trim()
      .replace(',', '.'),
  );
  return Number.isFinite(n) && String(texto).trim() !== '' ? n : null;
};
const casasDecimais = (texto) =>
  (String(texto).trim().replace(',', '.').split('.')[1] ?? '').length;

const texto = readFileSync(arquivo, 'utf8');
const linhas = (texto.charCodeAt(0) === 0xfeff ? texto.slice(1) : texto)
  .split('\n')
  .map((linha) => linha.replace(/\r$/, ''))
  .filter(Boolean);
const cabecalho = campos(linhas[0]).map((c) => c.trim().toUpperCase());
const idx = Object.fromEntries(cabecalho.map((nome, i) => [nome, i]));
for (const nome of [
  'CNES',
  'UF',
  'IBGE',
  'NOME',
  'LOGRADOURO',
  'BAIRRO',
  'LATITUDE',
  'LONGITUDE',
]) {
  if (!(nome in idx)) {
    console.error(`Coluna ausente no CSV: ${nome}. Colunas: ${cabecalho.join(', ')}`);
    process.exit(1);
  }
}

const motivos = { semCoordenada: 0, imprecisa: 0, foraDoBrasil: 0, repetida: 0, semNome: 0 };
const vistas = new Set();
const rows = [];
for (const linha of linhas.slice(1)) {
  const c = campos(linha);
  const cnes = c[idx.CNES].trim().padStart(7, '0');
  const lat = numero(c[idx.LATITUDE]);
  const lon = numero(c[idx.LONGITUDE]);
  if (lat === null || lon === null) {
    motivos.semCoordenada++;
    continue;
  }
  if (casasDecimais(c[idx.LATITUDE]) < 3 || casasDecimais(c[idx.LONGITUDE]) < 3) {
    motivos.imprecisa++;
    continue;
  }
  if (lat < -34 || lat > 6 || lon < -74 || lon > -28) {
    motivos.foraDoBrasil++;
    continue;
  }
  if (vistas.has(cnes)) {
    motivos.repetida++;
    continue;
  }
  const nome = embelezar(c[idx.NOME]);
  if (!nome) {
    motivos.semNome++;
    continue;
  }
  vistas.add(cnes);
  rows.push([
    cnes,
    nome,
    embelezar(c[idx.LOGRADOURO]),
    embelezar(c[idx.BAIRRO]),
    c[idx.IBGE].trim().padStart(6, '0'),
    Math.round(lat * 1e6) / 1e6,
    Math.round(lon * 1e6) / 1e6,
  ]);
}
rows.sort((a, b) => a[0].localeCompare(b[0]));

const documento = {
  fonte: {
    nome: 'Unidades Básicas de Saúde (UBS), Cadastro Nacional de Estabelecimentos de Saúde (CNES)',
    editor: 'Ministério da Saúde',
    url: 'https://dadosabertos.saude.gov.br/dataset/unidades-basicas-de-saude-ubs',
    licenca:
      'Creative Commons Atribuição-SemDerivações 3.0 (portal de dados abertos do Ministério da Saúde)',
  },
  versao,
  colunas: ['cnes', 'nome', 'logradouro', 'bairro', 'ibge', 'latitude', 'longitude'],
  rows,
};
writeFileSync(saida, `${JSON.stringify(documento)}\n`, 'utf8');
console.log(`Gravadas ${rows.length} unidades (de ${linhas.length - 1}) em ${saida}`);
console.log('Descartadas:', motivos);
