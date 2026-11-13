// Fuente única de tokens (R06). Valores tomados de docs/templates/catalogo-componentes-nudo.html.
// Tres niveles: primitivo → semántico → componente. Cada nivel solo referencia al anterior
// y los tipos lo garantizan: un semántico solo acepta nombres de primitivos y un token de
// componente solo acepta nombres de semánticos. Mapa completo: docs/design-tokens-map.md.

/** Nivel 1 · Primitivos (`--p-*`). Únicos valores literales del sistema. */
export const primitives = {
  // Color · ink
  "ink-1000": "#0A0F25",
  "ink-950": "#0E1430",
  "ink-900": "#17203B",
  "ink-850": "#1B2445",
  "ink-800": "#252F52",
  "ink-700": "#3A4366",
  "ink-500": "#6B7395",
  "ink-300": "#AEB3C8",
  "ink-100": "#E2E4EC",
  // Color · concrete
  "concrete-0": "#FFFFFF",
  "concrete-50": "#F6F7F4",
  "concrete-100": "#ECEEEA",
  "concrete-200": "#DDE0DA",
  "concrete-300": "#C9CDC5",
  // Color · cobalt
  "cobalt-900": "#1D2A6B",
  "cobalt-700": "#1A2BB8",
  "cobalt-600": "#2338E0",
  "cobalt-500": "#3550FF",
  "cobalt-300": "#9AA8FF",
  "cobalt-100": "#E3E7FF",
  // Color · coral
  "coral-900": "#4A1F33",
  "coral-700": "#C22546",
  "coral-600": "#E23A5B",
  "coral-500": "#FF4F6E",
  "coral-300": "#F2A6B6",
  "coral-200": "#FFC2CE",
  "coral-175": "#FFC9D4",
  "coral-150": "#FFD9E1",
  "coral-100": "#FFE6EB",
  // Color · estados
  "green-900": "#143A2A",
  "green-600": "#17784A",
  "green-300": "#7FD8A8",
  "green-100": "#DDF3E7",
  "amber-900": "#3D2E0D",
  "amber-600": "#A86A00",
  "amber-300": "#F5C76A",
  "amber-100": "#FFF0CC",
  "red-900": "#45201D",
  "red-600": "#C42E24",
  "red-300": "#FF9C93",
  "red-100": "#FDE2DF",
  // Tipografía (`--font-archivo` lo define next/font en apps/web)
  "font-sans":
    'var(--font-archivo, "Archivo"), ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
  "font-mono": 'ui-monospace, "SF Mono", "Cascadia Code", Menlo, monospace',
  "size-12": "0.75rem",
  "size-14": "0.875rem",
  "size-16": "1rem",
  "size-18": "1.125rem",
  "size-22": "1.375rem",
  "size-28": "1.75rem",
  "size-36": "2.25rem",
  "size-56": "3.5rem",
  "size-88": "5.5rem",
  "weight-400": "400",
  "weight-500": "500",
  "weight-600": "600",
  "weight-700": "700",
  "weight-800": "800",
  "leading-110": "1.1",
  "leading-130": "1.3",
  "leading-150": "1.5",
  "tracking-tight": "-0.02em",
  "tracking-0": "0",
  "tracking-wide": "0.06em",
  // Espaciado
  "space-0": "0",
  "space-1": "0.25rem",
  "space-2": "0.5rem",
  "space-3": "0.75rem",
  "space-4": "1rem",
  "space-5": "1.25rem",
  "space-6": "1.5rem",
  "space-8": "2rem",
  "space-10": "2.5rem",
  "space-12": "3rem",
  "space-16": "4rem",
  // Dimensiones de componentes (en el catálogo eran literales de nivel 3)
  "dim-28": "1.75rem",
  "dim-36": "2.25rem",
  "dim-44": "2.75rem",
  "dim-64": "4rem",
  "dim-384": "24rem",
  "dim-1280": "80rem",
  "ratio-4-5": "4 / 5",
  "border-1": "1px",
  "border-2": "2px",
  // Radios
  "radius-0": "0",
  "radius-2": "2px",
  "radius-6": "6px",
  "radius-12": "12px",
  "radius-full": "999px",
  // Sombras
  "shadow-1": "0 1px 2px rgb(14 20 48 / 0.08)",
  "shadow-2": "0 6px 18px -6px rgb(14 20 48 / 0.18)",
  "shadow-3": "0 24px 48px -16px rgb(14 20 48 / 0.32)",
  // Movimiento
  "duration-0": "0.01ms",
  "duration-75": "75ms",
  "duration-150": "150ms",
  "duration-250": "250ms",
  "duration-400": "400ms",
  "duration-1400": "1400ms",
  "ease-out": "cubic-bezier(0.2, 0.8, 0.2, 1)",
  "ease-in-out": "cubic-bezier(0.6, 0, 0.3, 1)",
  "ease-snap": "cubic-bezier(0.3, 1.4, 0.5, 1)",
  // Z-index
  "z-base": "0",
  "z-sticky": "10",
  "z-drawer": "40",
  "z-toast": "60",
} as const;

