# RETRO FOOTBALL CARDS SYSTEM v2
## World Cup 2026 — Beat The Keeper

### Objective

Create a reusable vertical card system inspired by vintage football posters from the 1960s–1980s.

The cards must preserve:

- Halftone illustrations
- Grunge textures
- Vintage print feeling
- Cutout silhouettes
- Poster-style typography

while matching the application's modern visual identity.

This is NOT a direct recreation.

It is a premium modernization of the retro style.

---

# Design Direction

Visual reference:

- Retro football posters
- Vintage FIFA programs
- Old matchday tickets
- Screen printed sports posters
- Halftone newspaper illustrations

Application style:

- Premium
- Dark
- Modern
- World Cup 2026
- Collectible cards feeling

Users should feel like they are collecting football memorabilia.

---

# Card Dimensions

Vertical Only

```txt
Aspect Ratio:
3 : 4

Recommended Sizes:

360 x 480
540 x 720
720 x 960
```

Border Radius:

```css
16px
```

---

# Color System

Primary App Theme:

```css
--bg-primary: #07111f;
--bg-secondary: #0f1728;

--lime-primary: #a8ff00;
--lime-glow: #c7ff4d;

--cream: #f4ead4;
--retro-blue: #a9cdd6;
--retro-slate: #7d8a86;

--ink: #182324;
```

---

# Card Variants

Generate these variants:

## 1. Match Day

Player kicking ball.

Used for:

- Today's Matches
- Upcoming Matches
- Home hero sections

---

## 2. Prediction

Football centered.

Used for:

- My Predictions
- Prediction history
- Prediction cards

---

## 3. Champion

Trophy centered.

Used for:

- Leaderboard
- Tournament winners
- Rank achievements

---

## 4. Goalkeeper

Keeper holding ball.

Used for:

- Beat The Keeper
- Bonus Challenges
- Defensive prediction mode

---

## 5. Final Match

Player with ball overhead.

Used for:

- Knockout Stage
- Finals
- Special match cards

---

# Layer Structure

Each card must be built using this layer order from bottom to top:

```txt
1. Background Color
2. Vintage Paper Texture
3. Paint Splatter / Grid / Poster Pattern
4. Halftone Illustration
5. White Cutout Outline
6. Typography
7. Grain Overlay
8. Subtle Glow Layer
```

---

# Halftone Rules

Halftone is mandatory.

The illustration must be generated as:

```txt
Black Dots
Variable Radius
Vintage Newspaper Style
```

Avoid:

```txt
Comic Book Style
Pop Art Style
Modern Perfect Dots
Over-clean Digital Pattern
```

Target visual feeling:

```txt
1960s Sports Magazine Print
Old Football Poster
Screen Printed Paper
```

---

# Grunge Texture Rules

Use subtle texture, not dirty or messy design.

Required effects:

- Light paper grain
- Worn poster edges
- Small paint splatters
- Slight print imperfections
- Faded ink areas

Avoid:

- Heavy scratches
- Horror texture
- Too much noise
- Unreadable text

---

# Typography

Recommended fonts:

```txt
Anton
Archivo Black
Oswald Heavy
Bebas Neue
League Spartan
```

Rules:

- Uppercase only
- Condensed or heavy weight
- Tight visual hierarchy
- Slight letter spacing
- Vintage poster alignment

Examples:

```txt
MATCH DAY
FINAL
CHAMPION
DEFEND
FOOTBALL
PREDICT
BEAT THE KEEPER
```

---

# Modern Upgrade Rules

Retro Style = 80%

Modern Premium Feel = 20%

Add:

- Subtle glow
- Soft depth
- Premium shadows
- Slight 3D feel
- Smooth UI polish

Avoid:

- Excessive neon
- Cyberpunk look
- Futuristic sci-fi style
- Overly glossy elements

The final result must still feel vintage.

---

# React Native Component Requirement

Create a reusable component:

```tsx
<RetroFootballCard />
```

Expected props:

```tsx
type RetroFootballCardProps = {
  variant: 'matchDay' | 'prediction' | 'champion' | 'goalkeeper' | 'finalMatch';
  title?: string;
  subtitle?: string;
  badge?: string;
  active?: boolean;
  selected?: boolean;
  winner?: boolean;
  locked?: boolean;
  finished?: boolean;
  image?: ImageSourcePropType;
  onPress?: () => void;
};
```

