# UI Modernization Guidelines

These rules codify the design direction for every SEEE dashboard app going forward. They complement the existing architecture standards and should be treated as global UI requirements unless a route has a documented exception.

## 1. Palette & Atmosphere
- **Core background:** deep navy graphite gradient (`#05060d → #111426`) applied globally via CSS custom properties; fallback solid `#0b0e1a`.
- **Surface stack:**
  - `bg-card`: translucent slate (`rgba(22, 26, 40, 0.85)`) with 1px border `rgba(255, 255, 255, 0.08)`.
  - `bg-popover`: slightly brighter slate (`rgba(27, 32, 48, 0.9)`).
- **Accent system:**
  - Primary accent: electric cyan (`#4de1ff`).
  - Secondary accent: persimmon orange (`#ff8c4d`).
  - Success/informational chips use teal (`#42f2b8`), warnings use amber (`#f6c546`).
- **State shading:** Hover/active states increase surface brightness by 6% and add `drop-shadow(0 10px 30px rgba(6, 214, 160, 0.15))` for interactive cards.
- **Backdrop blur:** Containers sitting on the root gradient must apply `backdrop-blur-sm` at a minimum.

## 2. Typography
- **Font stack:** Install and default to `"Space Grotesk"` for headings / nav, `"Inter Tight"` for body text. Fallbacks stay `system-ui, sans-serif`.
- **Scale:**
  - Title (`h1`, page headers): `text-3xl sm:text-4xl` with `tracking-tight`.
  - Section headings: `text-xl font-semibold`.
  - Body copy: `text-sm text-muted-foreground`.
- **Number presentation:** Stats or counts should use tabular numerals (`font-feature-settings: 'tnum' 1`).

## 3. Layout & Surfaces
- **Shell padding:** `p-4 md:p-8` for all dashboard shells.
- **Card structure:**
  - Use `border border-white/5 rounded-2xl bg-card/90`. 
  - Top of cards may include a linear gradient hairline (`h-0.5 bg-gradient-to-r from-primary/60 via-transparent to-secondary/40`).
- **Tables:**
  - Replace plain table headers with sticky `bg-transparent/60 backdrop-blur-sm`.
  - Rows alternate `bg-white/2` overlays for readability.

## 4. Navigation & Chrome
- **Sidebar:**
  - Background gradient `from-slate-950/90 via-slate-900/70 to-slate-900/30` with `backdrop-blur-lg`.
  - Active item uses a pill highlight (`bg-primary/20`) and 2px accent bar on the left.
  - Provide an icon-only collapsed state ≥1440px wide with tooltip labels.
- **Top bar:** Transparent glass panel with subtle bottom border `rgba(255, 255, 255, 0.06)`.

## 5. Motion & Interaction
- **Entry motion:** Lists and card grids stagger in using `opacity-[0→1]` and `translate-y-[12px→0]` over 160ms, 40ms delay per item (Framer Motion `LayoutGroup`).
- **Feedback:** Buttons use `scale-95` press states; skeleton loaders shimmer using `bg-[length:200%_100%] animate-[shimmer_1.5s_linear_infinite]`.
- **Route transitions:** Fade/slide content when switching dashboard tabs with `motion.div` wrappers (200ms ease-out).

## 6. Data Visualization Accents
- **Micro charts:** Use Tailwind `bg-gradient-to-r from-primary/80 to-secondary/60` for mini progress bars; heights 6px, rounded-full.
- **Chips:** Attendance status chips adopt `bg-white/10` and accent border matching the status color.

## 7. Accessibility & Contrast
- Maintain WCAG AA contrast: ensure text on translucent surfaces reaches ≥4.5:1 by combining lighter text (`text-slate-100`) with darker overlays.
- Preserve shadcn focus rings but recolor to `rgba(77, 225, 255, 0.8)` for consistency with the new primary accent.

These guidelines should be referenced before introducing any new component or layout. Future app work (Planner, Admin, Platform) must share this language so that the multi-app experience feels unified.
