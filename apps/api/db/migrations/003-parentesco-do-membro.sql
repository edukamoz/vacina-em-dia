-- Parentesco do membro com o dono da conta (SCRUM-15). Opcional: NULL quando não informado.
-- Dado de baixo risco, sem identificar a pessoa; a lista de códigos fica no esquema compartilhado.

ALTER TABLE member ADD relationship VARCHAR(20) NULL
  CONSTRAINT ck_member_relationship CHECK (relationship IN (
    'SELF', 'MOTHER', 'FATHER', 'SON', 'DAUGHTER', 'GRANDMOTHER', 'GRANDFATHER',
    'SISTER', 'BROTHER', 'SPOUSE', 'OTHER'
  ));