---

# Card States

## Normal

Default poster card.

## Selected

Used when the user selects a card or prediction.

Visual treatment:

- Lime border
- Slight glow
- Scale up very slightly

## Locked

Used after prediction deadline.

Visual treatment:

- Reduced opacity
- Lock badge
- No heavy blur

## Winner

Used for winning prediction or top-ranked user.

Visual treatment:

- Trophy glow
- Gold accent
- Premium highlight

## Active Match

Used for live or upcoming highlighted match.

Visual treatment:

- Lime pulse
- Small live badge

## Finished Match

Used after result is confirmed.

Visual treatment:

- Stable card
- Score badge
- No animation spam

---

# Motion Design

Keep motion minimal and premium.

Card hover / focus:

```txt
Scale: 1.03
Duration: 160ms
```

Card press:

```txt
Scale: 0.97
Duration: 100ms
```

Winner animation:

```txt
Subtle trophy glow
No confetti loop
No excessive motion
```

---

# Performance Rules

Preferred asset formats:

- SVG for shapes and illustrations
- Optimized PNG for texture overlays
- WebP only when supported safely

Avoid:

- Heavy blur layers
- Huge JPEG backgrounds
- Runtime image processing
- Real-time shaders
- Uncompressed textures

All assets must be optimized for mobile.

---

# Dark Mode Compatibility

Cards must look premium on this app background:

```css
#07111f
```

Rules:

- No card should disappear on dark background
- Add subtle outer shadow
- Add optional lime glow only when active or selected
- Keep retro colors visible but not washed out

---

# UI Kit Integration

The cards must follow the existing app UI Kit.

Codex must:

- Reuse existing spacing tokens
- Reuse existing border radius scale where possible
- Reuse existing shadow/elevation system
- Reuse existing typography utilities where possible
- Avoid creating duplicate theme logic
- Keep naming consistent with the current project structure

---

# Suggested File Structure

```txt
/components/cards/RetroFootballCard.tsx
/components/cards/RetroFootballCard.types.ts
/components/cards/RetroFootballCard.styles.ts
/assets/cards/retro/match-day.png
/assets/cards/retro/prediction.png
/assets/cards/retro/champion.png
/assets/cards/retro/goalkeeper.png
/assets/cards/retro/final-match.png
/assets/cards/retro/texture-grain.png
/assets/cards/retro/texture-splatter.png
/constants/retroCardTokens.ts
```

Adjust paths if the project already has a different structure.

---

# Deliverables

Codex must generate:

## 1. With Typography

Five complete vertical poster cards:

- Match Day
- Prediction
- Champion
- Goalkeeper
- Final Match

## 2. Without Typography

Five clean background versions for dynamic text overlays.

## 3. Assets

Export sizes:

```txt
@1x
@2x
@3x
```

Recommended base size:

```txt
720 x 960
```

## 4. Component

Reusable React Native card component.

## 5. Documentation

Add a short usage example for each card variant.

---

# Application Usage

Use these cards across:

- Home Screen
- Today's Matches
- My Predictions
- Leaderboard
- Tournament
- Knockout Bracket
- User Performance
- Notifications
- Profile

All cards must share the same visual language.

---

# Legal / Copyright Requirement

Do NOT recreate the Shutterstock artwork directly.

The uploaded image is only a style reference.

Create original illustrations that capture:

- Retro Football
- Halftone Print
- Vintage Sports Posters
- World Cup Energy
- Premium collectible card feeling

The final assets must be legally safe and production-ready.

---

# Final Acceptance Checklist

- [ ] Cards are vertical only.
- [ ] Retro halftone style is clearly visible.
- [ ] Grunge texture is subtle and clean.
- [ ] Cards work on dark app background.
- [ ] Cards support selected / locked / winner states.
- [ ] Component is reusable.
- [ ] Assets are optimized for mobile.
- [ ] No direct copyrighted artwork is used.
- [ ] Visual style feels premium, not childish.
- [ ] Implementation follows the existing UI Kit.
