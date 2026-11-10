-- Família com vários responsáveis (B15, ADR-029).
-- Toda conta passa a pertencer a exatamente uma família; as pessoas (e, por elas, as doses) pertencem
-- à família, não mais à conta que as criou. Cada conta existente ganha uma família própria e é a dona
-- dela, então ninguém perde acesso a nada. `member.account_id` vira só "criada por" (pode ficar nulo
-- quando essa conta for excluída). Convites guardam só o hash do código.

CREATE TABLE family (
  id         VARCHAR(64)  NOT NULL CONSTRAINT pk_family PRIMARY KEY,
  created_at DATETIME2(3) NOT NULL CONSTRAINT df_family_created DEFAULT SYSUTCDATETIME()
);

CREATE TABLE family_membership (
  id         VARCHAR(64)  NOT NULL CONSTRAINT pk_family_membership PRIMARY KEY,
  family_id  VARCHAR(64)  NOT NULL
    CONSTRAINT fk_membership_family REFERENCES family (id) ON DELETE CASCADE,
  -- A unicidade garante uma família por conta.
  account_id VARCHAR(64)  NOT NULL
    CONSTRAINT uq_membership_account UNIQUE
    CONSTRAINT fk_membership_account REFERENCES app_account (id) ON DELETE CASCADE,
  role       VARCHAR(10)  NOT NULL
    CONSTRAINT ck_membership_role CHECK (role IN ('OWNER', 'GUARDIAN')),
  joined_at  DATETIME2(3) NOT NULL CONSTRAINT df_membership_joined DEFAULT SYSUTCDATETIME()
);
CREATE INDEX ix_membership_family ON family_membership (family_id, joined_at);

CREATE TABLE family_invite (
  token_hash            VARCHAR(64)  NOT NULL CONSTRAINT pk_family_invite PRIMARY KEY,
  family_id             VARCHAR(64)  NOT NULL
    CONSTRAINT fk_invite_family REFERENCES family (id) ON DELETE CASCADE,
  created_by_account_id VARCHAR(64)  NOT NULL,
  expires_at            DATETIME2(3) NOT NULL,
  used_at               DATETIME2(3) NULL,
  used_by_account_id    VARCHAR(64)  NULL
);
CREATE INDEX ix_invite_family ON family_invite (family_id);

-- Uma família por conta existente; o id da família é o da conta (só nesta carga inicial).
INSERT INTO family (id) SELECT id FROM app_account;
INSERT INTO family_membership (id, family_id, account_id, role)
  SELECT LOWER(CONVERT(VARCHAR(36), NEWID())), id, id, 'OWNER' FROM app_account;

ALTER TABLE member ADD family_id VARCHAR(64) NULL;

-- As etapas abaixo usam a coluna nova, que ainda não existe na compilação deste lote: SQL dinâmico.
EXEC (N'UPDATE member SET family_id = account_id');
EXEC (N'ALTER TABLE member ALTER COLUMN family_id VARCHAR(64) NOT NULL');
EXEC (N'ALTER TABLE member ADD CONSTRAINT fk_member_family
  FOREIGN KEY (family_id) REFERENCES family (id) ON DELETE CASCADE');
EXEC (N'CREATE INDEX ix_member_family ON member (family_id, seq)');

-- A pessoa deixa de depender da conta que a criou: excluir essa conta não pode apagar a pessoa.
ALTER TABLE member DROP CONSTRAINT fk_member_account;
DROP INDEX ix_member_account ON member;
ALTER TABLE member ALTER COLUMN account_id VARCHAR(64) NULL;
