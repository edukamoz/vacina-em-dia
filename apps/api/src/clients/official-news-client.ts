import type { NewsItem } from '@vacina/shared';

/** Cliente do feed de notícias do Ministério da Saúde. */
export interface OfficialNewsClient {
  /**
   * Lê o feed e devolve as notícias (da mais nova para a mais antiga).
   *
   * @param signal - Para abortar a leitura por tempo.
   * @throws Error se o feed não responder ou vier fora do formato.
   */
  fetchLatest(signal?: AbortSignal): Promise<NewsItem[]>;
}

/** Cliente usado sem rede (testes e desenvolvimento): sempre falha, e a API responde com lista vazia. */
export const unavailableOfficialNewsClient: OfficialNewsClient = {
  fetchLatest: () => Promise.reject(new Error('Feed indisponível.')),
};

/** Feed RSS 1.0 do portal do Ministério da Saúde (todo o site; o cliente separa as notícias). */
export const OFFICIAL_NEWS_FEED_URL = 'https://www.gov.br/saude/RSS';
/** Só entram links de notícias do portal: sem anexos (PDF, imagem) nem páginas de outro assunto. */
const NEWS_LINK =
  /^https:\/\/www\.gov\.br\/saude\/pt-br\/assuntos\/noticias-ms\/\d{4}\/[a-z]+\/[a-z0-9-]+$/;
/** Teto do tamanho do feed lido (1 MB): o real tem poucas dezenas de KB. */
const MAX_FEED_BYTES = 1_000_000;
const MAX_TITLE_LENGTH = 200;

const VACCINE_WORDS =
  /vacin|imuniz|sarampo|poliomielite|paralisia infantil|\bhpv\b|coqueluche|rotav[ií]rus|meningite|febre amarela|\bgripe\b|influenza|covid|dengue/i;

const ENTITIES: Readonly<Record<string, string>> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&apos;': "'",
  '&#39;': "'",
};

function decode(text: string): string {
  return text
    .replace(/^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/, '$1')
    .replace(/&(?:amp|lt|gt|quot|apos|#39);/g, (entity) => ENTITIES[entity] ?? entity)
    .replace(/&#(\d{1,6});/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/\s+/g, ' ')
    .trim();
}

function field(item: string, tag: string): string {
  const match = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`).exec(item);
  return match?.[1] ? decode(match[1]) : '';
}

/**
 * Extrai as notícias de um feed RSS 1.0 do portal do Ministério da Saúde. Função pura: não lê a
 * rede. Descarta anexos, imagens e itens sem título, link de notícia ou data válida; guarda só
 * título, data e link (nunca o texto da notícia); ordena da mais nova para a mais antiga e, na
 * mesma data, põe antes as que citam vacinação.
 *
 * @param xml - Conteúdo do feed.
 * @param limit - Máximo de notícias devolvidas.
 */
export function parseNewsFeed(xml: string, limit = 8): NewsItem[] {
  const items: NewsItem[] = [];
  const seen = new Set<string>();
  for (const match of xml.matchAll(/<item\b[\s\S]*?<\/item>/g)) {
    const raw = match[0];
    const url = field(raw, 'link');
    const title = field(raw, 'title').slice(0, MAX_TITLE_LENGTH);
    const date = /^(\d{4}-\d{2}-\d{2})T/.exec(field(raw, 'dc:date'))?.[1];
    if (!title || !date || !NEWS_LINK.test(url) || seen.has(url)) continue;
    seen.add(url);
    items.push({ title, url, publishedAt: date, vaccineRelated: VACCINE_WORDS.test(title) });
  }
  return items
    .sort(
      (a, b) =>
        b.publishedAt.localeCompare(a.publishedAt) ||
        Number(b.vaccineRelated) - Number(a.vaccineRelated),
    )
    .slice(0, limit);
}

/**
 * Cria o cliente que lê o feed oficial por HTTPS. O endereço é fixo (não vem do usuário), a
 * resposta tem teto de tamanho e nada do usuário é enviado.
 *
 * @param fetchFn - `fetch` a usar (injetável nos testes).
 */
export function createOfficialNewsClient(fetchFn: typeof fetch = fetch): OfficialNewsClient {
  return {
    async fetchLatest(signal) {
      const response = await fetchFn(OFFICIAL_NEWS_FEED_URL, {
        ...(signal ? { signal } : {}),
        headers: { accept: 'application/rss+xml, application/xml;q=0.9' },
      });
      if (!response.ok) throw new Error(`Feed respondeu ${response.status}.`);
      const body = await response.text();
      if (body.length > MAX_FEED_BYTES) throw new Error('Feed grande demais.');
      return parseNewsFeed(body);
    },
  };
}
