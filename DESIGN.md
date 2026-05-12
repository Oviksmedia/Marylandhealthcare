---
version: "2.0"
updated: "2026-05-11"
status: "Logo-informed, production-ready"

# DESIGN TOKENS — used by code directly
colors:
  # Primary brand teal — matches logo dark HC side
  primary:
    DEFAULT: "oklch(0.40 0.13 193)"        # Deep slate-teal #0A5C5C
    bright: "oklch(0.65 0.17 193)"         # Bright cyan-teal #00A5A0 (logo M shape)
    hover: "oklch(0.35 0.12 193)"          # Darker on hover
    light: "oklch(0.95 0.04 193)"          # Soft teal surface
    on-primary: "#FFFFFF"                  # White text on teal

  # Semantic backgrounds
  background:
    canvas: "oklch(0.98 0.01 85)"          # Warm cream #F9F5EE — not pure white
    surface: "oklch(0.96 0.01 85)"         # Slightly darker card surface
    dark: "oklch(0.40 0.13 193)"           # Deep teal for inverted sections

  # Text
  text:
    main: "oklch(0.12 0.01 220)"           # Near-black #111111
    muted: "oklch(0.50 0.02 220)"          # Muted slate for body
    inverse: "oklch(0.98 0.01 85)"         # Cream on dark backgrounds
    eyebrow: "oklch(0.40 0.13 193)"        # Primary teal for eyebrow labels

  # Accent — emergency and urgency ONLY
  accent:
    emergency: "oklch(0.58 0.17 30)"       # Warm coral #B85C45
    emergency-hover: "oklch(0.52 0.15 30)"

  # Semantic feedback
  feedback:
    success: "oklch(0.55 0.15 155)"
    warning: "oklch(0.78 0.18 75)"
    error: "oklch(0.55 0.20 25)"

typography:
  fonts:
    serif: "'Playfair Display', 'Georgia', serif"      # Headlines — authority + legacy
    sans: "'Inter', 'DM Sans', system-ui, sans-serif"  # Body, UI, data
  scale:
    display: "clamp(3.5rem, 6vw, 5.5rem)"    # Hero headline
    h1: "clamp(2.5rem, 4vw, 4rem)"           # Page headline
    h2: "clamp(1.75rem, 2.5vw, 2.5rem)"      # Section headline
    h3: "clamp(1.25rem, 1.8vw, 1.5rem)"      # Card/component headline
    body-lg: "1.25rem"                        # Lead paragraph
    body: "1rem"                              # Standard body
    small: "0.875rem"                         # Labels, captions
    eyebrow: "0.75rem"                        # Uppercase labels
  tracking:
    tight: "-0.03em"                          # Display + h1
    normal: "-0.01em"                         # h2, h3
    wide: "0.1em"                             # Eyebrow labels
    wider: "0.15em"                           # Nav links
  leading:
    display: "1.0"                            # Display headlines
    heading: "1.15"                           # h2, h3
    body: "1.65"                              # Readable body text

spacing:
  base: "8px"
  xs: "0.5rem"   # 4px  — micro gaps
  sm: "1rem"     # 8px  — tight internal
  md: "2rem"     # 16px — standard component gap
  lg: "4rem"     # 32px — between sections (mobile)
  xl: "7rem"     # 56px — major section padding (desktop)
  xxl: "12rem"   # 96px — hero vertical space
  container-max: "1440px"
  container-pad: "clamp(1.5rem, 5vw, 5rem)"
  section-pad: "clamp(4rem, 8vw, 7rem)"

radius:
  sm: "8px"
  md: "16px"
  lg: "32px"
  xl: "48px"
  pill: "9999px"

shadows:
  soft: "0 4px 24px -4px rgba(0,0,0,0.06)"
  card: "0 8px 32px -8px rgba(0,0,0,0.08)"
  hover: "0 16px 48px -12px rgba(10,92,92,0.15)"  # Teal-tinted hover shadow
  float: "0 20px 60px -15px rgba(0,0,0,0.12)"    # Floating cards

motion:
  curve-standard: "cubic-bezier(0.16, 1, 0.3, 1)"  # Snappy, premium
  curve-out: "cubic-bezier(0.0, 0.0, 0.2, 1)"
  duration-fast: "0.15s"
  duration-standard: "0.4s"
  duration-slow: "0.8s"
  duration-cinematic: "1.2s"
