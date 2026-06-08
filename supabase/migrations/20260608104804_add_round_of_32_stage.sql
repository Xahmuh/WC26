-- Add the 2026 World Cup Round of 32 stage between group play and Round of 16.
alter type public.match_stage add value if not exists 'ROUND_OF_32' before 'ROUND_OF_16';
