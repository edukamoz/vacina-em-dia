-- Redefinição de senha por e-mail (SCRUM-13, ADR-014). Guarda só o hash do token (SHA-256), com
-- validade e uso único. Apagado em cascata com a conta (RF09).

CREATE TABLE password_reset_token (
  token_hash CHAR(64)     NOT NULL CONSTRAINT pk_password_reset_token PRIMARY KEY,
  account_id VARCHAR(64)  NOT NULL
    CONSTRAINT fk_password_reset_account REFERENCES app_account (id) ON DELETE CASCADE,
  expires_at DATETIME2(3) NOT NULL,
  used_at    DATETIME2(3) NULL
);
CREATE INDEX ix_password_reset_account ON password_reset_token (account_id);