export type PrimitiveName = keyof typeof primitives;

/** Nivel 2 · Semánticos, tema claro (default). Solo referencian primitivos. */
export const semantic = {
  "font-body": "font-sans",
  "font-code": "font-mono",

  "text-xs": "size-12",
  "text-sm": "size-14",
  "text-md": "size-16",
  "text-lg": "size-18",
  "text-xl": "size-22",
  "text-2xl": "size-28",
  "text-3xl": "size-36",
  "text-display": "size-56",
  "text-hero": "size-88",

  "weight-regular": "weight-400",
  "weight-medium": "weight-500",
  "weight-semibold": "weight-600",
  "weight-bold": "weight-700",
  "weight-heavy": "weight-800",
  "leading-tight": "leading-110",
  "leading-snug": "leading-130",
  "leading-body": "leading-150",
  "tracking-display": "tracking-tight",
  "tracking-normal": "tracking-0",
  "tracking-caps": "tracking-wide",

  "space-none": "space-0",
  "space-2xs": "space-1",
  "space-xs": "space-2",
  "space-sm": "space-3",
  "space-md": "space-4",
  "space-lg": "space-6",
  "space-xl": "space-8",
  "space-2xl": "space-12",
  "space-3xl": "space-16",

  "size-control-md": "dim-44",
  "size-control-sm": "dim-36",
  "size-swatch": "dim-28",
  "size-header": "dim-64",
  "size-drawer": "dim-384",
  "size-container": "dim-1280",
  "ratio-product": "ratio-4-5",
  "border-thin": "border-1",
  "border-thick": "border-2",

  "radius-none": "radius-0",
  "radius-control": "radius-2",
  "radius-card": "radius-6",
  "radius-panel": "radius-12",
  "radius-pill": "radius-full",

  "shadow-raised": "shadow-1",
  "shadow-overlay": "shadow-2",
  "shadow-drawer": "shadow-3",

  "motion-none": "duration-0",
  "motion-instant": "duration-75",
  "motion-fast": "duration-150",
  "motion-base": "duration-250",
  "motion-slow": "duration-400",
  "motion-loop": "duration-1400",
  "ease-enter": "ease-out",
  "ease-move": "ease-in-out",
  "ease-feedback": "ease-snap",

  "layer-base": "z-base",
  "layer-sticky": "z-sticky",
  "layer-drawer": "z-drawer",
  "layer-toast": "z-toast",

  "color-bg": "concrete-100",
  "color-surface": "concrete-50",
  "color-surface-raised": "concrete-0",
  "color-surface-sunken": "concrete-200",
  "color-text-primary": "ink-900",
  "color-text-secondary": "ink-700",
  "color-text-muted": "ink-500",
  "color-text-inverse": "concrete-50",
  "color-border": "concrete-300",
  "color-border-strong": "ink-900",
  "color-accent": "cobalt-500",
  "color-accent-hover": "cobalt-600",
  "color-accent-contrast": "concrete-0",
  "color-accent-subtle": "cobalt-100",
  "color-action": "ink-900",
  "color-action-hover": "ink-800",
  "color-action-contrast": "concrete-50",
  "color-sale": "coral-600",
  "color-sale-subtle": "coral-100",
  "color-success": "green-600",
  "color-success-subtle": "green-100",
  "color-warning": "amber-600",
  "color-warning-subtle": "amber-100",
  "color-danger": "red-600",
  "color-danger-subtle": "red-100",
  "color-focus": "cobalt-500",
  "color-skeleton": "concrete-200",
  "color-skeleton-shine": "concrete-50",
  "color-product-stage": "concrete-200",
} as const satisfies Record<string, PrimitiveName>;

export type SemanticName = keyof typeof semantic;

