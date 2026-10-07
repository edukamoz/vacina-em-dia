-- Esquema inicial do Vacina em Dia (Azure SQL, T-SQL). SCRUM-15 e SCRUM-13.
-- Contas de login (ADR-014), consentimento, membros e doses. Instantes em UTC (DATETIME2); datas
-- civis em DATE. Identificadores são texto (UUID gerado pela API). Sem CPF e sem cartão do SUS.
-- A exclusão da conta apaga tudo em cascata (RF09).

CREATE TABLE app_account (
  id            VARCHAR(64)   NOT NULL CONSTRAINT pk_app_account PRIMARY KEY,
  email         NVARCHAR(254) NOT NULL CONSTRAINT uq_app_account_email UNIQUE,
  password_hash VARCHAR(200)  NOT NULL,
  created_at    DATETIME2(3)  NOT NULL
);

CREATE TABLE refresh_token (
  token_hash CHAR(64)     NOT NULL CONSTRAINT pk_refresh_token PRIMARY KEY,
  account_id VARCHAR(64)  NOT NULL
    CONSTRAINT fk_refresh_token_account REFERENCES app_account (id) ON DELETE CASCADE,
  expires_at DATETIME2(3) NOT NULL,
  revoked_at DATETIME2(3) NULL
);
CREATE INDEX ix_refresh_token_account ON refresh_token (account_id);

CREATE TABLE consent (
  account_id           VARCHAR(64)  NOT NULL CONSTRAINT pk_consent PRIMARY KEY
    CONSTRAINT fk_consent_account REFERENCES app_account (id) ON DELETE CASCADE,
  term_version         VARCHAR(20)  NOT NULL,
  accepted_at          DATETIME2(3) NOT NULL,
  guardian_declaration BIT          NOT NULL
);

CREATE TABLE member (
  seq          BIGINT IDENTITY(1, 1) NOT NULL,
  id           VARCHAR(64)  NOT NULL CONSTRAINT pk_member PRIMARY KEY,
  account_id   VARCHAR(64)  NOT NULL
    CONSTRAINT fk_member_account REFERENCES app_account (id) ON DELETE CASCADE,
  display_name NVARCHAR(80) NOT NULL,
  birth_date   DATE         NOT NULL,
  is_pregnant  BIT          NOT NULL
);
CREATE INDEX ix_member_account ON member (account_id, seq);

CREATE TABLE dose (
  seq            BIGINT IDENTITY(1, 1) NOT NULL,
  id             VARCHAR(64) NOT NULL CONSTRAINT pk_dose PRIMARY KEY,
  member_id      VARCHAR(64) NOT NULL
    CONSTRAINT fk_dose_member REFERENCES member (id) ON DELETE CASCADE,
  rule_id        VARCHAR(80) NOT NULL,
  status         VARCHAR(10) NOT NULL
    CONSTRAINT ck_dose_status CHECK (status IN ('PENDING', 'SCHEDULED', 'OVERDUE', 'APPLIED', 'CANCELLED')),
  due_date       DATE        NOT NULL,
  scheduled_date DATE        NULL,
  applied_date   DATE        NULL
);
CREATE INDEX ix_dose_member ON dose (member_id, seq);
