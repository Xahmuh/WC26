# My Cards Feature Spec — World Cup Prediction Platform

## Goal
Build a **My Cards** feature where users can earn limited-use multiplier upgrade cards based on their performance in specific tournament stages.

A card is earned when the user reaches a configurable percentage of the total available points in a stage. The default rule is **70% of the stage total points**.

Once earned, the card allows the user to increase the multiplier of one prediction by a configurable amount, usually **+1 multiplier**, for a limited number of uses, usually **1 use only**.

---

## Core Concept
Each tournament stage can reward a user with a card if they achieve the required percentage of points for that stage.

Example:

- Group Stage total available points = `100`
- Required percentage = `70%`
- User earns `70` points or more
- User unlocks a card
- The card can be used on an eligible match to upgrade the match multiplier

Example usage:

- Round of 32 match has multiplier `x2`
- User uses the earned card
- Prediction multiplier becomes `x3`
- Card usage count decreases
- If usage limit is reached, the card becomes expired/used

---

## Cards Required Initially
The system should support dynamic card creation from the Admin Dashboard, but these are the initial default cards.

### 1. First Stage Card
This card is earned from the **Group Stage**.

| Field | Value |
|---|---|
| Card Name | Configurable by admin |
| Earned From Stage | Group Stage |
| Required Points Percentage | 70% |
| Can Be Used From Stage | Group Stage |
| Can Be Used Until Stage | Round of 32 |
| Usage Limit | 1 time |
| Multiplier Effect | +1 |
| Expiry Rule | Expires after Round of 32 if unused |

### 2. Joker Card
This card is earned from the **Round of 32**.

| Field | Value |
|---|---|
| Card Name | Joker Card |
| Earned From Stage | Round of 32 |
| Required Points Percentage | 70% |
| Can Be Used From Stage | Round of 32 |
| Can Be Used Until Stage | Round of 16 |
| Usage Limit | 1 time |
| Multiplier Effect | +1 |
| Expiry Rule | Expires after Round of 16 if unused |

### 3. Legend Card
This card is earned from the **Round of 16**.

| Field | Value |
|---|---|
| Card Name | Legend Card |
| Earned From Stage | Round of 16 |
| Required Points Percentage | 70% |
| Can Be Used From Stage | Configurable by admin |
| Can Be Used Until Stage | Configurable by admin |
| Usage Limit | 1 time by default |
| Multiplier Effect | +1 by default |
| Expiry Rule | Expires after configured final usable stage if unused |

---

## Admin Dashboard Requirements
Create an admin section called **Cards Management**.

Admin should be able to create, edit, activate, deactivate, and delete card rules.

### Admin Fields
Each card rule must include:

| Field | Type | Required | Description |
|---|---|---:|---|
| Card Name | Text | Yes | Display name of the card |
| Card Description | Textarea | Optional | Short explanation shown to users |
| Card Image | Upload/Image URL | Yes | Visual image of the card |
| Earned From Stage | Dropdown | Yes | Stage where user must achieve the target percentage |
| Required Points Percentage | Number | Yes | Percentage of total stage points needed to unlock the card, e.g. 70 |
| Can Be Used From Stage | Dropdown | Yes | First stage where the card can be used |
| Can Be Used Until Stage | Dropdown | Yes | Last stage where the card can be used |
| Usage Limit | Number | Yes | Number of times the card can be used |
| Multiplier Increment | Number | Yes | How much to increase the match multiplier, e.g. +1 |
| Is Active | Boolean | Yes | Whether this card rule is active |
| Sort Order | Number | Optional | Display order in UI |

---

## Stage Order Logic
The system must understand the tournament stage order.

Suggested stage order:

```ts
const STAGE_ORDER = [
  'GROUP_STAGE',
  'ROUND_OF_32',
  'ROUND_OF_16',
  'QUARTER_FINAL',
  'SEMI_FINAL',
  'THIRD_PLACE',
  'FINAL'
];
```

