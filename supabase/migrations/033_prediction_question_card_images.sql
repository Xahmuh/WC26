-- ============================================================================
-- 033 — Optional card images for tournament prediction questions
--       Admins can upload per-card artwork; cards fall back to existing design.
-- ============================================================================
begin;

alter table public.prediction_questions
  add column if not exists card_image_path text;

-- Storage bucket for prediction-card artwork (public read, admin-only writes).
insert into storage.buckets (id, name, public)
values ('prediction-card-images', 'prediction-card-images', true)
on conflict (id) do nothing;

drop policy if exists "Prediction card images are publicly readable" on storage.objects;
drop policy if exists "Admins upload prediction card images" on storage.objects;
drop policy if exists "Admins update prediction card images" on storage.objects;
drop policy if exists "Admins delete prediction card images" on storage.objects;

create policy "Prediction card images are publicly readable"
  on storage.objects for select
  to public
  using (bucket_id = 'prediction-card-images');

create policy "Admins upload prediction card images"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'prediction-card-images' and public.is_admin());

create policy "Admins update prediction card images"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'prediction-card-images' and public.is_admin())
  with check (bucket_id = 'prediction-card-images' and public.is_admin());

create policy "Admins delete prediction card images"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'prediction-card-images' and public.is_admin());

commit;
