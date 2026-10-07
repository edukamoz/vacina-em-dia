-- Lembretes de dose por e-mail (SCRUM-19, ADR-017).
-- `reminders_enabled`: a pessoa pode desligar os e-mails na aba Conta (ligado por padrão).
-- `reminder_log`: no máximo um e-mail por conta por dia; a chave primária impede envio duplicado
-- se a rotina diária rodar duas vezes. A exclusão da conta apaga o registro em cascata (RF09).

ALTER TABLE app_account ADD reminders_enabled BIT NOT NULL
  CONSTRAINT df_app_account_reminders_enabled DEFAULT 1;

CREATE TABLE reminder_log (
  account_id VARCHAR(64) NOT NULL
    CONSTRAINT fk_reminder_log_account REFERENCES app_account (id) ON DELETE CASCADE,
  sent_on    DATE        NOT NULL,
  CONSTRAINT pk_reminder_log PRIMARY KEY (account_id, sent_on)
);