---

# DESIGN.md — Maryland Healthcare Port Harcourt
# Visual Design System · Impeccable Standard v2.0

---

## Overview

This document defines the complete visual system for the Maryland Healthcare redesign. Every token in this file is a production decision — not a suggestion. All code must use these values. No ad-hoc colors, no arbitrary spacing, no font choices outside this system.

**Core design philosophy:** The visual system must communicate 44 years of earned trust in the first three seconds a patient sees the page. Warmth, specificity, and permanence — never generic, never sterile, never corporate.

---

## Logo Integration

The MHC logo has two teal tones and a near-black wordmark:
- **Bright teal** (M + slanted shape): `oklch(0.65 0.17 193)` — `#00A5A0` approx
- **Dark slate-teal** (H + C): `oklch(0.40 0.13 193)` — `#0A5C5C` approx
- **Wordmark**: Near-black `#111111`

**Logo usage rules:**
- On light backgrounds: full-color logo (both teal tones + black wordmark)
- On dark/teal backgrounds: white-only version (wordmark in white)
- Minimum size: 120px wide on desktop, 80px on mobile
- Clear space: equal to the height of the "M" letterform on all sides
- Never stretch, recolor, or place on a busy background without overlay

---

## Color System

All colors use OKLCH for perceptual uniformity. Values are in the YAML frontmatter above for direct code use.

### Primary Palette

| Role | Token | OKLCH | Hex approx | Use |
|---|---|---|---|---|
| Brand primary | `--primary` | `oklch(0.40 0.13 193)` | `#0A5C5C` | CTAs, links, nav active, eyebrow teal |
| Brand bright | `--primary-bright` | `oklch(0.65 0.17 193)` | `#00A5A0` | Accents, logo echo, hover highlights |
| Primary hover | `--primary-hover` | `oklch(0.35 0.12 193)` | `#084F4F` | Button hover states |
| Teal surface | `--primary-light` | `oklch(0.95 0.04 193)` | `#EBF7F7` | Card backgrounds, active chips |

### Background Palette

| Role | Token | Value | Use |
|---|---|---|---|
| Canvas | `--bg-canvas` | `oklch(0.98 0.01 85)` | Main page background — warm cream, not pure white |
| Surface | `--bg-surface` | `oklch(0.96 0.01 85)` | Cards, panels, form backgrounds |
| Dark | `--bg-dark` | `oklch(0.40 0.13 193)` | Inverted sections (telemedicine CTA, footer) |

### Text Palette

| Role | Token | Value | Use |
|---|---|---|---|
| Primary text | `--text-main` | `oklch(0.12 0.01 220)` | All headlines, body copy |
| Muted text | `--text-muted` | `oklch(0.50 0.02 220)` | Subheadings, labels, captions |
| Inverse | `--text-inverse` | `oklch(0.98 0.01 85)` | Text on dark/teal backgrounds |
| Eyebrow | `--text-eyebrow` | `oklch(0.40 0.13 193)` | Section eyebrow labels |

### Accent Palette

| Role | Token | Value | Use |
|---|---|---|---|
| Emergency | `--accent-emergency` | `oklch(0.58 0.17 30)` | Emergency number, urgent CTAs, phone link |
| Emergency hover | `--accent-emergency-hover` | `oklch(0.52 0.15 30)` | Hover state on emergency elements |

> [!IMPORTANT]
> The coral/terracotta accent is **EXCLUSIVELY** for emergency and urgent elements. Do not use it for decorative purposes or general CTAs.

---

## Typography

### Font Families

**Serif (Headlines):** Playfair Display
- Load from Google Fonts: `weights: 400, 600, 700`
- Used for: hero headlines, section headlines (h2), CMD section, any "legacy moment" copy
- Why: authoritative, editorial, warm — signals an institution with history, not a startup

**Sans (Body + UI):** Inter
- Load from Google Fonts: `weights: 300, 400, 500, 600, 700`
- Used for: body text, nav, buttons, labels, stats, captions
- Why: maximum readability across all ages and devices

### Type Scale

