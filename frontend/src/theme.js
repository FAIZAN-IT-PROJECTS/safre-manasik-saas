import { createTheme } from '@mui/material/styles';

// ── Safre Manasik brand defaults ────────────────────────────────────────────
const BRAND = {
  green:       '#1B4B35',
  greenDark:   '#0D2B1A',
  greenMid:    '#2E6B4F',
  greenLight:  '#EAF2EE',
  greenPale:   '#F3F8F5',
  gold:        '#C9A227',
  goldDark:    '#9B7A1A',
  goldLight:   '#FFF8E6',
  cream:       '#F7F2E8',
};

// primaryColor values that mean "keep the default Safre look": unset, the schema
// default (#0D7377 — predates theming and was never applied), or the brand green.
const DEFAULT_COLORS = ['#0d7377', '#1b4b35'];

// ── tiny hex helpers (no dependencies) ──────────────────────────────────────
function parseHex(hex) {
  let h = String(hex || '').trim().replace(/^#/, '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return null;
  return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16) };
}
const clamp = (v) => Math.max(0, Math.min(255, Math.round(v)));
const toHex = ({ r, g, b }) => '#' + [r, g, b].map((v) => clamp(v).toString(16).padStart(2, '0')).join('');
// Blend colour c toward target by weight w (0..1).
const mix = (c, t, w) => toHex({ r: c.r + (t.r - c.r) * w, g: c.g + (t.g - c.g) * w, b: c.b + (t.b - c.b) * w });
const BLACK = { r: 11, g: 11, b: 11 };
const WHITE = { r: 255, g: 255, b: 255 };
// Relative luminance (0..1) — decides whether text on this colour should be dark or light.
function luminance({ r, g, b }) {
  const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

// Resolve the full set of palette tokens from a single tenant primary colour.
// The default branch returns the exact current brand values (no visual change
// for existing tenants); a custom colour is expanded into a coherent palette.
function tokens(primaryColor) {
  const rgb = parseHex(primaryColor);
  const isDefault = !rgb || DEFAULT_COLORS.includes(String(primaryColor).trim().toLowerCase());
  if (isDefault) {
    return {
      main: BRAND.green, mid: BRAND.greenMid, dark: BRAND.greenDark, light: BRAND.greenLight,
      contrast: '#ffffff', surfaceDark: BRAND.greenDark,
      textPrimary: BRAND.greenDark, textSecondary: '#4B7060', heading: BRAND.greenDark,
      accentText: BRAND.green, shadowRgb: '27,75,53',
    };
  }
  return {
    main: toHex(rgb),
    mid: mix(rgb, BLACK, 0.14),
    dark: mix(rgb, BLACK, 0.42),
    light: mix(rgb, WHITE, 0.86),
    contrast: luminance(rgb) > 0.5 ? '#1A1A1A' : '#ffffff',
    surfaceDark: mix(rgb, BLACK, 0.86),   // near-black sidebar, tinted by the brand colour
    textPrimary: mix(rgb, BLACK, 0.72),
    textSecondary: mix(rgb, BLACK, 0.5),
    heading: mix(rgb, BLACK, 0.72),
    accentText: mix(rgb, BLACK, 0.42),    // readable on white: outlined buttons, tabs, table heads
    shadowRgb: '0,0,0',
  };
}

// Build a MUI theme for the given tenant primary colour. Called with no argument
// (or an unknown colour) it yields the default Safre Manasik theme.
export function createAppTheme(primaryColor) {
  const C = tokens(primaryColor);
  return createTheme({
    palette: {
      primary:    { main: C.main, light: C.light, dark: C.dark, contrastText: C.contrast },
      secondary:  { main: BRAND.gold, light: BRAND.goldLight, dark: BRAND.goldDark, contrastText: '#fff' },
      warning:    { main: '#EA580C', light: '#FFF7ED' },
      error:      { main: '#DC2626', light: '#FEF2F2' },
      success:    { main: '#16A34A', light: '#F0FDF4' },
      background: { default: BRAND.cream, paper: '#FFFFFF' },
      text:       { primary: C.textPrimary, secondary: C.textSecondary },
      // Custom token: the dark app chrome (sidebar / drawer). Near-black, tinted
      // by the brand colour. Consumed by Layout.js and Sidebar.js.
      appSidebar: C.surfaceDark,
    },
    typography: {
      fontFamily: '"Inter", "Segoe UI", Arial, sans-serif',
      h4: { fontWeight: 700, color: C.heading },
      h5: { fontWeight: 700, color: C.heading },
      h6: { fontWeight: 700, color: C.heading },
      subtitle1: { fontWeight: 600 },
    },
    shape: { borderRadius: 10 },
    components: {
      MuiButton: {
        styleOverrides: {
          root: { textTransform: 'none', fontWeight: 600, borderRadius: 8 },
          containedPrimary: {
            background: `linear-gradient(135deg, ${C.mid} 0%, ${C.main} 100%)`,
            color: C.contrast,
            boxShadow: `0 2px 8px rgba(${C.shadowRgb},0.35)`,
            '&:hover': { boxShadow: `0 4px 14px rgba(${C.shadowRgb},0.45)`, background: `linear-gradient(135deg, ${C.main} 0%, ${C.dark} 100%)` },
          },
          containedSecondary: {
            background: `linear-gradient(135deg, ${BRAND.gold} 0%, ${BRAND.goldDark} 100%)`,
            boxShadow: '0 2px 8px rgba(201,162,39,0.35)',
            color: '#fff',
          },
          outlinedPrimary: { borderColor: C.main, color: C.accentText, '&:hover': { background: C.light } },
        },
      },
      MuiAppBar:    { styleOverrides: { root: { background: '#fff', color: C.textPrimary, boxShadow: `0 2px 8px rgba(${C.shadowRgb},0.12)` } } },
      MuiDrawer:    { styleOverrides: { paper: { background: C.surfaceDark, color: '#fff', borderRight: 'none' } } },
      MuiCard:      { styleOverrides: { root: { borderRadius: 12, boxShadow: `0 1px 4px rgba(${C.shadowRgb},0.1), 0 1px 2px rgba(${C.shadowRgb},0.06)` } } },
      MuiChip:      { styleOverrides: { root: { fontWeight: 600, borderRadius: 6 } } },
      MuiTableHead: { styleOverrides: { root: { '& .MuiTableCell-root': { fontWeight: 700, background: C.light, color: C.accentText, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.06em' } } } },
      MuiTextField: { defaultProps: { size: 'small' } },
      MuiDialogTitle: { styleOverrides: { root: { background: C.main, color: C.contrast, fontWeight: 700, padding: '14px 24px' } } },
      MuiTab: { styleOverrides: { root: { fontWeight: 600, '&.Mui-selected': { color: C.accentText } } } },
      MuiTabs: { styleOverrides: { indicator: { background: BRAND.gold, height: 3 } } },
      MuiLinearProgress: { styleOverrides: { bar: { background: BRAND.gold } } },
    },
  });
}

// Default theme (Safre brand) for the initial loading screen and as a fallback.
const theme = createAppTheme();
export default theme;
