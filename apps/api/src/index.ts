/**
 * API do Vacina em Dia (Azure Functions, Node.js e TypeScript, sem Express).
 *
 * Camadas: `handlers` (HTTP, finos) → `services` (casos de uso) → `domain` (regras puras, em
 * `@vacina/shared`) → `repositories` (acesso a dados).
 *
 * @packageDocumentation
 */
export * from './clock';
export * from './http';
export * from './identity';
export * from './clients/nlp-http-client';
export * from './clients/speech-http-client';
export * from './handlers/account';
export * from './handlers/assistant';
export * from './handlers/consent';
export * from './handlers/docs';
export * from './handlers/doses';
export * from './handlers/health';
export * from './handlers/members';
export * from './openapi/build-spec';
export * from './repositories/in-memory-store';
export * from './repositories/repositories';
export * from './services/account-service';
export * from './services/assistant-ports';
export * from './services/assistant-service';
export * from './services/rate-limiter';
export * from './services/consent-service';
export * from './services/dose-service';
export * from './services/errors';
export * from './services/member-service';
