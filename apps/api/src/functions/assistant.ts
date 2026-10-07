import { app } from '@azure/functions';
import type { HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { assistantHandlers, authenticated } from './composition';

/** `POST /api/assistant/message`: pergunta em texto ao assistente. */
export async function assistantMessage(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  return authenticated(request, context, async (ownerId) => {
    const body: unknown = await request.json().catch(() => undefined);
    return assistantHandlers.message(ownerId, body);
  });
}

/** `POST /api/assistant/voice`: pergunta por voz (áudio WAV PCM de 16 kHz, mono). */
export async function assistantVoice(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  return authenticated(request, context, async (ownerId) => {
    // O áudio fica só em memória, durante esta chamada: nunca é gravado.
    const audio = new Uint8Array(await request.arrayBuffer());
    return assistantHandlers.voice(ownerId, request.headers.get('content-type'), audio);
  });
}

app.http('assistantMessage', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'assistant/message',
  handler: assistantMessage,
});

app.http('assistantVoice', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'assistant/voice',
  handler: assistantVoice,
});
