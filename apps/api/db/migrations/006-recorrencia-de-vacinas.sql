-- Recorrência de vacinas e aviso antecipado por dose (B69, ADR-027).
-- A regra de repetição vai na própria dose e é copiada para a próxima da série: sem tabela nova e
-- sem chave estrangeira. `series_id` e `occurrence` ligam as doses de uma mesma série; encerrar a
-- série grava os campos `recur_*` como nulos na dose aberta. Nenhuma dose existente muda.
-- `remind_days_before` (0 a 60) vale para qualquer dose; nulo usa o padrão do app (7 dias).

ALTER TABLE dose ADD
  remind_days_before SMALLINT    NULL,
  series_id          VARCHAR(64) NULL,
  occurrence         SMALLINT    NULL,
  recur_unit         VARCHAR(5)  NULL,
  recur_every        SMALLINT    NULL,
  recur_anchor       VARCHAR(11) NULL,
  recur_anchor_date  DATE        NULL,
  recur_end_date     DATE        NULL,
  recur_max_doses    SMALLINT    NULL;

-- As restrições vão em SQL dinâmico porque as colunas novas ainda não existem na compilação deste lote.
EXEC (N'ALTER TABLE dose ADD CONSTRAINT ck_dose_remind
  CHECK (remind_days_before IS NULL OR remind_days_before BETWEEN 0 AND 60)');

EXEC (N'ALTER TABLE dose ADD CONSTRAINT ck_dose_series
  CHECK ((series_id IS NULL AND occurrence IS NULL) OR (series_id IS NOT NULL AND occurrence >= 1))');

-- A repetição vale por inteiro ou não vale: ou todos os campos recur_* vêm nulos (série encerrada ou
-- dose que nunca se repetiu), ou os campos obrigatórios estão preenchidos e a dose tem série.
EXEC (N'ALTER TABLE dose ADD CONSTRAINT ck_dose_recurrence CHECK (
  (recur_unit IS NULL AND recur_every IS NULL AND recur_anchor IS NULL AND recur_anchor_date IS NULL
    AND recur_end_date IS NULL AND recur_max_doses IS NULL)
  OR (recur_unit IN (''DAY'', ''WEEK'', ''MONTH'', ''YEAR'') AND recur_every >= 1
    AND recur_anchor IN (''APPLICATION'', ''SCHEDULE'') AND recur_anchor_date IS NOT NULL
    AND series_id IS NOT NULL AND rule_id IS NULL)
)');

-- Uma dose por número na série: aplicar duas vezes ao mesmo tempo não cria a próxima em duplicidade.
EXEC (N'CREATE UNIQUE INDEX ux_dose_series_occurrence ON dose (series_id, occurrence)
  WHERE series_id IS NOT NULL');
