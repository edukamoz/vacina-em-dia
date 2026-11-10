-- Animais de estimação (B73, ADR-031): o membro passa a ter um tipo. PERSON é a pessoa de sempre
-- (calendário nacional); PET é um animal, sem calendário oficial: as vacinas são digitadas como
-- dose avulsa. Os membros já cadastrados ficam como PERSON. Nada é apagado nem reescrito.

ALTER TABLE member ADD kind VARCHAR(10) NOT NULL
  CONSTRAINT df_member_kind DEFAULT 'PERSON'
  CONSTRAINT ck_member_kind CHECK (kind IN ('PERSON', 'PET'));

ALTER TABLE member ADD species VARCHAR(10) NULL
  CONSTRAINT ck_member_species CHECK (species IN ('DOG', 'CAT', 'OTHER'));

-- Só animal tem espécie, e todo animal tem espécie.
ALTER TABLE member ADD CONSTRAINT ck_member_pet_species CHECK (
  (kind = 'PET' AND species IS NOT NULL) OR (kind = 'PERSON' AND species IS NULL)
);