A card is usable only when:

```ts
currentStage >= canUseFromStage && currentStage <= canUseUntilStage
```

---

## User Card Lifecycle
A user card can have these statuses:

```ts
type UserCardStatus = 'locked' | 'available' | 'used' | 'expired';
```

### Status Rules

| Status | Meaning |
|---|---|
| locked | User has not earned the card yet |
| available | User earned the card and can use it in eligible stages |
| used | User used all available usages |
| expired | Card was not used before the allowed stage window ended |

---

## Earning Logic
After a stage is completed, calculate whether each user has earned the related card.

Formula:

```ts
requiredPoints = totalAvailableStagePoints * (requiredPointsPercentage / 100)
```

User earns card if:

```ts
userStagePoints >= requiredPoints
```

Example:

```ts
totalAvailableStagePoints = 100;
requiredPointsPercentage = 70;
requiredPoints = 70;

if (userStagePoints >= 70) {
  unlockCardForUser();
}
```

Important:

- The calculation should be idempotent.
- Do not create duplicate user cards.
- If the user already has the card, do not create it again.
- Only active card rules should be evaluated.

---

## Usage Logic
When a user opens a match prediction screen, show eligible cards only if:

- The card status is `available`.
- The current match stage is between `canUseFromStage` and `canUseUntilStage`.
- The card has remaining uses.
- The prediction has not already used another card.
- The match has not started yet.
- The prediction is still editable.

When the user applies a card:

```ts
finalPredictionMultiplier = matchBaseMultiplier + card.multiplierIncrement;
```

Example:

```ts
matchBaseMultiplier = 2;
card.multiplierIncrement = 1;
finalPredictionMultiplier = 3;
```

After successful usage:

- Create a card usage record.
- Link the card usage to the prediction.
- Decrease remaining uses.
- If remaining uses reaches `0`, set user card status to `used`.

---

## Expiry Logic
A card should expire automatically when the tournament moves beyond its allowed usage stage.

Example:

- Card can be used until Round of 32.
- Current stage becomes Round of 16.
- If the card is still unused, set status to `expired`.

Expiry should run:

- When stages are updated.
- During match polling/scoring jobs.
- On app load as a safety check.
- Optionally through a scheduled Edge Function/Cron.

---

## Database Tables Proposal

### `card_rules`
Stores admin-created card definitions.

