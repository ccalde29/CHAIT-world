// ============================================================================
// CHAIT World — UI Design System
// Named Tailwind class constants for consistent styling across components.
// Import what you need: import { btn, input, card, text, modal } from '../styles/ui';
// ============================================================================

// ── Surfaces ─────────────────────────────────────────────────────────────────

export const surface = {
  /** Primary page / modal background */
  base:    'bg-gray-900',
  /** Slightly elevated panel (cards, sidebars) */
  raised:  'bg-gray-800',
  /** Subtle inset: inputs, code blocks, read-only areas */
  inset:   'bg-white/5',
  /** Hover-state surface lift */
  hover:   'hover:bg-white/10',
  /** Active / selected surface */
  active:  'bg-white/10',
  /** Warn tinted surface (admin, caution areas) */
  warn:    'bg-orange-600/10',
};

// ── Borders ───────────────────────────────────────────────────────────────────

export const border = {
  /** Default subtle divider */
  base:    'border border-white/10',
  /** Section separator (used as top border on sticky footers/headers) */
  divider: 'border-t border-white/10',
  /** Focused input border */
  focus:   'focus:border-red-400',
  /** Accent (orange) border for highlight panels */
  accent:  'border border-orange-500/30',
  /** Danger border */
  danger:  'border border-red-500/30',
  /** Success border */
  success: 'border border-green-500/30',
};

// ── Text ──────────────────────────────────────────────────────────────────────

export const text = {
  /** Primary white headings */
  heading:    'text-white font-semibold',
  /** Standard body copy */
  body:       'text-gray-300',
  /** De-emphasised help text / captions */
  muted:      'text-gray-400',
  /** Very quiet — hints, counts */
  subtle:     'text-gray-500',
  /** Dimmed — e.g. column range labels */
  dim:        'text-gray-600',
  /** Accent orange — icons, active labels */
  accent:     'text-orange-500',
  /** Soft accent — secondary orange */
  accentSoft: 'text-orange-400',
  /** Success */
  success:    'text-green-400',
  /** Error / warning */
  warn:       'text-orange-400',
  /** Placeholder inside inputs */
  placeholder:'placeholder-gray-500',
};

// ── Form inputs ───────────────────────────────────────────────────────────────

export const input = {
  /** Standard single-line text input */
  base: 'w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white placeholder-gray-500 focus:outline-none focus:border-red-400',
  /** Compact variant (selects, small inputs) */
  sm:   'w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-red-400',
  /** Textarea */
  area: 'w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white placeholder-gray-500 focus:outline-none focus:border-red-400 resize-none',
  /** Range slider accent */
  range:'accent-red-500',
  /** Error state border override */
  error:'border-red-400',
};

// ── Buttons ───────────────────────────────────────────────────────────────────

export const btn = {
  /** Primary CTA — orange fill */
  primary:   'px-5 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
  /** Secondary — ghost with border */
  secondary: 'px-5 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-lg transition-colors disabled:opacity-50',
  /** Destructive */
  danger:    'px-5 py-2 bg-red-600/80 hover:bg-red-600 text-white rounded-lg transition-colors',
  /** Icon-only ghost */
  icon:      'p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors',
  /** Icon-only danger */
  iconDanger:'p-2 rounded-lg bg-white/5 hover:bg-red-600/20 text-gray-400 hover:text-red-400 transition-colors',
  /** Small text link style */
  link:      'text-xs text-gray-500 hover:text-orange-400 transition-colors',
  /** Admin / warn tinted */
  warn:      'px-3 py-2 bg-orange-600/20 hover:bg-orange-600/30 text-orange-400 border border-orange-500/30 rounded-lg transition-colors text-sm disabled:opacity-50',
};

// ── Cards / panels ────────────────────────────────────────────────────────────

export const card = {
  /** Standard content card */
  base:   'bg-white/5 border border-white/10 rounded-xl p-4',
  /** Hoverable card */
  hover:  'bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/[0.07] transition-colors',
  /** Warn-tinted panel (admin / caution) */
  warn:   'bg-orange-600/10 border border-orange-500/30 rounded-lg p-4',
  /** Success-tinted */
  success:'bg-green-500/20 border border-green-500/30 rounded-lg p-3',
  /** Error-tinted */
  error:  'bg-red-600/20 border border-red-500/30 rounded-lg p-3',
  /** Info/tips box */
  info:   'bg-orange-600/10 border border-orange-500/20 rounded-lg p-4',
};

// ── Badges / tags ─────────────────────────────────────────────────────────────

export const badge = {
  /** Neutral pill */
  base:   'text-xs px-2 py-0.5 rounded-full bg-white/10 text-gray-400',
  /** Orange accent pill */
  accent: 'text-xs px-2 py-0.5 rounded-full bg-orange-600/20 text-orange-400 border border-orange-500/20',
  /** Green success pill */
  success:'text-xs px-2 py-0.5 rounded-full text-green-400 bg-green-400/20',
  /** Red / orange warn pill */
  warn:   'text-xs px-2 py-0.5 rounded-full text-orange-400 bg-red-400/20',
};

// ── Modal shell ───────────────────────────────────────────────────────────────

export const modal = {
  /** Full-screen overlay backdrop */
  backdrop: 'fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4',
  /** Modal panel */
  panel:    'bg-gray-900 rounded-2xl border border-white/10 w-full max-w-3xl max-h-[90vh] overflow-y-auto',
  /** Sticky header inside modal */
  header:   'flex items-center justify-between p-6 border-b border-white/10 sticky top-0 bg-gray-900 z-10',
  /** Sticky footer inside modal */
  footer:   'flex items-center justify-between p-6 border-t border-white/10 bg-gray-900 sticky bottom-0',
  /** Scrollable content area */
  body:     'p-6',
};

// ── Section headings ──────────────────────────────────────────────────────────

export const section = {
  /** Top-level section title with icon slot */
  title: 'text-lg font-semibold text-white flex items-center gap-2',
  /** Field label */
  label: 'block text-sm font-medium text-gray-300',
  /** Help text below a field */
  help:  'text-xs text-gray-500 mt-1',
};

// ── Layout helpers ────────────────────────────────────────────────────────────

export const layout = {
  /** Horizontal row with gap */
  row:     'flex items-center gap-3',
  /** Vertical stack with gap */
  stack:   'flex flex-col gap-4',
  /** Standard form spacing */
  form:    'space-y-5',
  /** Divider line */
  divider: 'pt-4 border-t border-white/10',
};

// ── Status feedback inline ────────────────────────────────────────────────────

export const status = {
  success: 'flex items-center gap-2 text-green-400 text-xs',
  warn:    'flex items-center gap-2 text-orange-400 text-xs',
  error:   'flex items-center gap-2 text-red-400 text-xs',
};

// ── Toggle (boolean switch) ───────────────────────────────────────────────────

/** Usage: className={toggle.track(value)} / className={toggle.thumb(value)} */
export const toggle = {
  track: (on) => `relative w-12 h-6 rounded-full transition-colors ${on ? 'bg-green-500' : 'bg-gray-600'}`,
  thumb: (on)  => `absolute w-5 h-5 bg-white rounded-full top-0.5 transition-transform ${on ? 'right-0.5' : 'left-0.5'}`,
};
