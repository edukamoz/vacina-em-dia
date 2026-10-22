import { app } from '@azure/functions';
import type { HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { authenticated, newsHandlers } from './composition';

/** `GET /api/news`: últimas notícias do Ministério da Saúde. */
export async function getNews(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  return authenticated(request, context, (ownerId) => newsHandlers.latest(ownerId));
}

app.http('getNews', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'news',
  handler: getNews,
});