```sql
create table public.card_rules (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  image_url text not null,
  earned_from_stage text not null,
  required_points_percentage numeric not null default 70,
  can_use_from_stage text not null,
  can_use_until_stage text not null,
  usage_limit integer not null default 1,
  multiplier_increment integer not null default 1,
  is_active boolean not null default true,
  sort_order integer default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

### `user_cards`
Stores cards earned by users.

```sql
create table public.user_cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  card_rule_id uuid not null references public.card_rules(id) on delete cascade,
  status text not null default 'available',
  earned_stage text not null,
  earned_points numeric not null default 0,
  required_points numeric not null default 0,
  remaining_uses integer not null default 1,
  earned_at timestamptz not null default now(),
  used_at timestamptz,
  expired_at timestamptz,
  unique(user_id, card_rule_id)
);
```

### `card_usages`
Tracks each card usage.

```sql
create table public.card_usages (
  id uuid primary key default gen_random_uuid(),
  user_card_id uuid not null references public.user_cards(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  match_id uuid not null references public.matches(id) on delete cascade,
  prediction_id uuid not null references public.predictions(id) on delete cascade,
  base_multiplier numeric not null,
  multiplier_increment numeric not null,
  final_multiplier numeric not null,
  used_at timestamptz not null default now(),
  unique(user_card_id, prediction_id)
);
```

---

## Prediction Table Update
Add card-related fields to predictions.

```sql
alter table public.predictions
add column if not exists used_card_id uuid references public.user_cards(id),
add column if not exists base_multiplier numeric,
add column if not exists final_multiplier numeric;
```

Rules:

- `base_multiplier` should store the original match multiplier.
- `final_multiplier` should store the multiplier after card effect.
- If no card is used, `final_multiplier = base_multiplier`.
- Scoring should use `final_multiplier`.

---

## Frontend Requirements

### My Cards Screen
Create a screen called **My Cards**.

It should show:

- Available cards.
- Locked cards.
- Used cards.
- Expired cards.
- Card image.
- Card name.
- Required percentage.
- Earned stage.
- Usage window.
- Remaining uses.
- Multiplier effect.

### Prediction Screen Integration
On eligible match prediction screens:

- Show a card selection area.
- Show only cards valid for the match stage.
- Let user apply one card to the prediction.
- Show clear multiplier preview:

```text
Base Multiplier: x2
Card Bonus: +1
Final Multiplier: x3
```

Before saving prediction, validate again on the backend.

---

## Backend Validation Requirements
Never rely only on frontend validation.

Before applying a card, backend must check:

- User owns the card.
- Card status is `available`.
- Card has remaining uses.
- Match stage is eligible.
- Match has not started.
- Prediction belongs to the same user.
- Prediction has not already used a card.
- Card rule is active.

If validation fails, return a clear error.

---

## Edge Functions / RPC Suggestions
Create RPC or Edge Functions for:

### `evaluate_user_cards_for_stage(stage)`
Evaluates all active card rules for a completed stage and unlocks cards for qualified users.

### `apply_card_to_prediction(user_card_id, prediction_id)`
Applies a card to a prediction after full backend validation.

### `expire_invalid_cards(current_stage)`
Expires cards that passed their allowed usage window.

---

## Scoring Logic Update
Current scoring must use:

```ts
prediction.final_multiplier ?? match.multiplier
```

Do not recalculate the multiplier later from the card rule, because admin settings may change after prediction submission.

The prediction should preserve the multiplier used at the time of submission.

---

## Important Edge Cases
Handle these cases carefully:

1. User earns a card but never uses it.
   - It should expire after the allowed stage window.

2. Admin changes a card rule after users already earned it.
   - Existing user cards should keep their earned state.
   - Existing predictions should keep their final multiplier.

3. User tries to use a card after match kickoff.
   - Block usage.

4. User tries to use two cards on one prediction.
   - Block usage.

5. User deletes or edits prediction.
   - If prediction editing is allowed before kickoff, preserve card usage carefully.
   - Do not allow users to exploit by reusing the same card.

6. Stage total points change.
   - Re-evaluation must be idempotent.
   - Avoid duplicate card grants.

7. Card expires while user is on prediction screen.
   - Backend validation must reject usage.

---

## Acceptance Criteria

- Admin can create/edit/deactivate card rules.
- Admin can upload card image.
- Admin can define required percentage, earned stage, usage stage range, usage limit, and multiplier increment.
- User cards are unlocked automatically when the user reaches the configured percentage.
- User can view cards in My Cards screen.
- User can apply eligible card to one prediction.
- Card increases prediction multiplier correctly.
- Card can only be used within configured stage window.
- Card usage limit is enforced.
- Card expires if unused after allowed stage.
- Scoring uses the prediction final multiplier.
- Backend validation prevents cheating or duplicate usage.

---

## Suggested UI Copy

### Available Card
```text
Ready to use
Upgrade one match multiplier by +1
Valid until Round of 32
```

### Locked Card
```text
Locked
Reach 70% of this stage points to unlock
```

### Used Card
```text
Used
This card has already been applied
```

### Expired Card
```text
Expired
This card was not used before the allowed stage ended
```

---

## Codex Task
Implement the complete **My Cards** system using the existing project architecture.

Please inspect the current database schema, scoring logic, prediction flow, admin dashboard structure, Supabase migrations, and UI kit before implementation.

Do not break existing scoring rules. Add this feature in a clean, modular, and migration-safe way.
