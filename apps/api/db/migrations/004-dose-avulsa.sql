-- Dose avulsa (SCRUM-18, ADR-016): vacina que a pessoa cadastra à mão, fora do calendário oficial.
-- A dose oficial guarda só o rule_id; a avulsa não tem rule_id e guarda o nome e a dose digitados.
-- Nenhuma dose existente muda.

ALTER TABLE dose ALTER COLUMN rule_id VARCHAR(80) NULL;
ALTER TABLE dose ADD custom_vaccine NVARCHAR(80) NULL, custom_dose_label NVARCHAR(40) NULL;

-- A restrição vai em SQL dinâmico porque as colunas novas ainda não existem na compilação deste lote.
EXEC (N'ALTER TABLE dose ADD CONSTRAINT ck_dose_origin CHECK (
  (rule_id IS NOT NULL AND custom_vaccine IS NULL AND custom_dose_label IS NULL)
  OR (rule_id IS NULL AND custom_vaccine IS NOT NULL AND custom_dose_label IS NOT NULL)
)');
