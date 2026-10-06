import type { DoseSnapshot } from '@vacina/shared';

/** Dose guardada pelo repositório: identificação da vacina mais o estado da máquina de estados. */
export interface StoredDose extends DoseSnapshot {
  readonly id: string;
  readonly vaccine: string;
  readonly doseLabel: string;
}

/** Acesso às doses. A implementação em memória serve ao esqueleto; o banco entra no SCRUM-22. */
export interface DoseRepository {
  /** Lista todas as doses na ordem de cadastro. */
  list(): Promise<readonly StoredDose[]>;
  /** Busca uma dose pelo identificador; `undefined` quando não existe. */
  get(id: string): Promise<StoredDose | undefined>;
  /** Grava a dose, substituindo a anterior de mesmo identificador. */
  save(dose: StoredDose): Promise<void>;
}
