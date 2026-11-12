-- Vários avisos por dose: a pessoa pode pedir, por exemplo, 7 dias antes, 3 dias antes e no dia.
-- `remind_days` guarda as antecedências separadas por vírgula (ex.: '7,3,0'; de 0 a 60, até 8).
-- `remind_days_before` continua existindo e guarda a maior antecedência (contrato antigo). Dose
-- sem `remind_days` segue valendo pelo `remind_days_before`. Nada é apagado nem reescrito.

ALTER TABLE dose ADD remind_days VARCHAR(40) NULL;
