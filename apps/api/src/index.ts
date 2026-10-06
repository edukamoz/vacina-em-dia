/**
 * API do Vacina em Dia (Azure Functions, Node.js e TypeScript, sem Express).
 *
 * Camadas: `handlers` (HTTP, finos) → `services` (casos de uso) → `domain` (regras puras, em
 * `@vacina/shared`) → `repositories` (acesso a dados).
 *
 * @packageDocumentation
 */
export * from './handlers/health';
export * from './clock';
export * from './http';
export * from './handlers/doses';
export * from './services/dose-service';
export * from './repositories/dose-repository';
export * from './repositories/in-memory-dose-repository';
