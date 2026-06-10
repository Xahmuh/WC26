--
-- PostgreSQL database dump
--

\restrict 2LYme1Fys9pc1lxL0Dapsl3gRNr4eakbyeLOj9zxk0YJOWOOsIFQBr7U3xPmmyL

-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA public;


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- Name: match_decision_method; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.match_decision_method AS ENUM (
    'FT',
    'ET',
    'PEN'
);


--
-- Name: match_stage; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.match_stage AS ENUM (
    'GROUP',
    'ROUND_OF_32',
    'ROUND_OF_16',
    'QUARTER_FINAL',
    'SEMI_FINAL',
    'THIRD_PLACE',
    'FINAL'
);


--
-- Name: match_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.match_status AS ENUM (
    'SCHEDULED',
    'IN_PLAY',
    'FINISHED',
    'POSTPONED',
    'CANCELLED'
);


--
-- Name: admin_broadcast(text, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.admin_broadcast(p_type text, p_title text, p_body text) RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare n int;
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  if p_type not in ('announcement','tournament') then
    raise exception 'admin_broadcast supports announcement|tournament only';
  end if;
  insert into public.notifications (user_id, type, title, body)
  select id, p_type, p_title, p_body from public.users;
  get diagnostics n = row_count;
  return n;
end $$;


--
-- Name: admin_delete_match(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.admin_delete_match(p_match_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  if not public.is_admin() then
    raise exception 'Only admins can delete matches';
  end if;

  delete from public.matches
  where id = p_match_id;

  if not found then
    raise exception 'Match not found';
  end if;
end;
$$;


--
-- Name: admin_delete_user(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.admin_delete_user(p_user_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  if not public.is_admin() then
    raise exception 'Only administrators can delete users';
  end if;
  if p_user_id = auth.uid() then
    raise exception 'Admins cannot delete themselves';
  end if;
  delete from auth.users where id = p_user_id;
end;
$$;


--
-- Name: admin_get_question_submissions(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.admin_get_question_submissions(p_question_id uuid) RETURNS TABLE(id uuid, prediction text, status text, created_at timestamp with time zone, user_id uuid, display_name text, email text, avatar_url text)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  return query
    select uqp.id, uqp.prediction, uqp.status, uqp.created_at,
           u.id, u.display_name, u.email, u.avatar_url
    from public.user_question_predictions uqp
    join public.users u on u.id = uqp.user_id
    where uqp.question_id = p_question_id
    order by uqp.created_at desc;
end;
$$;


--
-- Name: admin_recalculate_stage_cards(public.match_stage); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.admin_recalculate_stage_cards(p_stage public.match_stage) RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  row_user record;
  total integer := 0;
begin
  if not public.is_admin() then
    raise exception 'Only admins can recalculate stage cards';
  end if;

  for row_user in
    select distinct p.user_id
    from public.points p
    join public.matches m on m.id = p.match_id
    where m.stage = p_stage
  loop
    total := total + public.award_user_stage_cards(row_user.user_id, p_stage);
  end loop;

  return total;
end;
$$;


--
-- Name: admin_restore_user(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.admin_restore_user(p_user_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  if not public.is_admin() then
    raise exception 'Only administrators can restore users';
  end if;
  update public.users
  set is_deleted = false, deleted_at = null
  where id = p_user_id;
end;
$$;


--
-- Name: admin_set_active_api_provider(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.admin_set_active_api_provider(p_id text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  if not public.is_admin() then
    raise exception 'Only admins can manage API providers';
  end if;

  if not exists (select 1 from public.api_providers where id = p_id) then
    raise exception 'API provider not found';
  end if;

  update public.api_providers set is_active = false, updated_at = now();
  update public.api_providers
  set is_active = true, updated_by = auth.uid(), updated_at = now()
  where id = p_id;
end;
$$;


--
-- Name: admin_set_stage_expected_matches(public.match_stage, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.admin_set_stage_expected_matches(p_stage public.match_stage, p_expected_matches integer) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  if not public.is_admin() then
    raise exception 'Only admins can update stage card settings';
  end if;

  if p_expected_matches < 0 then
    raise exception 'Expected matches cannot be negative';
  end if;

  insert into public.stage_card_settings (stage, expected_matches, updated_by, updated_at)
  values (p_stage, p_expected_matches, auth.uid(), now())
  on conflict (stage) do update set
    expected_matches = excluded.expected_matches,
    updated_by = excluded.updated_by,
    updated_at = excluded.updated_at;
end;
$$;


--
-- Name: admin_set_stage_multiplier(public.match_stage, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.admin_set_stage_multiplier(p_stage public.match_stage, p_multiplier integer) RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  affected integer := 0;
begin
  if not public.is_admin() then
    raise exception 'Only admins can change stage multipliers';
  end if;

  if p_multiplier < 1 or p_multiplier > 6 then
    raise exception 'Multiplier must be between 1 and 6';
  end if;

  insert into public.stage_multipliers (stage, multiplier, updated_at, updated_by)
  values (p_stage, p_multiplier, now(), auth.uid())
  on conflict (stage) do update
    set multiplier = excluded.multiplier,
        updated_at = now(),
        updated_by = auth.uid();

  update public.matches
  set points_multiplier = p_multiplier
  where stage = p_stage
    and points_multiplier is distinct from p_multiplier
    and (
      status <> 'FINISHED'
      or (stage = 'GROUP' and not is_knockout)
      or (winner_team_id is not null and decision_method is not null)
    );

  get diagnostics affected = row_count;
  return affected;
end;
$$;


--
-- Name: admin_set_user_role(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.admin_set_user_role(p_user_id uuid, p_role text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  if not public.is_admin() then
    raise exception 'Only administrators can change roles';
  end if;
  if p_role not in ('user', 'admin') then
    raise exception 'Invalid role: %', p_role;
  end if;
  update public.users set role = p_role where id = p_user_id;
end;
$$;


--
-- Name: admin_soft_delete_user(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.admin_soft_delete_user(p_user_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  if not public.is_admin() then
    raise exception 'Only administrators can delete users';
  end if;
  update public.users
  set is_deleted = true, deleted_at = now()
  where id = p_user_id;
end;
$$;


--
-- Name: admin_upsert_api_provider(text, text, text, text, text, text, boolean, integer, boolean, boolean, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.admin_upsert_api_provider(p_id text, p_name text, p_adapter text, p_base_url text, p_competition_code text, p_token_secret_name text, p_is_active boolean, p_rate_limit_per_minute integer, p_supports_fixtures boolean, p_supports_results boolean, p_notes text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  if not public.is_admin() then
    raise exception 'Only admins can manage API providers';
  end if;

  if p_is_active then
    update public.api_providers set is_active = false, updated_at = now();
  end if;

  insert into public.api_providers (
    id,
    name,
    adapter,
    base_url,
    competition_code,
    token_secret_name,
    is_active,
    rate_limit_per_minute,
    supports_fixtures,
    supports_results,
    notes,
    updated_by,
    updated_at
  )
  values (
    lower(trim(p_id)),
    trim(p_name),
    trim(p_adapter),
    trim(p_base_url),
    trim(p_competition_code),
    trim(p_token_secret_name),
    p_is_active,
    p_rate_limit_per_minute,
    p_supports_fixtures,
    p_supports_results,
    nullif(trim(coalesce(p_notes, '')), ''),
    auth.uid(),
    now()
  )
  on conflict (id) do update set
    name = excluded.name,
    adapter = excluded.adapter,
    base_url = excluded.base_url,
    competition_code = excluded.competition_code,
    token_secret_name = excluded.token_secret_name,
    is_active = excluded.is_active,
    rate_limit_per_minute = excluded.rate_limit_per_minute,
    supports_fixtures = excluded.supports_fixtures,
    supports_results = excluded.supports_results,
    notes = excluded.notes,
    updated_by = excluded.updated_by,
    updated_at = excluded.updated_at;
end;
$$;


--
-- Name: apply_stage_multiplier_default(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.apply_stage_multiplier_default() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
declare
  v_multiplier int;
begin
  select multiplier into v_multiplier
  from public.stage_multipliers
  where stage = new.stage;

  if v_multiplier is not null then
    new.points_multiplier := v_multiplier;
  end if;

  return new;
end;
$$;


--
-- Name: award_user_stage_cards(uuid, public.match_stage); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.award_user_stage_cards(p_user_id uuid, p_stage public.match_stage) RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  possible numeric;
  earned numeric;
  inserted_count integer := 0;
begin
  possible := public.stage_possible_points(p_stage);
  if possible <= 0 then
    return 0;
  end if;

  earned := public.user_stage_points(p_user_id, p_stage);

  insert into public.user_cards (
    user_id,
    card_definition_id,
    earned_stage,
    usable_from_stage,
    usable_until_stage,
    multiplier_bonus,
    max_uses,
    uses_remaining
  )
  select
    p_user_id,
    cd.id,
    cd.award_stage,
    cd.usable_from_stage,
    cd.usable_until_stage,
    cd.multiplier_bonus,
    cd.max_uses,
    cd.max_uses
  from public.card_definitions cd
  where cd.is_active
    and cd.award_stage = p_stage
    and ((earned / possible) * 100) >= cd.threshold_percent
    and not exists (
      select 1
      from public.user_cards uc
      where uc.user_id = p_user_id
        and uc.card_definition_id = cd.id
    );

  get diagnostics inserted_count = row_count;
  return inserted_count;
end;
$$;


--
-- Name: card_stage_is_between(public.match_stage, public.match_stage, public.match_stage); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.card_stage_is_between(p_stage public.match_stage, p_from public.match_stage, p_until public.match_stage) RETURNS boolean
    LANGUAGE sql IMMUTABLE
    SET search_path TO 'public'
    AS $$
  select public.card_stage_rank(p_stage) between public.card_stage_rank(p_from)
    and public.card_stage_rank(p_until);
$$;


--
-- Name: card_stage_rank(public.match_stage); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.card_stage_rank(p_stage public.match_stage) RETURNS integer
    LANGUAGE sql IMMUTABLE
    SET search_path TO 'public'
    AS $$
  select case p_stage
    when 'GROUP' then 1
    when 'ROUND_OF_32' then 2
    when 'ROUND_OF_16' then 3
    when 'QUARTER_FINAL' then 4
    when 'SEMI_FINAL' then 5
    when 'THIRD_PLACE' then 6
    when 'FINAL' then 7
    else 999
  end;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: leagues; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.leagues (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    avatar_url text,
    owner_id uuid NOT NULL,
    invite_code text NOT NULL,
    max_members integer,
    is_deleted boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT leagues_description_check CHECK (((description IS NULL) OR (char_length(description) <= 280))),
    CONSTRAINT leagues_max_members_check CHECK (((max_members IS NULL) OR ((max_members >= 2) AND (max_members <= 500)))),
    CONSTRAINT leagues_name_check CHECK (((char_length(btrim(name)) >= 3) AND (char_length(btrim(name)) <= 40)))
);


--
-- Name: create_league(text, text, text, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_league(p_name text, p_description text DEFAULT NULL::text, p_avatar_url text DEFAULT NULL::text, p_max_members integer DEFAULT NULL::integer) RETURNS public.leagues
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  v_league public.leagues;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  insert into public.leagues (name, description, avatar_url, owner_id, invite_code, max_members)
  values (btrim(p_name), nullif(btrim(coalesce(p_description, '')), ''), p_avatar_url, auth.uid(),
          public.generate_league_invite_code(), p_max_members)
  returning * into v_league;

  insert into public.league_members (league_id, user_id, role)
  values (v_league.id, auth.uid(), 'owner');

  return v_league;
end $$;


--
-- Name: delete_league(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.delete_league(p_league_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  if not exists (
    select 1 from public.leagues l
    where l.id = p_league_id
      and (l.owner_id = auth.uid() or exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin'))
  ) then
    raise exception 'Only the league owner or an admin can delete this league';
  end if;

  delete from public.leagues where id = p_league_id;
end $$;


--
-- Name: finalize_leaderboard(date); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.finalize_leaderboard(p_day date DEFAULT NULL::date) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare had_snapshot boolean;
begin
  select exists(select 1 from public.user_rank_snapshot) into had_snapshot;

  begin
    refresh materialized view concurrently public.leaderboard;
  exception when others then
    refresh materialized view public.leaderboard;
  end;

  if had_snapshot then
    insert into public.notifications (user_id, type, title, body, data)
    select lb.user_id, 'rank_change',
           case when lb.rank < s.rank then 'You climbed the leaderboard'
                when lb.rank > s.rank then 'Your leaderboard position dropped'
                else 'Your leaderboard position changed' end,
           'You are now #' || lb.rank || ' (was #' || s.rank || ').',
           jsonb_build_object('old_rank', s.rank, 'new_rank', lb.rank,
                              'total_points', lb.total_points)
    from public.leaderboard lb
    join public.user_rank_snapshot s on s.user_id = lb.user_id
    where lb.total_points > 0 and lb.rank is distinct from s.rank;
  end if;

  insert into public.user_rank_snapshot (user_id, rank, total_points, updated_at)
  select user_id, rank, total_points, now() from public.leaderboard
  on conflict (user_id) do update
    set rank = excluded.rank, total_points = excluded.total_points, updated_at = now();

  update public.leaderboard_state
     set refreshed_at = now(),
         refreshed_for_day = coalesce(p_day, refreshed_for_day),
         version = version + 1
   where id = true;
end $$;


--
-- Name: generate_league_invite_code(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_league_invite_code() RETURNS text
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
declare
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- no 0/O/1/I — avoids confusion
  code text;
  i int;
begin
  loop
    code := 'WC26';
    for i in 1..4 loop
      code := code || substr(chars, 1 + floor(random() * length(chars))::int, 1);
    end loop;
    exit when not exists (select 1 from public.leagues where invite_code = code);
  end loop;
  return code;
end $$;


--
-- Name: get_player_profile_cards(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_player_profile_cards(p_user_id uuid) RETURNS TABLE(user_card_id uuid, card_definition_id uuid, name text, image_path text, earned_stage public.match_stage, multiplier_bonus integer, status text, unlocked_at timestamp with time zone)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select
    uc.id as user_card_id,
    cd.id as card_definition_id,
    cd.name,
    cd.image_path,
    uc.earned_stage,
    uc.multiplier_bonus,
    uc.status::text,
    uc.unlocked_at
  from public.user_cards uc
  join public.card_definitions cd on cd.id = uc.card_definition_id
  where uc.user_id = p_user_id
    and uc.status <> 'revoked'
  order by uc.unlocked_at desc, cd.created_at desc;
$$;


--
-- Name: get_user_streak(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_user_streak(p_user_id uuid) RETURNS json
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  streak_count int := 0;
  streak_type  text := 'none';
  last_result  boolean;
  r            record;
begin
  if p_user_id is distinct from auth.uid() then
    raise exception 'Forbidden';
  end if;

  for r in
    select (pt.winner_points > 0) as is_correct
    from public.points pt
    join public.matches m on m.id = pt.match_id
    where pt.user_id = p_user_id
      and pt.match_id is not null
      and m.status = 'FINISHED'
    order by m.kickoff_time desc
  loop
    if streak_count = 0 then
      last_result := r.is_correct;
      streak_type := case when r.is_correct then 'win' else 'loss' end;
    end if;

    if r.is_correct = last_result then
      streak_count := streak_count + 1;
    else
      exit;
    end if;
  end loop;

  return json_build_object(
    'current_streak', streak_count,
    'streak_type', streak_type
  );
end;
$$;


--
-- Name: guard_notification_update(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.guard_notification_update() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  if (select auth.uid()) is not null then
    new.user_id    := old.user_id;
    new.type       := old.type;
    new.title      := old.title;
    new.body       := old.body;
    new.data       := old.data;
    new.created_at := old.created_at;
  end if;
  return new;
end $$;


--
-- Name: guard_uqp_status(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.guard_uqp_status() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  if not public.is_admin() then
    if tg_op = 'INSERT' then new.status := 'pending';
    elsif tg_op = 'UPDATE' then new.status := old.status;
    end if;
  end if;
  return new;
end;
$$;


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  INSERT INTO public.users (id, display_name, email, avatar_url, role, last_login)
  VALUES (
    new.id,
    COALESCE(
      new.raw_user_meta_data->>'display_name',
      new.raw_user_meta_data->>'full_name',
      split_part(new.email, '@', 1)
    ),
    new.email,
    COALESCE(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture'),
    CASE
      WHEN LOWER(new.email) = 'ahmedelsherbiinii@gmail.com' THEN 'admin'
      ELSE COALESCE(new.raw_user_meta_data->>'role', 'user')
    END,
    new.last_sign_in_at
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = excluded.email,
    role = CASE
      WHEN LOWER(excluded.email) = 'ahmedelsherbiinii@gmail.com' THEN 'admin'
      ELSE COALESCE(excluded.role, users.role)
    END,
    avatar_url = COALESCE(excluded.avatar_url, users.avatar_url),
    last_login = COALESCE(excluded.last_login, users.last_login);
  RETURN new;
END;
$$;


--
-- Name: handle_prediction_audit(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_prediction_audit() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare q_points int; q_text text;
begin
  if (tg_op = 'INSERT' and new.status = 'approved') or
     (tg_op = 'UPDATE' and old.status is distinct from new.status) then

    select points, question_text into q_points, q_text
      from public.prediction_questions where id = new.question_id;

    if new.status = 'approved' then
      insert into public.points (user_id, question_id, winner_points, total_points, calculated_at)
      values (new.user_id, new.question_id, q_points, q_points, now())
      on conflict (user_id, question_id) do update
        set winner_points = excluded.winner_points,
            total_points  = excluded.total_points,
            calculated_at = now();

      insert into public.notifications (user_id, type, title, body, data)
      select new.user_id, 'points',
             'Prediction approved',
             'Your answer "' || new.prediction || '" was approved — you earned ' || q_points || ' pts'
               || case when q_text is not null then ' for "' || q_text || '"' else '' end || '.',
             jsonb_build_object('question_id', new.question_id, 'points', q_points)
      where not exists (
        select 1 from public.notifications n
        where n.user_id = new.user_id and n.type = 'points'
          and n.data->>'question_id' = new.question_id::text
      );
    elsif new.status = 'rejected' or new.status = 'pending' then
      delete from public.points
       where user_id = new.user_id and question_id = new.question_id;
      delete from public.notifications
       where user_id = new.user_id and type = 'points'
         and data->>'question_id' = new.question_id::text;
    end if;

    perform public.refresh_leaderboard();
  end if;
  return new;
end $$;


--
-- Name: handle_user_update(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_user_update() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  UPDATE public.users
  SET
    email = new.email,
    role = CASE
      WHEN LOWER(new.email) = 'ahmedelsherbiinii@gmail.com' THEN 'admin'
      ELSE role
    END,
    avatar_url = COALESCE(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture', avatar_url),
    display_name = COALESCE(new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'full_name', display_name),
    last_login = COALESCE(new.last_sign_in_at, last_login)
  WHERE id = new.id;
  RETURN new;
END;
$$;


--
-- Name: is_active_user(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_active_user(p_user_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select exists (
    select 1
    from public.users
    where id = p_user_id
      and is_deleted = false
  );
$$;


--
-- Name: is_admin(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_admin() RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select exists (select 1 from public.users where id = auth.uid() and role = 'admin');
$$;


--
-- Name: join_league_by_code(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.join_league_by_code(p_invite_code text) RETURNS public.leagues
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  v_league public.leagues;
  v_count int;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  -- Lock the league row so capacity checks can't race two simultaneous joiners
  -- past max_members.
  select * into v_league from public.leagues
   where invite_code = upper(btrim(p_invite_code)) and not is_deleted
   for update;

  if not found then
    raise exception 'Invalid invite code';
  end if;

  if exists (select 1 from public.league_members where league_id = v_league.id and user_id = auth.uid()) then
    return v_league; -- already a member — idempotent join
  end if;

  if v_league.max_members is not null then
    select count(*) into v_count from public.league_members where league_id = v_league.id;
    if v_count >= v_league.max_members then
      raise exception 'This league is full';
    end if;
  end if;

  insert into public.league_members (league_id, user_id, role) values (v_league.id, auth.uid(), 'member');
  return v_league;
end $$;


--
-- Name: leave_league(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.leave_league(p_league_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if exists (select 1 from public.leagues where id = p_league_id and owner_id = auth.uid()) then
    raise exception 'Owners cannot leave — delete the league or transfer ownership first';
  end if;

  delete from public.league_members where league_id = p_league_id and user_id = auth.uid();
end $$;


--
-- Name: lock_predictions_at_kickoff(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.lock_predictions_at_kickoff() RETURNS void
    LANGUAGE sql
    SET search_path TO 'public'
    AS $$
  update public.predictions p
  set is_locked = true
  from public.matches m
  where p.match_id = m.id
    and m.kickoff_time <= now()
    and p.is_locked = false;
$$;


--
-- Name: match_day(timestamp with time zone); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.match_day(p_kickoff timestamp with time zone) RETURNS date
    LANGUAGE sql IMMUTABLE
    SET search_path TO 'public'
    AS $$ select (p_kickoff at time zone public.tournament_tz())::date $$;


--
-- Name: maybe_finalize_day(date); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.maybe_finalize_day(p_day date) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare pending int; new_points int; last_refresh timestamptz;
begin
  if p_day is null then return; end if;
  perform pg_advisory_xact_lock(hashtext('leaderboard_finalize'));

  select count(*) into pending
  from public.matches
  where public.match_day(kickoff_time) = p_day
    and status in ('SCHEDULED','IN_PLAY');
  if pending > 0 then return; end if;

  select refreshed_at into last_refresh from public.leaderboard_state where id = true;
  select count(*) into new_points
  from public.points pt
  join public.matches m on m.id = pt.match_id
  where public.match_day(m.kickoff_time) = p_day
    and pt.calculated_at > coalesce(last_refresh, 'epoch'::timestamptz);
  if new_points = 0 then return; end if;

  perform public.finalize_leaderboard(p_day);
end $$;


--
-- Name: protect_users_privileged_columns(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.protect_users_privileged_columns() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  if (select auth.uid()) is not null and not public.is_admin() then
    new.role         := old.role;
    new.total_points := old.total_points;
    new.email        := old.email;
    new.last_login   := old.last_login;
    new.id           := old.id;
    new.created_at   := old.created_at;
  end if;
  return new;
end;
$$;


--
-- Name: refresh_leaderboard(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.refresh_leaderboard() RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  refresh materialized view concurrently public.leaderboard;
exception when others then
  refresh materialized view public.leaderboard;
end;
$$;


--
-- Name: regenerate_league_invite_code(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.regenerate_league_invite_code(p_league_id uuid) RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare v_code text;
begin
  if not exists (select 1 from public.leagues where id = p_league_id and owner_id = auth.uid()) then
    raise exception 'Only the league owner can regenerate the invite code';
  end if;

  v_code := public.generate_league_invite_code();
  update public.leagues set invite_code = v_code, updated_at = now() where id = p_league_id;
  return v_code;
end $$;


--
-- Name: remove_league_member(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.remove_league_member(p_league_id uuid, p_user_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  if not exists (select 1 from public.leagues where id = p_league_id and owner_id = auth.uid()) then
    raise exception 'Only the league owner can remove members';
  end if;
  if p_user_id = auth.uid() then
    raise exception 'Use leave_league or delete_league instead';
  end if;

  delete from public.league_members where league_id = p_league_id and user_id = p_user_id;
end $$;


--
-- Name: resolve_prediction_question(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.resolve_prediction_question(p_question_id uuid, p_correct_answer text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  q public.prediction_questions%rowtype;
begin
  if not public.is_admin() then
    raise exception 'Only administrators can resolve questions';
  end if;

  select * into q from public.prediction_questions where id = p_question_id;
  if not found then
    raise exception 'Question not found';
  end if;

  update public.prediction_questions
    set correct_answer = p_correct_answer,
        status = 'resolved',
        resolved_at = now()
    where id = p_question_id;

  -- Award `points` to everyone who picked the correct option (idempotent).
  insert into public.points (
    user_id, match_id, question_id,
    winner_points, home_goal_points, away_goal_points, exact_bonus,
    total_points, calculated_at
  )
  select uqp.user_id, null, p_question_id, 0, 0, 0, 0, q.points, now()
  from public.user_question_predictions uqp
  where uqp.question_id = p_question_id
    and uqp.prediction = p_correct_answer
  on conflict (user_id, question_id)
    do update set total_points = excluded.total_points, calculated_at = now();

  perform public.refresh_leaderboard();
end;
$$;


--
-- Name: restore_prediction_card_use(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.restore_prediction_card_use(p_user_card_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  update public.user_cards
  set uses_remaining = least(max_uses, uses_remaining + 1),
      status = case when status = 'used' then 'active' else status end
  where id = p_user_card_id
    and status in ('active', 'used');
end;
$$;


--
-- Name: score_match(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.score_match(p_match_id uuid) RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  m        record;
  r        record;
  affected int := 0;
begin
  select id, home_score, away_score, status, points_multiplier,
         is_knockout, winner_team_id
    into m from public.matches where id = p_match_id;

  if not found then return 0; end if;
  if m.status <> 'FINISHED' or m.home_score is null or m.away_score is null then
    return 0;
  end if;
  if m.is_knockout and m.winner_team_id is null then
    return 0;
  end if;

  select winner_points, exact_bonus_points
    into r from public.scoring_rules where id = 1;

  if not found then
    raise exception 'Missing scoring_rules singleton row id=1; configure scoring from the admin dashboard before scoring matches.';
  end if;

  with scored as (
    select
      p.user_id,
      (m.points_multiplier + coalesce(uc.multiplier_bonus, 0)) as effective_multiplier,
      case
        when m.is_knockout then
          case when p.pred_winner_team_id = m.winner_team_id then r.winner_points else 0 end
        else
          case when sign(m.home_score - m.away_score)
                 = sign(p.pred_home_score - p.pred_away_score) then r.winner_points else 0 end
      end as wp,
      (case when m.home_score = p.pred_home_score
             and m.away_score = p.pred_away_score then r.exact_bonus_points else 0 end) as eb
    from public.predictions p
    left join public.user_cards uc
      on uc.id = p.applied_user_card_id
     and uc.user_id = p.user_id
    where p.match_id = m.id
  )
  insert into public.points
    (user_id, match_id, winner_points, home_goal_points, away_goal_points,
     exact_bonus, total_points, calculated_at)
  select
    s.user_id, m.id,
    s.wp * s.effective_multiplier,
    0,
    0,
    s.eb * s.effective_multiplier,
    (s.wp + s.eb) * s.effective_multiplier,
    now()
  from scored s
  on conflict (user_id, match_id) do update set
    winner_points    = excluded.winner_points,
    home_goal_points = excluded.home_goal_points,
    away_goal_points = excluded.away_goal_points,
    exact_bonus      = excluded.exact_bonus,
    total_points     = excluded.total_points,
    calculated_at    = now();

  get diagnostics affected = row_count;

  update public.users u
  set total_points = (
    select coalesce(sum(pt.total_points), 0)
    from public.points pt
    where pt.user_id = u.id
  )
  where u.id in (
    select distinct user_id from public.points where match_id = m.id
  );

  insert into public.notifications (user_id, type, title, body, data)
  select pt.user_id, 'points', 'Points awarded',
         'You earned ' || pt.total_points || ' pts for a finished match.',
         jsonb_build_object('match_id', m.id, 'points', pt.total_points)
  from public.points pt
  where pt.match_id = m.id and pt.total_points > 0
    and not exists (
      select 1 from public.notifications n
      where n.user_id = pt.user_id and n.type = 'points'
        and n.data->>'match_id' = m.id::text
    );

  return affected;
end;
$$;


--
-- Name: set_hero_slides_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_hero_slides_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


--
-- Name: set_home_cards_tile_settings_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_home_cards_tile_settings_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


--
-- Name: set_match_knockout_flag(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_match_knockout_flag() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
begin
  new.is_knockout := (new.stage <> 'GROUP');
  return new;
end;
$$;


--
-- Name: set_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


--
-- Name: stage_possible_points(public.match_stage); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.stage_possible_points(p_stage public.match_stage) RETURNS numeric
    LANGUAGE plpgsql STABLE
    SET search_path TO 'public'
    AS $$
declare
  base_points numeric := 0;
  actual_matches integer := 0;
  actual_multiplier_sum numeric := 0;
  expected_matches integer := 0;
  missing_matches integer := 0;
  fallback_multiplier integer := 1;
begin
  select (winner_points + exact_bonus_points)
    into base_points
  from public.scoring_rules
  where id = 1;

  if base_points is null then
    base_points := 0;
  end if;

  select
    count(*)::integer,
    coalesce(sum(points_multiplier), 0)::numeric
    into actual_matches, actual_multiplier_sum
  from public.matches
  where stage = p_stage
    and status not in ('POSTPONED', 'CANCELLED');

  select coalesce(scs.expected_matches, actual_matches)
    into expected_matches
  from public.stage_card_settings scs
  where scs.stage = p_stage;

  if expected_matches is null then
    expected_matches := actual_matches;
  end if;

  select coalesce(sm.multiplier, 1)
    into fallback_multiplier
  from public.stage_multipliers sm
  where sm.stage = p_stage;

  if fallback_multiplier is null then
    fallback_multiplier := 1;
  end if;

  missing_matches := greatest(expected_matches - actual_matches, 0);

  return base_points * (actual_multiplier_sum + (missing_matches * fallback_multiplier));
end;
$$;


--
-- Name: sync_matches(jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sync_matches(p_matches jsonb) RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  n int;
begin
  insert into public.matches as m
    (external_id, home_team_id, away_team_id, status, stage, group_name,
     kickoff_time, venue, home_score, away_score, is_placeholder, is_knockout,
     winner_team_id, decision_method, last_synced_at)
  select
    (e->>'external_id')::int,
    nullif(e->>'home_team_id','')::uuid,
    nullif(e->>'away_team_id','')::uuid,
    (e->>'status')::public.match_status,
    (e->>'stage')::public.match_stage,
    nullif(e->>'group_name',''),
    (e->>'kickoff_time')::timestamptz,
    nullif(e->>'venue',''),
    case when (e->>'status') = 'FINISHED' then nullif(e->>'home_score','')::int end,
    case when (e->>'status') = 'FINISHED' then nullif(e->>'away_score','')::int end,
    (nullif(e->>'home_team_id','') is null or nullif(e->>'away_team_id','') is null),
    ((e->>'stage')::public.match_stage <> 'GROUP'),
    nullif(e->>'winner_team_id','')::uuid,
    nullif(e->>'decision_method','')::public.match_decision_method,
    now()
  from jsonb_array_elements(p_matches) e
  on conflict (external_id) do update
  set
    home_team_id = coalesce(excluded.home_team_id, m.home_team_id),
    away_team_id = coalesce(excluded.away_team_id, m.away_team_id),
    status       = case when m.status = 'FINISHED' then m.status else excluded.status end,
    home_score   = case when m.status = 'FINISHED' then m.home_score else excluded.home_score end,
    away_score   = case when m.status = 'FINISHED' then m.away_score else excluded.away_score end,
    winner_team_id = case when m.status = 'FINISHED' then m.winner_team_id else excluded.winner_team_id end,
    decision_method = case when m.status = 'FINISHED' then m.decision_method else excluded.decision_method end,
    stage        = excluded.stage,
    group_name   = excluded.group_name,
    kickoff_time = excluded.kickoff_time,
    venue        = coalesce(excluded.venue, m.venue),
    is_placeholder = (
      coalesce(excluded.home_team_id, m.home_team_id) is null
      or coalesce(excluded.away_team_id, m.away_team_id) is null
    ),
    is_knockout = (excluded.stage <> 'GROUP'),
    last_synced_at = now();

  get diagnostics n = row_count;
  return n;
end;
$$;


--
-- Name: sync_user_total_points(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sync_user_total_points() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  affected_user uuid := coalesce(new.user_id, old.user_id);
begin
  update public.users u
  set total_points = coalesce((
    select sum(pt.total_points)
    from public.points pt
    where pt.user_id = affected_user
  ), 0)
  where u.id = affected_user;

  return null;
end;
$$;


--
-- Name: tg_match_after_write(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.tg_match_after_write() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  new_day date := public.match_day(new.kickoff_time);
  old_day date := case when tg_op = 'UPDATE' then public.match_day(old.kickoff_time) end;
begin
  if new.status = 'FINISHED'
     and new.home_score is not null and new.away_score is not null
     and (
          tg_op = 'INSERT'
          or new.status          is distinct from old.status
          or new.home_score      is distinct from old.home_score
          or new.away_score      is distinct from old.away_score
          or new.winner_team_id  is distinct from old.winner_team_id
          or new.decision_method is distinct from old.decision_method
          or new.points_multiplier is distinct from old.points_multiplier
        ) then
    perform public.score_match(new.id);
  end if;

  perform public.maybe_finalize_day(new_day);
  if old_day is not null and old_day is distinct from new_day then
    perform public.maybe_finalize_day(old_day);
  end if;

  return new;
end;
$$;


--
-- Name: tg_points_award_stage_cards(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.tg_points_award_stage_cards() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  v_stage public.match_stage;
begin
  if new.match_id is null then
    return new;
  end if;

  select stage into v_stage
  from public.matches
  where id = new.match_id;

  if v_stage is not null then
    perform public.award_user_stage_cards(new.user_id, v_stage);
  end if;

  return new;
end;
$$;


--
-- Name: tg_points_sync_leaderboard(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.tg_points_sync_leaderboard() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  refresh materialized view public.leaderboard;
  update public.leaderboard_state
     set version = version + 1
   where id = true;
  return null;
end $$;


--
-- Name: tg_predictions_apply_card_usage(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.tg_predictions_apply_card_usage() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  v_match_stage public.match_stage;
  v_card record;
  v_updated integer;
begin
  if tg_op = 'UPDATE'
     and old.applied_user_card_id is not null
     and (
       old.applied_user_card_id is distinct from new.applied_user_card_id
       or old.match_id is distinct from new.match_id
     ) then
    perform public.restore_prediction_card_use(old.applied_user_card_id);
  end if;

  if new.applied_user_card_id is null then
    return new;
  end if;

  if tg_op = 'UPDATE'
     and old.applied_user_card_id is not distinct from new.applied_user_card_id
     and old.match_id is not distinct from new.match_id then
    return new;
  end if;

  select stage into v_match_stage
  from public.matches
  where id = new.match_id;

  if v_match_stage is null then
    raise exception 'Match not found for card usage.';
  end if;

  select
    uc.id,
    uc.user_id,
    uc.status,
    uc.uses_remaining,
    uc.usable_from_stage,
    uc.usable_until_stage,
    cd.is_active
    into v_card
  from public.user_cards uc
  join public.card_definitions cd on cd.id = uc.card_definition_id
  where uc.id = new.applied_user_card_id
  for update of uc;

  if not found then
    raise exception 'Selected card was not found.';
  end if;

  if v_card.user_id is distinct from new.user_id then
    raise exception 'Selected card does not belong to this user.';
  end if;

  if not v_card.is_active then
    raise exception 'Selected card is no longer active.';
  end if;

  if v_card.status <> 'active' or v_card.uses_remaining <= 0 then
    raise exception 'Selected card has no remaining uses.';
  end if;

  if not public.card_stage_is_between(v_match_stage, v_card.usable_from_stage, v_card.usable_until_stage) then
    raise exception 'Selected card cannot be used in this stage.';
  end if;

  update public.user_cards
  set uses_remaining = uses_remaining - 1,
      status = case when uses_remaining - 1 <= 0 then 'used' else 'active' end
  where id = v_card.id
    and uses_remaining > 0;

  get diagnostics v_updated = row_count;
  if v_updated <> 1 then
    raise exception 'Selected card has already been used.';
  end if;

  return new;
end;
$$;


--
-- Name: tg_predictions_restore_card_usage(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.tg_predictions_restore_card_usage() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  if old.applied_user_card_id is not null then
    perform public.restore_prediction_card_use(old.applied_user_card_id);
  end if;
  return old;
end;
$$;


--
-- Name: tg_users_sync_leaderboard(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.tg_users_sync_leaderboard() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  refresh materialized view public.leaderboard;
  update public.leaderboard_state set version = version + 1 where id = true;
  return null;
end $$;


--
-- Name: tournament_tz(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.tournament_tz() RETURNS text
    LANGUAGE sql IMMUTABLE
    SET search_path TO 'public'
    AS $$ select 'UTC'::text $$;


--
-- Name: transfer_league_ownership(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.transfer_league_ownership(p_league_id uuid, p_new_owner_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  if not exists (
    select 1 from public.leagues l
    where l.id = p_league_id
      and (l.owner_id = auth.uid() or exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin'))
  ) then
    raise exception 'Only the league owner or an admin can transfer ownership';
  end if;

  if not exists (select 1 from public.league_members where league_id = p_league_id and user_id = p_new_owner_id) then
    raise exception 'New owner must already be a member of the league';
  end if;

  update public.leagues set owner_id = p_new_owner_id, updated_at = now() where id = p_league_id;
  update public.league_members set role = 'member' where league_id = p_league_id and user_id <> p_new_owner_id;
  update public.league_members set role = 'owner' where league_id = p_league_id and user_id = p_new_owner_id;
end $$;


--
-- Name: update_league(uuid, text, text, text, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_league(p_league_id uuid, p_name text DEFAULT NULL::text, p_description text DEFAULT NULL::text, p_avatar_url text DEFAULT NULL::text, p_max_members integer DEFAULT NULL::integer) RETURNS public.leagues
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare v_league public.leagues;
begin
  if not exists (select 1 from public.leagues where id = p_league_id and owner_id = auth.uid()) then
    raise exception 'Only the league owner can edit this league';
  end if;

  update public.leagues set
    name        = coalesce(nullif(btrim(p_name), ''), name),
    description = case when p_description is not null then nullif(btrim(p_description), '') else description end,
    avatar_url  = coalesce(p_avatar_url, avatar_url),
    max_members = case when p_max_members is not null then p_max_members else max_members end,
    updated_at  = now()
  where id = p_league_id
  returning * into v_league;

  return v_league;
end $$;


--
-- Name: update_username(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_username(p_username text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  _uid uuid;
begin
  _uid := auth.uid();
  if _uid is null then
    raise exception 'Not authenticated';
  end if;

  if p_username is null or length(trim(p_username)) < 3 then
    raise exception 'Username must be at least 3 characters';
  end if;

  if exists (select 1 from public.users where username = trim(p_username) and id <> _uid and is_deleted = false) then
    raise exception 'Username already taken';
  end if;

  update public.users
  set username = trim(p_username)
  where id = _uid;
end;
$$;


--
-- Name: user_stage_points(uuid, public.match_stage); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.user_stage_points(p_user_id uuid, p_stage public.match_stage) RETURNS numeric
    LANGUAGE sql STABLE
    SET search_path TO 'public'
    AS $$
  select coalesce(sum(pt.total_points), 0)::numeric
  from public.points pt
  join public.matches m on m.id = pt.match_id
  where pt.user_id = p_user_id
    and m.stage = p_stage;
$$;


--
-- Name: validate_prediction_outcome(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.validate_prediction_outcome() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
declare
  m record;
begin
  select is_knockout, home_team_id, away_team_id
    into m
    from public.matches
   where id = new.match_id;

  if not found then
    raise exception 'Match not found.';
  end if;

  if m.is_knockout then
    if new.pred_winner_team_id is null then
      raise exception 'Knockout matches require a qualifying team prediction.';
    end if;

    if new.pred_winner_team_id is distinct from m.home_team_id
       and new.pred_winner_team_id is distinct from m.away_team_id then
      raise exception 'Predicted qualifying team must be one of the match teams.';
    end if;
  end if;

  return new;
end;
$$;


--
-- Name: api_providers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.api_providers (
    id text NOT NULL,
    name text NOT NULL,
    adapter text DEFAULT 'football_data_v4'::text NOT NULL,
    base_url text NOT NULL,
    competition_code text DEFAULT 'WC'::text NOT NULL,
    token_secret_name text DEFAULT 'FOOTBALL_API_TOKEN'::text NOT NULL,
    is_active boolean DEFAULT false NOT NULL,
    rate_limit_per_minute integer,
    supports_fixtures boolean DEFAULT true NOT NULL,
    supports_results boolean DEFAULT true NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid,
    CONSTRAINT api_providers_base_url_check CHECK ((base_url ~ '^https?://'::text)),
    CONSTRAINT api_providers_id_check CHECK ((id ~ '^[a-z0-9][a-z0-9_-]*$'::text)),
    CONSTRAINT api_providers_name_check CHECK ((length(TRIM(BOTH FROM name)) > 0)),
    CONSTRAINT api_providers_rate_limit_per_minute_check CHECK (((rate_limit_per_minute IS NULL) OR (rate_limit_per_minute > 0)))
);


--
-- Name: auth_quotes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.auth_quotes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    quote_text text NOT NULL,
    author text NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT auth_quotes_author_check CHECK (((length(TRIM(BOTH FROM author)) >= 1) AND (length(TRIM(BOTH FROM author)) <= 80))),
    CONSTRAINT auth_quotes_quote_text_check CHECK (((length(TRIM(BOTH FROM quote_text)) >= 1) AND (length(TRIM(BOTH FROM quote_text)) <= 240)))
);


--
-- Name: auth_screen_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.auth_screen_settings (
    id integer DEFAULT 1 NOT NULL,
    developer_name text DEFAULT 'Ahmed Elsherbini'::text NOT NULL,
    updated_by uuid,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT auth_screen_settings_developer_name_len CHECK (((length(TRIM(BOTH FROM developer_name)) >= 1) AND (length(TRIM(BOTH FROM developer_name)) <= 100))),
    CONSTRAINT auth_screen_settings_singleton CHECK ((id = 1))
);


--
-- Name: banner_collections; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.banner_collections (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    home_position text DEFAULT 'after_today_matches'::text NOT NULL,
    CONSTRAINT banner_collections_home_position_check CHECK ((home_position = ANY (ARRAY['after_top_banner'::text, 'after_cards_countdown'::text, 'after_my_teams'::text, 'after_pending_predictions'::text, 'after_today_matches'::text, 'after_performance'::text, 'before_tournament_questions'::text]))),
    CONSTRAINT banner_collections_title_check CHECK (((length(TRIM(BOTH FROM title)) >= 1) AND (length(TRIM(BOTH FROM title)) <= 80)))
);


--
-- Name: card_definitions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.card_definitions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    image_path text,
    award_stage public.match_stage NOT NULL,
    threshold_percent numeric(5,2) DEFAULT 70 NOT NULL,
    usable_from_stage public.match_stage NOT NULL,
    usable_until_stage public.match_stage NOT NULL,
    max_uses integer DEFAULT 1 NOT NULL,
    multiplier_bonus integer DEFAULT 1 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT card_definitions_max_uses_check CHECK (((max_uses >= 1) AND (max_uses <= 20))),
    CONSTRAINT card_definitions_multiplier_bonus_check CHECK (((multiplier_bonus >= 1) AND (multiplier_bonus <= 10))),
    CONSTRAINT card_definitions_name_check CHECK (((length(TRIM(BOTH FROM name)) >= 1) AND (length(TRIM(BOTH FROM name)) <= 80))),
    CONSTRAINT card_definitions_stage_window_check CHECK (((public.card_stage_rank(usable_until_stage) >= public.card_stage_rank(usable_from_stage)) AND (public.card_stage_rank(usable_from_stage) >= public.card_stage_rank(award_stage)))),
    CONSTRAINT card_definitions_threshold_percent_check CHECK (((threshold_percent > (0)::numeric) AND (threshold_percent <= (100)::numeric)))
);


--
-- Name: hero_slides; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.hero_slides (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    image_path text NOT NULL,
    background_color text DEFAULT '#13214a'::text NOT NULL,
    title text,
    subtitle text,
    link_url text,
    sort_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    placement text DEFAULT 'top'::text NOT NULL,
    collection_id uuid,
    CONSTRAINT hero_slides_placement_check CHECK ((placement = ANY (ARRAY['top'::text, 'bottom'::text])))
);


--
-- Name: home_cards_tile_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.home_cards_tile_settings (
    id integer DEFAULT 1 NOT NULL,
    image_path text,
    background_color text DEFAULT '#141414'::text NOT NULL,
    updated_by uuid,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT home_cards_tile_settings_singleton CHECK ((id = 1))
);


--
-- Name: points; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.points (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    match_id uuid,
    winner_points integer DEFAULT 0 NOT NULL,
    home_goal_points integer DEFAULT 0 NOT NULL,
    away_goal_points integer DEFAULT 0 NOT NULL,
    exact_bonus integer DEFAULT 0 NOT NULL,
    total_points integer DEFAULT 0 NOT NULL,
    calculated_at timestamp with time zone DEFAULT now() NOT NULL,
    question_id uuid,
    CONSTRAINT points_match_or_question CHECK ((((match_id IS NOT NULL) AND (question_id IS NULL)) OR ((match_id IS NULL) AND (question_id IS NOT NULL)))),
    CONSTRAINT points_one_source_check CHECK ((num_nonnulls(match_id, question_id) = 1))
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id uuid NOT NULL,
    display_name text NOT NULL,
    avatar_url text,
    total_points integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    email text,
    last_login timestamp with time zone,
    role text DEFAULT 'user'::text NOT NULL,
    supported_teams uuid[] DEFAULT '{}'::uuid[],
    is_deleted boolean DEFAULT false NOT NULL,
    deleted_at timestamp with time zone,
    username text,
    CONSTRAINT users_role_check CHECK ((role = ANY (ARRAY['user'::text, 'admin'::text]))),
    CONSTRAINT users_supported_teams_check CHECK ((cardinality(supported_teams) <= 3))
);


--
-- Name: leaderboard; Type: MATERIALIZED VIEW; Schema: public; Owner: -
--

CREATE MATERIALIZED VIEW public.leaderboard AS
 SELECT u.id AS user_id,
    u.display_name,
    u.username,
    u.avatar_url,
    COALESCE(sum(p.total_points), (0)::bigint) AS total_points,
    count(p.id) AS predictions_made,
    count(p.id) FILTER (WHERE (p.total_points > 0)) AS predictions_scored,
    count(p.id) FILTER (WHERE (p.exact_bonus > 0)) AS exact_predictions,
    rank() OVER (ORDER BY COALESCE(sum(p.total_points), (0)::bigint) DESC, (count(p.id) FILTER (WHERE (p.exact_bonus > 0))) DESC) AS rank
   FROM (public.users u
     LEFT JOIN public.points p ON ((p.user_id = u.id)))
  WHERE (u.is_deleted = false)
  GROUP BY u.id, u.display_name, u.username, u.avatar_url
  WITH NO DATA;


--
-- Name: leaderboard_state; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.leaderboard_state (
    id boolean DEFAULT true NOT NULL,
    refreshed_at timestamp with time zone,
    refreshed_for_day date,
    version bigint DEFAULT 0 NOT NULL,
    CONSTRAINT leaderboard_state_id_check CHECK (id)
);


--
-- Name: league_members; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.league_members (
    league_id uuid NOT NULL,
    user_id uuid NOT NULL,
    role text DEFAULT 'member'::text NOT NULL,
    joined_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT league_members_role_check CHECK ((role = ANY (ARRAY['owner'::text, 'member'::text])))
);


--
-- Name: league_leaderboard; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.league_leaderboard WITH (security_invoker='true') AS
 SELECT lm.league_id,
    lb.user_id,
    lb.display_name,
    lb.username,
    lb.avatar_url,
    lb.total_points,
    lb.predictions_made,
    lb.predictions_scored,
    lb.exact_predictions,
    u.supported_teams,
    rank() OVER (PARTITION BY lm.league_id ORDER BY lb.total_points DESC, lb.user_id) AS league_rank,
    count(*) OVER (PARTITION BY lm.league_id) AS league_member_count
   FROM ((public.league_members lm
     JOIN public.leaderboard lb ON ((lb.user_id = lm.user_id)))
     JOIN public.users u ON ((u.id = lm.user_id)));


--
-- Name: matches; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.matches (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    external_id integer NOT NULL,
    home_team_id uuid,
    away_team_id uuid,
    home_score integer,
    away_score integer,
    status public.match_status DEFAULT 'SCHEDULED'::public.match_status NOT NULL,
    stage public.match_stage DEFAULT 'GROUP'::public.match_stage NOT NULL,
    group_name character(1),
    kickoff_time timestamp with time zone NOT NULL,
    venue text,
    last_synced_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    points_multiplier integer DEFAULT 1 NOT NULL,
    is_placeholder boolean DEFAULT false NOT NULL,
    is_knockout boolean DEFAULT false NOT NULL,
    winner_team_id uuid,
    decision_method public.match_decision_method,
    CONSTRAINT matches_distinct_teams CHECK ((home_team_id <> away_team_id)),
    CONSTRAINT matches_points_multiplier_range CHECK (((points_multiplier >= 1) AND (points_multiplier <= 6)))
);


--
-- Name: matches_hero_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.matches_hero_settings (
    id integer DEFAULT 1 NOT NULL,
    image_path text,
    background_color text DEFAULT '#13214a'::text NOT NULL,
    updated_by uuid,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT matches_hero_settings_singleton CHECK ((id = 1))
);


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    type text NOT NULL,
    title text NOT NULL,
    body text,
    data jsonb DEFAULT '{}'::jsonb NOT NULL,
    is_read boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT notifications_type_check CHECK ((type = ANY (ARRAY['points'::text, 'rank_change'::text, 'match_result'::text, 'announcement'::text, 'tournament'::text])))
);


--
-- Name: prediction_questions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.prediction_questions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    question_text text NOT NULL,
    options jsonb NOT NULL,
    correct_answer text,
    points integer DEFAULT 10 NOT NULL,
    status text DEFAULT 'open'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    resolved_at timestamp with time zone,
    created_by uuid,
    lock_at timestamp with time zone DEFAULT (now() + '24:00:00'::interval) NOT NULL,
    card_image_path text,
    CONSTRAINT prediction_questions_status_check CHECK ((status = ANY (ARRAY['open'::text, 'closed'::text, 'resolved'::text])))
);


--
-- Name: predictions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.predictions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    match_id uuid NOT NULL,
    pred_home_score integer NOT NULL,
    pred_away_score integer NOT NULL,
    is_locked boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    pred_winner_team_id uuid,
    applied_user_card_id uuid,
    CONSTRAINT predictions_pred_away_score_check CHECK (((pred_away_score >= 0) AND (pred_away_score <= 20))),
    CONSTRAINT predictions_pred_home_score_check CHECK (((pred_home_score >= 0) AND (pred_home_score <= 20)))
);


--
-- Name: scoring_rules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.scoring_rules (
    id smallint DEFAULT 1 NOT NULL,
    winner_points integer NOT NULL,
    exact_bonus_points integer NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid,
    CONSTRAINT scoring_rules_exact_bonus_points_check CHECK ((exact_bonus_points >= 0)),
    CONSTRAINT scoring_rules_singleton CHECK ((id = 1)),
    CONSTRAINT scoring_rules_winner_points_check CHECK ((winner_points >= 0))
);


--
-- Name: stage_card_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stage_card_settings (
    stage public.match_stage NOT NULL,
    expected_matches integer NOT NULL,
    updated_by uuid,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT stage_card_settings_expected_matches_check CHECK ((expected_matches >= 0))
);


--
-- Name: stage_multipliers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stage_multipliers (
    stage public.match_stage NOT NULL,
    multiplier integer DEFAULT 1 NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid,
    CONSTRAINT stage_multipliers_multiplier_check CHECK (((multiplier >= 1) AND (multiplier <= 6)))
);


--
-- Name: teams; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.teams (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    external_id integer NOT NULL,
    name text NOT NULL,
    short_name text,
    code character(3),
    flag_url text,
    group_name character(1),
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: user_cards; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_cards (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    card_definition_id uuid NOT NULL,
    earned_stage public.match_stage NOT NULL,
    usable_from_stage public.match_stage NOT NULL,
    usable_until_stage public.match_stage NOT NULL,
    multiplier_bonus integer NOT NULL,
    max_uses integer NOT NULL,
    uses_remaining integer NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    unlocked_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT user_cards_max_uses_check CHECK (((max_uses >= 1) AND (max_uses <= 20))),
    CONSTRAINT user_cards_multiplier_bonus_check CHECK (((multiplier_bonus >= 1) AND (multiplier_bonus <= 10))),
    CONSTRAINT user_cards_stage_window_check CHECK ((public.card_stage_rank(usable_until_stage) >= public.card_stage_rank(usable_from_stage))),
    CONSTRAINT user_cards_status_check CHECK ((status = ANY (ARRAY['active'::text, 'used'::text, 'revoked'::text]))),
    CONSTRAINT user_cards_uses_remaining_check CHECK ((uses_remaining >= 0)),
    CONSTRAINT user_cards_uses_remaining_max_check CHECK ((uses_remaining <= max_uses))
);


--
-- Name: user_performance; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.user_performance WITH (security_invoker='true') AS
 SELECT p.user_id,
    count(DISTINCT p.id) AS total_predictions,
    count(DISTINCT pt.match_id) FILTER (WHERE (pt.winner_points > 0)) AS correct_predictions,
    count(DISTINCT pt.match_id) FILTER (WHERE (pt.exact_bonus > 0)) AS exact_predictions,
    COALESCE(sum(pt.total_points), (0)::bigint) AS total_points,
    count(DISTINCT p.match_id) AS matches_participated
   FROM (public.predictions p
     LEFT JOIN public.points pt ON (((pt.user_id = p.user_id) AND (pt.match_id = p.match_id))))
  GROUP BY p.user_id;


--
-- Name: user_question_predictions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_question_predictions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    question_id uuid NOT NULL,
    prediction text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    CONSTRAINT user_question_predictions_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])))
);


--
-- Name: user_rank_snapshot; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_rank_snapshot (
    user_id uuid NOT NULL,
    rank integer,
    total_points integer,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: api_providers api_providers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.api_providers
    ADD CONSTRAINT api_providers_pkey PRIMARY KEY (id);


--
-- Name: auth_quotes auth_quotes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auth_quotes
    ADD CONSTRAINT auth_quotes_pkey PRIMARY KEY (id);


--
-- Name: auth_screen_settings auth_screen_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auth_screen_settings
    ADD CONSTRAINT auth_screen_settings_pkey PRIMARY KEY (id);


--
-- Name: banner_collections banner_collections_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.banner_collections
    ADD CONSTRAINT banner_collections_pkey PRIMARY KEY (id);


--
-- Name: card_definitions card_definitions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.card_definitions
    ADD CONSTRAINT card_definitions_pkey PRIMARY KEY (id);


--
-- Name: hero_slides hero_slides_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hero_slides
    ADD CONSTRAINT hero_slides_pkey PRIMARY KEY (id);


--
-- Name: home_cards_tile_settings home_cards_tile_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.home_cards_tile_settings
    ADD CONSTRAINT home_cards_tile_settings_pkey PRIMARY KEY (id);


--
-- Name: leaderboard_state leaderboard_state_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leaderboard_state
    ADD CONSTRAINT leaderboard_state_pkey PRIMARY KEY (id);


--
-- Name: league_members league_members_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.league_members
    ADD CONSTRAINT league_members_pkey PRIMARY KEY (league_id, user_id);


--
-- Name: leagues leagues_invite_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leagues
    ADD CONSTRAINT leagues_invite_code_key UNIQUE (invite_code);


--
-- Name: leagues leagues_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leagues
    ADD CONSTRAINT leagues_pkey PRIMARY KEY (id);


--
-- Name: matches matches_external_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.matches
    ADD CONSTRAINT matches_external_id_key UNIQUE (external_id);


--
-- Name: matches matches_finished_knockout_has_outcome; Type: CHECK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE public.matches
    ADD CONSTRAINT matches_finished_knockout_has_outcome CHECK (((NOT is_knockout) OR (status <> 'FINISHED'::public.match_status) OR ((winner_team_id IS NOT NULL) AND (decision_method IS NOT NULL)))) NOT VALID;


--
-- Name: matches_hero_settings matches_hero_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.matches_hero_settings
    ADD CONSTRAINT matches_hero_settings_pkey PRIMARY KEY (id);


--
-- Name: matches matches_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.matches
    ADD CONSTRAINT matches_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: points points_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.points
    ADD CONSTRAINT points_pkey PRIMARY KEY (id);


--
-- Name: points points_user_question_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.points
    ADD CONSTRAINT points_user_question_key UNIQUE (user_id, question_id);


--
-- Name: prediction_questions prediction_questions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prediction_questions
    ADD CONSTRAINT prediction_questions_pkey PRIMARY KEY (id);


--
-- Name: predictions predictions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.predictions
    ADD CONSTRAINT predictions_pkey PRIMARY KEY (id);


--
-- Name: predictions predictions_user_id_match_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.predictions
    ADD CONSTRAINT predictions_user_id_match_id_key UNIQUE (user_id, match_id);


--
-- Name: scoring_rules scoring_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scoring_rules
    ADD CONSTRAINT scoring_rules_pkey PRIMARY KEY (id);


--
-- Name: stage_card_settings stage_card_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stage_card_settings
    ADD CONSTRAINT stage_card_settings_pkey PRIMARY KEY (stage);


--
-- Name: stage_multipliers stage_multipliers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stage_multipliers
    ADD CONSTRAINT stage_multipliers_pkey PRIMARY KEY (stage);


--
-- Name: teams teams_external_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teams
    ADD CONSTRAINT teams_external_id_key UNIQUE (external_id);


--
-- Name: teams teams_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teams
    ADD CONSTRAINT teams_pkey PRIMARY KEY (id);


--
-- Name: user_cards user_cards_one_definition_per_user; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_cards
    ADD CONSTRAINT user_cards_one_definition_per_user UNIQUE (user_id, card_definition_id);


--
-- Name: user_cards user_cards_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_cards
    ADD CONSTRAINT user_cards_pkey PRIMARY KEY (id);


--
-- Name: user_question_predictions user_question_predictions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_question_predictions
    ADD CONSTRAINT user_question_predictions_pkey PRIMARY KEY (id);


--
-- Name: user_question_predictions user_question_predictions_user_id_question_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_question_predictions
    ADD CONSTRAINT user_question_predictions_user_id_question_id_key UNIQUE (user_id, question_id);


--
-- Name: user_rank_snapshot user_rank_snapshot_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_rank_snapshot
    ADD CONSTRAINT user_rank_snapshot_pkey PRIMARY KEY (user_id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: api_providers_one_active; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX api_providers_one_active ON public.api_providers USING btree (is_active) WHERE is_active;


--
-- Name: auth_quotes_active_order_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX auth_quotes_active_order_idx ON public.auth_quotes USING btree (is_active, sort_order, created_at);


--
-- Name: banner_collections_active_order_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX banner_collections_active_order_idx ON public.banner_collections USING btree (is_active, sort_order);


--
-- Name: banner_collections_position_order_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX banner_collections_position_order_idx ON public.banner_collections USING btree (home_position, is_active, sort_order);


--
-- Name: hero_slides_active_order_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX hero_slides_active_order_idx ON public.hero_slides USING btree (is_active, sort_order);


--
-- Name: hero_slides_collection_order_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX hero_slides_collection_order_idx ON public.hero_slides USING btree (collection_id, sort_order);


--
-- Name: hero_slides_placement_order_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX hero_slides_placement_order_idx ON public.hero_slides USING btree (placement, sort_order);


--
-- Name: idx_league_members_league; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_league_members_league ON public.league_members USING btree (league_id);


--
-- Name: idx_league_members_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_league_members_user ON public.league_members USING btree (user_id);


--
-- Name: idx_leagues_invite_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_leagues_invite_code ON public.leagues USING btree (invite_code);


--
-- Name: idx_leagues_owner; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_leagues_owner ON public.leagues USING btree (owner_id);


--
-- Name: idx_matches_kickoff; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_matches_kickoff ON public.matches USING btree (kickoff_time);


--
-- Name: idx_matches_stage; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_matches_stage ON public.matches USING btree (stage);


--
-- Name: idx_matches_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_matches_status ON public.matches USING btree (status);


--
-- Name: idx_notifications_user_unread; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_user_unread ON public.notifications USING btree (user_id, is_read, created_at DESC);


--
-- Name: idx_points_match; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_points_match ON public.points USING btree (match_id);


--
-- Name: idx_points_question; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_points_question ON public.points USING btree (question_id);


--
-- Name: idx_points_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_points_user ON public.points USING btree (user_id);


--
-- Name: idx_predictions_applied_user_card; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_predictions_applied_user_card ON public.predictions USING btree (applied_user_card_id);


--
-- Name: idx_predictions_match; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_predictions_match ON public.predictions USING btree (match_id);


--
-- Name: idx_predictions_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_predictions_user ON public.predictions USING btree (user_id);


--
-- Name: idx_questions_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_questions_status ON public.prediction_questions USING btree (status);


--
-- Name: idx_uqp_question; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_uqp_question ON public.user_question_predictions USING btree (question_id);


--
-- Name: idx_uqp_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_uqp_user ON public.user_question_predictions USING btree (user_id);


--
-- Name: idx_user_cards_definition; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_cards_definition ON public.user_cards USING btree (card_definition_id);


--
-- Name: idx_user_cards_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_cards_status ON public.user_cards USING btree (status);


--
-- Name: idx_user_cards_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_cards_user ON public.user_cards USING btree (user_id);


--
-- Name: leaderboard_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX leaderboard_user_id_idx ON public.leaderboard USING btree (user_id);


--
-- Name: points_user_match_uidx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX points_user_match_uidx ON public.points USING btree (user_id, match_id);


--
-- Name: users_username_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX users_username_unique ON public.users USING btree (username) WHERE (username IS NOT NULL);


--
-- Name: auth_quotes auth_quotes_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER auth_quotes_set_updated_at BEFORE UPDATE ON public.auth_quotes FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: auth_screen_settings auth_screen_settings_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER auth_screen_settings_set_updated_at BEFORE UPDATE ON public.auth_screen_settings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: banner_collections banner_collections_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER banner_collections_set_updated_at BEFORE UPDATE ON public.banner_collections FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: card_definitions card_definitions_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER card_definitions_set_updated_at BEFORE UPDATE ON public.card_definitions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: hero_slides hero_slides_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER hero_slides_set_updated_at BEFORE UPDATE ON public.hero_slides FOR EACH ROW EXECUTE FUNCTION public.set_hero_slides_updated_at();


--
-- Name: home_cards_tile_settings home_cards_tile_settings_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER home_cards_tile_settings_set_updated_at BEFORE UPDATE ON public.home_cards_tile_settings FOR EACH ROW EXECUTE FUNCTION public.set_home_cards_tile_settings_updated_at();


--
-- Name: leagues leagues_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER leagues_set_updated_at BEFORE UPDATE ON public.leagues FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: matches matches_after_write; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER matches_after_write AFTER INSERT OR UPDATE OF status, home_score, away_score, winner_team_id, decision_method, points_multiplier, kickoff_time ON public.matches FOR EACH ROW EXECUTE FUNCTION public.tg_match_after_write();


--
-- Name: matches matches_apply_stage_multiplier; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER matches_apply_stage_multiplier BEFORE INSERT ON public.matches FOR EACH ROW EXECUTE FUNCTION public.apply_stage_multiplier_default();


--
-- Name: matches_hero_settings matches_hero_settings_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER matches_hero_settings_set_updated_at BEFORE UPDATE ON public.matches_hero_settings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: matches matches_set_knockout_flag; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER matches_set_knockout_flag BEFORE INSERT OR UPDATE OF stage ON public.matches FOR EACH ROW EXECUTE FUNCTION public.set_match_knockout_flag();


--
-- Name: notifications notifications_guard_update; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER notifications_guard_update BEFORE UPDATE ON public.notifications FOR EACH ROW EXECUTE FUNCTION public.guard_notification_update();


--
-- Name: user_question_predictions on_prediction_audit_change; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER on_prediction_audit_change AFTER INSERT OR UPDATE ON public.user_question_predictions FOR EACH ROW EXECUTE FUNCTION public.handle_prediction_audit();


--
-- Name: points points_award_stage_cards; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER points_award_stage_cards AFTER INSERT OR UPDATE OF total_points ON public.points FOR EACH ROW EXECUTE FUNCTION public.tg_points_award_stage_cards();


--
-- Name: points points_sync_leaderboard; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER points_sync_leaderboard AFTER INSERT OR DELETE OR UPDATE ON public.points FOR EACH STATEMENT EXECUTE FUNCTION public.tg_points_sync_leaderboard();


--
-- Name: points points_sync_user_total; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER points_sync_user_total AFTER INSERT OR DELETE OR UPDATE ON public.points FOR EACH ROW EXECUTE FUNCTION public.sync_user_total_points();


--
-- Name: predictions predictions_apply_card_usage; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER predictions_apply_card_usage BEFORE INSERT OR UPDATE OF user_id, match_id, applied_user_card_id ON public.predictions FOR EACH ROW EXECUTE FUNCTION public.tg_predictions_apply_card_usage();


--
-- Name: predictions predictions_restore_card_usage; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER predictions_restore_card_usage AFTER DELETE ON public.predictions FOR EACH ROW EXECUTE FUNCTION public.tg_predictions_restore_card_usage();


--
-- Name: predictions predictions_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER predictions_set_updated_at BEFORE UPDATE ON public.predictions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: predictions predictions_validate_outcome; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER predictions_validate_outcome BEFORE INSERT OR UPDATE OF match_id, pred_winner_team_id ON public.predictions FOR EACH ROW EXECUTE FUNCTION public.validate_prediction_outcome();


--
-- Name: user_question_predictions uqp_guard_status; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER uqp_guard_status BEFORE INSERT OR UPDATE ON public.user_question_predictions FOR EACH ROW EXECUTE FUNCTION public.guard_uqp_status();


--
-- Name: user_question_predictions uqp_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER uqp_set_updated_at BEFORE UPDATE ON public.user_question_predictions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: user_cards user_cards_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER user_cards_set_updated_at BEFORE UPDATE ON public.user_cards FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: users users_protect_privileged; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER users_protect_privileged BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.protect_users_privileged_columns();


--
-- Name: users users_sync_leaderboard; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER users_sync_leaderboard AFTER DELETE OR UPDATE OF is_deleted, display_name, username, avatar_url, supported_teams ON public.users FOR EACH STATEMENT EXECUTE FUNCTION public.tg_users_sync_leaderboard();


--
-- Name: api_providers api_providers_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.api_providers
    ADD CONSTRAINT api_providers_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: auth_quotes auth_quotes_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auth_quotes
    ADD CONSTRAINT auth_quotes_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: auth_screen_settings auth_screen_settings_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auth_screen_settings
    ADD CONSTRAINT auth_screen_settings_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: banner_collections banner_collections_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.banner_collections
    ADD CONSTRAINT banner_collections_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: card_definitions card_definitions_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.card_definitions
    ADD CONSTRAINT card_definitions_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: hero_slides hero_slides_collection_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hero_slides
    ADD CONSTRAINT hero_slides_collection_id_fkey FOREIGN KEY (collection_id) REFERENCES public.banner_collections(id) ON DELETE CASCADE;


--
-- Name: hero_slides hero_slides_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hero_slides
    ADD CONSTRAINT hero_slides_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: home_cards_tile_settings home_cards_tile_settings_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.home_cards_tile_settings
    ADD CONSTRAINT home_cards_tile_settings_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: league_members league_members_league_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.league_members
    ADD CONSTRAINT league_members_league_id_fkey FOREIGN KEY (league_id) REFERENCES public.leagues(id) ON DELETE CASCADE;


--
-- Name: league_members league_members_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.league_members
    ADD CONSTRAINT league_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: leagues leagues_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leagues
    ADD CONSTRAINT leagues_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: matches matches_away_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.matches
    ADD CONSTRAINT matches_away_team_id_fkey FOREIGN KEY (away_team_id) REFERENCES public.teams(id);


--
-- Name: matches_hero_settings matches_hero_settings_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.matches_hero_settings
    ADD CONSTRAINT matches_hero_settings_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: matches matches_home_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.matches
    ADD CONSTRAINT matches_home_team_id_fkey FOREIGN KEY (home_team_id) REFERENCES public.teams(id);


--
-- Name: matches matches_winner_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.matches
    ADD CONSTRAINT matches_winner_team_id_fkey FOREIGN KEY (winner_team_id) REFERENCES public.teams(id);


--
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: points points_match_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.points
    ADD CONSTRAINT points_match_id_fkey FOREIGN KEY (match_id) REFERENCES public.matches(id) ON DELETE CASCADE;


--
-- Name: points points_question_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.points
    ADD CONSTRAINT points_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.prediction_questions(id) ON DELETE CASCADE;


--
-- Name: points points_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.points
    ADD CONSTRAINT points_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: prediction_questions prediction_questions_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prediction_questions
    ADD CONSTRAINT prediction_questions_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: predictions predictions_applied_user_card_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.predictions
    ADD CONSTRAINT predictions_applied_user_card_id_fkey FOREIGN KEY (applied_user_card_id) REFERENCES public.user_cards(id) ON DELETE SET NULL;


--
-- Name: predictions predictions_match_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.predictions
    ADD CONSTRAINT predictions_match_id_fkey FOREIGN KEY (match_id) REFERENCES public.matches(id) ON DELETE CASCADE;


--
-- Name: predictions predictions_pred_winner_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.predictions
    ADD CONSTRAINT predictions_pred_winner_team_id_fkey FOREIGN KEY (pred_winner_team_id) REFERENCES public.teams(id);


--
-- Name: predictions predictions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.predictions
    ADD CONSTRAINT predictions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: scoring_rules scoring_rules_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scoring_rules
    ADD CONSTRAINT scoring_rules_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: stage_card_settings stage_card_settings_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stage_card_settings
    ADD CONSTRAINT stage_card_settings_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: stage_multipliers stage_multipliers_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stage_multipliers
    ADD CONSTRAINT stage_multipliers_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: user_cards user_cards_card_definition_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_cards
    ADD CONSTRAINT user_cards_card_definition_id_fkey FOREIGN KEY (card_definition_id) REFERENCES public.card_definitions(id) ON DELETE CASCADE;


--
-- Name: user_cards user_cards_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_cards
    ADD CONSTRAINT user_cards_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_question_predictions user_question_predictions_question_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_question_predictions
    ADD CONSTRAINT user_question_predictions_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.prediction_questions(id) ON DELETE CASCADE;


--
-- Name: user_question_predictions user_question_predictions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_question_predictions
    ADD CONSTRAINT user_question_predictions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_rank_snapshot user_rank_snapshot_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_rank_snapshot
    ADD CONSTRAINT user_rank_snapshot_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: users users_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: api_providers API providers are readable; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "API providers are readable" ON public.api_providers FOR SELECT TO authenticated USING (true);


--
-- Name: auth_quotes Active auth quotes are public; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Active auth quotes are public" ON public.auth_quotes FOR SELECT TO authenticated, anon USING (is_active);


--
-- Name: user_question_predictions Admins can manage all question predictions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage all question predictions" ON public.user_question_predictions TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());


--
-- Name: prediction_questions Admins can manage prediction questions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage prediction questions" ON public.prediction_questions TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());


--
-- Name: auth_quotes Admins create auth quotes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins create auth quotes" ON public.auth_quotes FOR INSERT TO authenticated WITH CHECK (public.is_admin());


--
-- Name: auth_screen_settings Admins create auth screen settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins create auth screen settings" ON public.auth_screen_settings FOR INSERT TO authenticated WITH CHECK (((id = 1) AND public.is_admin()));


--
-- Name: banner_collections Admins create banner collections; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins create banner collections" ON public.banner_collections FOR INSERT TO authenticated WITH CHECK (public.is_admin());


--
-- Name: card_definitions Admins create card definitions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins create card definitions" ON public.card_definitions FOR INSERT TO authenticated WITH CHECK (public.is_admin());


--
-- Name: auth_quotes Admins delete auth quotes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins delete auth quotes" ON public.auth_quotes FOR DELETE TO authenticated USING (public.is_admin());


--
-- Name: banner_collections Admins delete banner collections; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins delete banner collections" ON public.banner_collections FOR DELETE TO authenticated USING (public.is_admin());


--
-- Name: card_definitions Admins delete card definitions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins delete card definitions" ON public.card_definitions FOR DELETE TO authenticated USING (public.is_admin());


--
-- Name: hero_slides Admins delete hero slides; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins delete hero slides" ON public.hero_slides FOR DELETE TO authenticated USING (public.is_admin());


--
-- Name: matches Admins delete matches; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins delete matches" ON public.matches FOR DELETE TO authenticated USING (public.is_admin());


--
-- Name: matches_hero_settings Admins delete matches hero settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins delete matches hero settings" ON public.matches_hero_settings FOR DELETE TO authenticated USING (public.is_admin());


--
-- Name: hero_slides Admins insert hero slides; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins insert hero slides" ON public.hero_slides FOR INSERT TO authenticated WITH CHECK (public.is_admin());


--
-- Name: home_cards_tile_settings Admins insert home cards tile settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins insert home cards tile settings" ON public.home_cards_tile_settings FOR INSERT TO authenticated WITH CHECK (public.is_admin());


--
-- Name: matches Admins insert matches; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins insert matches" ON public.matches FOR INSERT TO authenticated WITH CHECK (public.is_admin());


--
-- Name: matches_hero_settings Admins insert matches hero settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins insert matches hero settings" ON public.matches_hero_settings FOR INSERT TO authenticated WITH CHECK (public.is_admin());


--
-- Name: prediction_questions Admins insert questions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins insert questions" ON public.prediction_questions FOR INSERT TO authenticated WITH CHECK (public.is_admin());


--
-- Name: api_providers Admins manage API providers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage API providers" ON public.api_providers TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());


--
-- Name: stage_card_settings Admins manage stage card settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage stage card settings" ON public.stage_card_settings TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());


--
-- Name: auth_quotes Admins read all auth quotes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins read all auth quotes" ON public.auth_quotes FOR SELECT TO authenticated USING (public.is_admin());


--
-- Name: auth_quotes Admins update auth quotes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins update auth quotes" ON public.auth_quotes FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());


--
-- Name: auth_screen_settings Admins update auth screen settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins update auth screen settings" ON public.auth_screen_settings FOR UPDATE TO authenticated USING (((id = 1) AND public.is_admin())) WITH CHECK (((id = 1) AND public.is_admin()));


--
-- Name: banner_collections Admins update banner collections; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins update banner collections" ON public.banner_collections FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());


--
-- Name: card_definitions Admins update card definitions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins update card definitions" ON public.card_definitions FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());


--
-- Name: hero_slides Admins update hero slides; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins update hero slides" ON public.hero_slides FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());


--
-- Name: home_cards_tile_settings Admins update home cards tile settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins update home cards tile settings" ON public.home_cards_tile_settings FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());


--
-- Name: matches Admins update matches; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins update matches" ON public.matches FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());


--
-- Name: matches_hero_settings Admins update matches hero settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins update matches hero settings" ON public.matches_hero_settings FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());


--
-- Name: prediction_questions Admins update questions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins update questions" ON public.prediction_questions FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());


--
-- Name: scoring_rules Admins update scoring rules; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins update scoring rules" ON public.scoring_rules FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());


--
-- Name: stage_multipliers Admins update stage multipliers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins update stage multipliers" ON public.stage_multipliers FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());


--
-- Name: auth_screen_settings Auth screen settings are public; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Auth screen settings are public" ON public.auth_screen_settings FOR SELECT TO authenticated, anon USING (true);


--
-- Name: banner_collections Banner collections are readable; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Banner collections are readable" ON public.banner_collections FOR SELECT TO authenticated USING (true);


--
-- Name: card_definitions Card definitions are readable by authenticated users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Card definitions are readable by authenticated users" ON public.card_definitions FOR SELECT TO authenticated USING (true);


--
-- Name: hero_slides Hero slides are public; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Hero slides are public" ON public.hero_slides FOR SELECT TO authenticated USING (true);


--
-- Name: home_cards_tile_settings Home cards tile settings are public; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Home cards tile settings are public" ON public.home_cards_tile_settings FOR SELECT TO authenticated USING (true);


--
-- Name: matches Matches are public; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Matches are public" ON public.matches FOR SELECT TO authenticated USING (true);


--
-- Name: matches_hero_settings Matches hero settings are readable; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Matches hero settings are readable" ON public.matches_hero_settings FOR SELECT TO authenticated USING (true);


--
-- Name: points Points are public; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Points are public" ON public.points FOR SELECT TO authenticated USING (true);


--
-- Name: prediction_questions Prediction questions are readable by authenticated users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Prediction questions are readable by authenticated users" ON public.prediction_questions FOR SELECT TO authenticated USING (true);


--
-- Name: prediction_questions Questions are public; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Questions are public" ON public.prediction_questions FOR SELECT TO authenticated USING (true);


--
-- Name: scoring_rules Scoring rules are readable by authenticated users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Scoring rules are readable by authenticated users" ON public.scoring_rules FOR SELECT TO authenticated USING (true);


--
-- Name: stage_card_settings Stage card settings are readable; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Stage card settings are readable" ON public.stage_card_settings FOR SELECT TO authenticated USING (true);


--
-- Name: stage_multipliers Stage multipliers are readable by authenticated users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Stage multipliers are readable by authenticated users" ON public.stage_multipliers FOR SELECT TO authenticated USING (true);


--
-- Name: teams Teams are public; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Teams are public" ON public.teams FOR SELECT TO authenticated USING (true);


--
-- Name: user_cards Users and admins read cards; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users and admins read cards" ON public.user_cards FOR SELECT TO authenticated USING (((( SELECT auth.uid() AS uid) = user_id) OR public.is_admin()));


--
-- Name: user_question_predictions Users can delete own question predictions for open questions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own question predictions for open questions" ON public.user_question_predictions FOR DELETE TO authenticated USING (((user_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM public.prediction_questions
  WHERE ((prediction_questions.id = user_question_predictions.question_id) AND (prediction_questions.status = 'open'::text) AND (prediction_questions.lock_at > now()))))));


--
-- Name: user_question_predictions Users can read own question predictions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can read own question predictions" ON public.user_question_predictions FOR SELECT TO authenticated USING ((user_id = auth.uid()));


--
-- Name: user_question_predictions Users can submit own question predictions for open questions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can submit own question predictions for open questions" ON public.user_question_predictions FOR INSERT TO authenticated WITH CHECK (((user_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM public.prediction_questions
  WHERE ((prediction_questions.id = user_question_predictions.question_id) AND (prediction_questions.status = 'open'::text) AND (prediction_questions.lock_at > now()))))));


--
-- Name: user_question_predictions Users can update own question predictions for open questions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own question predictions for open questions" ON public.user_question_predictions FOR UPDATE TO authenticated USING (((user_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM public.prediction_questions
  WHERE ((prediction_questions.id = user_question_predictions.question_id) AND (prediction_questions.status = 'open'::text) AND (prediction_questions.lock_at > now())))))) WITH CHECK (((user_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM public.prediction_questions
  WHERE ((prediction_questions.id = user_question_predictions.question_id) AND (prediction_questions.status = 'open'::text) AND (prediction_questions.lock_at > now()))))));


--
-- Name: predictions Users read own predictions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users read own predictions" ON public.predictions FOR SELECT TO authenticated USING ((user_id = auth.uid()));


--
-- Name: api_providers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.api_providers ENABLE ROW LEVEL SECURITY;

--
-- Name: auth_quotes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.auth_quotes ENABLE ROW LEVEL SECURITY;

--
-- Name: auth_screen_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.auth_screen_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: banner_collections; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.banner_collections ENABLE ROW LEVEL SECURITY;

--
-- Name: card_definitions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.card_definitions ENABLE ROW LEVEL SECURITY;

--
-- Name: hero_slides; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.hero_slides ENABLE ROW LEVEL SECURITY;

--
-- Name: home_cards_tile_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.home_cards_tile_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: leaderboard_state; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.leaderboard_state ENABLE ROW LEVEL SECURITY;

--
-- Name: leaderboard_state leaderboard_state_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY leaderboard_state_read ON public.leaderboard_state FOR SELECT TO authenticated USING (true);


--
-- Name: league_members; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.league_members ENABLE ROW LEVEL SECURITY;

--
-- Name: league_members league_members_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY league_members_select ON public.league_members FOR SELECT TO authenticated USING ((private.current_user_is_league_member(league_id) OR public.is_admin()));


--
-- Name: leagues; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.leagues ENABLE ROW LEVEL SECURITY;

--
-- Name: leagues leagues_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY leagues_delete ON public.leagues FOR DELETE TO authenticated USING (((owner_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.id = auth.uid()) AND (u.role = 'admin'::text))))));


--
-- Name: leagues leagues_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY leagues_insert ON public.leagues FOR INSERT TO authenticated WITH CHECK ((owner_id = auth.uid()));


--
-- Name: leagues leagues_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY leagues_select ON public.leagues FOR SELECT TO authenticated USING (((NOT is_deleted) AND (private.current_user_is_league_member(id) OR public.is_admin())));


--
-- Name: leagues leagues_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY leagues_update ON public.leagues FOR UPDATE TO authenticated USING (((owner_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.id = auth.uid()) AND (u.role = 'admin'::text)))))) WITH CHECK (((owner_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.id = auth.uid()) AND (u.role = 'admin'::text))))));


--
-- Name: matches; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;

--
-- Name: matches_hero_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.matches_hero_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: notifications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

--
-- Name: notifications notifications_select_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY notifications_select_own ON public.notifications FOR SELECT TO authenticated USING ((( SELECT auth.uid() AS uid) = user_id));


--
-- Name: notifications notifications_update_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY notifications_update_own ON public.notifications FOR UPDATE TO authenticated USING ((( SELECT auth.uid() AS uid) = user_id)) WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));


--
-- Name: points; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.points ENABLE ROW LEVEL SECURITY;

--
-- Name: prediction_questions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.prediction_questions ENABLE ROW LEVEL SECURITY;

--
-- Name: predictions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.predictions ENABLE ROW LEVEL SECURITY;

--
-- Name: predictions predictions_delete_own_before_kickoff; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY predictions_delete_own_before_kickoff ON public.predictions FOR DELETE TO authenticated USING (((( SELECT auth.uid() AS uid) = user_id) AND (is_locked = false) AND public.is_active_user(( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1
   FROM public.matches m
  WHERE ((m.id = predictions.match_id) AND (m.kickoff_time > now()))))));


--
-- Name: predictions predictions_insert_own_before_kickoff; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY predictions_insert_own_before_kickoff ON public.predictions FOR INSERT TO authenticated WITH CHECK (((( SELECT auth.uid() AS uid) = user_id) AND public.is_active_user(( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1
   FROM public.matches m
  WHERE ((m.id = predictions.match_id) AND (m.kickoff_time > now()) AND (m.status = 'SCHEDULED'::public.match_status))))));


--
-- Name: predictions predictions_update_own_before_kickoff; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY predictions_update_own_before_kickoff ON public.predictions FOR UPDATE TO authenticated USING (((( SELECT auth.uid() AS uid) = user_id) AND (is_locked = false) AND public.is_active_user(( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1
   FROM public.matches m
  WHERE ((m.id = predictions.match_id) AND (m.kickoff_time > now())))))) WITH CHECK (((( SELECT auth.uid() AS uid) = user_id) AND (is_locked = false) AND public.is_active_user(( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1
   FROM public.matches m
  WHERE ((m.id = predictions.match_id) AND (m.kickoff_time > now()))))));


--
-- Name: scoring_rules; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.scoring_rules ENABLE ROW LEVEL SECURITY;

--
-- Name: stage_card_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.stage_card_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: stage_multipliers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.stage_multipliers ENABLE ROW LEVEL SECURITY;

--
-- Name: teams; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

--
-- Name: user_cards; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_cards ENABLE ROW LEVEL SECURITY;

--
-- Name: user_question_predictions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_question_predictions ENABLE ROW LEVEL SECURITY;

--
-- Name: user_rank_snapshot; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_rank_snapshot ENABLE ROW LEVEL SECURITY;

--
-- Name: user_rank_snapshot user_rank_snapshot_select_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY user_rank_snapshot_select_own ON public.user_rank_snapshot FOR SELECT TO authenticated USING ((( SELECT auth.uid() AS uid) = user_id));


--
-- Name: users; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

--
-- Name: users users_select_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY users_select_all ON public.users FOR SELECT TO authenticated USING (((is_deleted = false) OR (id = auth.uid())));


--
-- Name: users users_update_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY users_update_own ON public.users FOR UPDATE TO authenticated USING (((( SELECT auth.uid() AS uid) = id) AND (is_deleted = false))) WITH CHECK (((( SELECT auth.uid() AS uid) = id) AND (is_deleted = false)));


--
-- PostgreSQL database dump complete
--

\unrestrict 2LYme1Fys9pc1lxL0Dapsl3gRNr4eakbyeLOj9zxk0YJOWOOsIFQBr7U3xPmmyL

