-- Permet à un destinataire de décaler son prochain rappel.
-- `reporter_a` : si renseigné et dans le futur, le cron n'envoie pas
-- cet envoi avant cette date. NULL = envoi dès que le message est dû.
alter table public.envois_participants
  add column if not exists reporter_a timestamptz;
