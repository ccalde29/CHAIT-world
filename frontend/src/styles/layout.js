/**
 * Shared layout / design-token constants
 *
 * Use these instead of raw Tailwind palette classes so the whole app
 * stays visually consistent and a colour change is a one-line edit here.
 *
 * Conventions
 *   BG_*      — background colours
 *   BORDER_*  — border colours
 *   TEXT_*    — text colours
 *   PANEL_*   — composite strings for common panel shapes
 */

// ─── Backgrounds ─────────────────────────────────────────────────────────────
export const BG_APP      = 'bg-gray-900';          // outermost shell
export const BG_SIDEBAR  = 'bg-slate-900';          // left / right sidebars
export const BG_SURFACE  = 'bg-white/5';            // cards, inputs, elevated rows
export const BG_SURFACE2 = 'bg-white/10';           // hovered / active surface

// ─── Borders ─────────────────────────────────────────────────────────────────
export const BORDER      = 'border-white/10';       // default subtle border
export const BORDER_FOCUS = 'focus:border-red-400'; // input focus ring

// ─── Text ────────────────────────────────────────────────────────────────────
export const TEXT_PRIMARY   = 'text-white';
export const TEXT_SECONDARY = 'text-gray-400';
export const TEXT_MUTED     = 'text-gray-500';
export const TEXT_ACCENT    = 'text-orange-400';

// ─── Brand / accent ──────────────────────────────────────────────────────────
export const ACCENT_BG      = 'bg-orange-600';
export const ACCENT_BG_SOFT = 'bg-orange-600/20';

// ─── Composite panel helpers ─────────────────────────────────────────────────
/** Full-height sidebar column */
export const SIDEBAR_PANEL = `${BG_SIDEBAR} border-r ${BORDER} flex flex-col h-screen`;

/** Scrollable main content area that fills remaining space */
export const MAIN_AREA = `flex-1 flex flex-col overflow-hidden ${BG_APP}`;

/** Standard card / surface block */
export const CARD = `${BG_SURFACE} border ${BORDER} rounded-lg`;