/** Nivel 3 · Componente. Solo referencian semánticos. */
export const component = {
  "button-primary-bg": "color-action",
  "button-primary-bg-hover": "color-action-hover",
  "button-primary-fg": "color-action-contrast",
  "button-accent-bg": "color-accent",
  "button-accent-bg-hover": "color-accent-hover",
  "button-accent-fg": "color-accent-contrast",
  "button-secondary-border": "color-border-strong",
  "button-secondary-fg": "color-text-primary",
  "button-radius": "radius-control",
  "button-height-md": "size-control-md",
  "button-height-sm": "size-control-sm",

  "input-bg": "color-surface-raised",
  "input-border": "color-border",
  "input-border-focus": "color-focus",
  "input-border-error": "color-danger",
  "input-radius": "radius-control",
  "input-height": "size-control-md",

  "swatch-size": "size-swatch",
  "swatch-ring": "color-border-strong",
  "swatch-gap": "space-xs",

  "card-bg": "color-surface-raised",
  "card-radius": "radius-card",
  "card-media-bg": "color-product-stage",
  "card-media-ratio": "ratio-product",

  "badge-new-bg": "color-accent-subtle",
  "badge-new-fg": "color-accent-hover",
  "badge-sale-bg": "color-sale-subtle",
  "badge-sale-fg": "color-sale",

  "drawer-width": "size-drawer",
  "drawer-bg": "color-surface-raised",
  "header-height": "size-header",
} as const satisfies Record<string, SemanticName>;

export type ComponentName = keyof typeof component;

type ThemeOverride = {
  readonly semantic: Partial<Record<SemanticName, PrimitiveName>>;
  readonly component?: Partial<Record<ComponentName, SemanticName>>;
};

/** Temas: solo reasignan semánticos (y, si el catálogo lo pide, a qué semántico apunta un componente). */
export const themes = {
  dark: {
    semantic: {
      "color-bg": "ink-950",
      "color-surface": "ink-900",
      "color-surface-raised": "ink-800",
      "color-surface-sunken": "ink-1000",
      "color-text-primary": "concrete-50",
      "color-text-secondary": "ink-100",
      "color-text-muted": "ink-300",
      "color-text-inverse": "ink-900",
      "color-border": "ink-700",
      "color-border-strong": "concrete-100",
      "color-accent": "cobalt-300",
      "color-accent-hover": "cobalt-100",
      "color-accent-contrast": "ink-950",
      "color-accent-subtle": "cobalt-900",
      "color-action": "concrete-50",
      "color-action-hover": "concrete-200",
      "color-action-contrast": "ink-900",
      "color-sale": "coral-200",
      "color-sale-subtle": "coral-900",
      "color-success": "green-300",
      "color-success-subtle": "green-900",
      "color-warning": "amber-300",
      "color-warning-subtle": "amber-900",
      "color-danger": "red-300",
      "color-danger-subtle": "red-900",
      "color-focus": "cobalt-300",
      "color-skeleton": "ink-700",
      "color-skeleton-shine": "ink-500",
      "color-product-stage": "ink-850",
    },
  },
  drop: {
    semantic: {
      "color-bg": "coral-150",
      "color-surface": "coral-100",
      "color-surface-raised": "concrete-0",
      "color-surface-sunken": "coral-200",
      "color-text-primary": "ink-950",
      "color-text-secondary": "ink-800",
      "color-text-muted": "ink-700",
      "color-border": "coral-300",
      "color-border-strong": "ink-950",
      "color-accent": "coral-600",
      "color-accent-hover": "coral-700",
      "color-accent-contrast": "concrete-0",
      "color-accent-subtle": "coral-100",
      "color-action": "cobalt-600",
      "color-action-hover": "cobalt-700",
      "color-action-contrast": "concrete-0",
      "color-sale": "cobalt-600",
      "color-sale-subtle": "cobalt-100",
      "color-focus": "cobalt-600",
      "color-skeleton": "coral-200",
      "color-skeleton-shine": "coral-100",
      "color-product-stage": "coral-175",
      "radius-card": "radius-0",
      "radius-control": "radius-0",
    },
    component: {
      "badge-new-bg": "color-text-primary",
      "badge-new-fg": "color-accent-subtle",
    },
  },
} as const satisfies Record<string, ThemeOverride>;

/** `auto` aplica `dark` cuando el sistema lo prefiere; `light` es el default sin atributo. */
export const themeNames = ["light", "dark", "drop", "auto"] as const;
export type ThemeName = (typeof themeNames)[number];
export const defaultTheme: ThemeName = "light";

/** Breakpoints para media queries (ADR 002 §5). Los componentes usan container queries. */
export const breakpoints = {
  sm: "40rem",
  md: "60rem",
  lg: "80rem",
} as const;

export type BreakpointName = keyof typeof breakpoints;