| Element | Font | Size | Weight | Tracking | Leading |
|---|---|---|---|---|---|
| Hero headline | Serif | `clamp(3.5rem, 6vw, 5.5rem)` | 700 | `-0.03em` | 1.0 |
| Page h1 | Serif | `clamp(2.5rem, 4vw, 4rem)` | 700 | `-0.03em` | 1.1 |
| Section h2 | Serif | `clamp(1.75rem, 2.5vw, 2.5rem)` | 600 | `-0.02em` | 1.15 |
| Component h3 | Sans | `clamp(1.25rem, 1.8vw, 1.5rem)` | 600 | `-0.01em` | 1.25 |
| Lead paragraph | Sans | `1.25rem` | 400 | `0` | 1.65 |
| Body | Sans | `1rem` | 400 | `0` | 1.65 |
| Eyebrow label | Sans | `0.75rem` | 600 | `0.12em` | 1.4 |
| Button | Sans | `1rem` | 600 | `0.02em` | 1 |
| Caption/stat label | Sans | `0.8rem` | 500 | `0.04em` | 1.4 |

### Typographic Rules

1. **Serif is for legacy moments.** Hero, CMD section, 44-year milestones, and the "Since 1982" anchor. Do not use serif for UI elements, buttons, or functional text.
2. **One headline per section maximum.** No competing h2s in the same visual zone.
3. **The stat number is large, the label is small.** Stats (44, 24/7, 3 Generations) are bold and prominent. Their labels (years of service, etc.) are small and muted. Never equal weight.
4. **Eyebrow labels are always teal + uppercase + wide tracking.** Never black, never lowercase, never mixed with the primary serif.

---

## Spatial System

### Grid

- **Max width:** 1440px
- **Container padding:** `clamp(1.5rem, 5vw, 5rem)` — scales naturally
- **Section vertical padding:** `clamp(4rem, 8vw, 7rem)`
- **Hero min-height:** 100dvh (dynamic viewport height)
- **Column gaps:** 2rem (mobile), 4rem (desktop)

### Spacing Scale

All spacing must use the defined tokens. No arbitrary pixel values.

```css
--space-xs: 0.5rem;
--space-sm: 1rem;
--space-md: 2rem;
--space-lg: 4rem;
--space-xl: 7rem;
--space-xxl: 12rem;
```

**Section rhythm rule:** Major sections alternate between canvas and dark backgrounds. This creates natural visual breathing — not everything on white.

---

## Component Patterns

### Buttons

**Primary CTA:**
- Background: `--primary` (deep teal)
- Text: white
- Radius: pill (`9999px`)
- Padding: `1rem 2.5rem`
- Hover: `--primary-hover` + `translateY(-2px)` + teal-tinted shadow
- Font: Sans, 1rem, weight 600

**Emergency CTA:**
- Background: transparent or cream
- Text + border: `--accent-emergency` (coral)
- Hover: fills coral, white text
- Always paired with phone icon (Lucide `Phone`)

**Ghost/Secondary:**
- Background: transparent
- Text: `--primary`
- Border: 1.5px solid `--primary`
- Hover: fills with `--primary-light`

### Cards

- Background: `--bg-surface`
- Radius: `--radius-lg` (32px)
- Shadow: `--shadow-card`
- Hover: `translateY(-4px)` + `--shadow-hover`
- Padding: `2rem`
- Service label: eyebrow style (teal, uppercase, tracked)

### Floating Badge
- Small rounded card (radius: 16px)
- Background: `--bg-canvas` (cream)
- Shadow: `--shadow-float`
- Border: 1px solid `oklch(0.90 0.03 193)` (faint teal)
- Content: small icon + text in `--primary`
- Used for: founding date badge, review count, HMO logo card

### Eyebrow Labels
- Font: Sans, 0.75rem, weight 600
- Color: `--text-eyebrow` (primary teal)
- Text-transform: uppercase
- Letter-spacing: 0.12em
- Margin-bottom: 1rem before headline

### Stats Display
- Number: Serif or bold Sans, 2.5–4rem, `--primary`
- Label: Sans, 0.85rem, `--text-muted`, `margin-top: 0.25rem`
- Dividers: 1px `--primary-light` vertical lines between stat items

### Navigation
- Desktop: transparent on photo heroes, white/cream with bottom border on light heroes
- Logo: left
- Links: center, Sans 0.95rem, `--text-muted`, hover → `--primary`
- Emergency number: right, coral, with phone icon, always visible
- Mobile: hamburger at right, slide-in drawer

---

## Motion Design

### Guiding Principle
Motion reveals hierarchy. Sections reveal as the user scrolls — content doesn't dump all at once. The hospital is calm and deliberate; the motion reflects that.

### Patterns

| Pattern | Implementation | Trigger |
|---|---|---|
| Hero content reveal | `opacity: 0 → 1`, `translateY(30px → 0)` | Page load |
| Hero image reveal | `scale(1.02 → 1)`, `opacity` | Page load, 0.2s delay |
| Section reveal | `opacity`, `translateY(20px → 0)` | Scroll intersection |
| Card hover | `translateY(-4px)` + shadow deepen | Hover |
| Button hover | `translateY(-2px)` + shadow | Hover |
| Stat counter | Number count-up animation | Intersection |

### Motion Rules
- **Duration:** Standard reveals 0.6–0.8s with `cubic-bezier(0.16, 1, 0.3, 1)`
- **Stagger:** When multiple elements reveal, stagger by 0.1–0.15s
- **No layout animation:** Never animate `width`, `height`, or `padding`. Animate `transform` and `opacity` only.
- **Respect prefers-reduced-motion:** All animations wrapped in `@media (prefers-reduced-motion: no-preference)`

---

## Section-Level Design Rules

### Hero
- **Rule:** Image must show a human relationship (doctor + patient), never equipment alone
- **Overlay:** Dark gradient from bottom 50% for text legibility on photo heroes
- **Emergency CTA:** Visible in nav — not inside the hero body
- **No carousel.** Single, static, deliberate scene.
- **"44 Years" or "Est. 1982"** must appear above the fold

### Services Section
- **Rule:** Telemedicine is NOT equal to other services — it gets a separate elevated section
- **The 6-service grid** comes after the telemedicine feature section
- **Emergency Care** card always has coral accent treatment (border, badge, or icon color)
- No lorem ipsum — all real service descriptions from PRODUCT.md

### Telemedicine Section
- **Full-width inverted section** (dark teal background, cream text)
- Leads with the hook: "Skip the traffic." — not a generic description
- Shows a 3-step process: Book → Connect → Receive Care
- Dedicated CTA: "Book a Virtual Session"

### CMD Section (Dr. Ekwelibe)
- Large portrait — not a thumbnail
- His name in serif, prominent
- A direct personal quote — not a bio paragraph
- Three facts below: years of experience, specialty, philosophy

### Testimonials
- Real names: Nneka Nwosu, Tunde Bakare, Blessing Amadi
- Real affiliations: AxaMansard HMO, Solewant LLC — displayed visibly
- Card format — not a full-width quote block

### Footer
- Dark teal background (inverted)
- All contact info: address, two phone numbers, email
- Logo in white version
- "Established 1982" in the copyright line — never absent

---

## Do's and Don'ts

### Do
- ✅ Use the warm cream canvas (`#F9F5EE`) as the default background — never pure white
- ✅ Place emergency phone number in the nav, always visible, always in coral
- ✅ Use Playfair Display for all headline moments — legacy, authority, section titles
- ✅ Show real patient names and real HMO affiliations in testimonials
- ✅ Make "44 Years" or "Est. 1982" appear before the first scroll
- ✅ Give telemedicine its own elevated section — separate from the services grid
- ✅ Apply hover lift (`translateY(-4px)`) to all interactive cards
- ✅ Use teal-tinted shadows for hover states — not generic black shadows
- ✅ Stagger reveal animations when multiple elements enter together

### Don't
- ❌ Use pure white (#FFFFFF) as the primary page background
- ❌ Use blue, navy, or forest green as the primary color — the logo is teal
- ❌ Use the coral accent for anything except emergency/urgent actions
- ❌ Use Inter for display headlines — that's the current site's mistake
- ❌ Treat all six services as equal visual weight — Emergency and Telemedicine are elevated
- ❌ Create generic CTAs: "Learn More", "Click Here", "Get Started" — be specific
- ❌ Animate layout properties (width, height, padding) — only transform and opacity
- ❌ Place the logo in a colored box or on a busy background without proper overlay
- ❌ Leave the founding year out of any page that has a footer
- ❌ Use stock imagery that could appear on any hospital website in the world
