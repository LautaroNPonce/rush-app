import { useState, useEffect, useRef, useCallback } from "react";

// ═══════════════════════════════════════════════════════════════
//  RUSH — App Unificada
//  Punto de entrada + App usuario (OpenStreetMap/Leaflet + Mercado Pago) + Panel admin
// ═══════════════════════════════════════════════════════════════

// Leaflet: carga desde CDN (no npm import)
const loadLeaflet = () => new Promise((resolve) => {
  if (window.L) { resolve(window.L); return; }
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css";
  document.head.appendChild(link);
  const script = document.createElement("script");
  script.src = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js";
  script.onload = () => resolve(window.L);
  document.head.appendChild(script);
});

// ┌─────────────────────────────────────────────────────────────┐
// │  SECTION 1: APP DEL USUARIO                                │
// └─────────────────────────────────────────────────────────────┘

// ─── API CONFIG ───
const API_URL = window.location.hostname === "localhost" ? "http://localhost:3001/api" : "https://rush-api.onrender.com/api";

const api = {
  get: async (path, token) => {
    const headers = { "Content-Type": "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(`${API_URL}${path}`, { headers });
    if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || "Error del servidor"); }
    return res.json();
  },
  post: async (path, body, token) => {
    const headers = { "Content-Type": "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(`${API_URL}${path}`, { method: "POST", headers, body: JSON.stringify(body) });
    if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || "Error del servidor"); }
    return res.json();
  },
  del: async (path, token) => {
    const headers = { "Content-Type": "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(`${API_URL}${path}`, { method: "DELETE", headers });
    if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || "Error del servidor"); }
    return res.json();
  },
};

// Adaptar formato de la API al formato que esperan los componentes
const DEMO_ROOMS_FALLBACK = [
  { id: "dr1", name: "Clásica", price: 5500, price_2h: 9000, price_night: 18000, amenities: "Wi-Fi · TV · Aire acond.", available: 2, popular: false, status: "libre" },
  { id: "dr2", name: "Suite", price: 8500, price_2h: 14000, price_night: 25000, amenities: "Jacuzzi · Smart TV · Frigobar", available: 1, popular: true, status: "libre" },
];
const formatAlbergue = (a) => {
  const apiRooms = (a.rooms || []).map(r => ({
    id: r.id,
    name: r.name,
    price: r.price_1h,
    price_2h: r.price_2h,
    price_night: r.price_night,
    amenities: (r.room_amenities || []).map(am => am.amenity).join(" · "),
    available: r.quantity || 1,
    popular: (r.room_amenities || []).length >= 3,
    status: r.status,
  }));
  const rooms = apiRooms.length > 0 ? apiRooms : DEMO_ROOMS_FALLBACK.map(r => ({ ...r, id: `${a.id}-${r.id}` }));
  return {
    id: a.id,
    name: a.name,
    address: a.address,
    zone: a.zone,
    distance: a.distance || "—",
    rating: parseFloat(a.rating) || 0,
    reviews: a.review_count || 0,
    tags: a.rooms?.[0]?.room_amenities?.map(am => am.amenity).slice(0, 3) || ["Wi-Fi", "TV", "Aire acond."],
    lat: a.lat,
    lng: a.lng,
    rooms,
  };
};

const COLORS = {
  purple: "#534AB7",
  purpleLight: "#EEEDFE",
  purpleMid: "#7F77DD",
  purpleDark: "#3C3489",
  green: "#1D9E75",
  greenLight: "#E1F5EE",
  greenDark: "#0F6E56",
  amber: "#EF9F27",
  amberLight: "#FAEEDA",
  red: "#E24B4A",
  redLight: "#FCEBEB",
  redDark: "#A32D2D",
  bg: "#FAFAFA",
  card: "#FFFFFF",
  text: "#1A1A1A",
  textSec: "#7A7A7A",
  textTer: "#ABABAB",
  border: "#EBEBEB",
  borderSec: "#D5D5D5",
};

const FONTS = {
  sans: "'DM Sans', 'Helvetica Neue', sans-serif",
  display: "'Outfit', 'DM Sans', sans-serif",
};

// ─── RESPONSIVE ───
const useWindowSize = () => {
  const [w, setW] = useState(typeof window !== "undefined" ? window.innerWidth : 375);
  useEffect(() => {
    const h = () => setW(window.innerWidth);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);
  return w;
};
const BP = { sm: 768, md: 1024 }; // sm = tablet, md = desktop

// ALBERGUES se cargan desde la API (ver RushUserApp)

// ---- ICONS ----
const Icons = {
  back: (c = COLORS.text, s = 20) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2"><path d="M15 18l-6-6 6-6" /></svg>
  ),
  map: (c = COLORS.text, s = 22) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill={c}><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" /></svg>
  ),
  grid: (c = COLORS.text, s = 20) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill={c}><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></svg>
  ),
  clock: (c = COLORS.text, s = 20) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" /></svg>
  ),
  user: (c = COLORS.text, s = 20) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2"><circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 4-6 8-6s8 2 8 6" /></svg>
  ),
  star: (c = COLORS.amber, s = 14) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill={c}><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
  ),
  heart: (c = COLORS.textSec, s = 18) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg>
  ),
  shield: (c = COLORS.greenDark, s = 14) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill={c}><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" /></svg>
  ),
  check: (c = COLORS.greenDark, s = 32) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
  ),
  search: (c = COLORS.textSec, s = 18) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.35-4.35" /></svg>
  ),
  eye: (c = COLORS.textSec, s = 16) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" /><circle cx="12" cy="12" r="3" /></svg>
  ),
  eyeOff: (c = COLORS.textSec, s = 16) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
  ),
  mail: (c = COLORS.textSec, s = 18) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2" /><path d="M22 4l-10 8L2 4" /></svg>
  ),
  lock: (c = COLORS.textSec, s = 18) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
  ),
  filter: (c = COLORS.textSec, s = 16) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" /></svg>
  ),
  chat: (c = COLORS.textSec, s = 20) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
  ),
  send: (c = "#fff", s = 16) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
  ),
  creditCard: (c = COLORS.textSec, s = 20) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2"><rect x="1" y="4" width="22" height="16" rx="2" /><line x1="1" y1="10" x2="23" y2="10" /></svg>
  ),
  cash: (c = COLORS.textSec, s = 20) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
  ),
  logout: (c = COLORS.textSec, s = 18) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
  ),
  settings: (c = COLORS.textSec, s = 18) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>
  ),
};

// ---- STYLES ----
const S = {
  phone: {
    width: "100%", minHeight: "100dvh", background: COLORS.bg,
    fontFamily: FONTS.sans, color: COLORS.text, position: "relative",
    overflowX: "hidden",
  },
  statusBar: {
    height: "env(safe-area-inset-top, 44px)", flexShrink: 0,
  },
  header: { padding: "8px 20px 12px" },
  navBar: {
    position: "fixed", bottom: 0, left: 0, right: 0,
    background: COLORS.card,
    borderTop: `1px solid ${COLORS.border}`, display: "flex",
    justifyContent: "space-around", alignItems: "flex-start",
    paddingTop: 10, paddingBottom: "env(safe-area-inset-bottom, 12px)",
    zIndex: 100,
  },
  navItem: (active) => ({
    display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
    cursor: "pointer", padding: "0 16px", opacity: active ? 1 : 0.45,
    transition: "opacity 0.15s",
    minWidth: 44, minHeight: 44, justifyContent: "center",
  }),
  navLabel: { fontSize: 10, fontWeight: 500 },
  btn: (bg = COLORS.purple, color = "#fff") => ({
    background: bg, color, border: "none", borderRadius: 14, padding: "12px 24px",
    fontSize: 15, fontWeight: 600, cursor: "pointer", width: "100%",
    fontFamily: FONTS.sans, transition: "all 0.15s", textAlign: "center",
  }),
  btnOutline: {
    background: "transparent", color: COLORS.purple, border: `1.5px solid ${COLORS.purple}`,
    borderRadius: 14, padding: "12px 24px", fontSize: 15, fontWeight: 600,
    cursor: "pointer", width: "100%", fontFamily: FONTS.sans, textAlign: "center",
  },
  input: {
    width: "100%", padding: "12px 16px", border: `1.5px solid ${COLORS.border}`,
    borderRadius: 12, fontSize: 15, fontFamily: FONTS.sans, background: COLORS.card,
    color: COLORS.text, outline: "none", boxSizing: "border-box",
    transition: "border-color 0.2s",
  },
  chip: (active) => ({
    padding: "7px 14px", borderRadius: 20, fontSize: 13, fontWeight: 500,
    cursor: "pointer", whiteSpace: "nowrap", transition: "all 0.2s",
    background: active ? COLORS.purple : COLORS.card,
    color: active ? "#fff" : COLORS.textSec,
    border: active ? "none" : `1px solid ${COLORS.border}`,
  }),
  card: {
    background: COLORS.card, borderRadius: 16, border: `1px solid ${COLORS.border}`,
    padding: 14, marginBottom: 10, cursor: "pointer", transition: "all 0.15s",
  },
  badge: (bg, color) => ({
    fontSize: 11, padding: "3px 10px", borderRadius: 10, background: bg,
    color, fontWeight: 600, whiteSpace: "nowrap",
  }),
  section: { padding: "0 20px", marginBottom: 16 },
  fadeIn: { animation: "rushFadeIn 0.35s ease" },
};

// ---- GLOBAL STYLES ----
const UserGlobalCSS = () => (
  <style>{`
    @import url('https://unpkg.com/leaflet@1.9.4/dist/leaflet.css');
    * { margin: 0; padding: 0; box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
    html, body, #root { width: 100%; min-height: 100dvh; }
    body { font-family: 'DM Sans', 'Helvetica Neue', sans-serif; background: ${COLORS.bg}; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; overflow-x: hidden; }
    button, input, textarea, select { -webkit-appearance: none; appearance: none; }
    input, textarea { font-size: 16px !important; } /* evita zoom en iOS */
    @keyframes rushFadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes rushPulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.05); } }
    @keyframes rushSlideUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes rushSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
    input:focus { border-color: ${COLORS.purple} !important; }
    ::-webkit-scrollbar { display: none; }
    .leaflet-container { font-family: 'DM Sans', sans-serif; }
    .rush-popup .leaflet-popup-content-wrapper {
      border-radius: 14px; box-shadow: 0 4px 24px rgba(83,74,183,0.18);
      border: 1.5px solid ${COLORS.border}; padding: 0; overflow: hidden;
    }
    .rush-popup .leaflet-popup-content { margin: 0; min-width: 200px; }
    .rush-popup .leaflet-popup-tip { background: white; }
    .rush-popup .leaflet-popup-close-button { color: ${COLORS.textSec} !important; font-size: 18px !important; top: 8px !important; right: 10px !important; }
    @media (min-width: 1024px) {
      ::-webkit-scrollbar { display: block !important; width: 6px; height: 6px; }
      ::-webkit-scrollbar-track { background: transparent; }
      ::-webkit-scrollbar-thumb { background: #D0D0D0; border-radius: 4px; }
      ::-webkit-scrollbar-thumb:hover { background: #B0B0B0; }
      input, textarea { font-size: 14px !important; }
    }
    .rush-marker-icon { background: ${COLORS.purple}; color: #fff; border-radius: 20px 20px 20px 4px; padding: 4px 8px; font-size: 11px; font-weight: 700; white-space: nowrap; box-shadow: 0 2px 8px rgba(83,74,183,0.35); border: 2px solid #fff; font-family: 'DM Sans', sans-serif; cursor: pointer; transform: translateY(-2px); transition: all 0.15s; }
    .rush-user-dot { width: 16px; height: 16px; border-radius: 50%; background: #378ADD; border: 3px solid #fff; box-shadow: 0 0 0 6px rgba(55,138,221,0.18); }
  `}</style>
);

// ---- COMPONENTS ----
const StatusBar = ({ light }) => (
  <div style={{ height: "env(safe-area-inset-top, 44px)", flexShrink: 0 }} />
);

const HeartIcon = (c = COLORS.textSec, s = 22, filled = false) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill={filled ? c : "none"} stroke={c} strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg>
);

// ─── DESKTOP SIDEBAR (usuario) ───
const UserSideNav = ({ active, onNavigate }) => {
  const NAV = [
    { key: "map",       label: "Explorar",  icon: (c) => Icons.map(c, 20) },
    { key: "favorites", label: "Favoritos", icon: (c) => HeartIcon(c, 20, active === "favorites") },
    { key: "chats",     label: "Mensajes",  icon: (c) => Icons.chat(c, 20) },
    { key: "history",   label: "Historial", icon: (c) => Icons.clock(c, 20) },
    { key: "profile",   label: "Perfil",    icon: (c) => Icons.user(c, 20) },
  ];
  return (
    <div style={{ width: 240, background: COLORS.card, borderRight: `1px solid ${COLORS.border}`, position: "fixed", top: 0, left: 0, bottom: 0, zIndex: 200, display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "28px 24px 24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 38, height: 38, borderRadius: 11, background: `linear-gradient(135deg, ${COLORS.purpleDark}, ${COLORS.purpleMid})`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <span style={{ fontSize: 18, fontWeight: 800, color: "#fff", fontFamily: FONTS.display }}>R</span>
          </div>
          <div>
            <p style={{ fontSize: 20, fontWeight: 800, fontFamily: FONTS.display, margin: 0, lineHeight: 1.1 }}>Rush</p>
            <p style={{ fontSize: 11, color: COLORS.textSec, margin: 0 }}>Tu espacio privado</p>
          </div>
        </div>
      </div>
      <nav style={{ flex: 1, padding: "0 12px", overflowY: "auto" }}>
        {NAV.map(({ key, label, icon }) => {
          const on = active === key;
          return (
            <div key={key} onClick={() => onNavigate(key)}
              style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderRadius: 12, cursor: "pointer", marginBottom: 2, background: on ? COLORS.purpleLight : "transparent", transition: "background 0.15s" }}
              onMouseEnter={e => { if (!on) e.currentTarget.style.background = "#F5F4FE"; }}
              onMouseLeave={e => { if (!on) e.currentTarget.style.background = "transparent"; }}>
              {icon(on ? COLORS.purple : COLORS.textSec)}
              <span style={{ fontSize: 14, fontWeight: on ? 700 : 500, color: on ? COLORS.purple : COLORS.textSec, fontFamily: FONTS.sans }}>{label}</span>
              {on && <div style={{ width: 6, height: 6, borderRadius: "50%", background: COLORS.purple, marginLeft: "auto" }} />}
            </div>
          );
        })}
      </nav>
      <div style={{ padding: "16px 24px", borderTop: `1px solid ${COLORS.border}` }}>
        <p style={{ fontSize: 11, color: COLORS.textTer, margin: 0 }}>Rush v1.0 · Argentina</p>
      </div>
    </div>
  );
};

const BottomNav = ({ active, onNavigate }) => {
  const w = useWindowSize();
  if (w >= BP.md) return null;
  return (
    <div style={S.navBar}>
      {[
        { key: "map", icon: (c) => Icons.map(c), label: "Explorar" },
        { key: "favorites", icon: (c) => HeartIcon(c, 22, active === "favorites"), label: "Favoritos" },
        { key: "chats", icon: (c) => Icons.chat(c, 22), label: "Mensajes" },
        { key: "history", icon: (c) => Icons.clock(c), label: "Historial" },
        { key: "profile", icon: (c) => Icons.user(c), label: "Perfil" },
      ].map(({ key, icon, label }) => (
        <div key={key} style={S.navItem(active === key)} onClick={() => onNavigate(key)}>
          {icon(active === key ? COLORS.purple : COLORS.textSec)}
          <span style={{ ...S.navLabel, color: active === key ? COLORS.purple : COLORS.textSec }}>{label}</span>
        </div>
      ))}
    </div>
  );
};

const AlbergueCard = ({ albergue, onClick }) => {
  const minPrice = Math.min(...albergue.rooms.map(r => r.price));
  const totalAvail = albergue.rooms.reduce((a, r) => a + r.available, 0);
  return (
    <div style={S.card} onClick={onClick}
      onMouseEnter={e => { e.currentTarget.style.borderColor = COLORS.purpleMid; e.currentTarget.style.transform = "translateY(-2px)"; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = COLORS.border; e.currentTarget.style.transform = "translateY(0)"; }}>
      <div style={{ display: "flex", gap: 12 }}>
        <div style={{ width: 72, height: 72, borderRadius: 12, background: `linear-gradient(135deg, ${COLORS.purpleDark}, ${COLORS.purpleMid})`, flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <p style={{ fontSize: 15, fontWeight: 600, marginBottom: 2 }}>{albergue.name}</p>
            <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
              {Icons.star()}
              <span style={{ fontSize: 13, fontWeight: 600 }}>{albergue.rating}</span>
            </div>
          </div>
          <p style={{ fontSize: 12, color: COLORS.textSec, marginBottom: 6 }}>{albergue.distance} · {albergue.address}</p>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 15, fontWeight: 600 }}>
              ${minPrice.toLocaleString()}<span style={{ fontSize: 11, fontWeight: 400, color: COLORS.textSec }}>/h</span>
            </span>
            <span style={S.badge(totalAvail > 0 ? COLORS.greenLight : COLORS.redLight, totalAvail > 0 ? COLORS.greenDark : COLORS.redDark)}>
              {totalAvail > 0 ? `${totalAvail} disponibles` : "Lleno"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

const RoomCard = ({ room, onBook }) => (
  <div style={{
    ...S.card, position: "relative",
    border: room.popular ? `2px solid ${COLORS.purple}` : `1px solid ${COLORS.border}`,
  }}>
    {room.popular && (
      <div style={{ position: "absolute", top: -10, right: 14, fontSize: 10, padding: "3px 10px", borderRadius: 10, background: COLORS.purple, color: "#fff", fontWeight: 600 }}>
        Popular
      </div>
    )}
    <div style={{ display: "flex", gap: 12 }}>
      <div style={{ width: 64, height: 64, borderRadius: 10, background: COLORS.bg, flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 2 }}>
          <p style={{ fontSize: 14, fontWeight: 600 }}>{room.name}</p>
          <span style={S.badge(
            room.available > 0 ? COLORS.greenLight : COLORS.redLight,
            room.available > 0 ? COLORS.greenDark : COLORS.redDark
          )}>
            {room.available > 0 ? `${room.available} libre${room.available > 1 ? "s" : ""}` : "Ocupada"}
          </span>
        </div>
        <p style={{ fontSize: 11, color: COLORS.textSec, marginBottom: 8 }}>{room.amenities}</p>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 15, fontWeight: 600, color: room.available > 0 ? COLORS.text : COLORS.textSec }}>
            ${room.price.toLocaleString()}<span style={{ fontSize: 11, fontWeight: 400, color: COLORS.textSec }}>/h</span>
          </span>
          <button
            onClick={(e) => { e.stopPropagation(); if (room.available > 0) onBook(room); }}
            style={{
              padding: "6px 18px", borderRadius: 12, border: "none", fontSize: 13, fontWeight: 600,
              cursor: room.available > 0 ? "pointer" : "not-allowed", fontFamily: FONTS.sans,
              background: room.available > 0 ? COLORS.purple : COLORS.bg,
              color: room.available > 0 ? "#fff" : COLORS.textSec,
              transition: "all 0.15s",
            }}>
            {room.available > 0 ? "Reservar" : "No disponible"}
          </button>
        </div>
      </div>
    </div>
  </div>
);

// Helper: wrapper centrado para pantallas de formulario en desktop
const ScreenCard = ({ children, maxWidth = 560 }) => {
  const w = useWindowSize();
  if (w < BP.md) return <>{children}</>;
  return (
    <div style={{ minHeight: "100dvh", display: "flex", alignItems: "flex-start", justifyContent: "center", background: COLORS.bg, padding: "40px 24px 60px" }}>
      <div style={{ width: "100%", maxWidth, background: COLORS.card, borderRadius: 24, border: `1px solid ${COLORS.border}`, boxShadow: "0 4px 32px rgba(0,0,0,0.07)", overflow: "hidden" }}>
        {children}
      </div>
    </div>
  );
};

// ---- SCREENS ----

// 1. SPLASH
const SplashScreen = ({ onFinish }) => {
  useEffect(() => { const t = setTimeout(onFinish, 2000); return () => clearTimeout(t); }, []);
  return (
    <div style={{ ...S.phone, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100dvh", background: `linear-gradient(160deg, ${COLORS.purpleDark} 0%, ${COLORS.purple} 50%, ${COLORS.purpleMid} 100%)` }}>
      <div style={{ animation: "rushPulse 2s ease infinite" }}>
        <p style={{ fontSize: 48, fontWeight: 800, color: "#fff", fontFamily: FONTS.display, letterSpacing: -1 }}>Rush</p>
      </div>
      <p style={{ fontSize: 14, color: "rgba(255,255,255,0.7)", marginTop: 8 }}>Tu espacio privado</p>
    </div>
  );
};

// 2. ONBOARDING
const UserOnboardingScreen = ({ onLogin, onRegister }) => (
  <div style={{ ...S.phone, display: "flex", flexDirection: "column", minHeight: "100dvh", background: COLORS.card }}>
    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 30px", ...S.fadeIn }}>
      <div style={{ width: 80, height: 80, borderRadius: 24, background: `linear-gradient(135deg, ${COLORS.purpleDark}, ${COLORS.purpleMid})`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 24 }}>
        <span style={{ fontSize: 32, fontWeight: 800, color: "#fff", fontFamily: FONTS.display }}>R</span>
      </div>
      <h1 style={{ fontSize: 28, fontWeight: 700, fontFamily: FONTS.display, marginBottom: 8, textAlign: "center" }}>Bienvenido a Rush</h1>
      <p style={{ fontSize: 15, color: COLORS.textSec, textAlign: "center", lineHeight: 1.5, maxWidth: 280 }}>
        Encontrá, compará y reservá albergues cerca tuyo en menos de 60 segundos.
      </p>
      <div style={{ display: "flex", gap: 20, margin: "32px 0 16px" }}>
        {[
          { icon: Icons.shield, label: "Anónimo" },
          { icon: () => Icons.clock(COLORS.greenDark, 14), label: "En vivo" },
          { icon: () => Icons.star(COLORS.greenDark, 14), label: "Validado" },
        ].map(({ icon, label }, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 4 }}>
            {typeof icon === "function" ? icon() : icon()}
            <span style={{ fontSize: 12, fontWeight: 500, color: COLORS.greenDark }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
    <div style={{ padding: "0 24px 40px", display: "flex", flexDirection: "column", gap: 12 }}>
      <button style={S.btn()} onClick={onRegister}>Crear cuenta</button>
      <button style={S.btnOutline} onClick={onLogin}>Ya tengo cuenta</button>
    </div>
  </div>
);

// 2.5 FORGOT PASSWORD
const ForgotPasswordScreen = ({ onBack }) => {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleReset = () => {
    if (!email) { setError("Ingres\u00e1 tu email"); return; }
    if (!email.includes("@")) { setError("Email inv\u00e1lido"); return; }
    setError("");
    setSent(true);
  };

  if (sent) return (
    <div style={{ ...S.phone, minHeight: "100dvh", background: COLORS.card, ...S.fadeIn }}>
      <StatusBar />
      <div style={{ padding: "8px 20px" }}>
        <div style={{ cursor: "pointer", marginBottom: 20 }} onClick={onBack}>{Icons.back()}</div>
        <div style={{ textAlign: "center", padding: "40px 0" }}>
          <div style={{ width: 64, height: 64, borderRadius: "50%", background: COLORS.greenLight, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={COLORS.greenDark} strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 700, fontFamily: FONTS.display, marginBottom: 8 }}>{"Email enviado"}</h2>
          <p style={{ fontSize: 14, color: COLORS.textSec, lineHeight: 1.6, maxWidth: 280, margin: "0 auto 24px" }}>
            {"Si existe una cuenta con "}<strong>{email}</strong>{", vas a recibir un link para restablecer tu contrase\u00f1a."}
          </p>
          <p style={{ fontSize: 13, color: COLORS.textTer, marginBottom: 24 }}>{"Revis\u00e1 tu bandeja de entrada y spam"}</p>
          <button style={S.btn()} onClick={onBack}>{"Volver al login"}</button>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ ...S.phone, minHeight: "100dvh", background: COLORS.card, ...S.fadeIn }}>
      <StatusBar />
      <div style={{ padding: "8px 20px" }}>
        <div style={{ cursor: "pointer", marginBottom: 20 }} onClick={onBack}>{Icons.back()}</div>
        <h1 style={{ fontSize: 26, fontWeight: 700, fontFamily: FONTS.display, marginBottom: 6 }}>{"Recuperar contrase\u00f1a"}</h1>
        <p style={{ fontSize: 14, color: COLORS.textSec, marginBottom: 28, lineHeight: 1.6 }}>
          {"Ingres\u00e1 tu email y te enviaremos un link para restablecer tu contrase\u00f1a."}
        </p>
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 13, fontWeight: 500, color: COLORS.textSec, marginBottom: 6, display: "block" }}>Email</label>
          <div style={{ position: "relative" }}>
            <input style={{ ...S.input, paddingLeft: 42 }} placeholder="tu@email.com" value={email} onChange={e => setEmail(e.target.value)} />
            <div style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)" }}>{Icons.mail()}</div>
          </div>
        </div>
        {error && <p style={{ fontSize: 13, color: COLORS.red, marginBottom: 12, padding: "8px 12px", background: COLORS.redLight, borderRadius: 10 }}>{error}</p>}
        <button style={S.btn()} onClick={handleReset}>{"Enviar link de recuperaci\u00f3n"}</button>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 20, padding: "12px 14px", background: COLORS.purpleLight, borderRadius: 12 }}>
          {Icons.shield(COLORS.purpleDark, 14)}
          <p style={{ fontSize: 12, color: COLORS.purpleDark, lineHeight: 1.4 }}>{"Tu cuenta es an\u00f3nima. Si no record\u00e1s el email, cre\u00e1 una nueva cuenta."}</p>
        </div>
      </div>
    </div>
  );
};

// 3. LOGIN
const UserLoginScreen = ({ onBack, onLogin, onGoRegister, onForgot }) => {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !pass) { setError("Completá email y contraseña"); return; }
    setLoading(true); setError("");
    try {
      const data = await api.post("/auth/login", { email, password: pass });
      localStorage.setItem("rush_token", data.token);
      localStorage.setItem("rush_user", JSON.stringify(data.user));
      onLogin(data.user);
    } catch (err) {
      setError(err.message || "Error al iniciar sesión");
    } finally { setLoading(false); }
  };
  return (
    <ScreenCard>
      <div style={{ ...S.phone, minHeight: "100dvh", background: COLORS.card, ...S.fadeIn }}>
        <StatusBar />
        <div style={{ padding: "8px 20px 32px" }}>
          <div style={{ cursor: "pointer", marginBottom: 20 }} onClick={onBack}>{Icons.back()}</div>
          <h1 style={{ fontSize: 26, fontWeight: 700, fontFamily: FONTS.display, marginBottom: 6 }}>Iniciá sesión</h1>
          <p style={{ fontSize: 14, color: COLORS.textSec, marginBottom: 28 }}>Ingresá tus datos para continuar</p>
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 13, fontWeight: 500, color: COLORS.textSec, marginBottom: 6, display: "block" }}>Email</label>
            <div style={{ position: "relative" }}>
              <input style={{ ...S.input, paddingLeft: 42 }} placeholder="tu@email.com" value={email} onChange={e => setEmail(e.target.value)} />
              <div style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)" }}>{Icons.mail()}</div>
            </div>
          </div>
          <div style={{ marginBottom: 24 }}>
            <label style={{ fontSize: 13, fontWeight: 500, color: COLORS.textSec, marginBottom: 6, display: "block" }}>Contraseña</label>
            <div style={{ position: "relative" }}>
              <input style={{ ...S.input, paddingLeft: 42, paddingRight: 42 }} type={showPass ? "text" : "password"} placeholder="••••••••" value={pass} onChange={e => setPass(e.target.value)} />
              <div style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)" }}>{Icons.lock()}</div>
              <div style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", cursor: "pointer" }} onClick={() => setShowPass(!showPass)}>
                {showPass ? Icons.eyeOff() : Icons.eye()}
              </div>
            </div>
          </div>
          <p style={{ fontSize: 13, color: COLORS.purple, fontWeight: 500, textAlign: "right", cursor: "pointer", marginBottom: 28 }} onClick={onForgot}>{"¿Olvidaste tu contrase\u00f1a?"}</p>
          {error && <p style={{ fontSize: 13, color: COLORS.red, marginBottom: 12, padding: "8px 12px", background: COLORS.redLight, borderRadius: 10 }}>{error}</p>}
          <button style={{ ...S.btn(), opacity: loading ? 0.6 : 1 }} onClick={handleLogin} disabled={loading}>{loading ? "Ingresando..." : "Iniciar sesión"}</button>
          <p style={{ fontSize: 13, color: COLORS.textSec, textAlign: "center", marginTop: 20 }}>
            ¿No tenés cuenta? <span style={{ color: COLORS.purple, fontWeight: 600, cursor: "pointer" }} onClick={onGoRegister}>Registrate</span>
          </p>
        </div>
      </div>
    </ScreenCard>
  );
};

// 4. REGISTER
const UserRegisterScreen = ({ onBack, onRegister }) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!name || !email || !pass) { setError("Completá todos los campos"); return; }
    if (pass.length < 6) { setError("La contraseña debe tener al menos 6 caracteres"); return; }
    setLoading(true); setError("");
    try {
      const data = await api.post("/auth/register", { name, email, password: pass });
      localStorage.setItem("rush_token", data.token);
      localStorage.setItem("rush_user", JSON.stringify(data.user));
      onRegister(data.user);
    } catch (err) {
      setError(err.message || "Error al crear la cuenta");
    } finally { setLoading(false); }
  };
  return (
    <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", background: COLORS.card, padding: "24px 28px", fontFamily: "'DM Sans', sans-serif", ...S.fadeIn }}>
      <div style={{ width: "100%", maxWidth: 480 }}>
        <div style={{ cursor: "pointer", marginBottom: 28 }} onClick={onBack}>{Icons.back()}</div>
        <h1 style={{ fontSize: 28, fontWeight: 800, fontFamily: FONTS.display, margin: "0 0 6px" }}>Crear cuenta</h1>
        <p style={{ fontSize: 14, color: COLORS.textSec, margin: "0 0 28px" }}>Tu información es 100% privada</p>
        {[
          { label: "Nombre", icon: Icons.user(COLORS.textSec, 18), ph: "Tu nombre", val: name, set: setName },
          { label: "Email", icon: Icons.mail(), ph: "tu@email.com", val: email, set: setEmail },
          { label: "Contraseña", icon: Icons.lock(), ph: "Mínimo 8 caracteres", val: pass, set: setPass, type: "password" },
        ].map(({ label, icon, ph, val, set, type }, i) => (
          <div key={i} style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 13, fontWeight: 500, color: COLORS.textSec, marginBottom: 6, display: "block" }}>{label}</label>
            <div style={{ position: "relative" }}>
              <input style={{ ...S.input, paddingLeft: 42 }} placeholder={ph} type={type || "text"} value={val} onChange={e => set(e.target.value)} />
              <div style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)" }}>{icon}</div>
            </div>
          </div>
        ))}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 28, marginTop: 8 }}>
          {Icons.shield()}
          <p style={{ fontSize: 11, color: COLORS.textSec, lineHeight: 1.4 }}>
            Los albergues nunca verán tu nombre ni datos personales. Solo un código de reserva.
          </p>
        </div>
        {error && <p style={{ fontSize: 13, color: COLORS.red, marginBottom: 12, padding: "8px 12px", background: COLORS.redLight, borderRadius: 10 }}>{error}</p>}
        <button style={{ ...S.btn(), opacity: loading ? 0.6 : 1 }} onClick={handleRegister} disabled={loading}>{loading ? "Creando..." : "Crear mi cuenta"}</button>
      </div>
    </div>
  );
};

// ---- LEAFLET MAP COMPONENT ----
const LeafletMap = ({ onSelectAlbergue, albergues = [] }) => {
  const [leafletReady, setLeafletReady] = useState(false);
  useEffect(() => { loadLeaflet().then(() => setLeafletReady(true)); }, []);
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const userMarkerRef = useRef(null);
  const markersRef = useRef([]);

  const createPriceIcon = useCallback((albergue) => {
    const L = window.L; if (!L) return null;
    const minPrice = Math.min(...albergue.rooms.map(r => r.price));
    return L.divIcon({
      className: "",
      html: `<div class="rush-marker-icon">$${(minPrice / 1000).toFixed(1)}k/h</div>`,
      iconAnchor: [0, 0],
      popupAnchor: [16, -4],
    });
  }, []);

  const createUserIcon = useCallback(() => {
    const L = window.L; if (!L) return null;
    return L.divIcon({
      className: "",
      html: `<div class="rush-user-dot"></div>`,
      iconAnchor: [8, 8],
    });
  }, []);

  useEffect(() => {
    if (!leafletReady || mapInstanceRef.current) return;
    const L = window.L; if (!L) return;

    // Default center (Buenos Aires)
    const defaultCenter = [-34.594, -58.405];

    const map = L.map(mapRef.current, {
      center: defaultCenter,
      zoom: 13,
      zoomControl: false,
      attributionControl: true,
    });

    // OpenStreetMap tiles
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    // Custom zoom control (bottom right)
    L.control.zoom({ position: "bottomright" }).addTo(map);

    // Add albergue markers
    albergues.forEach((albergue) => {
      const minPrice = Math.min(...albergue.rooms.map(r => r.price));
      const totalAvail = albergue.rooms.reduce((a, r) => a + r.available, 0);
      const availColor = totalAvail > 0 ? "#1D9E75" : "#E24B4A";
      const availText = totalAvail > 0 ? `${totalAvail} disponibles` : "Lleno";

      const marker = L.marker([albergue.lat, albergue.lng], {
        icon: L.divIcon({
          className: "",
          html: `<div class="rush-marker-icon">$${(minPrice / 1000).toFixed(1)}k/h</div>`,
          iconAnchor: [0, 0],
          popupAnchor: [16, -4],
        }),
      });

      const popupContent = `
        <div style="padding:14px 16px;font-family:'DM Sans',sans-serif;">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:4px;">
            <p style="font-size:14px;font-weight:700;color:#1A1A1A;margin:0;max-width:140px;">${albergue.name}</p>
            <span style="font-size:12px;font-weight:600;color:#534AB7;background:#EEEDFE;padding:2px 8px;border-radius:8px;">★ ${albergue.rating}</span>
          </div>
          <p style="font-size:11px;color:#7A7A7A;margin:0 0 10px;">${albergue.address} · ${albergue.distance}</p>
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <span style="font-size:15px;font-weight:700;color:#1A1A1A;">$${minPrice.toLocaleString()}<span style="font-size:10px;font-weight:400;color:#7A7A7A;">/h</span></span>
            <span style="font-size:11px;font-weight:600;color:${availColor};background:${totalAvail > 0 ? "#E1F5EE" : "#FCEBEB"};padding:2px 8px;border-radius:8px;">${availText}</span>
          </div>
          <button id="rush-btn-${albergue.id}" style="margin-top:10px;width:100%;padding:8px;background:#534AB7;color:#fff;border:none;border-radius:10px;font-size:13px;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif;">Ver habitaciones</button>
        </div>
      `;

      marker.bindPopup(popupContent, {
        className: "rush-popup",
        maxWidth: 240,
        minWidth: 220,
      });

      marker.on("popupopen", () => {
        setTimeout(() => {
          const btn = document.getElementById(`rush-btn-${albergue.id}`);
          if (btn) btn.onclick = () => onSelectAlbergue(albergue);
        }, 50);
      });

      marker.addTo(map);
      markersRef.current.push(marker);
    });

    mapInstanceRef.current = map;

    // Geolocation
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude: lat, longitude: lng } = pos.coords;
          if (userMarkerRef.current) {
            userMarkerRef.current.setLatLng([lat, lng]);
          } else {
            userMarkerRef.current = L.marker([lat, lng], {
              icon: L.divIcon({
                className: "",
                html: `<div class="rush-user-dot"></div>`,
                iconAnchor: [8, 8],
              }),
            }).addTo(map);
          }
          map.setView([lat, lng], 14, { animate: true });
        },
        () => { /* permission denied, keep Buenos Aires center */ },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    }

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      userMarkerRef.current = null;
      markersRef.current = [];
    };
  }, [onSelectAlbergue, leafletReady, albergues]);

  const centerOnUser = () => {
    const L = window.L;
    if (!navigator.geolocation || !mapInstanceRef.current || !L) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        mapInstanceRef.current.setView([lat, lng], 15, { animate: true });
        if (userMarkerRef.current) {
          userMarkerRef.current.setLatLng([lat, lng]);
        } else {
          userMarkerRef.current = L.marker([lat, lng], {
            icon: L.divIcon({
              className: "",
              html: `<div class="rush-user-dot"></div>`,
              iconAnchor: [8, 8],
            }),
          }).addTo(mapInstanceRef.current);
        }
      },
      () => { }
    );
  };

  return (
    <div style={{ position: "relative", marginBottom: 12, overflow: "hidden" }}>
      <div ref={mapRef} style={{ height: 280, width: "100%" }} />
      {/* Locate me button */}
      <button
        onClick={centerOnUser}
        style={{
          position: "absolute", bottom: 12, left: 12, zIndex: 1000,
          background: COLORS.card, border: `1px solid ${COLORS.border}`,
          borderRadius: 10, padding: "7px 12px", fontSize: 12, fontWeight: 600,
          color: COLORS.purple, cursor: "pointer", display: "flex", alignItems: "center",
          gap: 5, boxShadow: "0 2px 8px rgba(0,0,0,0.12)", fontFamily: FONTS.sans,
        }}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={COLORS.purple} strokeWidth="2.5">
          <circle cx="12" cy="12" r="3" />
          <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
        </svg>
        Mi ubicación
      </button>
      {/* OSM badge */}
      <div style={{ position: "absolute", top: 10, right: 10, zIndex: 1000, background: "rgba(255,255,255,0.9)", borderRadius: 8, padding: "3px 8px", fontSize: 10, color: COLORS.textSec, backdropFilter: "blur(4px)" }}>
        🗺 OpenStreetMap
      </div>
    </div>
  );
};

// LeafletMap desktop (full height, no rounded borders)
const LeafletMapDesktop = ({ onSelectAlbergue, albergues = [] }) => {
  const [leafletReady, setLeafletReady] = useState(false);
  useEffect(() => { loadLeaflet().then(() => setLeafletReady(true)); }, []);
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);

  useEffect(() => {
    if (!leafletReady || mapInstanceRef.current) return;
    const L = window.L; if (!L) return;
    const map = L.map(mapRef.current, { center: [-34.594, -58.405], zoom: 13, zoomControl: true, attributionControl: true });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>', maxZoom: 19 }).addTo(map);
    mapInstanceRef.current = map;
  }, [leafletReady]);

  useEffect(() => {
    const L = window.L; if (!L || !mapInstanceRef.current) return;
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];
    albergues.forEach(a => {
      if (!a.lat || !a.lng) return;
      const minPrice = Math.min(...(a.rooms || []).map(r => r.price || 0));
      const icon = L.divIcon({ className: "", html: `<div class="rush-marker-icon">$${(minPrice / 1000).toFixed(1)}k/h</div>`, iconAnchor: [0, 0], popupAnchor: [16, -4] });
      const marker = L.marker([a.lat, a.lng], { icon }).addTo(mapInstanceRef.current);
      marker.bindPopup(`<div style="padding:10px 12px"><p style="font-weight:700;font-size:14px;margin:0 0 4px">${a.name}</p><p style="font-size:12px;color:#7A7A7A;margin:0 0 8px">${a.address}</p><button onclick="window.__rushSelect('${a.id}')" style="background:#534AB7;color:#fff;border:none;border-radius:8px;padding:6px 14px;font-size:12px;font-weight:600;cursor:pointer;width:100%">Ver habitaciones</button></div>`, { className: "rush-popup" });
      markersRef.current.push(marker);
    });
    window.__rushSelect = (id) => { const a = albergues.find(x => x.id === id); if (a) onSelectAlbergue(a); };
    return () => { delete window.__rushSelect; };
  }, [albergues, leafletReady, onSelectAlbergue]);

  return <div ref={mapRef} style={{ width: "100%", height: "100%" }} />;
};

// 5. MAP / EXPLORE
const MapScreen = ({ onSelectAlbergue, activeNav, onNavigate, albergues = [], onGoProfile, activeReservation }) => {
  const w = useWindowSize();
  const isDesktop = w >= BP.md;
  const [activeFilter, setActiveFilter] = useState("Cerca");
  const [search, setSearch] = useState("");
  const [bannerTimeLeft, setBannerTimeLeft] = useState(0);

  useEffect(() => {
    if (!activeReservation) return;
    const tick = () => setBannerTimeLeft(Math.max(0, activeReservation.expiresAt - Date.now()));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [activeReservation]);

  const filters = ["Cerca", "Precio", "Calidad", "Suite", "24hs"];
  let filtered = albergues.filter(a =>
    search === "" ||
    a.name.toLowerCase().includes(search.toLowerCase()) ||
    a.address.toLowerCase().includes(search.toLowerCase())
  );
  if (activeFilter === "Precio") filtered = [...filtered].sort((a, b) => Math.min(...(a.rooms || []).map(r => r.price || 0)) - Math.min(...(b.rooms || []).map(r => r.price || 0)));
  else if (activeFilter === "Calidad") filtered = [...filtered].sort((a, b) => (b.rating || 0) - (a.rating || 0));
  else if (activeFilter === "Suite") filtered = filtered.filter(a => (a.rooms || []).some(r => /suite|premium|vip/i.test(r.name)));
  else if (activeFilter === "24hs") filtered = filtered.filter(a => a.rooms?.length > 0);

  const ReservaBanner = () => activeReservation && bannerTimeLeft > 0 ? (
    <div style={{ margin: "0 0 12px", background: `linear-gradient(135deg, ${COLORS.purpleDark}, ${COLORS.purple})`, borderRadius: 16, padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", boxShadow: "0 4px 16px rgba(83,74,183,0.28)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {Icons.shield("#fff", 16)}
        <div>
          <p style={{ fontSize: 10, color: "rgba(255,255,255,0.72)", margin: 0, textTransform: "uppercase", letterSpacing: 1 }}>Reserva activa</p>
          <p style={{ fontSize: 13, fontWeight: 600, color: "#fff", margin: "1px 0 0" }}>{activeReservation.albergue?.name}</p>
        </div>
      </div>
      <div style={{ textAlign: "right" }}>
        <p style={{ fontSize: 26, fontWeight: 800, color: "#fff", margin: 0, letterSpacing: 8, fontFamily: FONTS.display }}>{activeReservation.code.split("").join(" ")}</p>
        <p style={{ fontSize: 10, color: "rgba(255,255,255,0.75)", margin: "1px 0 0" }}>
          {String(Math.floor(bannerTimeLeft / 60000)).padStart(2, "0")}:{String(Math.floor((bannerTimeLeft % 60000) / 1000)).padStart(2, "0")} restantes
        </p>
      </div>
    </div>
  ) : null;

  // ── DESKTOP LAYOUT (lista izquierda + mapa derecha) ──
  if (isDesktop) {
    return (
      <div style={{ display: "flex", height: "100dvh", background: COLORS.bg, ...S.fadeIn }}>
        {/* Left panel — search + list */}
        <div style={{ width: 400, flexShrink: 0, display: "flex", flexDirection: "column", background: COLORS.bg, borderRight: `1px solid ${COLORS.border}`, height: "100dvh" }}>
          {/* Header */}
          <div style={{ padding: "24px 24px 16px", background: COLORS.card, borderBottom: `1px solid ${COLORS.border}`, flexShrink: 0 }}>
            <ReservaBanner />
            <div style={{ position: "relative" }}>
              <input style={{ ...S.input, paddingLeft: 42, borderRadius: 14, background: COLORS.bg }} placeholder="Buscar zona o albergue..." value={search} onChange={e => setSearch(e.target.value)} />
              <div style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)" }}>{Icons.search()}</div>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 12, overflowX: "auto" }}>
              {filters.map(f => <span key={f} style={S.chip(activeFilter === f)} onClick={() => setActiveFilter(f)}>{f}</span>)}
            </div>
          </div>
          {/* List */}
          <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: COLORS.textSec, marginBottom: 12 }}>{filtered.length} albergues encontrados</p>
            {filtered.map(a => <AlbergueCard key={a.id} albergue={a} onClick={() => onSelectAlbergue(a)} />)}
            {filtered.length === 0 && (
              <div style={{ textAlign: "center", padding: "40px 0" }}>
                {Icons.search(COLORS.textTer, 36)}
                <p style={{ fontSize: 14, color: COLORS.textSec, marginTop: 10 }}>Sin resultados para "{search}"</p>
              </div>
            )}
          </div>
        </div>
        {/* Right panel — full-height map */}
        <div style={{ flex: 1, position: "relative" }}>
          <LeafletMapDesktop onSelectAlbergue={onSelectAlbergue} albergues={albergues} />
        </div>
      </div>
    );
  }

  // ── MOBILE / TABLET LAYOUT ──
  return (
    <div style={{ ...S.phone, minHeight: "100dvh", paddingBottom: "calc(70px + env(safe-area-inset-bottom, 12px))", ...S.fadeIn }}>
      <StatusBar />
      <div style={S.header}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <p style={{ fontSize: 24, fontWeight: 700, fontFamily: FONTS.display }}>Rush</p>
            <p style={{ fontSize: 12, color: COLORS.textSec }}>Tu espacio privado</p>
          </div>
          <div onClick={onGoProfile} style={{ width: 38, height: 38, borderRadius: "50%", background: COLORS.purpleLight, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            {Icons.user(COLORS.purple)}
          </div>
        </div>
      </div>
      <div style={{ padding: "0 16px 10px" }}><ReservaBanner /></div>
      <div style={{ ...S.section }}>
        <div style={{ position: "relative" }}>
          <input style={{ ...S.input, paddingLeft: 42, borderRadius: 14, background: COLORS.bg }} placeholder="Buscar zona o albergue..." value={search} onChange={e => setSearch(e.target.value)} />
          <div style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)" }}>{Icons.search()}</div>
        </div>
      </div>
      <LeafletMap onSelectAlbergue={onSelectAlbergue} albergues={albergues} />
      <div style={{ display: "flex", gap: 8, padding: "0 20px", marginBottom: 16, overflowX: "auto" }}>
        {filters.map(f => <span key={f} style={S.chip(activeFilter === f)} onClick={() => setActiveFilter(f)}>{f}</span>)}
      </div>
      <div style={S.section}>
        <p style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Cerca de vos</p>
        {filtered.map(a => <AlbergueCard key={a.id} albergue={a} onClick={() => onSelectAlbergue(a)} />)}
        {filtered.length === 0 && (
          <div style={{ textAlign: "center", padding: "30px 0" }}>
            {Icons.search(COLORS.textTer, 36)}
            <p style={{ fontSize: 14, color: COLORS.textSec, marginTop: 10 }}>Sin resultados para "{search}"</p>
          </div>
        )}
      </div>
      <BottomNav active={activeNav} onNavigate={onNavigate} />
    </div>
  );
};

// 6. DETAIL
const DetailScreen = ({ albergue, onBack, onBookRoom, isFavorite, onToggleFavorite, onChat }) => (
  <div style={{ ...S.phone, minHeight: "100dvh", background: COLORS.card, paddingBottom: 20, ...S.fadeIn }}>
    {/* Hero */}
    <div style={{ height: 220, background: `linear-gradient(135deg, ${COLORS.purpleDark} 0%, ${COLORS.purple} 50%, ${COLORS.purpleMid} 100%)`, position: "relative" }}>
      <StatusBar light />
      <div style={{ position: "absolute", top: 48, left: 16, width: 36, height: 36, borderRadius: "50%", background: "rgba(0,0,0,0.25)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", backdropFilter: "blur(4px)" }} onClick={onBack}>
        {Icons.back("#fff")}
      </div>
      <div style={{ position: "absolute", top: 48, right: 60, width: 36, height: 36, borderRadius: "50%", background: "rgba(0,0,0,0.25)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", backdropFilter: "blur(4px)" }} onClick={onChat}>
        {Icons.chat("#fff", 18)}
      </div>
      <div style={{ position: "absolute", top: 48, right: 16, width: 36, height: 36, borderRadius: "50%", background: isFavorite ? "rgba(229,57,53,0.85)" : "rgba(0,0,0,0.25)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "all 0.2s" }} onClick={onToggleFavorite}>
        {HeartIcon("#fff", 18, isFavorite)}
      </div>
      <div style={{ position: "absolute", bottom: 14, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 6 }}>
        {[1, 0.4, 0.4, 0.4].map((op, i) => (
          <div key={i} style={{ width: 7, height: 7, borderRadius: "50%", background: `rgba(255,255,255,${op})` }} />
        ))}
      </div>
    </div>
    {/* Info */}
    <div style={{ padding: "16px 20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700, fontFamily: FONTS.display }}>{albergue.name}</h2>
          <p style={{ fontSize: 13, color: COLORS.textSec, marginTop: 2 }}>{albergue.address} · {albergue.distance}</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4, background: COLORS.bg, padding: "5px 10px", borderRadius: 12 }}>
          {Icons.star()}
          <span style={{ fontSize: 14, fontWeight: 600 }}>{albergue.rating}</span>
          <span style={{ fontSize: 11, color: COLORS.textSec }}>({albergue.reviews})</span>
        </div>
      </div>
      {/* Tags */}
      <div style={{ display: "flex", gap: 6, margin: "14px 0", flexWrap: "wrap" }}>
        <span style={S.badge(COLORS.greenLight, COLORS.greenDark)}>Disponible ahora</span>
        {albergue.tags.map(t => (
          <span key={t} style={S.badge(COLORS.purpleLight, COLORS.purple)}>{t}</span>
        ))}
      </div>
      {/* Chat CTA */}
      {onChat && (
        <button onClick={onChat} style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "11px 16px", borderRadius: 12, border: `1.5px solid ${COLORS.purple}`, background: COLORS.purpleLight, cursor: "pointer", marginBottom: 14, fontFamily: FONTS.sans }}>
          {Icons.chat(COLORS.purple, 16)}
          <span style={{ fontSize: 14, fontWeight: 600, color: COLORS.purple }}>Consultar antes de reservar</span>
        </button>
      )}
      <div style={{ borderTop: `1px solid ${COLORS.border}`, margin: "4px 0 16px" }} />
      {/* Rooms */}
      <p style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Habitaciones</p>
      {albergue.rooms.map(r => (
        <RoomCard key={r.id} room={r} onBook={onBookRoom} />
      ))}
      {/* Privacy */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 16, padding: "12px 14px", background: COLORS.greenLight, borderRadius: 12 }}>
        {Icons.shield()}
        <p style={{ fontSize: 12, color: COLORS.greenDark, lineHeight: 1.4 }}>Tus datos personales nunca se comparten con el albergue</p>
      </div>
    </div>
  </div>
);

// 7a. MERCADO PAGO WALLET BRICK
const MP_PUBLIC_KEY = (typeof window !== "undefined" && window.RUSH_MP_PUBLIC_KEY) || "TEST-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx";

function loadMPScript() {
  return new Promise((resolve, reject) => {
    if (window.MercadoPago) { resolve(); return; }
    const script = document.createElement("script");
    script.src = "https://sdk.mercadopago.com/js/v2";
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

const MPWalletBrick = ({ albergue, room, total, hours, onConfirm }) => {
  const [status, setStatus] = useState("idle"); // idle | loading | ready | error
  const [errorMsg, setErrorMsg] = useState("");
  const brickRef = useRef(null);
  const brickBuiltRef = useRef(false);

  const initBrick = useCallback(async () => {
    if (brickBuiltRef.current) return;
    setStatus("loading");
    try {
      // 1. Ask backend for preference_id
      const res = await fetch("http://localhost:3001/api/create-preference", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `${albergue.name} – ${room.name}`,
          unit_price: total,
          quantity: 1,
          hours,
        }),
      });
      if (!res.ok) throw new Error("Error del servidor al crear preferencia");
      const { preference_id } = await res.json();

      // 2. Load MP SDK
      await loadMPScript();
      const mp = new window.MercadoPago(MP_PUBLIC_KEY, { locale: "es-AR" });

      // 3. Render Wallet Brick
      const bricks = mp.bricks();
      brickBuiltRef.current = true;
      await bricks.create("wallet", "rush-mp-wallet-brick", {
        initialization: { preferenceId: preference_id, redirectMode: "blank" },
        customization: {
          texts: { valueProp: "smart_option" },
          visual: { buttonBackground: "default", borderRadius: "14px" },
        },
        callbacks: {
          onReady: () => setStatus("ready"),
          onError: (err) => {
            console.error("MP Brick error:", err);
            setErrorMsg("Error al cargar Mercado Pago. Intentá de nuevo.");
            setStatus("error");
            brickBuiltRef.current = false;
          },
          onSubmit: () => {
            // Save pending booking to sessionStorage.
            // Confirmation will happen when MP redirects back with ?mp_status=success
            sessionStorage.setItem("rush_pending_booking", JSON.stringify({
              total, hours, method: "digital",
              albergueName: albergue.name,
              roomName: room.name,
            }));
          },
        },
      });
    } catch (err) {
      console.error("MP init error:", err);
      setErrorMsg(err.message || "No se pudo conectar con Mercado Pago.");
      setStatus("error");
      brickBuiltRef.current = false;
    }
  }, [albergue, room, total, hours, onConfirm]);

  return (
    <div style={{ marginTop: 8 }}>
      {/* Wallet Brick container */}
      <div id="rush-mp-wallet-brick" ref={brickRef} />

      {/* Init button shown only while idle */}
      {status === "idle" && (
        <button style={{ ...S.btn(), background: `linear-gradient(135deg, #009EE3, #007EB5)` }} onClick={initBrick}>
          Pagar con Mercado Pago
        </button>
      )}

      {/* Loading spinner */}
      {status === "loading" && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, padding: "16px 0", color: COLORS.textSec, fontSize: 13 }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={COLORS.purple} strokeWidth="2.5" style={{ animation: "rushSpin 0.8s linear infinite" }}>
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
          </svg>
          Conectando con Mercado Pago…
        </div>
      )}

      {/* Error state */}
      {status === "error" && (
        <div style={{ background: COLORS.redLight, borderRadius: 12, padding: 14, marginBottom: 10 }}>
          <p style={{ fontSize: 13, color: COLORS.redDark, marginBottom: 8 }}>{errorMsg}</p>
          <button style={{ ...S.btn(COLORS.red), fontSize: 13, padding: "8px 16px" }} onClick={() => { setStatus("idle"); }}>
            Reintentar
          </button>
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "center", marginTop: 14 }}>
        {Icons.shield(COLORS.greenDark, 12)}
        <span style={{ fontSize: 11, color: COLORS.textSec }}>Pago seguro con Mercado Pago</span>
      </div>
    </div>
  );
};

// 7. PAYMENT
const PaymentScreen = ({ albergue, room, onBack, onConfirm }) => {
  const [method, setMethod] = useState("digital");
  const [hours, setHours] = useState(2);
  const total = room.price * hours;
  return (
    <ScreenCard maxWidth={620}>
    <div style={{ ...S.phone, minHeight: "100dvh", background: COLORS.card, ...S.fadeIn }}>
      <StatusBar />
      <div style={{ padding: "8px 20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
          <div style={{ cursor: "pointer" }} onClick={onBack}>{Icons.back()}</div>
          <h2 style={{ fontSize: 20, fontWeight: 700, fontFamily: FONTS.display }}>Confirmar reserva</h2>
        </div>
        {/* Summary */}
        <div style={{ background: COLORS.bg, borderRadius: 14, padding: 16, marginBottom: 20 }}>
          <p style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>{albergue.name}</p>
          <p style={{ fontSize: 13, color: COLORS.textSec, marginBottom: 12 }}>{room.name} · {room.amenities}</p>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 13, color: COLORS.textSec }}>Duración</span>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div onClick={() => setHours(Math.max(1, hours - 1))} style={{ width: 30, height: 30, borderRadius: "50%", border: `1.5px solid ${COLORS.border}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 18, color: COLORS.textSec }}>-</div>
              <span style={{ fontSize: 16, fontWeight: 600, minWidth: 50, textAlign: "center" }}>{hours}h</span>
              <div onClick={() => setHours(hours + 1)} style={{ width: 30, height: 30, borderRadius: "50%", border: `1.5px solid ${COLORS.border}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 18, color: COLORS.textSec }}>+</div>
            </div>
          </div>
        </div>
        {/* Payment method */}
        <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Método de pago</p>
        {[
          { key: "digital", icon: Icons.creditCard, label: "Mercado Pago", desc: "Pagá desde la app" },
          { key: "cash", icon: Icons.cash, label: "Efectivo", desc: "Pagás al llegar" },
        ].map(({ key, icon, label, desc }) => (
          <div key={key} onClick={() => setMethod(key)} style={{
            display: "flex", alignItems: "center", gap: 14, padding: 14, borderRadius: 14,
            border: method === key ? `2px solid ${COLORS.purple}` : `1.5px solid ${COLORS.border}`,
            background: method === key ? COLORS.purpleLight : COLORS.card, marginBottom: 10, cursor: "pointer",
            transition: "all 0.15s",
          }}>
            {icon(method === key ? COLORS.purple : COLORS.textSec)}
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 14, fontWeight: 600, color: method === key ? COLORS.purple : COLORS.text }}>{label}</p>
              <p style={{ fontSize: 11, color: COLORS.textSec }}>{desc}</p>
            </div>
            <div style={{ width: 20, height: 20, borderRadius: "50%", border: `2px solid ${method === key ? COLORS.purple : COLORS.border}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              {method === key && <div style={{ width: 10, height: 10, borderRadius: "50%", background: COLORS.purple }} />}
            </div>
          </div>
        ))}
        {/* Total */}
        <div style={{ borderTop: `1px solid ${COLORS.border}`, margin: "20px 0", paddingTop: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ fontSize: 13, color: COLORS.textSec }}>{room.name} x {hours}h</span>
            <span style={{ fontSize: 13 }}>${total.toLocaleString()}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ fontSize: 13, color: COLORS.textSec }}>Cargo de servicio</span>
            <span style={{ fontSize: 13 }}>$0</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12 }}>
            <span style={{ fontSize: 17, fontWeight: 700 }}>Total</span>
            <span style={{ fontSize: 17, fontWeight: 700, color: COLORS.purple }}>${total.toLocaleString()}</span>
          </div>
        </div>
        {method === "digital"
          ? <MPWalletBrick albergue={albergue} room={room} total={total} hours={hours} onConfirm={onConfirm} />
          : (
            <>
              <button style={{ ...S.btn(), marginTop: 8 }} onClick={() => onConfirm(total, hours, method)}>
                Confirmar reserva
              </button>
              <div style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "center", marginTop: 14 }}>
                {Icons.shield(COLORS.greenDark, 12)}
                <span style={{ fontSize: 11, color: COLORS.textSec }}>Reserva anónima y segura</span>
              </div>
            </>
          )
        }
      </div>
    </div>
    </ScreenCard>
  );
};

// 8. CONFIRMATION
const ConfirmationScreen = ({ albergue, room, total, hours, onDone, code: codeProp }) => {
  const code = codeProp || useRef(String(Math.floor(1000 + Math.random() * 9000))).current;
  const [timeLeft, setTimeLeft] = useState(15 * 60);

  useEffect(() => {
    if (timeLeft <= 0) return;
    const t = setInterval(() => setTimeLeft(p => p - 1), 1000);
    return () => clearInterval(t);
  }, [timeLeft]);

  const mins = String(Math.floor(timeLeft / 60)).padStart(2, "0");
  const secs = String(timeLeft % 60).padStart(2, "0");
  const expired = timeLeft <= 0;
  const urgent = timeLeft <= 120;
  const timerBg = expired ? COLORS.redLight : urgent ? COLORS.amberLight : COLORS.greenLight;
  const timerColor = expired ? COLORS.redDark : urgent ? COLORS.amber : COLORS.greenDark;

  return (
    <ScreenCard maxWidth={560}>
    <div style={{ ...S.phone, minHeight: "100dvh", background: COLORS.card }}>
      <StatusBar />
      <div style={{ padding: "8px 20px", ...S.fadeIn }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, fontFamily: FONTS.display }}>Reserva confirmada</h2>
        </div>
        {/* Success */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "12px 0 12px" }}>
          <div style={{ width: 64, height: 64, borderRadius: "50%", background: COLORS.greenLight, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 10, animation: "rushSlideUp 0.5s ease" }}>
            {Icons.check()}
          </div>
          <p style={{ fontSize: 18, fontWeight: 700, fontFamily: FONTS.display }}>¡Todo listo!</p>
          <p style={{ fontSize: 13, color: COLORS.textSec, marginTop: 4 }}>Mostrá este código al llegar</p>
        </div>
        {/* Countdown */}
        <div style={{ margin: "8px 0 10px", padding: "12px 18px", borderRadius: 14, background: timerBg, display: "flex", alignItems: "center", justifyContent: "space-between", transition: "background 0.5s" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {Icons.clock(timerColor, 18)}
            <span style={{ fontSize: 13, fontWeight: 600, color: timerColor }}>
              {expired ? "Tiempo agotado — código inválido" : urgent ? "¡Date prisa!" : "Tiempo para llegar"}
            </span>
          </div>
          {!expired && (
            <span style={{ fontSize: 22, fontWeight: 800, letterSpacing: 1, color: timerColor, fontFamily: FONTS.display }}>
              {mins}:{secs}
            </span>
          )}
        </div>
        {/* Code */}
        <div style={{ margin: "10px 0 16px", padding: "18px 24px", borderRadius: 16, background: COLORS.bg, textAlign: "center", opacity: expired ? 0.45 : 1, transition: "opacity 0.5s" }}>
          <p style={{ fontSize: 11, color: COLORS.textSec, textTransform: "uppercase", letterSpacing: 2, marginBottom: 8 }}>Código de acceso</p>
          <p style={{ fontSize: 48, fontWeight: 800, letterSpacing: 12, color: expired ? COLORS.textTer : COLORS.purple, fontFamily: FONTS.display }}>
            {code.split("").join(" ")}
          </p>
          {expired && <p style={{ fontSize: 12, color: COLORS.redDark, marginTop: 6, fontWeight: 600 }}>Este código ya no es válido</p>}
        </div>
        {/* Details */}
        <div style={{ border: `1px solid ${COLORS.border}`, borderRadius: 14, padding: 16 }}>
          {[
            { label: "Lugar", value: albergue.name },
            { label: "Habitación", value: room.name },
            { label: "Duración", value: `${hours} hora${hours > 1 ? "s" : ""}` },
          ].map(({ label, value }, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
              <span style={{ fontSize: 13, color: COLORS.textSec }}>{label}</span>
              <span style={{ fontSize: 13, fontWeight: 600 }}>{value}</span>
            </div>
          ))}
          <div style={{ borderTop: `1px solid ${COLORS.border}`, paddingTop: 10, display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontSize: 15, fontWeight: 700 }}>Total</span>
            <span style={{ fontSize: 15, fontWeight: 700, color: COLORS.purple }}>${total.toLocaleString()}</span>
          </div>
        </div>
        {/* Privacy */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 14 }}>
          {Icons.shield(COLORS.greenDark, 12)}
          <span style={{ fontSize: 11, color: COLORS.textSec }}>Tus datos personales no se comparten con el albergue</span>
        </div>
        <button style={{ ...S.btn(), marginTop: 20 }} onClick={onDone}>Volver al inicio</button>
      </div>
    </div>
    </ScreenCard>
  );
};

// 8b. CHATS LIST
const ChatsListScreen = ({ chatAlbergues, onOpenChat, activeNav, onNavigate }) => {
  const w = useWindowSize();
  const isTablet = w >= BP.sm;
  return (
    <div style={{ ...S.phone, minHeight: "100dvh", background: COLORS.bg, paddingBottom: "calc(70px + env(safe-area-inset-bottom, 12px))", ...S.fadeIn }}>
      <StatusBar />
      <div style={{ ...S.header, paddingTop: isTablet ? 32 : undefined }}>
        <p style={{ fontSize: 24, fontWeight: 700, fontFamily: FONTS.display }}>Mensajes</p>
        <p style={{ fontSize: 12, color: COLORS.textSec }}>Tus conversaciones</p>
      </div>
      <div style={{ padding: "0 16px", maxWidth: isTablet ? 900 : undefined, margin: isTablet ? "0 auto" : undefined }}>
        {chatAlbergues.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 20px" }}>
            {Icons.chat(COLORS.textTer, 48)}
            <p style={{ fontSize: 16, fontWeight: 600, color: COLORS.text, marginTop: 16 }}>Sin mensajes aún</p>
            <p style={{ fontSize: 13, color: COLORS.textSec, marginTop: 6, lineHeight: 1.5 }}>
              Podés consultar cualquier albergue antes de reservar tocando el ícono de chat en el detalle.
            </p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: isTablet ? "repeat(2, 1fr)" : "1fr", gap: 10 }}>
            {chatAlbergues.map(a => (
              <div key={a.id} onClick={() => onOpenChat(a)}
                style={{ background: COLORS.card, borderRadius: 14, border: `1px solid ${COLORS.border}`, padding: "14px 16px", display: "flex", alignItems: "center", gap: 12, cursor: "pointer", transition: "border-color 0.15s" }}
                onMouseEnter={e => e.currentTarget.style.borderColor = COLORS.purpleMid}
                onMouseLeave={e => e.currentTarget.style.borderColor = COLORS.border}>
                <div style={{ width: 46, height: 46, borderRadius: "50%", background: `linear-gradient(135deg, ${COLORS.purpleDark}, ${COLORS.purpleMid})`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <span style={{ fontSize: 18, fontWeight: 700, color: "#fff" }}>{(a.name || "A")[0]}</span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 15, fontWeight: 600, margin: "0 0 2px" }}>{a.name}</p>
                  <p style={{ fontSize: 12, color: COLORS.textSec, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {a.address || "Tocá para ver la conversación"}
                  </p>
                </div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={COLORS.textTer} strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
              </div>
            ))}
          </div>
        )}
      </div>
      <BottomNav active={activeNav} onNavigate={onNavigate} />
    </div>
  );
};

// 9. HISTORY
const HistoryScreen = ({ reservations, activeNav, onNavigate, token, albergues, onRebook }) => {
  const [reviewModal, setReviewModal] = useState(null);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [reviewError, setReviewError] = useState("");
  const [reviewed, setReviewed] = useState(new Set());

  const openReview = (r) => { setReviewModal(r); setRating(0); setHoverRating(0); setComment(""); setReviewError(""); };
  const closeReview = () => { setReviewModal(null); setReviewError(""); };

  const submitReview = async () => {
    if (!rating) { setReviewError("Seleccioná una calificación"); return; }
    setSubmitting(true);
    setReviewError("");
    try {
      if (!reviewModal.id) {
        // Sin ID real de DB: guardamos la reseña localmente como confirmación visual
        setReviewed(prev => new Set([...prev, reviewModal.albergue_id]));
        closeReview();
        return;
      }
      await api.post("/reviews", {
        albergue_id: reviewModal.albergue_id,
        reservation_id: reviewModal.id,
        rating,
        comment: comment.trim(),
      }, token);
      setReviewed(prev => new Set([...prev, reviewModal.id]));
      closeReview();
    } catch (err) {
      const msg = err.message || "";
      if (msg.includes("completada")) {
        setReviewError("Tu reserva aún está siendo procesada. Volvé a intentarlo en unos minutos.");
      } else if (msg.includes("Ya dejaste")) {
        setReviewed(prev => new Set([...prev, reviewModal.id]));
        closeReview();
      } else {
        setReviewError(msg || "No se pudo enviar la reseña");
      }
    }
    setSubmitting(false);
  };

  const statusBadge = (status) => {
    const map = {
      completada: { bg: COLORS.greenLight, color: COLORS.greenDark, label: "Completada" },
      en_curso: { bg: COLORS.purpleLight, color: COLORS.purple, label: "En curso" },
      pendiente: { bg: COLORS.amberLight, color: COLORS.amber, label: "Pendiente" },
      cancelada: { bg: COLORS.redLight, color: COLORS.redDark, label: "Cancelada" },
    };
    const s = map[status] || map.completada;
    return <span style={S.badge(s.bg, s.color)}>{s.label}</span>;
  };

  const ww = useWindowSize();
  const isTablet = ww >= BP.sm;
  return (
    <div style={{ ...S.phone, minHeight: "100dvh", paddingBottom: "calc(70px + env(safe-area-inset-bottom, 12px))", ...S.fadeIn }}>
      <StatusBar />
      <div style={{ ...S.header, paddingTop: isTablet ? 32 : undefined }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, fontFamily: FONTS.display }}>Historial</h2>
        <p style={{ fontSize: 13, color: COLORS.textSec, marginTop: 2 }}>Tus reservas anteriores</p>
      </div>
      <div style={{ padding: "0 20px", maxWidth: isTablet ? 1000 : undefined, margin: isTablet ? "0 auto" : undefined }}>
        {reservations.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 0" }}>
            {Icons.clock(COLORS.textTer, 40)}
            <p style={{ fontSize: 14, color: COLORS.textSec, marginTop: 12 }}>Todavía no tenés reservas</p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: isTablet ? "repeat(2, 1fr)" : "1fr", gap: 10 }}>
          {reservations.map((r, i) => (
            <div key={r.id || i} style={{ ...S.card, animation: `rushFadeIn 0.3s ease ${i * 0.08}s both`, marginBottom: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                <div style={{ flex: 1, minWidth: 0, marginRight: 8 }}>
                  <p style={{ fontSize: 15, fontWeight: 600 }}>{r.albergue}</p>
                  <p style={{ fontSize: 12, color: COLORS.textSec }}>{r.room} · {r.hours}h</p>
                </div>
                {statusBadge(r.status)}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", borderTop: `1px solid ${COLORS.border}`, paddingTop: 8, marginTop: 4, marginBottom: 10 }}>
                <span style={{ fontSize: 12, color: COLORS.textSec }}>Código: <strong>{r.code}</strong></span>
                <span style={{ fontSize: 13, fontWeight: 600 }}>${r.total.toLocaleString()}</span>
              </div>
              {/* Actions */}
              <div style={{ display: "flex", gap: 8 }}>
                {onRebook && r.albergue_id && (
                  <button
                    onClick={() => onRebook(r)}
                    style={{ flex: 1, padding: "8px 0", borderRadius: 10, border: `1.5px solid ${COLORS.purple}`, background: "transparent", color: COLORS.purple, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: FONTS.sans }}>
                    Reservar de nuevo
                  </button>
                )}
                {token && r.albergue_id && !reviewed.has(r.id || i) && (
                  <button
                    onClick={() => openReview(r)}
                    style={{ flex: 1, padding: "8px 0", borderRadius: 10, border: "none", background: COLORS.purpleLight, color: COLORS.purple, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: FONTS.sans }}>
                    Dejar reseña
                  </button>
                )}
                {(reviewed.has(r.id) || reviewed.has(r.albergue_id)) && (
                  <div style={{ flex: 1, padding: "8px 0", borderRadius: 10, background: COLORS.greenLight, textAlign: "center" }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: COLORS.greenDark }}>✓ Reseña enviada</span>
                  </div>
                )}
              </div>
            </div>
          ))}
          </div>
        )}
      </div>
      <BottomNav active={activeNav} onNavigate={onNavigate} />

      {/* Review Modal */}
      {reviewModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 200, display: "flex", alignItems: "flex-end", justifyContent: "center" }}
          onClick={(e) => { if (e.target === e.currentTarget) closeReview(); }}>
          <div style={{ width: "100%", maxWidth: 480, background: COLORS.card, borderRadius: "20px 20px 0 0", padding: "24px 20px 36px", animation: "rushSlideUp 0.3s ease" }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: COLORS.border, margin: "0 auto 20px" }} />
            <h3 style={{ fontSize: 18, fontWeight: 700, fontFamily: FONTS.display, marginBottom: 4 }}>Dejar reseña</h3>
            <p style={{ fontSize: 13, color: COLORS.textSec, marginBottom: 20 }}>{reviewModal.albergue} · {reviewModal.room}</p>

            {/* Stars */}
            <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>Calificación</p>
            <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
              {[1, 2, 3, 4, 5].map(n => (
                <div key={n}
                  onMouseEnter={() => setHoverRating(n)}
                  onMouseLeave={() => setHoverRating(0)}
                  onClick={() => setRating(n)}
                  style={{ cursor: "pointer", fontSize: 36, lineHeight: 1, transition: "transform 0.1s", transform: (hoverRating || rating) >= n ? "scale(1.15)" : "scale(1)" }}>
                  <span style={{ color: (hoverRating || rating) >= n ? COLORS.amber : COLORS.border }}>★</span>
                </div>
              ))}
              {rating > 0 && (
                <span style={{ fontSize: 13, color: COLORS.textSec, alignSelf: "center", marginLeft: 4 }}>
                  {["", "Muy malo", "Malo", "Regular", "Bueno", "Excelente"][rating]}
                </span>
              )}
            </div>

            {/* Comment */}
            <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Comentario (opcional)</p>
            <textarea
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder="Contá tu experiencia..."
              maxLength={300}
              rows={3}
              style={{ width: "100%", padding: "10px 14px", borderRadius: 12, border: `1.5px solid ${COLORS.border}`, fontSize: 14, fontFamily: FONTS.sans, resize: "none", outline: "none", boxSizing: "border-box", color: COLORS.text, background: COLORS.bg }}
            />
            <p style={{ fontSize: 11, color: COLORS.textTer, textAlign: "right", marginTop: 4 }}>{comment.length}/300</p>

            {reviewError && (
              <p style={{ fontSize: 13, color: COLORS.redDark, fontWeight: 600, marginTop: 8 }}>{reviewError}</p>
            )}

            <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
              <button onClick={closeReview}
                style={{ flex: 1, padding: "12px 0", borderRadius: 12, border: `1.5px solid ${COLORS.border}`, background: "transparent", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: FONTS.sans, color: COLORS.textSec }}>
                Cancelar
              </button>
              <button onClick={submitReview} disabled={submitting || !rating}
                style={{ flex: 2, padding: "12px 0", borderRadius: 12, border: "none", background: rating ? COLORS.purple : COLORS.border, color: rating ? "#fff" : COLORS.textSec, fontSize: 14, fontWeight: 600, cursor: rating ? "pointer" : "not-allowed", fontFamily: FONTS.sans, opacity: submitting ? 0.7 : 1 }}>
                {submitting ? "Enviando..." : "Enviar reseña"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// 10. FAVORITES
const FavoritesScreen = ({ favorites, onSelectAlbergue, onRemoveFavorite, activeNav, onNavigate }) => {
  const ww = useWindowSize();
  const isTablet = ww >= BP.sm;
  return (
    <div style={{ ...S.phone, minHeight: "100dvh", paddingBottom: "calc(70px + env(safe-area-inset-bottom, 12px))", ...S.fadeIn }}>
      <StatusBar />
      <div style={{ ...S.header, paddingTop: isTablet ? 32 : undefined }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, fontFamily: FONTS.display }}>Favoritos</h2>
        <p style={{ fontSize: 13, color: COLORS.textSec, marginTop: 2 }}>Tus albergues guardados</p>
      </div>
      <div style={{ padding: "0 20px", maxWidth: isTablet ? 1000 : undefined, margin: isTablet ? "0 auto" : undefined }}>
        {favorites.length === 0 ? (
          <div style={{ textAlign: "center", padding: "50px 0" }}>
            <div style={{ marginBottom: 12 }}>{HeartIcon(COLORS.textTer, 44)}</div>
            <p style={{ fontSize: 15, fontWeight: 500, color: COLORS.textSec, marginBottom: 4 }}>Sin favoritos todavía</p>
            <p style={{ fontSize: 13, color: COLORS.textTer, lineHeight: 1.5, maxWidth: 240, margin: "0 auto" }}>
              Tocá el corazón en cualquier albergue para guardarlo acá
            </p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: isTablet ? "repeat(2, 1fr)" : "1fr", gap: 10 }}>
          {favorites.map((a, i) => {
            const minPrice = Math.min(...a.rooms.map(r => r.price));
            const totalAvail = a.rooms.reduce((acc, r) => acc + r.available, 0);
            return (
              <div key={a.id} style={{ ...S.card, animation: `rushFadeIn 0.3s ease ${i * 0.08}s both`, position: "relative", marginBottom: 0 }}>
                <div style={{ position: "absolute", top: 12, right: 12, cursor: "pointer", zIndex: 2 }} onClick={(e) => { e.stopPropagation(); onRemoveFavorite(a.id); }}>
                  {HeartIcon(COLORS.red, 20, true)}
                </div>
                <div style={{ display: "flex", gap: 12, cursor: "pointer" }} onClick={() => onSelectAlbergue(a)}>
                  <div style={{ width: 72, height: 72, borderRadius: 12, background: `linear-gradient(135deg, ${COLORS.purpleDark}, ${COLORS.purpleMid})`, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0, paddingRight: 24 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                      <p style={{ fontSize: 15, fontWeight: 600 }}>{a.name}</p>
                      <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
                        {Icons.star(COLORS.amber, 12)}
                        <span style={{ fontSize: 12, fontWeight: 600 }}>{a.rating}</span>
                      </div>
                    </div>
                    <p style={{ fontSize: 12, color: COLORS.textSec, marginBottom: 6 }}>{a.distance} · {a.address}</p>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 15, fontWeight: 600 }}>
                        ${minPrice.toLocaleString()}<span style={{ fontSize: 11, fontWeight: 400, color: COLORS.textSec }}>/h</span>
                      </span>
                      <span style={S.badge(totalAvail > 0 ? COLORS.greenLight : COLORS.redLight, totalAvail > 0 ? COLORS.greenDark : COLORS.redDark)}>
                        {totalAvail > 0 ? `${totalAvail} disponibles` : "Lleno"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          </div>
        )}
      </div>
      <BottomNav active={activeNav} onNavigate={onNavigate} />
    </div>
  );
};

// 11. PROFILE
const ProfileScreen = ({ onLogout, activeNav, onNavigate, authUser }) => {
  const [editingProfile, setEditingProfile] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [profileName, setProfileName] = useState(authUser?.name || "Usuario Rush");
  const [profilePhone, setProfilePhone] = useState(authUser?.phone || "");
  const [profileEmail] = useState(authUser?.email || "usuario@rush.app");
  const [saved, setSaved] = useState(false);
  const [notifReservas, setNotifReservas] = useState(true);
  const [notifOfertas, setNotifOfertas] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleSave = () => { setEditingProfile(false); setSaved(true); setTimeout(() => setSaved(false), 2000); };

  const ToggleSwitch = ({ on, onToggle }) => (
    <div onClick={onToggle} style={{ width: 44, height: 24, borderRadius: 12, background: on ? COLORS.purple : COLORS.border, cursor: "pointer", position: "relative", transition: "background 0.2s", flexShrink: 0 }}>
      <div style={{ width: 20, height: 20, borderRadius: "50%", background: "#fff", position: "absolute", top: 2, left: on ? 22 : 2, transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.15)" }} />
    </div>
  );

  return (
    <div style={{ ...S.phone, minHeight: "100dvh", paddingBottom: "calc(70px + env(safe-area-inset-bottom, 12px))", ...S.fadeIn }}>
      <StatusBar />
      <div style={S.header}>
        <h2 style={{ fontSize: 22, fontWeight: 700, fontFamily: FONTS.display }}>Perfil</h2>
      </div>

      {/* Avatar + info */}
      <div style={{ ...S.section, display: "flex", alignItems: "center", gap: 14, marginBottom: 24 }}>
        <div style={{ position: "relative" }}>
          <div style={{ width: 56, height: 56, borderRadius: "50%", background: `linear-gradient(135deg, ${COLORS.purpleDark}, ${COLORS.purpleMid})`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: 22, fontWeight: 700, color: "#fff", fontFamily: FONTS.display }}>{(authUser?.name || "U")[0].toUpperCase()}</span>
          </div>
          <div style={{ position: "absolute", bottom: -2, right: -2, width: 20, height: 20, borderRadius: "50%", background: COLORS.purple, display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid #fff", cursor: "pointer" }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><path d="M12 5v14M5 12h14" /></svg>
          </div>
        </div>
        <div>
          <p style={{ fontSize: 17, fontWeight: 600 }}>{authUser?.name || "Usuario Rush"}</p>
          <p style={{ fontSize: 13, color: COLORS.textSec }}>{authUser?.email || "usuario@rush.app"}</p>
        </div>
      </div>

      {saved && <div style={{ margin: "0 20px 12px", padding: "10px 14px", background: COLORS.greenLight, borderRadius: 10, fontSize: 13, color: COLORS.greenDark, fontWeight: 600 }}>{"Perfil actualizado \u2713"}</div>}

      <div style={S.section}>
        {/* Editar perfil */}
        <div style={{ cursor: "pointer" }} onClick={() => { setEditingProfile(!editingProfile); setShowPrivacy(false); setShowConfig(false); }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 0", borderBottom: `1px solid ${COLORS.border}` }}>
            {Icons.user(COLORS.textSec, 18)}
            <span style={{ fontSize: 15, flex: 1 }}>Editar perfil</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={COLORS.textTer} strokeWidth="2" style={{ transform: editingProfile ? "rotate(90deg)" : "none", transition: "transform 0.2s" }}><path d="M9 18l6-6-6-6" /></svg>
          </div>
        </div>
        {editingProfile && (
          <div style={{ padding: "14px 0", borderBottom: `1px solid ${COLORS.border}` }}>
            {/* Photo upload placeholder */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <div style={{ width: 48, height: 48, borderRadius: "50%", background: COLORS.purpleLight, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", border: `2px dashed ${COLORS.purple}` }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={COLORS.purple} strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" /></svg>
              </div>
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, color: COLORS.purple, cursor: "pointer" }}>Cambiar foto</p>
                <p style={{ fontSize: 11, color: COLORS.textTer }}>JPG o PNG, {"m\u00e1x"} 5MB</p>
              </div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, color: COLORS.textSec, display: "block", marginBottom: 4 }}>Nombre</label>
              <input value={profileName} onChange={e => setProfileName(e.target.value)} style={{ ...S.input, fontSize: 14 }} />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, color: COLORS.textSec, display: "block", marginBottom: 4 }}>Email</label>
              <input value={profileEmail} disabled style={{ ...S.input, fontSize: 14, opacity: 0.6 }} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, color: COLORS.textSec, display: "block", marginBottom: 4 }}>{"Tel\u00e9fono"}</label>
              <input value={profilePhone} onChange={e => setProfilePhone(e.target.value)} placeholder="+54 11 1234-5678" style={{ ...S.input, fontSize: 14 }} />
            </div>
            <button onClick={handleSave} style={{ ...S.btn(), fontSize: 14, padding: "10px 20px" }}>Guardar cambios</button>
          </div>
        )}

        {/* Privacidad */}
        <div style={{ cursor: "pointer" }} onClick={() => { setShowPrivacy(!showPrivacy); setEditingProfile(false); setShowConfig(false); }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 0", borderBottom: `1px solid ${COLORS.border}` }}>
            {Icons.shield(COLORS.greenDark, 16)}
            <span style={{ fontSize: 15, flex: 1 }}>Privacidad y seguridad</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={COLORS.textTer} strokeWidth="2" style={{ transform: showPrivacy ? "rotate(90deg)" : "none", transition: "transform 0.2s" }}><path d="M9 18l6-6-6-6" /></svg>
          </div>
        </div>
        {showPrivacy && (
          <div style={{ padding: "14px 0", borderBottom: `1px solid ${COLORS.border}`, fontSize: 13, color: COLORS.textSec, lineHeight: 1.7 }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 10 }}>
              {Icons.shield(COLORS.greenDark, 14)}
              <p>{"Los albergues nunca ven tu nombre ni datos personales. Solo reciben un c\u00f3digo de reserva de 4 d\u00edgitos."}</p>
            </div>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 10 }}>
              {Icons.shield(COLORS.greenDark, 14)}
              <p>{"Tus favoritos e historial son privados y solo vos pod\u00e9s verlos."}</p>
            </div>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
              {Icons.shield(COLORS.greenDark, 14)}
              <p>{"Pod\u00e9s eliminar tu cuenta en cualquier momento desde Configuraci\u00f3n."}</p>
            </div>
          </div>
        )}

        {/* Configuración */}
        <div style={{ cursor: "pointer" }} onClick={() => { setShowConfig(!showConfig); setEditingProfile(false); setShowPrivacy(false); }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 0", borderBottom: `1px solid ${COLORS.border}` }}>
            {Icons.settings(COLORS.textSec, 18)}
            <span style={{ fontSize: 15, flex: 1 }}>{"Configuraci\u00f3n"}</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={COLORS.textTer} strokeWidth="2" style={{ transform: showConfig ? "rotate(90deg)" : "none", transition: "transform 0.2s" }}><path d="M9 18l6-6-6-6" /></svg>
          </div>
        </div>
        {showConfig && (
          <div style={{ padding: "14px 0", borderBottom: `1px solid ${COLORS.border}`, fontSize: 13, color: COLORS.textSec }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <span>Notificaciones de reservas</span>
              <ToggleSwitch on={notifReservas} onToggle={() => setNotifReservas(!notifReservas)} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <span>Notificaciones de ofertas</span>
              <ToggleSwitch on={notifOfertas} onToggle={() => setNotifOfertas(!notifOfertas)} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <span>Modo oscuro</span>
              <ToggleSwitch on={darkMode} onToggle={() => setDarkMode(!darkMode)} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <span>Idioma</span>
              <span style={{ fontSize: 13, color: COLORS.purple, fontWeight: 600 }}>{"Espa\u00f1ol (AR)"}</span>
            </div>
            <div style={{ borderTop: `1px solid ${COLORS.border}`, paddingTop: 14, marginTop: 4 }}>
              {!showDeleteConfirm ? (
                <p style={{ fontSize: 13, color: COLORS.red, fontWeight: 600, cursor: "pointer" }} onClick={() => setShowDeleteConfirm(true)}>Eliminar mi cuenta</p>
              ) : (
                <div style={{ background: COLORS.redLight, borderRadius: 10, padding: 12 }}>
                  <p style={{ fontSize: 13, color: COLORS.red, fontWeight: 600, marginBottom: 8 }}>{"¿Est\u00e1s seguro? Esta acci\u00f3n es irreversible."}</p>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => setShowDeleteConfirm(false)} style={{ flex: 1, padding: "8px", borderRadius: 8, border: `1px solid ${COLORS.border}`, background: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Cancelar</button>
                    <button onClick={() => { alert("Cuenta eliminada (demo). En producci\u00f3n esto borrar\u00eda todos tus datos."); onLogout(); }} style={{ flex: 1, padding: "8px", borderRadius: 8, border: "none", background: COLORS.red, color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>{"S\u00ed, eliminar"}</button>
                  </div>
                </div>
              )}
            </div>
            <p style={{ fontSize: 11, color: COLORS.textTer, marginTop: 12 }}>{"Versi\u00f3n Rush 1.0.0"}</p>
          </div>
        )}

        {/* Cerrar sesión */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 0", cursor: "pointer" }} onClick={onLogout}>
          {Icons.logout(COLORS.red)}
          <span style={{ fontSize: 15, color: COLORS.red, fontWeight: 500 }}>{"Cerrar sesi\u00f3n"}</span>
        </div>
      </div>
      <BottomNav active={activeNav} onNavigate={onNavigate} />
    </div>
  );
};

// 12. CHAT SCREEN
const ChatScreen = ({ albergue, token, authUser, onBack, activeNav, onNavigate }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef(null);
  const pollRef = useRef(null);

  const loadMessages = useCallback(async () => {
    if (!token || !albergue?.id) { setLoading(false); return; }
    try {
      const data = await api.get(`/messages/${albergue.id}`, token);
      setMessages(data.messages || []);
    } catch {
      // silencio — sin token o sin conexión
    }
    setLoading(false);
  }, [token, albergue?.id]);

  useEffect(() => {
    loadMessages();
    pollRef.current = setInterval(loadMessages, 8000);
    return () => clearInterval(pollRef.current);
  }, [loadMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || sending || !token) return;
    setSending(true);
    const optimistic = { id: "tmp-" + Date.now(), sender_role: "user", content: input.trim(), created_at: new Date().toISOString() };
    setMessages(prev => [...prev, optimistic]);
    setInput("");
    try {
      await api.post(`/messages/${albergue.id}`, { content: optimistic.content }, token);
      loadMessages();
    } catch {
      setMessages(prev => prev.filter(m => m.id !== optimistic.id));
    }
    setSending(false);
  };

  const handleKey = (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } };

  const fmtTime = (iso) => {
    const d = new Date(iso);
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  };

  return (
    <div style={{ ...S.phone, minHeight: "100dvh", background: COLORS.bg, display: "flex", flexDirection: "column", ...S.fadeIn }}>
      {/* Header */}
      <div style={{ background: COLORS.card, borderBottom: `1px solid ${COLORS.border}`, padding: "52px 16px 12px", display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
        <div onClick={onBack} style={{ cursor: "pointer", width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {Icons.back()}
        </div>
        <div style={{ width: 40, height: 40, borderRadius: "50%", background: `linear-gradient(135deg, ${COLORS.purpleDark}, ${COLORS.purpleMid})`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: "#fff" }}>{(albergue?.name || "A")[0]}</span>
        </div>
        <div>
          <p style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>{albergue?.name}</p>
          <p style={{ fontSize: 11, color: COLORS.green, margin: 0, fontWeight: 500 }}>● En línea</p>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 16px 0" }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: "40px 0", color: COLORS.textSec, fontSize: 13 }}>Cargando conversación...</div>
        ) : messages.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 0" }}>
            {Icons.chat(COLORS.textTer, 40)}
            <p style={{ fontSize: 14, color: COLORS.textSec, marginTop: 12 }}>Iniciá la conversación</p>
            <p style={{ fontSize: 12, color: COLORS.textTer, marginTop: 4 }}>Preguntá lo que necesites antes de reservar</p>
          </div>
        ) : (
          messages.map((m, i) => {
            const isMe = m.sender_role === "user";
            return (
              <div key={m.id || i} style={{ display: "flex", flexDirection: "column", alignItems: isMe ? "flex-end" : "flex-start", marginBottom: 12 }}>
                <div style={{
                  maxWidth: "78%", padding: "10px 14px", borderRadius: isMe ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                  background: isMe ? COLORS.purple : COLORS.card,
                  border: isMe ? "none" : `1px solid ${COLORS.border}`,
                  boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                }}>
                  {!isMe && <p style={{ fontSize: 11, fontWeight: 600, color: COLORS.purple, margin: "0 0 4px" }}>{albergue?.name}</p>}
                  <p style={{ fontSize: 14, color: isMe ? "#fff" : COLORS.text, margin: 0, lineHeight: 1.45 }}>{m.content}</p>
                </div>
                <span style={{ fontSize: 10, color: COLORS.textTer, marginTop: 3, paddingLeft: 4, paddingRight: 4 }}>{m.created_at ? fmtTime(m.created_at) : ""}</span>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ background: COLORS.card, borderTop: `1px solid ${COLORS.border}`, padding: "10px 12px", display: "flex", gap: 8, alignItems: "flex-end", flexShrink: 0, paddingBottom: 24 }}>
        {!token ? (
          <p style={{ fontSize: 13, color: COLORS.textSec, textAlign: "center", flex: 1, padding: "8px 0" }}>Iniciá sesión para enviar mensajes</p>
        ) : (
          <>
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Escribí tu consulta..."
              rows={1}
              style={{ flex: 1, padding: "10px 14px", borderRadius: 20, border: `1.5px solid ${COLORS.border}`, fontSize: 14, fontFamily: FONTS.sans, resize: "none", outline: "none", maxHeight: 80, background: COLORS.bg, color: COLORS.text, lineHeight: 1.4 }}
            />
            <button onClick={sendMessage} disabled={sending || !input.trim()}
              style={{ width: 40, height: 40, borderRadius: "50%", border: "none", background: input.trim() ? COLORS.purple : COLORS.border, cursor: input.trim() ? "pointer" : "not-allowed", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "background 0.2s" }}>
              {Icons.send("#fff", 16)}
            </button>
          </>
        )}
      </div>
    </div>
  );
};

// ---- MAIN APP ----
function RushUserApp({ onLogout, startScreen = "splash" }) {
  const w = useWindowSize();
  const isDesktop = w >= BP.md;
  const [screen, setScreen] = useState(startScreen);
  const [selectedAlbergue, setSelectedAlbergue] = useState(null);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [bookingInfo, setBookingInfo] = useState({});
  const [reservations, setReservations] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [albergues, setAlbergues] = useState([]);
  const [activeNav, setActiveNav] = useState("map");
  const [authUser, setAuthUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("rush_token") || "");
  const [chatAlbergues, setChatAlbergues] = useState([]); // albergues the user has chatted with
  const [chatBackTarget, setChatBackTarget] = useState("detail");
  const [activeReservation, setActiveReservation] = useState(null); // current active booking

  // Cargar albergues desde API — solo Suite Palermo (martin@suitepalermo.com)
  useEffect(() => {
    api.get("/albergues").then(data => {
      const fromApi = (data.albergues || []).map(formatAlbergue);
      const suitePalermo = fromApi.filter(a => a.name?.toLowerCase().includes("suite palermo") || a.name?.toLowerCase().includes("palermo"));
      // También incluir el albergue del admin desde localStorage si no está en la lista
      try {
        const adminRaw = localStorage.getItem("rush_admin_albergue");
        if (adminRaw) {
          const adminAlbergue = formatAlbergue(JSON.parse(adminRaw));
          if (adminAlbergue?.id && !suitePalermo.find(a => a.id === adminAlbergue.id)) {
            setAlbergues([adminAlbergue, ...suitePalermo]);
            return;
          }
        }
      } catch { /* ignore */ }
      setAlbergues(suitePalermo.length > 0 ? suitePalermo : fromApi);
    }).catch(err => console.error("Error cargando albergues:", err));
  }, []);

  // Cargar favoritos si hay token
  useEffect(() => {
    if (!token) return;
    api.get("/favorites", token).then(data => {
      setFavorites((data.favorites || []).map(formatAlbergue));
    }).catch(() => { });
  }, [token]);

  // Cargar historial de reservas si hay token
  const DEMO_RESERVATION = {
    id: "demo-rev-001",
    albergue_id: "demo-albergue-001",
    room_id: "demo-room-001",
    albergue: "Suite Palermo",
    room: "Suite Premium",
    total: 8500,
    hours: 1,
    code: "7391",
    status: "completada",
    isDemo: true,
  };

  useEffect(() => {
    if (!token) return;
    api.get("/reservations", token).then(data => {
      const fromApi = (data.reservations || []).map(r => ({
        id: r.id,
        albergue_id: r.albergue_id,
        room_id: r.room_id,
        albergue: r.albergues?.name || "—",
        room: r.rooms?.name || "—",
        total: r.total,
        hours: r.hours,
        code: r.code,
        status: r.status || "completada",
        created_at: r.created_at,
      }));
      setReservations([...fromApi, DEMO_RESERVATION]);
    }).catch(() => { });
  }, [token]);

  // Detect MP redirect back (success/failure/pending)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const mpStatus = params.get("mp_status");
    if (!mpStatus) return;
    window.history.replaceState({}, document.title, window.location.pathname);
    const pending = sessionStorage.getItem("rush_pending_booking");
    if (mpStatus === "success" && pending) {
      const { total, hours, method, albergueName, roomName } = JSON.parse(pending);
      sessionStorage.removeItem("rush_pending_booking");
      setSelectedAlbergue({ name: albergueName });
      setSelectedRoom({ name: roomName });
      setBookingInfo({ total, hours, method });
      setReservations(prev => [...prev, {
        albergue: albergueName, room: roomName,
        total, hours, code: String(Math.floor(1000 + Math.random() * 9000)),
      }]);
      setScreen("confirmation");
    } else if (mpStatus === "failure") {
      setScreen("map");
      setActiveNav("map");
    }
  }, []);

  const navigate = (s) => { window.scrollTo(0, 0); setScreen(s); };

  const handleNavigation = (key) => {
    setActiveNav(key);
    if (key === "map") navigate("map");
    else if (key === "favorites") navigate("favorites");
    else if (key === "chats") navigate("chats");
    else if (key === "history") navigate("history");
    else if (key === "profile") navigate("profile");
  };

  const handleAuthSuccess = (user) => {
    setAuthUser(user);
    setToken(localStorage.getItem("rush_token") || "");
    setActiveNav("map");
    navigate("map");
  };

  const toggleFavorite = async (albergue) => {
    const isFav = favorites.some(a => a.id === albergue.id);
    if (isFav) {
      setFavorites(prev => prev.filter(a => a.id !== albergue.id));
      if (token) api.del(`/favorites/${albergue.id}`, token).catch(() => { });
    } else {
      setFavorites(prev => [...prev, albergue]);
      if (token) api.post("/favorites", { albergue_id: albergue.id }, token).catch(() => { });
    }
  };

  const isFavorite = (id) => favorites.some(a => a.id === id);

  const handleSelectAlbergue = (a) => { setSelectedAlbergue(a); navigate("detail"); };
  const handleBookRoom = (r) => { setSelectedRoom(r); navigate("payment"); };
  const handleOpenChat = () => {
    if (selectedAlbergue) {
      setChatAlbergues(prev => prev.some(a => a.id === selectedAlbergue.id) ? prev : [...prev, selectedAlbergue]);
    }
    setChatBackTarget("detail");
    navigate("chat");
  };
  const handleOpenChatFromList = (albergue) => {
    setSelectedAlbergue(albergue);
    setChatBackTarget("chats");
    navigate("chat");
  };
  const handleConfirm = async (total, hours, method) => {
    setBookingInfo({ total, hours, method });
    const fallbackCode = String(Math.floor(1000 + Math.random() * 9000));
    let finalCode = fallbackCode;
    let finalTotal = total;
    // Crear reserva real en la API
    if (token && selectedAlbergue && selectedRoom) {
      try {
        const data = await api.post("/reservations", {
          albergue_id: selectedAlbergue.id,
          room_id: selectedRoom.id,
          hours,
          pay_method: method === "digital" ? "digital" : "cash",
        }, token);
        finalCode = data.reservation.code || fallbackCode;
        finalTotal = data.reservation.total || total;
        setReservations(prev => [...prev, {
          id: data.reservation.id,
          albergue_id: selectedAlbergue.id,
          room_id: selectedRoom.id,
          albergue: selectedAlbergue.name,
          room: selectedRoom.name,
          total: finalTotal,
          hours,
          code: finalCode,
          status: data.reservation.status || "completada",
          created_at: data.reservation.created_at,
        }]);
        setBookingInfo({ total: finalTotal, hours, method });
      } catch (err) {
        console.error("Error creando reserva:", err);
        setReservations(prev => [...prev, {
          albergue_id: selectedAlbergue.id,
          room_id: selectedRoom.id,
          albergue: selectedAlbergue.name, room: selectedRoom.name,
          total, hours, code: finalCode,
          status: "completada",
        }]);
      }
    } else {
      setReservations(prev => [...prev, {
        albergue_id: selectedAlbergue?.id,
        room_id: selectedRoom?.id,
        albergue: selectedAlbergue.name, room: selectedRoom.name,
        total, hours, code: finalCode,
        status: "completada",
      }]);
    }
    // Guardar reserva activa para el banner del mapa (15 min de ventana de check-in)
    setActiveReservation({
      code: finalCode,
      albergue: selectedAlbergue,
      room: selectedRoom,
      hours,
      total: finalTotal,
      expiresAt: Date.now() + 15 * 60 * 1000,
    });
    // Sync con panel admin vía localStorage
    const reservaAdmin = {
      id: Date.now(),
      room: selectedRoom.name,
      checkIn: new Date().toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" }),
      duration: `${hours}h`,
      code: finalCode,
      amount: finalTotal,
      status: "pendiente",
      payMethod: method === "digital" ? "Mercado Pago" : "Efectivo",
    };
    const prevAdmin = JSON.parse(localStorage.getItem("rush_admin_reservations") || "[]");
    localStorage.setItem("rush_admin_reservations", JSON.stringify([reservaAdmin, ...prevAdmin]));
    navigate("confirmation");
  };

  const handleLogout = () => {
    localStorage.removeItem("rush_token");
    localStorage.removeItem("rush_user");
    setToken("");
    setAuthUser(null);
    onLogout();
  };

  // Pantallas que NO muestran el sidebar (pre-login)
  const noShell = ["splash", "onboarding", "login", "register", "forgot"].includes(screen);

  const screenContent = (
    <>
      {screen === "splash" && <SplashScreen onFinish={() => navigate("onboarding")} />}
      {screen === "onboarding" && <UserOnboardingScreen onLogin={() => navigate("login")} onRegister={() => navigate("register")} />}
      {screen === "login" && <UserLoginScreen onBack={onLogout} onLogin={handleAuthSuccess} onGoRegister={() => navigate("register")} onForgot={() => navigate("forgot")} />}
      {screen === "register" && <UserRegisterScreen onBack={onLogout} onRegister={handleAuthSuccess} />}
      {screen === "forgot" && <ForgotPasswordScreen onBack={() => navigate("login")} />}
      {screen === "map" && <MapScreen albergues={albergues} onSelectAlbergue={handleSelectAlbergue} activeNav={activeNav} onNavigate={handleNavigation} onGoProfile={() => { setActiveNav("profile"); navigate("profile"); }} activeReservation={activeReservation} />}
      {screen === "detail" && <DetailScreen albergue={selectedAlbergue} onBack={() => navigate("map")} onBookRoom={handleBookRoom} isFavorite={isFavorite(selectedAlbergue?.id)} onToggleFavorite={() => toggleFavorite(selectedAlbergue)} onChat={handleOpenChat} />}
      {screen === "chat" && <ChatScreen albergue={selectedAlbergue} token={token} authUser={authUser} onBack={() => navigate(chatBackTarget)} activeNav={activeNav} onNavigate={handleNavigation} />}
      {screen === "chats" && <ChatsListScreen chatAlbergues={chatAlbergues} onOpenChat={handleOpenChatFromList} activeNav={activeNav} onNavigate={handleNavigation} />}
      {screen === "payment" && <PaymentScreen albergue={selectedAlbergue} room={selectedRoom} onBack={() => navigate("detail")} onConfirm={handleConfirm} />}
      {screen === "confirmation" && <ConfirmationScreen albergue={selectedAlbergue} room={selectedRoom} total={bookingInfo.total} hours={bookingInfo.hours} code={activeReservation?.code} onDone={() => { setActiveNav("map"); navigate("map"); }} />}
      {screen === "favorites" && <FavoritesScreen favorites={favorites} onSelectAlbergue={handleSelectAlbergue} onRemoveFavorite={(id) => { setFavorites(prev => prev.filter(a => a.id !== id)); if (token) api.del(`/favorites/${id}`, token).catch(() => { }); }} activeNav={activeNav} onNavigate={handleNavigation} />}
      {screen === "history" && <HistoryScreen reservations={reservations} activeNav={activeNav} onNavigate={handleNavigation} token={token} albergues={albergues} onRebook={(r) => { const albergue = albergues.find(a => a.id === r.albergue_id); if (albergue) handleSelectAlbergue(albergue); }} />}
      {screen === "profile" && <ProfileScreen onLogout={handleLogout} activeNav={activeNav} onNavigate={handleNavigation} authUser={authUser} />}
    </>
  );

  return (
    <>
      <UserGlobalCSS />
      {/* Desktop shell: sidebar fija + contenido scrollable */}
      {isDesktop && !noShell ? (
        <div style={{ display: "flex", minHeight: "100dvh", background: COLORS.bg }}>
          <UserSideNav active={activeNav} onNavigate={handleNavigation} />
          <div style={{ flex: 1, marginLeft: 240, minHeight: "100dvh", overflowY: screen === "map" ? "hidden" : "auto" }}>
            {screenContent}
          </div>
        </div>
      ) : (
        screenContent
      )}
    </>
  );
}



// ┌─────────────────────────────────────────────────────────────┐
// │  SECTION 2: PANEL DEL ALBERGUE (ADMIN)                     │
// └─────────────────────────────────────────────────────────────┘

// ═══════════════════════════════════════════
//  RUSH ADMIN — Panel de gestión para albergues
//  Responsive: Desktop (sidebar) + Mobile (bottom nav)
// ═══════════════════════════════════════════

const CA = {
  purple: "#534AB7", purpleLight: "#EEEDFE", purpleMid: "#7F77DD",
  purpleDark: "#3C3489", purple100: "#CECBF6", purple200: "#AFA9EC",
  green: "#1D9E75", greenLight: "#E1F5EE", greenDark: "#0F6E56", green800: "#085041",
  amber: "#EF9F27", amberLight: "#FAEEDA", amberDark: "#854F0B", amber800: "#633806",
  red: "#E24B4A", redLight: "#FCEBEB", redDark: "#A32D2D", red800: "#791F1F",
  bg: "#F6F5FA", card: "#FFFFFF", text: "#1A1A1A", textSec: "#7A7A7A",
  textTer: "#ABABAB", border: "#EBEBEB", borderSec: "#D5D5D5",
};

const FONT_ADMIN = "'Outfit', 'DM Sans', sans-serif";

const ROOMS_DATA = [
  { id: 1, name: "Clásica 1", type: "Clásica", price1h: 6500, price2h: 11000, priceNight: 18000, status: "libre", peakEnabled: true, peakPct: 30, reservations: 18, occupancy: 72, revenue: 312000 },
  { id: 2, name: "Clásica 2", type: "Clásica", price1h: 6500, price2h: 11000, priceNight: 18000, status: "ocupada", peakEnabled: true, peakPct: 30, reservations: 16, occupancy: 68, revenue: 289000 },
  { id: 3, name: "Clásica 3", type: "Clásica", price1h: 6500, price2h: 11000, priceNight: 18000, status: "libre", peakEnabled: true, peakPct: 30, reservations: 14, occupancy: 65, revenue: 254000 },
  { id: 4, name: "Suite Premium 1", type: "Suite Premium", price1h: 8500, price2h: 15000, priceNight: 25000, status: "reservada", peakEnabled: true, peakPct: 25, reservations: 22, occupancy: 88, revenue: 385000 },
  { id: 5, name: "Suite Premium 2", type: "Suite Premium", price1h: 8500, price2h: 15000, priceNight: 25000, status: "libre", peakEnabled: true, peakPct: 25, reservations: 19, occupancy: 80, revenue: 340000 },
  { id: 6, name: "VIP", type: "VIP", price1h: 12000, price2h: 20000, priceNight: 35000, status: "mantenimiento", peakEnabled: false, peakPct: 0, reservations: 7, occupancy: 52, revenue: 145000 },
];

const RESERVATIONS_DATA = [];

const DAILY_REVENUE = [
  { day: "Lun", value: 95000 }, { day: "Mar", value: 115000 }, { day: "Mié", value: 82000 },
  { day: "Jue", value: 128000 }, { day: "Vie", value: 178000 }, { day: "Sáb", value: 198000 }, { day: "Dom", value: 152000 },
];

// ─── Icons ───
const I = {
  dashboard: (c) => <svg width="20" height="20" viewBox="0 0 24 24" fill={c}><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></svg>,
  calendar: (c) => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>,
  dollar: (c) => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>,
  chart: (c) => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2"><path d="M18 20V10" /><path d="M12 20V4" /><path d="M6 20v-6" /></svg>,
  settings: (c) => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09" /></svg>,
  star: (c = CA.amber) => <svg width="14" height="14" viewBox="0 0 24 24" fill={c}><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>,
  shield: (c = CA.greenDark) => <svg width="14" height="14" viewBox="0 0 24 24" fill={c}><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" /></svg>,
  up: () => <svg width="12" height="12" viewBox="0 0 24 24" fill={CA.greenDark}><path d="M7 14l5-5 5 5z" /></svg>,
  down: () => <svg width="12" height="12" viewBox="0 0 24 24" fill={CA.redDark}><path d="M7 10l5 5 5-5z" /></svg>,
  search: (c = CA.textSec) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.35-4.35" /></svg>,
  bell: (c = CA.textSec) => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>,
  tag: (c = CA.purple) => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" /><line x1="7" y1="7" x2="7.01" y2="7" /></svg>,
  clock: (c = CA.textSec) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" /></svg>,
  check: (c = CA.greenDark) => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>,
  user: (c = CA.textSec) => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2"><circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 4-6 8-6s8 2 8 6" /></svg>,
  mail: (c = CA.textSec) => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2" /><path d="M22 4l-10 8L2 4" /></svg>,
  lock: (c = CA.textSec) => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>,
  phone: (c = CA.textSec) => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72" /></svg>,
  mapPin: (c = CA.purple) => <svg width="16" height="16" viewBox="0 0 24 24" fill={c}><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" /></svg>,
  image: (c = CA.purple) => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>,
  plus: (c = CA.purple) => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>,
  edit: (c = CA.textSec) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>,
  back: (c = CA.text) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2"><path d="M15 18l-6-6 6-6" /></svg>,
  eye: (c = CA.textSec) => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" /><circle cx="12" cy="12" r="3" /></svg>,
  eyeOff: (c = CA.textSec) => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" /><line x1="1" y1="1" x2="23" y2="23" /></svg>,
  trash: (c = CA.red) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>,
  chat: (c = CA.textSec) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>,
  send: (c = "#fff") => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>,
};

const NAV_ITEMS = [
  { key: "dashboard", label: "Inicio", icon: I.dashboard },
  { key: "reservations", label: "Reservas", icon: I.calendar },
  { key: "messages", label: "Mensajes", icon: I.chat },
  { key: "pricing", label: "Precios", icon: I.dollar },
  { key: "metrics", label: "Métricas", icon: I.chart },
  { key: "settings", label: "Ajustes", icon: I.settings },
];

// ─── Shared Components ───

const Badge = ({ status }) => {
  const map = {
    libre: { bg: CA.greenLight, color: CA.green800, label: "Libre" },
    ocupada: { bg: CA.amberLight, color: CA.amber800, label: "Ocupada" },
    reservada: { bg: CA.purpleLight, color: CA.purpleDark, label: "Reservada" },
    mantenimiento: { bg: CA.redLight, color: CA.red800, label: "Mant." },
    en_curso: { bg: CA.greenLight, color: CA.green800, label: "En curso" },
    pendiente: { bg: CA.purpleLight, color: CA.purpleDark, label: "Pendiente" },
    por_vencer: { bg: CA.amberLight, color: CA.amber800, label: "Por vencer" },
    completada: { bg: CA.bg, color: CA.textSec, label: "Completada" },
  };
  const s = map[status] || map.libre;
  return <span style={{ fontSize: 12, padding: "4px 12px", borderRadius: 10, background: s.bg, color: s.color, fontWeight: 600, whiteSpace: "nowrap" }}>{s.label}</span>;
};

const Toggle = ({ on, onToggle }) => (
  <div onClick={onToggle} style={{ width: 40, height: 22, borderRadius: 11, background: on ? CA.green : CA.borderSec, position: "relative", cursor: "pointer", transition: "background 0.2s", flexShrink: 0 }}>
    <div style={{ width: 18, height: 18, borderRadius: "50%", background: "#fff", position: "absolute", top: 2, left: on ? 20 : 2, transition: "left 0.2s" }} />
  </div>
);

const MetricCard = ({ label, value, trend, trendValue, color = CA.text }) => (
  <div style={{ background: CA.bg, borderRadius: 14, padding: "16px 18px", minWidth: 0 }}>
    <p style={{ fontSize: 13, color: CA.textSec, margin: 0, fontWeight: 500 }}>{label}</p>
    <p style={{ fontSize: 26, fontWeight: 700, color, margin: "6px 0 4px", fontFamily: FONT_ADMIN }}>{value}</p>
    {trend && (
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        {trend === "up" ? I.up() : I.down()}
        <span style={{ fontSize: 12, color: trend === "up" ? CA.greenDark : CA.redDark, fontWeight: 600 }}>{trendValue}</span>
      </div>
    )}
  </div>
);

const SectionTitle = ({ children, action, onAction }) => (
  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
    <h3 style={{ fontSize: 17, fontWeight: 700, margin: 0, fontFamily: FONT_ADMIN }}>{children}</h3>
    {action && <span style={{ fontSize: 13, color: CA.purple, fontWeight: 600, cursor: "pointer" }} onClick={onAction}>{action}</span>}
  </div>
);

// ─── Shared Form Components ───

const FormInput = ({ label, icon, placeholder, value, onChange, type = "text", showToggle, onToggle, toggleState }) => (
  <div style={{ marginBottom: 16 }}>
    <label style={{ fontSize: 13, fontWeight: 600, color: CA.textSec, display: "block", marginBottom: 6 }}>{label}</label>
    <div style={{ position: "relative" }}>
      <input type={type} placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)}
        style={{
          width: "100%", padding: "12px 16px", paddingLeft: icon ? 42 : 16, paddingRight: showToggle ? 42 : 16,
          border: `1.5px solid ${CA.border}`, borderRadius: 12, fontSize: 15, fontFamily: "'DM Sans', sans-serif",
          background: CA.card, color: CA.text, outline: "none", boxSizing: "border-box", transition: "border-color 0.2s"
        }} />
      {icon && <div style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)" }}>{icon}</div>}
      {showToggle && (
        <div style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", cursor: "pointer" }} onClick={onToggle}>
          {toggleState ? I.eyeOff() : I.eye()}
        </div>
      )}
    </div>
  </div>
);

const StepBar = ({ current, total = 4 }) => (
  <div style={{ display: "flex", gap: 5, marginBottom: 24 }}>
    {Array.from({ length: total }, (_, i) => (
      <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: i < current ? CA.purple : CA.border, transition: "background 0.3s" }} />
    ))}
  </div>
);

const PrimaryButton = ({ children, onClick, disabled }) => (
  <button onClick={onClick} disabled={disabled}
    style={{
      width: "100%", padding: "14px 24px", borderRadius: 14, border: "none", fontSize: 16, fontWeight: 700,
      fontFamily: FONT_ADMIN, cursor: disabled ? "not-allowed" : "pointer", transition: "all 0.15s", textAlign: "center",
      background: disabled ? CA.border : CA.purple, color: disabled ? CA.textSec : "#fff"
    }}>
    {children}
  </button>
);

const AMENITIES_LIST = ["Jacuzzi", "TV", "Smart TV", "Frigobar", "Minibar", "Wi-Fi", "Cochera", "Aire acond.", "Música", "Luces LED", "Terraza", "Sala privada"];

// ─── AUTH: Welcome / Login ───

const AdminWelcomeScreen = ({ onLogin, onRegister }) => (
  <div style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", background: CA.bg, fontFamily: "'DM Sans', sans-serif", padding: 20 }}>
    <div style={{ width: "100%", maxWidth: 420, textAlign: "center", animation: "fadeUp 0.5s ease" }}>
      <div style={{ width: 72, height: 72, borderRadius: 20, background: `linear-gradient(135deg, ${CA.purpleDark}, ${CA.purpleMid})`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px" }}>
        <span style={{ fontSize: 30, fontWeight: 800, color: "#fff", fontFamily: FONT_ADMIN }}>R</span>
      </div>
      <h1 style={{ fontSize: 30, fontWeight: 800, fontFamily: FONT_ADMIN, margin: "0 0 6px" }}>Rush para negocios</h1>
      <p style={{ fontSize: 15, color: CA.textSec, margin: "0 0 36px", lineHeight: 1.5 }}>
        Digitalizá tu albergue. Más clientes, más ocupación, menos fricción.
      </p>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {["Reservas online", "Gestión simple", "Más ingresos"].map(t => (
          <div key={t} style={{ flex: 1, background: CA.card, borderRadius: 12, padding: "14px 8px", border: `1px solid ${CA.border}` }}>
            <div style={{ marginBottom: 6 }}>{I.check(CA.greenDark)}</div>
            <span style={{ fontSize: 12, fontWeight: 600, color: CA.text }}>{t}</span>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 28 }}>
        <PrimaryButton onClick={onRegister}>Registrar mi albergue</PrimaryButton>
        <button onClick={onLogin} style={{
          width: "100%", padding: "14px 24px", borderRadius: 14, fontSize: 16, fontWeight: 700,
          fontFamily: FONT_ADMIN, cursor: "pointer", background: "transparent", color: CA.purple, border: `2px solid ${CA.purple}`, transition: "all 0.15s"
        }}>
          Ya tengo cuenta
        </button>
      </div>
    </div>
  </div>
);

const AdminLoginScreen = ({ onBack, onLogin }) => {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async () => {
    if (!email || !pass) { setError("Completá email y contraseña"); return; }
    setLoading(true); setError("");
    try {
      const data = await api.post("/auth/login", { email, password: pass });
      const token = data.token;
      localStorage.setItem("rush_admin_token", token);
      localStorage.setItem("rush_admin_user", JSON.stringify(data.user));
      // Intentar cargar el albergue del admin para mostrarlo en el mapa del usuario
      try {
        const res = await api.get("/admin/albergue", token);
        if (res?.albergue) {
          localStorage.setItem("rush_admin_albergue", JSON.stringify(res.albergue));
        }
      } catch {
        // Si no existe ese endpoint, buscar entre todos los albergues
        try {
          const all = await api.get("/albergues");
          const mine = (all.albergues || []).find(a => a.owner_email === email || a.user_id === data.user?.id);
          if (mine) localStorage.setItem("rush_admin_albergue", JSON.stringify(mine));
        } catch { /* silencioso */ }
      }
      onLogin(data.user);
    } catch (err) {
      setError(err.message || "Email o contraseña incorrectos");
    } finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", background: CA.bg, fontFamily: "'DM Sans', sans-serif", padding: 20 }}>
      <div style={{ width: "100%", maxWidth: 420, animation: "fadeUp 0.4s ease" }}>
        <div style={{ cursor: "pointer", marginBottom: 24 }} onClick={onBack}>{I.back()}</div>
        <h1 style={{ fontSize: 28, fontWeight: 800, fontFamily: FONT_ADMIN, margin: "0 0 6px" }}>Iniciar sesión</h1>
        <p style={{ fontSize: 14, color: CA.textSec, margin: "0 0 28px" }}>Accedé al panel de gestión de tu albergue</p>
        <FormInput label="Email" icon={I.mail()} placeholder="tu@albergue.com" value={email} onChange={setEmail} />
        <FormInput label="Contraseña" icon={I.lock()} placeholder="Tu contraseña" value={pass} onChange={setPass}
          type={showPass ? "text" : "password"} showToggle onToggle={() => setShowPass(!showPass)} toggleState={showPass} />
        {error && <p style={{ fontSize: 13, color: CA.red, marginBottom: 12, padding: "8px 12px", background: CA.redLight, borderRadius: 10 }}>{error}</p>}
        <p style={{ fontSize: 13, color: CA.purple, fontWeight: 600, textAlign: "right", cursor: "pointer", margin: "-8px 0 24px" }} onClick={() => alert("Contactá a soporte@rush.app")}>{"¿Olvidaste tu contraseña?"}</p>
        <PrimaryButton onClick={handleLogin} disabled={loading}>{loading ? "Ingresando..." : "Iniciar sesión"}</PrimaryButton>
      </div>
    </div>
  );
};

// ─── ONBOARDING STEP 1: Owner Data ───
const OnboardingStep1 = ({ data, setData, onNext, onBack }) => {
  const [showPass, setShowPass] = useState(false);
  return (
    <div style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", background: CA.bg, fontFamily: "'DM Sans', sans-serif", padding: 20 }}>
      <div style={{ width: "100%", maxWidth: 480, animation: "fadeUp 0.4s ease" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
          <div style={{ cursor: "pointer" }} onClick={onBack}>{I.back()}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: CA.purple, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: "#fff", fontFamily: FONT_ADMIN }}>R</span>
            </div>
            <span style={{ fontSize: 14, fontWeight: 600, color: CA.textSec }}>Rush para negocios</span>
          </div>
        </div>
        <StepBar current={1} />
        <h2 style={{ fontSize: 24, fontWeight: 800, fontFamily: FONT_ADMIN, margin: "0 0 4px" }}>Creá tu cuenta</h2>
        <p style={{ fontSize: 14, color: CA.textSec, margin: "0 0 24px" }}>Datos del titular del negocio</p>
        <FormInput label="Nombre completo" icon={I.user()} placeholder="Tu nombre" value={data.ownerName} onChange={v => setData({ ...data, ownerName: v })} />
        <FormInput label="Email" icon={I.mail()} placeholder="tu@albergue.com" value={data.ownerEmail} onChange={v => setData({ ...data, ownerEmail: v })} />
        <FormInput label="Teléfono" icon={I.phone()} placeholder="+54 11 5555-1234" value={data.ownerPhone} onChange={v => setData({ ...data, ownerPhone: v })} />
        <FormInput label="Contraseña" icon={I.lock()} placeholder="Mínimo 8 caracteres" value={data.ownerPass} onChange={v => setData({ ...data, ownerPass: v })}
          type={showPass ? "text" : "password"} showToggle onToggle={() => setShowPass(!showPass)} toggleState={showPass} />
        <PrimaryButton onClick={onNext}>Continuar</PrimaryButton>
      </div>
    </div>
  );
};

// ─── ONBOARDING STEP 2: Albergue Data ───
const OnboardingStep2 = ({ data, setData, onNext, onBack }) => {
  const [is24h, setIs24h] = useState(true);
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const [leafletOk, setLeafletOk] = useState(false);
  const [searching, setSearching] = useState(false);

  useEffect(() => { loadLeaflet().then(() => setLeafletOk(true)); }, []);

  useEffect(() => {
    if (!leafletOk || !mapRef.current || mapInstanceRef.current) return;
    const L = window.L; if (!L) return;
    const center = [data.lat || -34.594, data.lng || -58.405];
    const map = L.map(mapRef.current, { center, zoom: 14, zoomControl: true, attributionControl: false });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19 }).addTo(map);
    const marker = L.marker(center, { draggable: true }).addTo(map);
    marker.on("dragend", () => {
      const p = marker.getLatLng();
      setData(prev => ({ ...prev, lat: p.lat, lng: p.lng }));
    });
    mapInstanceRef.current = map;
    markerRef.current = marker;
    return () => { map.remove(); mapInstanceRef.current = null; markerRef.current = null; };
  }, [leafletOk]);

  const searchAddress = async () => {
    if (!data.address || data.address.length < 3) return;
    setSearching(true);
    try {
      const q = encodeURIComponent(data.address + ", Buenos Aires, Argentina");
      const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1`);
      const r = await res.json();
      if (r.length > 0) {
        const lat = parseFloat(r[0].lat), lng = parseFloat(r[0].lon);
        setData(prev => ({ ...prev, lat, lng }));
        if (mapInstanceRef.current && markerRef.current) {
          mapInstanceRef.current.setView([lat, lng], 16, { animate: true });
          markerRef.current.setLatLng([lat, lng]);
        }
      }
    } catch (e) { console.error("Geocoding error:", e); }
    finally { setSearching(false); }
  };

  return (
    <div style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", background: CA.bg, fontFamily: "'DM Sans', sans-serif", padding: 20 }}>
      <div style={{ width: "100%", maxWidth: 480, animation: "fadeUp 0.4s ease" }}>
        <div style={{ cursor: "pointer", marginBottom: 24 }} onClick={onBack}>{I.back()}</div>
        <StepBar current={2} />
        <h2 style={{ fontSize: 24, fontWeight: 800, fontFamily: FONT_ADMIN, margin: "0 0 4px" }}>Tu albergue</h2>
        <p style={{ fontSize: 14, color: CA.textSec, margin: "0 0 24px" }}>Contanos sobre tu negocio</p>
        <FormInput label="Nombre del albergue" placeholder="Ej: Suite Palermo" value={data.name} onChange={v => setData({ ...data, name: v })} />

        {/* Address + search button */}
        <div style={{ marginBottom: 8 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: CA.textSec, display: "block", marginBottom: 6 }}>{"\u00bfD\u00f3nde queda?"}</label>
          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ flex: 1, position: "relative" }}>
              <input placeholder="Av. Santa Fe 4200" value={data.address}
                onChange={e => setData({ ...data, address: e.target.value })}
                onKeyDown={e => { if (e.key === "Enter") searchAddress(); }}
                style={{ width: "100%", padding: "12px 16px", paddingLeft: 40, border: `1.5px solid ${CA.border}`, borderRadius: 12, fontSize: 15, fontFamily: "'DM Sans', sans-serif", background: CA.card, color: CA.text, outline: "none", boxSizing: "border-box" }} />
              <div style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)" }}>{I.mapPin()}</div>
            </div>
            <button onClick={searchAddress} disabled={searching}
              style={{ padding: "10px 16px", borderRadius: 12, background: CA.purple, color: "#fff", border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", opacity: searching ? 0.6 : 1, whiteSpace: "nowrap" }}>
              {searching ? "..." : "Buscar"}
            </button>
          </div>
          <p style={{ fontSize: 11, color: CA.textTer, marginTop: 4 }}>{"Escrib\u00ed la direcci\u00f3n y toc\u00e1 Buscar. Arrastr\u00e1 el pin para ajustar."}</p>
        </div>

        {/* Real Leaflet map */}
        <div style={{ height: 180, borderRadius: 14, border: `1px solid ${CA.border}`, marginBottom: 16, overflow: "hidden", position: "relative" }}>
          <div ref={mapRef} style={{ height: "100%", width: "100%" }} />
          {!leafletOk && (
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, display: "flex", alignItems: "center", justifyContent: "center", background: CA.bg, fontSize: 13, color: CA.textSec }}>
              Cargando mapa...
            </div>
          )}
        </div>

        <FormInput label="Barrio / Zona" placeholder="Ej: Palermo, CABA" value={data.zone} onChange={v => setData({ ...data, zone: v })} />
        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: CA.textSec, display: "block", marginBottom: 6 }}>{"Horario de atenci\u00f3n"}</label>
          <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 8 }}>
            <input placeholder="00:00" value={data.openTime} onChange={e => setData({ ...data, openTime: e.target.value })} disabled={is24h}
              style={{ flex: 1, padding: "12px 16px", border: `1.5px solid ${CA.border}`, borderRadius: 12, fontSize: 15, textAlign: "center", fontFamily: "'DM Sans', sans-serif", background: is24h ? CA.bg : CA.card, color: is24h ? CA.textTer : CA.text, outline: "none" }} />
            <span style={{ fontSize: 13, color: CA.textSec }}>a</span>
            <input placeholder="24:00" value={data.closeTime} onChange={e => setData({ ...data, closeTime: e.target.value })} disabled={is24h}
              style={{ flex: 1, padding: "12px 16px", border: `1.5px solid ${CA.border}`, borderRadius: 12, fontSize: 15, textAlign: "center", fontFamily: "'DM Sans', sans-serif", background: is24h ? CA.bg : CA.card, color: is24h ? CA.textTer : CA.text, outline: "none" }} />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }} onClick={() => setIs24h(!is24h)}>
            <div style={{ width: 18, height: 18, borderRadius: 5, background: is24h ? CA.purple : "transparent", border: is24h ? "none" : `2px solid ${CA.border}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              {is24h && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>}
            </div>
            <span style={{ fontSize: 13, color: CA.textSec }}>Abierto 24 horas</span>
          </div>
        </div>
        <PrimaryButton onClick={onNext}>Continuar</PrimaryButton>
      </div>
    </div>
  );
};

// ─── ONBOARDING STEP 3: Rooms ───
const RoomForm = ({ room, onSave, onCancel, isNew }) => {
  const [form, setForm] = useState(room || { name: "", qty: "1", price: "", amenities: [], photos: 0 });

  const toggleAmenity = (a) => {
    setForm(prev => ({
      ...prev,
      amenities: prev.amenities.includes(a) ? prev.amenities.filter(x => x !== a) : [...prev.amenities, a]
    }));
  };

  const canSave = form.name.trim() && form.price;

  return (
    <div style={{ border: `2px solid ${CA.purple}`, borderRadius: 16, padding: "18px 20px", marginBottom: 12, background: CA.card }}>
      <p style={{ fontSize: 14, fontWeight: 700, color: CA.purple, margin: "0 0 14px", fontFamily: FONT_ADMIN }}>
        {isNew ? "Nueva habitación" : `Editando: ${room.name}`}
      </p>
      <FormInput label="Nombre" placeholder="Ej: Suite Premium" value={form.name} onChange={v => setForm({ ...form, name: v })} />
      <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: CA.textSec, display: "block", marginBottom: 6 }}>Cantidad</label>
          <input value={form.qty} onChange={e => setForm({ ...form, qty: e.target.value })} type="number" min="1"
            style={{ width: "100%", padding: "12px 16px", border: `1.5px solid ${CA.border}`, borderRadius: 12, fontSize: 15, textAlign: "center", fontFamily: "'DM Sans', sans-serif", background: CA.card, color: CA.text, outline: "none", boxSizing: "border-box" }} />
        </div>
        <div style={{ flex: 2 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: CA.textSec, display: "block", marginBottom: 6 }}>Precio base/h</label>
          <div style={{ position: "relative" }}>
            <input value={form.price} onChange={e => setForm({ ...form, price: e.target.value.replace(/\D/g, "") })} placeholder="8500"
              style={{ width: "100%", padding: "12px 16px", paddingLeft: 30, border: `1.5px solid ${CA.border}`, borderRadius: 12, fontSize: 15, fontFamily: "'DM Sans', sans-serif", background: CA.card, color: CA.text, outline: "none", boxSizing: "border-box" }} />
            <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontSize: 15, color: CA.textSec }}>$</span>
          </div>
        </div>
      </div>
      <label style={{ fontSize: 13, fontWeight: 600, color: CA.textSec, display: "block", marginBottom: 8 }}>Amenidades</label>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
        {AMENITIES_LIST.map(a => (
          <span key={a} onClick={() => toggleAmenity(a)}
            style={{
              fontSize: 12, padding: "6px 12px", borderRadius: 10, cursor: "pointer", fontWeight: 500, transition: "all 0.15s",
              background: form.amenities.includes(a) ? CA.purple : CA.card,
              color: form.amenities.includes(a) ? "#fff" : CA.textSec,
              border: form.amenities.includes(a) ? "none" : `1px solid ${CA.border}`
            }}>
            {a}
          </span>
        ))}
      </div>

      {/* Photos per room */}
      <label style={{ fontSize: 13, fontWeight: 600, color: CA.textSec, display: "block", marginBottom: 8 }}>Fotos de esta habitación</label>
      <div style={{ display: "flex", gap: 8, marginBottom: 18, flexWrap: "wrap" }}>
        {Array.from({ length: form.photos }, (_, i) => (
          <div key={i} style={{ width: 64, height: 64, borderRadius: 10, background: `linear-gradient(135deg, ${CA.purpleDark}, ${CA.purpleMid})`, display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
            {I.image("#fff")}
            <div onClick={(e) => { e.stopPropagation(); setForm(prev => ({ ...prev, photos: prev.photos - 1 })); }}
              style={{ position: "absolute", top: -4, right: -4, width: 18, height: 18, borderRadius: "50%", background: CA.red, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            </div>
          </div>
        ))}
        <div onClick={() => setForm(prev => ({ ...prev, photos: prev.photos + 1 }))}
          style={{ width: 64, height: 64, borderRadius: 10, border: `1.5px dashed ${CA.borderSec}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", cursor: "pointer", gap: 2, transition: "all 0.15s" }}
          onMouseEnter={e => e.currentTarget.style.borderColor = CA.purple}
          onMouseLeave={e => e.currentTarget.style.borderColor = CA.borderSec}>
          {I.plus(CA.textSec)}
          <span style={{ fontSize: 9, color: CA.textTer }}>Agregar</span>
        </div>
      </div>
      {form.photos === 0 && <p style={{ fontSize: 11, color: CA.amber, marginTop: -12, marginBottom: 14 }}>Recomendamos subir al menos 2 fotos por habitación</p>}

      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={onCancel} style={{ flex: 1, padding: "12px", borderRadius: 12, border: `1.5px solid ${CA.border}`, background: "transparent", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", color: CA.textSec }}>Cancelar</button>
        <button onClick={() => { if (canSave) onSave({ ...form, id: form.id || Date.now(), price: parseInt(form.price) || 0 }); }}
          style={{
            flex: 2, padding: "12px", borderRadius: 12, border: "none", fontSize: 14, fontWeight: 700, cursor: canSave ? "pointer" : "not-allowed", fontFamily: FONT_ADMIN,
            background: canSave ? CA.purple : CA.border, color: canSave ? "#fff" : CA.textSec
          }}>
          {isNew ? "Guardar habitación" : "Guardar cambios"}
        </button>
      </div>
    </div>
  );
};

const OnboardingStep3 = ({ data, setData, onNext, onBack }) => {
  const [showNewForm, setShowNewForm] = useState(data.rooms.length === 0);
  const [editingId, setEditingId] = useState(null);

  const addRoom = (room) => {
    setData({ ...data, rooms: [...data.rooms, room] });
    setShowNewForm(false);
  };

  const updateRoom = (room) => {
    setData({ ...data, rooms: data.rooms.map(r => r.id === room.id ? room : r) });
    setEditingId(null);
  };

  const removeRoom = (id) => {
    setData({ ...data, rooms: data.rooms.filter(r => r.id !== id) });
    if (editingId === id) setEditingId(null);
  };

  return (
    <div style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", background: CA.bg, fontFamily: "'DM Sans', sans-serif", padding: 20 }}>
      <div style={{ width: "100%", maxWidth: 520, animation: "fadeUp 0.4s ease" }}>
        <div style={{ cursor: "pointer", marginBottom: 24 }} onClick={onBack}>{I.back()}</div>
        <StepBar current={3} />
        <h2 style={{ fontSize: 24, fontWeight: 800, fontFamily: FONT_ADMIN, margin: "0 0 4px" }}>Tus habitaciones</h2>
        <p style={{ fontSize: 14, color: CA.textSec, margin: "0 0 24px" }}>Agregá los tipos de habitación que ofrecés</p>

        {/* Existing rooms — show card or edit form */}
        {data.rooms.map((r, i) => (
          editingId === r.id ? (
            <RoomForm key={r.id} room={{ ...r, price: String(r.price) }} isNew={false}
              onSave={updateRoom} onCancel={() => setEditingId(null)} />
          ) : (
            <div key={r.id} style={{ background: CA.card, borderRadius: 14, border: `1px solid ${CA.border}`, padding: "14px 18px", marginBottom: 10, animation: `fadeUp 0.3s ease ${i * 0.05}s both` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                <div>
                  <p style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>{r.name}</p>
                  <p style={{ fontSize: 12, color: CA.textSec, margin: "2px 0 0" }}>{r.qty} habitacion{parseInt(r.qty) > 1 ? "es" : ""}</p>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ cursor: "pointer", padding: "4px 10px", borderRadius: 8, background: CA.purpleLight, display: "flex", alignItems: "center", gap: 4 }}
                    onClick={() => { setEditingId(r.id); setShowNewForm(false); }}>
                    {I.edit(CA.purple)}
                    <span style={{ fontSize: 12, fontWeight: 600, color: CA.purple }}>Editar</span>
                  </div>
                  <div style={{ cursor: "pointer", padding: "4px 8px", borderRadius: 8, background: CA.redLight, display: "flex", alignItems: "center" }}
                    onClick={() => removeRoom(r.id)}>
                    {I.trash()}
                  </div>
                </div>
              </div>
              {/* Photo thumbnails */}
              {(r.photos || 0) > 0 && (
                <div style={{ display: "flex", gap: 4, marginBottom: 8 }}>
                  {Array.from({ length: Math.min(r.photos, 4) }, (_, pi) => (
                    <div key={pi} style={{ width: 40, height: 40, borderRadius: 6, background: `linear-gradient(135deg, ${CA.purpleDark}, ${CA.purpleMid})`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {I.image("#fff")}
                    </div>
                  ))}
                  {r.photos > 4 && (
                    <div style={{ width: 40, height: 40, borderRadius: 6, background: CA.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: CA.textSec }}>+{r.photos - 4}</span>
                    </div>
                  )}
                  <span style={{ fontSize: 11, color: CA.textSec, alignSelf: "center", marginLeft: 4 }}>{r.photos} foto{r.photos > 1 ? "s" : ""}</span>
                </div>
              )}
              {(r.photos || 0) === 0 && (
                <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 8 }}>
                  {I.image(CA.textTer)}
                  <span style={{ fontSize: 11, color: CA.amber }}>Sin fotos</span>
                </div>
              )}
              <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 6 }}>
                {r.amenities.map(a => (
                  <span key={a} style={{ fontSize: 11, padding: "3px 9px", borderRadius: 8, background: CA.purpleLight, color: CA.purpleDark, fontWeight: 500 }}>{a}</span>
                ))}
                {r.amenities.length === 0 && <span style={{ fontSize: 11, color: CA.textTer }}>Sin amenidades</span>}
              </div>
              <p style={{ fontSize: 14, fontWeight: 700, color: CA.purple, margin: 0 }}>${(r.price || 0).toLocaleString()}/h</p>
            </div>
          )
        ))}

        {/* New room form */}
        {showNewForm && !editingId && (
          <RoomForm isNew onSave={addRoom} onCancel={() => { if (data.rooms.length > 0) setShowNewForm(false); }} />
        )}

        {/* Add button — visible when not showing form and not editing */}
        {!showNewForm && !editingId && (
          <div onClick={() => setShowNewForm(true)}
            style={{ border: `1.5px dashed ${CA.borderSec}`, borderRadius: 14, padding: 18, textAlign: "center", cursor: "pointer", marginBottom: 12, transition: "all 0.15s" }}
            onMouseEnter={e => e.currentTarget.style.borderColor = CA.purple}
            onMouseLeave={e => e.currentTarget.style.borderColor = CA.borderSec}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              {I.plus()}
              <span style={{ fontSize: 14, color: CA.purple, fontWeight: 600 }}>Agregar otro tipo de habitación</span>
            </div>
          </div>
        )}

        <div style={{ marginTop: 12 }}>
          <PrimaryButton onClick={onNext} disabled={data.rooms.length === 0}>Continuar</PrimaryButton>
          {data.rooms.length === 0 && (
            <p style={{ fontSize: 12, color: CA.textTer, textAlign: "center", marginTop: 8 }}>Agregá al menos una habitación para continuar</p>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── ONBOARDING STEP 4: Photos & Verification ───
const OnboardingStep4 = ({ data, onBack, onFinish }) => {
  const [accepted, setAccepted] = useState(false);
  const [photos, setPhotos] = useState([]); // { url, uploading, error }
  const [uploading, setUploading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const photoInputRef = useRef(null);

  const handlePhotoFiles = async (e) => {
    const files = Array.from(e.target.files || []).slice(0, 4 - photos.length);
    for (const file of files) {
      const id = Date.now() + Math.random();
      setPhotos(prev => [...prev, { url: "", uploading: true, id }]);
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const token = localStorage.getItem("rush_token");
        try {
          const res = await fetch(`${API_URL}/photos/upload`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ base64: ev.target.result, fileName: file.name, type: "albergue" }),
          });
          const d = await res.json();
          setPhotos(prev => prev.map(p => p.id === id ? { url: d.url || ev.target.result, uploading: false, id } : p));
        } catch {
          setPhotos(prev => prev.map(p => p.id === id ? { url: ev.target.result, uploading: false, id } : p));
        }
      };
      reader.readAsDataURL(file);
    }
    e.target.value = "";
  };
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [codeError, setCodeError] = useState(false);
  const [verified, setVerified] = useState(false);

  const VALID_CODE = "834721";

  const handleCodeChange = (index, value) => {
    if (value.length > 1) value = value.slice(-1);
    if (value && !/\d/.test(value)) return;
    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);
    setCodeError(false);
    if (value && index < 5) {
      const next = document.getElementById(`vc-${index + 1}`);
      if (next) next.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      const prev = document.getElementById(`vc-${index - 1}`);
      if (prev) prev.focus();
    }
  };

  const handleVerify = () => {
    const entered = code.join("");
    if (entered === VALID_CODE) {
      setVerified(true);
      setTimeout(onFinish, 2000);
    } else {
      setCodeError(true);
    }
  };

  const fullCode = code.every(c => c !== "");

  // ── Phase 2: Code entry ──
  if (submitted) {
    return (
      <div style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", background: CA.bg, fontFamily: "'DM Sans', sans-serif", padding: 20 }}>
        <div style={{ width: "100%", maxWidth: 480, animation: "fadeUp 0.4s ease", textAlign: "center" }}>

          {verified ? (
            <>
              <div style={{ width: 80, height: 80, borderRadius: "50%", background: CA.greenLight, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={CA.greenDark} strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
              </div>
              <h2 style={{ fontSize: 26, fontWeight: 800, fontFamily: FONT_ADMIN, margin: "0 0 8px" }}>¡Albergue verificado!</h2>
              <p style={{ fontSize: 15, color: CA.textSec, margin: "0 0 8px" }}>Tu albergue ya está activo en Rush</p>
              <p style={{ fontSize: 13, color: CA.textTer }}>Redirigiendo al panel de gestión...</p>
            </>
          ) : (
            <>
              {/* Waiting illustration */}
              <div style={{ width: 72, height: 72, borderRadius: 20, background: CA.purpleLight, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
                {I.shield(CA.purple, 32)}
              </div>

              <h2 style={{ fontSize: 24, fontWeight: 800, fontFamily: FONT_ADMIN, margin: "0 0 6px" }}>Verificá tu albergue</h2>
              <p style={{ fontSize: 14, color: CA.textSec, margin: "0 0 28px", lineHeight: 1.6 }}>
                Tu solicitud fue enviada. El equipo de Rush te enviará un código de 6 dígitos para confirmar que tu negocio es real.
              </p>

              {/* How it works */}
              <div style={{ background: CA.card, borderRadius: 14, border: `1px solid ${CA.border}`, padding: "16px 20px", marginBottom: 24, textAlign: "left" }}>
                <p style={{ fontSize: 13, fontWeight: 700, margin: "0 0 12px", fontFamily: FONT_ADMIN }}>¿Cómo funciona?</p>
                {[
                  { step: "1", text: "Rush revisa tu solicitud" },
                  { step: "2", text: "Te enviamos un código de verificación" },
                  { step: "3", text: "Ingresás el código acá abajo" },
                  { step: "4", text: "Tu albergue se activa automáticamente" },
                ].map((s, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: i < 3 ? 10 : 0 }}>
                    <div style={{ width: 24, height: 24, borderRadius: "50%", background: CA.purpleLight, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: CA.purple }}>{s.step}</span>
                    </div>
                    <span style={{ fontSize: 13, color: CA.textSec }}>{s.text}</span>
                  </div>
                ))}
              </div>

              {/* Code input */}
              <p style={{ fontSize: 13, fontWeight: 600, color: CA.text, marginBottom: 12 }}>Ingresá el código de verificación</p>
              <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 8 }}>
                {code.map((digit, i) => (
                  <input key={i} id={`vc-${i}`} value={digit} maxLength={1} inputMode="numeric"
                    onChange={e => handleCodeChange(i, e.target.value)}
                    onKeyDown={e => handleKeyDown(i, e)}
                    style={{
                      width: 48, height: 56, borderRadius: 12, textAlign: "center", fontSize: 24, fontWeight: 700,
                      fontFamily: FONT_ADMIN, outline: "none", boxSizing: "border-box",
                      border: `2px solid ${codeError ? CA.red : digit ? CA.purple : CA.border}`,
                      background: digit ? CA.purpleLight : CA.card, color: CA.text,
                      transition: "all 0.15s",
                    }} />
                ))}
              </div>

              {codeError && (
                <p style={{ fontSize: 13, color: CA.red, fontWeight: 600, marginBottom: 12 }}>
                  Código incorrecto. Revisá e intentá de nuevo.
                </p>
              )}

              <div style={{ marginTop: 16 }}>
                <PrimaryButton onClick={handleVerify} disabled={!fullCode}>Verificar código</PrimaryButton>
              </div>

              <p style={{ fontSize: 12, color: CA.textTer, marginTop: 16, lineHeight: 1.5 }}>
                ¿No recibiste el código? Contactanos a soporte@rush.app
              </p>

              {/* Demo hint */}
              <div style={{ background: CA.amberLight, borderRadius: 10, padding: "10px 14px", marginTop: 16, textAlign: "left" }}>
                <p style={{ fontSize: 11, color: CA.amber800, margin: 0 }}>
                  Demo: usá el código <span style={{ fontWeight: 700, letterSpacing: 2 }}>834721</span> para probar la verificación
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  // ── Phase 1: General photos & submit ──
  return (
    <div style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", background: CA.bg, fontFamily: "'DM Sans', sans-serif", padding: 20 }}>
      <div style={{ width: "100%", maxWidth: 480, animation: "fadeUp 0.4s ease" }}>
        <div style={{ cursor: "pointer", marginBottom: 24 }} onClick={onBack}>{I.back()}</div>
        <StepBar current={4} />
        <h2 style={{ fontSize: 24, fontWeight: 800, fontFamily: FONT_ADMIN, margin: "0 0 4px" }}>Último paso</h2>
        <p style={{ fontSize: 14, color: CA.textSec, margin: "0 0 24px" }}>Subí fotos generales y enviá tu solicitud</p>

        {/* General photos - upload real */}
        <input ref={photoInputRef} type="file" accept="image/*" multiple style={{ display: "none" }} onChange={handlePhotoFiles} />
        <label style={{ fontSize: 13, fontWeight: 600, color: CA.textSec, display: "block", marginBottom: 8 }}>Fotos generales (fachada, entrada, recepción)</label>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 20 }}>
          {photos.map((p, i) => (
            <div key={i} style={{ aspectRatio: "1", borderRadius: 12, position: "relative", overflow: "hidden" }}>
              {p.uploading ? (
                <div style={{ width: "100%", height: "100%", background: CA.purpleLight, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontSize: 10, color: CA.purple }}>Subiendo...</span>
                </div>
              ) : (
                <img src={p.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              )}
              <div onClick={() => setPhotos(prev => prev.filter((_, j) => j !== i))}
                style={{ position: "absolute", top: 4, right: 4, width: 20, height: 20, borderRadius: "50%", background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                <span style={{ color: "#fff", fontSize: 12, lineHeight: 1 }}>×</span>
              </div>
            </div>
          ))}
          {photos.length < 4 && (
            <div onClick={() => photoInputRef.current?.click()}
              style={{ aspectRatio: "1", borderRadius: 12, border: `1.5px dashed ${CA.borderSec}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", cursor: "pointer", gap: 2, transition: "all 0.15s" }}>
              {I.plus(CA.textSec)}
              <span style={{ fontSize: 9, color: CA.textTer }}>Agregar</span>
            </div>
          )}
        </div>
        {photos.length > 0 && <p style={{ fontSize: 11, color: CA.greenDark, marginTop: -14, marginBottom: 16 }}>✓ {photos.length} foto{photos.length > 1 ? "s" : ""} lista{photos.length > 1 ? "s" : ""}</p>}

        {/* Room photos summary - read only from step 3 */}
        <label style={{ fontSize: 13, fontWeight: 600, color: CA.textSec, display: "block", marginBottom: 8 }}>Fotos por habitación (cargadas en el paso anterior)</label>
        {data.rooms.map((r) => (
          <div key={r.id}
            style={{ background: CA.card, borderRadius: 12, border: `1px solid ${CA.border}`, padding: "12px 16px", marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {(r.photos || 0) > 0 && (
                <div style={{ display: "flex", gap: 3 }}>
                  {Array.from({ length: Math.min(r.photos, 3) }, (_, pi) => (
                    <div key={pi} style={{ width: 28, height: 28, borderRadius: 4, background: `linear-gradient(135deg, ${CA.purpleDark}, ${CA.purpleMid})`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {I.image("#fff")}
                    </div>
                  ))}
                </div>
              )}
              <div>
                <p style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>{r.name}</p>
                <p style={{ fontSize: 12, color: CA.textSec, margin: "2px 0 0" }}>
                  {(r.photos || 0) > 0 ? `${r.photos} foto${r.photos > 1 ? "s" : ""}` : "Sin fotos"}
                </p>
              </div>
            </div>
            {(r.photos || 0) > 0
              ? <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 8, background: CA.greenLight, color: CA.green800, fontWeight: 600 }}>Listo</span>
              : <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 8, background: CA.amberLight, color: CA.amber800, fontWeight: 600 }}>Pendiente</span>
            }
          </div>
        ))}

        {/* Verification info */}
        <div style={{ background: CA.greenLight, borderRadius: 14, padding: "16px 18px", margin: "20px 0", display: "flex", gap: 12, alignItems: "flex-start" }}>
          {I.shield(CA.greenDark)}
          <div>
            <p style={{ fontSize: 14, fontWeight: 700, color: CA.green800, margin: 0 }}>Verificación Rush</p>
            <p style={{ fontSize: 13, color: CA.greenDark, margin: "3px 0 0", lineHeight: 1.5 }}>
              Después de enviar, te daremos un código de 6 dígitos para verificar que tu negocio es real. Ingresalo en el siguiente paso.
            </p>
          </div>
        </div>

        {/* Terms */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 24, cursor: "pointer" }} onClick={() => setAccepted(!accepted)}>
          <div style={{
            width: 20, height: 20, borderRadius: 6, background: accepted ? CA.purple : "transparent", border: accepted ? "none" : `2px solid ${CA.border}`,
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1, transition: "all 0.15s"
          }}>
            {accepted && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>}
          </div>
          <span style={{ fontSize: 13, color: CA.textSec, lineHeight: 1.5 }}>Acepto los términos y condiciones de Rush para negocios</span>
        </div>

        <PrimaryButton onClick={() => setSubmitted(true)} disabled={!accepted}>Enviar solicitud</PrimaryButton>
      </div>
    </div>
  );
};

// ─── DASHBOARD ───
const DashboardView = ({ rooms, setRooms }) => {
  const occupied = rooms.filter(r => r.status === "ocupada" || r.status === "reservada").length;
  const occupancyPct = Math.round((occupied / rooms.length) * 100);
  const [liveUserRes, setLiveUserRes] = useState(() => JSON.parse(localStorage.getItem("rush_admin_reservations") || "[]"));
  useEffect(() => {
    const interval = setInterval(() => setLiveUserRes(JSON.parse(localStorage.getItem("rush_admin_reservations") || "[]")), 2000);
    return () => clearInterval(interval);
  }, []);
  const allResAdmin = [...liveUserRes, ...RESERVATIONS_DATA];
  const todayRevenue = allResAdmin.filter(r => r.status !== "completada").reduce((a, r) => a + r.amount, 0);
  const activeRes = allResAdmin.filter(r => r.status === "en_curso" || r.status === "pendiente" || r.status === "por_vencer").length;

  const toggleRoom = (id) => {
    setRooms(prev => prev.map(r => {
      if (r.id !== id) return r;
      const next = r.status === "libre" ? "ocupada" : r.status === "ocupada" ? "libre" : r.status;
      return { ...r, status: next };
    }));
  };

  return (
    <div style={{ animation: "fadeUp 0.4s ease" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 28 }}>
        <MetricCard label="Ocupación hoy" value={`${occupancyPct}%`} trend="up" trendValue="+5%" color={CA.green} />
        <MetricCard label="Ingresos hoy" value={`$${Math.round(todayRevenue / 1000)}k`} trend="up" trendValue="+18%" color={CA.purple} />
        <MetricCard label="Reservas activas" value={activeRes} />
        <MetricCard label="Valoración" value="4.3" trend="up" trendValue="+0.2" color={CA.amber} />
      </div>

      <SectionTitle>Habitaciones</SectionTitle>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 10 }}>
        {rooms.map(r => (
          <div key={r.id} style={{ background: CA.card, borderRadius: 14, border: `1px solid ${CA.border}`, padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", transition: "all 0.15s" }}
            onMouseEnter={e => e.currentTarget.style.borderColor = CA.purpleMid}
            onMouseLeave={e => e.currentTarget.style.borderColor = CA.border}>
            <div>
              <p style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>{r.name}</p>
              <p style={{ fontSize: 13, color: CA.textSec, margin: "2px 0 0" }}>${r.price1h.toLocaleString()}/h</p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Badge status={r.status} />
              {(r.status === "libre" || r.status === "ocupada") && (
                <Toggle on={r.status === "libre"} onToggle={() => toggleRoom(r.id)} />
              )}
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 24 }}>
        <SectionTitle>Últimas reservas</SectionTitle>
        <div style={{ background: CA.card, borderRadius: 14, border: `1px solid ${CA.border}`, overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${CA.border}` }}>
                  {["Habitación", "Check-in", "Código", "Monto", "Estado"].map(h => (
                    <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontWeight: 600, color: CA.textSec, fontSize: 12, whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {RESERVATIONS_DATA.slice(0, 4).map(r => (
                  <tr key={r.id} style={{ borderBottom: `1px solid ${CA.border}` }}>
                    <td style={{ padding: "12px 16px", fontWeight: 500 }}>{r.room}</td>
                    <td style={{ padding: "12px 16px", color: CA.textSec }}>{r.checkIn} · {r.duration}</td>
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        {I.shield()}
                        <span style={{ letterSpacing: 3, fontWeight: 600, fontFamily: "'DM Sans', monospace" }}>{r.code}</span>
                      </div>
                    </td>
                    <td style={{ padding: "12px 16px", fontWeight: 600, color: CA.purple }}>${r.amount.toLocaleString()}</td>
                    <td style={{ padding: "12px 16px" }}><Badge status={r.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── RESERVATIONS ───
const ReservationsView = () => {
  const [filter, setFilter] = useState("all");
  const [verifyCode, setVerifyCode] = useState("");
  const [verifyResult, setVerifyResult] = useState(null);
  const [userReservations, setUserReservations] = useState(() => JSON.parse(localStorage.getItem("rush_admin_reservations") || "[]"));
  useEffect(() => {
    const interval = setInterval(() => {
      setUserReservations(JSON.parse(localStorage.getItem("rush_admin_reservations") || "[]"));
    }, 2000);
    return () => clearInterval(interval);
  }, []);
  const allReservations = [...userReservations, ...RESERVATIONS_DATA];
  const filters = [
    { key: "all", label: "Todas" },
    { key: "active", label: "Activas" },
    { key: "pending", label: "Pendientes" },
    { key: "done", label: "Historial" },
  ];
  const filtered = allReservations.filter(r => {
    if (filter === "active") return r.status === "en_curso" || r.status === "por_vencer";
    if (filter === "pending") return r.status === "pendiente";
    if (filter === "done") return r.status === "completada";
    return true;
  });

  const handleVerify = () => {
    const found = allReservations.find(r => r.code === verifyCode);
    setVerifyResult(found ? { success: true, room: found.room, duration: found.duration } : { success: false });
  };

  return (
    <div style={{ animation: "fadeUp 0.4s ease" }}>
      {/* Verify code box */}
      <div style={{ background: CA.purpleLight, borderRadius: 16, padding: "20px 24px", marginBottom: 24, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12 }}>
        <div style={{ flex: "1 1 200px" }}>
          <p style={{ fontSize: 15, fontWeight: 700, color: CA.purpleDark, margin: 0, fontFamily: FONT_ADMIN }}>Verificar código de acceso</p>
          <p style={{ fontSize: 13, color: CA.purple, margin: "2px 0 0" }}>Ingresá el código de 4 dígitos del cliente</p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input value={verifyCode} onChange={e => { setVerifyCode(e.target.value.replace(/\D/g, "").slice(0, 4)); setVerifyResult(null); }}
            placeholder="0000" maxLength={4}
            style={{ width: 100, padding: "10px 14px", borderRadius: 12, border: `2px solid ${CA.purple}`, fontSize: 20, fontWeight: 700, textAlign: "center", letterSpacing: 6, fontFamily: FONT_ADMIN, outline: "none", background: CA.card }} />
          <button onClick={handleVerify}
            style={{ padding: "10px 20px", borderRadius: 12, background: CA.purple, color: "#fff", border: "none", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: FONT_ADMIN }}>
            Verificar
          </button>
        </div>
        {verifyResult && (
          <div style={{ width: "100%", marginTop: 4, padding: "10px 14px", borderRadius: 10, background: verifyResult.success ? CA.greenLight : CA.redLight }}>
            {verifyResult.success
              ? <p style={{ margin: 0, fontSize: 13, color: CA.greenDark, fontWeight: 600 }}>{I.check()} Código válido — {verifyResult.room} · {verifyResult.duration}</p>
              : <p style={{ margin: 0, fontSize: 13, color: CA.redDark, fontWeight: 600 }}>Código no encontrado</p>
            }
          </div>
        )}
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        {filters.map(f => (
          <span key={f.key} onClick={() => setFilter(f.key)}
            style={{
              padding: "8px 18px", borderRadius: 14, fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all 0.2s",
              background: filter === f.key ? CA.purple : CA.card, color: filter === f.key ? "#fff" : CA.textSec,
              border: filter === f.key ? "none" : `1px solid ${CA.border}`
            }}>
            {f.label}
          </span>
        ))}
      </div>

      {/* Reservation cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 12 }}>
        {filtered.map((r, i) => (
          <div key={r.id} style={{ background: CA.card, borderRadius: 14, border: `1px solid ${CA.border}`, padding: "16px 20px", animation: `fadeUp 0.3s ease ${i * 0.05}s both` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
              <div>
                <p style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>{r.room}</p>
                <p style={{ fontSize: 13, color: CA.textSec, margin: "3px 0 0" }}>Check-in: {r.checkIn} · {r.duration}</p>
              </div>
              <Badge status={r.status} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: `1px solid ${CA.border}`, paddingTop: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {I.shield()}
                <span style={{ fontSize: 18, fontWeight: 700, letterSpacing: 4, fontFamily: FONT_ADMIN }}>{r.code}</span>
              </div>
              <div style={{ textAlign: "right" }}>
                <p style={{ fontSize: 16, fontWeight: 700, color: CA.purple, margin: 0 }}>${r.amount.toLocaleString()}</p>
                <p style={{ fontSize: 11, color: CA.textSec, margin: "2px 0 0" }}>{r.payMethod}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
      {filtered.length === 0 && (
        <div style={{ textAlign: "center", padding: 40, color: CA.textSec }}>
          <p style={{ fontSize: 15 }}>No hay reservas en esta categoría</p>
        </div>
      )}
    </div>
  );
};

// ─── PRICING ───
const PricingView = ({ rooms, setRooms }) => {
  const [turno, setTurno] = useState("1h");
  const turnos = [{ key: "1h", label: "1 hora" }, { key: "2h", label: "2 horas" }, { key: "night", label: "Pernocte" }];
  const priceKey = turno === "1h" ? "price1h" : turno === "2h" ? "price2h" : "priceNight";

  const grouped = {};
  rooms.forEach(r => {
    if (!grouped[r.type]) grouped[r.type] = [];
    grouped[r.type].push(r);
  });

  const updatePrice = (type, val) => {
    const num = parseInt(val.replace(/\D/g, "")) || 0;
    setRooms(prev => prev.map(r => r.type === type ? { ...r, [priceKey]: num } : r));
  };

  const togglePeak = (type) => {
    setRooms(prev => prev.map(r => r.type === type ? { ...r, peakEnabled: !r.peakEnabled } : r));
  };

  return (
    <div style={{ animation: "fadeUp 0.4s ease" }}>
      <div style={{ marginBottom: 20 }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: CA.textSec, margin: "0 0 10px" }}>Turno seleccionado</p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {turnos.map(t => (
            <span key={t.key} onClick={() => setTurno(t.key)}
              style={{
                padding: "9px 20px", borderRadius: 14, fontSize: 14, fontWeight: 600, cursor: "pointer", transition: "all 0.2s",
                background: turno === t.key ? CA.purple : CA.card, color: turno === t.key ? "#fff" : CA.textSec,
                border: turno === t.key ? "none" : `1px solid ${CA.border}`
              }}>
              {t.label}
            </span>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 14 }}>
        {Object.entries(grouped).map(([type, typeRooms]) => (
          <div key={type} style={{ background: CA.card, borderRadius: 16, border: `1px solid ${CA.border}`, padding: "20px 24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div>
                <p style={{ fontSize: 17, fontWeight: 700, margin: 0, fontFamily: FONT_ADMIN }}>{type}</p>
                <p style={{ fontSize: 12, color: CA.textSec, margin: "2px 0 0" }}>{typeRooms.length} habitacion{typeRooms.length > 1 ? "es" : ""}</p>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <div style={{ flex: 1, display: "flex", alignItems: "center", border: `2px solid ${CA.border}`, borderRadius: 12, padding: "0 14px", height: 46, background: CA.bg }}>
                <span style={{ fontSize: 16, color: CA.textSec, marginRight: 4 }}>$</span>
                <input value={typeRooms[0][priceKey].toLocaleString()} onChange={e => updatePrice(type, e.target.value)}
                  style={{ border: "none", background: "transparent", fontSize: 20, fontWeight: 700, fontFamily: FONT_ADMIN, outline: "none", width: "100%", color: CA.text }} />
              </div>
              <span style={{ fontSize: 14, color: CA.textSec, fontWeight: 500 }}>/{turno === "night" ? "noche" : turno}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderTop: `1px solid ${CA.border}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {I.clock(typeRooms[0].peakEnabled ? CA.amberDark : CA.textSec)}
                <span style={{ fontSize: 13, color: typeRooms[0].peakEnabled ? CA.amberDark : CA.textSec, fontWeight: 500 }}>
                  Pico: {typeRooms[0].peakEnabled ? `+${typeRooms[0].peakPct}%` : "desactivado"}
                </span>
              </div>
              <Toggle on={typeRooms[0].peakEnabled} onToggle={() => togglePeak(type)} />
            </div>
          </div>
        ))}
      </div>

      {/* Promo banner */}
      <div style={{ background: CA.purpleLight, borderRadius: 16, padding: "18px 24px", marginTop: 20, display: "flex", alignItems: "center", gap: 14, cursor: "pointer" }}
        onMouseEnter={e => e.currentTarget.style.background = CA.purple100}
        onMouseLeave={e => e.currentTarget.style.background = CA.purpleLight}>
        {I.tag()}
        <div style={{ flex: 1 }}>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: CA.purpleDark, fontFamily: FONT_ADMIN }}>Crear promoción</p>
          <p style={{ margin: "2px 0 0", fontSize: 13, color: CA.purple }}>Configurá descuentos por horario, día de la semana o fechas especiales</p>
        </div>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={CA.purple} strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
      </div>
    </div>
  );
};

// ─── MESSAGES ───
const MessagesView = () => {
  const [conversations, setConversations] = useState([]);
  const [activeConv, setActiveConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [albergueId, setAlbergueId] = useState(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const bottomRef = useRef(null);
  const token = localStorage.getItem("rush_token");

  useEffect(() => {
    api.get("/messages/admin/conversations", token)
      .then(data => { setConversations(data.conversations || []); setAlbergueId(data.albergue_id); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!activeConv || !albergueId) return;
    setLoadingMsgs(true);
    const load = () => api.get(`/messages/${albergueId}?user_id=${activeConv.user_id}`, token)
      .then(data => { setMessages(data.messages || []); setLoadingMsgs(false); })
      .catch(() => setLoadingMsgs(false));
    load();
    const t = setInterval(load, 8000);
    return () => clearInterval(t);
  }, [activeConv, albergueId]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || sending || !albergueId || !activeConv) return;
    setSending(true);
    const optimistic = { id: "tmp-" + Date.now(), sender_role: "admin", content: input.trim(), created_at: new Date().toISOString() };
    setMessages(prev => [...prev, optimistic]);
    setInput("");
    try {
      await api.post(`/messages/${albergueId}`, { content: optimistic.content, user_id: activeConv.user_id }, token);
    } catch { setMessages(prev => prev.filter(m => m.id !== optimistic.id)); }
    setSending(false);
  };

  const fmtTime = (iso) => {
    const d = new Date(iso);
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  };

  const fmtDate = (iso) => {
    const d = new Date(iso);
    return d.toLocaleDateString("es-AR", { day: "numeric", month: "short" });
  };

  if (loading) return <div style={{ textAlign: "center", padding: "60px 0", color: CA.textSec }}>Cargando conversaciones...</div>;

  return (
    <div style={{ display: "flex", height: "calc(100vh - 120px)", minHeight: 500, gap: 16, animation: "fadeUp 0.4s ease" }}>
      {/* Sidebar — lista de conversaciones */}
      <div style={{ width: 280, flexShrink: 0, background: CA.card, borderRadius: 16, border: `1px solid ${CA.border}`, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "16px 18px", borderBottom: `1px solid ${CA.border}` }}>
          <p style={{ fontSize: 16, fontWeight: 700, margin: 0, fontFamily: FONT_ADMIN }}>Conversaciones</p>
          <p style={{ fontSize: 12, color: CA.textSec, margin: "2px 0 0" }}>{conversations.length} usuario{conversations.length !== 1 ? "s" : ""}</p>
        </div>
        <div style={{ flex: 1, overflowY: "auto" }}>
          {conversations.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 16px" }}>
              {I.chat(CA.textTer)}
              <p style={{ fontSize: 13, color: CA.textSec, marginTop: 10 }}>Sin mensajes aún</p>
              <p style={{ fontSize: 12, color: CA.textTer, marginTop: 4 }}>Los usuarios te escribirán desde el detalle del albergue</p>
            </div>
          ) : conversations.map(c => (
            <div key={c.user_id} onClick={() => { setActiveConv(c); setMessages([]); }}
              style={{ padding: "12px 16px", borderBottom: `1px solid ${CA.border}`, cursor: "pointer", background: activeConv?.user_id === c.user_id ? CA.purpleLight : "transparent", transition: "background 0.15s" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 32, height: 32, borderRadius: "50%", background: `linear-gradient(135deg, ${CA.purpleDark}, ${CA.purpleMid})`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>{(c.user_name || "U")[0].toUpperCase()}</span>
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>{c.user_name}</span>
                </div>
                {c.unread > 0 && (
                  <span style={{ fontSize: 11, fontWeight: 700, background: CA.purple, color: "#fff", borderRadius: "50%", width: 18, height: 18, display: "flex", alignItems: "center", justifyContent: "center" }}>{c.unread}</span>
                )}
              </div>
              <p style={{ fontSize: 12, color: CA.textSec, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.last_message}</p>
              <p style={{ fontSize: 11, color: CA.textTer, margin: "3px 0 0" }}>{c.last_at ? fmtDate(c.last_at) : ""}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Panel de chat */}
      <div style={{ flex: 1, background: CA.card, borderRadius: 16, border: `1px solid ${CA.border}`, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {!activeConv ? (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: CA.textSec }}>
            {I.chat(CA.textTer)}
            <p style={{ marginTop: 12, fontSize: 14 }}>Seleccioná una conversación</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div style={{ padding: "16px 20px", borderBottom: `1px solid ${CA.border}`, display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 38, height: 38, borderRadius: "50%", background: `linear-gradient(135deg, ${CA.purpleDark}, ${CA.purpleMid})`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>{(activeConv.user_name || "U")[0].toUpperCase()}</span>
              </div>
              <div>
                <p style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>{activeConv.user_name}</p>
                <p style={{ fontSize: 11, color: CA.textSec, margin: 0 }}>Usuario Rush</p>
              </div>
            </div>

            {/* Mensajes */}
            <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
              {loadingMsgs ? (
                <p style={{ textAlign: "center", color: CA.textSec, fontSize: 13 }}>Cargando...</p>
              ) : messages.length === 0 ? (
                <p style={{ textAlign: "center", color: CA.textSec, fontSize: 13, marginTop: 40 }}>Sin mensajes en esta conversación</p>
              ) : messages.map((m, i) => {
                const isAdmin = m.sender_role === "admin";
                return (
                  <div key={m.id || i} style={{ display: "flex", flexDirection: "column", alignItems: isAdmin ? "flex-end" : "flex-start", marginBottom: 12 }}>
                    <div style={{ maxWidth: "75%", padding: "10px 14px", borderRadius: isAdmin ? "14px 14px 4px 14px" : "14px 14px 14px 4px", background: isAdmin ? CA.purple : CA.bg, border: isAdmin ? "none" : `1px solid ${CA.border}` }}>
                      <p style={{ fontSize: 14, color: isAdmin ? "#fff" : CA.text, margin: 0, lineHeight: 1.45 }}>{m.content}</p>
                    </div>
                    <span style={{ fontSize: 10, color: CA.textTer, marginTop: 3, paddingLeft: 4, paddingRight: 4 }}>{m.created_at ? fmtTime(m.created_at) : ""}</span>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div style={{ padding: "12px 16px", borderTop: `1px solid ${CA.border}`, display: "flex", gap: 8, alignItems: "center" }}>
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") sendMessage(); }}
                placeholder="Respondé al usuario..."
                style={{ flex: 1, padding: "10px 16px", borderRadius: 20, border: `1.5px solid ${CA.border}`, fontSize: 14, fontFamily: "'DM Sans', sans-serif", outline: "none", background: CA.bg, color: CA.text }}
              />
              <button onClick={sendMessage} disabled={sending || !input.trim()}
                style={{ width: 40, height: 40, borderRadius: "50%", border: "none", background: input.trim() ? CA.purple : CA.border, cursor: input.trim() ? "pointer" : "not-allowed", display: "flex", alignItems: "center", justifyContent: "center", transition: "background 0.2s" }}>
                {I.send()}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// ─── METRICS ───
const MetricsView = () => {
  const [period, setPeriod] = useState("week");
  const [apiMetrics, setApiMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const periods = [{ key: "today", label: "Hoy" }, { key: "week", label: "Semana" }, { key: "month", label: "Mes" }, { key: "year", label: "Año" }];

  useEffect(() => {
    const token = localStorage.getItem("rush_token");
    if (!token) { setLoading(false); return; }
    api.get("/owners/me", token)
      .then(data => {
        const albergueId = data.owner?.albergues?.[0]?.id;
        if (!albergueId) { setLoading(false); return; }
        return api.get(`/metrics/admin/${albergueId}`, token);
      })
      .then(data => { if (data) setApiMetrics(data.metrics); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const dailyData = apiMetrics?.dailyRevenue || DAILY_REVENUE;
  const maxRev = Math.max(...dailyData.map(d => d.value), 1);

  const roomPerf = apiMetrics?.rooms?.length > 0
    ? apiMetrics.rooms.map(r => ({
        name: r.name,
        status: r.status,
        price: r.price_1h,
        occupancy: r.status === "ocupada" || r.status === "reservada" ? 100 : r.status === "libre" ? 0 : 50,
      }))
    : [
        { name: "Suite Premium", revenue: 385000, reservations: 22, occupancy: 88 },
        { name: "Clásica", revenue: 312000, reservations: 18, occupancy: 72 },
        { name: "VIP", revenue: 145000, reservations: 7, occupancy: 52 },
      ];

  const fmtMoney = (n) => n >= 1000 ? `$${Math.round(n / 1000)}k` : `$${n}`;

  return (
    <div style={{ animation: "fadeUp 0.4s ease" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {periods.map(p => (
            <span key={p.key} onClick={() => setPeriod(p.key)}
              style={{
                padding: "8px 18px", borderRadius: 14, fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all 0.2s",
                background: period === p.key ? CA.purple : CA.card, color: period === p.key ? "#fff" : CA.textSec,
                border: period === p.key ? "none" : `1px solid ${CA.border}`
              }}>
              {p.label}
            </span>
          ))}
        </div>
        {!loading && apiMetrics && (
          <span style={{ fontSize: 11, color: CA.green, fontWeight: 600, padding: "4px 10px", background: CA.greenLight, borderRadius: 8 }}>● En vivo</span>
        )}
      </div>

      {/* KPI cards — API cuando está disponible */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 28 }}>
        {apiMetrics ? (
          <>
            <MetricCard label="Ingresos hoy" value={fmtMoney(apiMetrics.todayRevenue)} trend="up" trendValue="" color={CA.purple} />
            <MetricCard label="Reservas activas" value={String(apiMetrics.activeReservations)} trend="up" trendValue="" />
            <MetricCard label="Ocupación" value={`${apiMetrics.occupancy}%`} trend={apiMetrics.occupancy >= 50 ? "up" : "down"} trendValue="" color={CA.green} />
            <MetricCard label="Rating" value={String(apiMetrics.rating || "—")} trend="up" trendValue={`${apiMetrics.reviewCount} reseñas`} color={CA.amber} />
          </>
        ) : (
          <>
            <MetricCard label="Ingresos" value="$842k" trend="up" trendValue="+18%" color={CA.purple} />
            <MetricCard label="Reservas" value="47" trend="up" trendValue="+12%" />
            <MetricCard label="Ocupación prom." value="74%" trend="up" trendValue="+5%" color={CA.green} />
            <MetricCard label="Ticket promedio" value="$17.9k" trend="down" trendValue="-3%" />
          </>
        )}
      </div>

      {/* Bar chart — ingresos por día */}
      <div style={{ background: CA.card, borderRadius: 16, border: `1px solid ${CA.border}`, padding: "20px 24px", marginBottom: 20 }}>
        <SectionTitle>{apiMetrics ? "Ingresos últimos 7 días (API)" : "Ingresos por día"}</SectionTitle>
        {loading ? (
          <div style={{ height: 160, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: 13, color: CA.textSec }}>Cargando datos...</span>
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", height: 160, gap: 8 }}>
            {dailyData.map((d, i) => {
              const h = Math.max(Math.round((d.value / maxRev) * 140), d.value > 0 ? 8 : 2);
              const isWeekend = i >= 4;
              return (
                <div key={d.day} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: CA.textSec }}>{d.value > 0 ? fmtMoney(d.value) : ""}</span>
                  <div style={{ width: "100%", maxWidth: 40, height: h, borderRadius: "6px 6px 0 0", background: isWeekend ? CA.purple : CA.purple200, transition: "height 0.5s ease" }} />
                  <span style={{ fontSize: 12, fontWeight: isWeekend ? 700 : 400, color: isWeekend ? CA.purple : CA.textSec }}>{d.day}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Room performance */}
      <div style={{ background: CA.card, borderRadius: 16, border: `1px solid ${CA.border}`, padding: "20px 24px", marginBottom: 20 }}>
        <SectionTitle>Rendimiento por habitación</SectionTitle>
        {apiMetrics?.rooms?.length > 0 ? (
          apiMetrics.rooms.map((r, i) => {
            const statusColor = r.status === "libre" ? CA.green : r.status === "ocupada" ? CA.amber : CA.purple;
            const statusLabel = { libre: "Libre", ocupada: "Ocupada", reservada: "Reservada", mantenimiento: "Mant." }[r.status] || r.status;
            return (
              <div key={r.id || i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: i < apiMetrics.rooms.length - 1 ? `1px solid ${CA.border}` : "none" }}>
                <div>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>{r.name}</span>
                  <span style={{ fontSize: 12, color: CA.textSec, marginLeft: 8 }}>${(r.price_1h || 0).toLocaleString()}/h</span>
                </div>
                <span style={{ fontSize: 12, fontWeight: 600, padding: "3px 10px", borderRadius: 8, background: `${statusColor}22`, color: statusColor }}>{statusLabel}</span>
              </div>
            );
          })
        ) : (
          roomPerf.map((r, i) => {
            const maxP = Math.max(...roomPerf.map(x => x.revenue || 1));
            return (
              <div key={r.name} style={{ marginBottom: i < roomPerf.length - 1 ? 18 : 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>{r.name}</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: CA.purple }}>{fmtMoney(r.revenue)}</span>
                </div>
                <div style={{ height: 8, borderRadius: 4, background: CA.bg, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${Math.round((r.revenue / maxP) * 100)}%`, borderRadius: 4, background: i === 0 ? CA.purple : i === 1 ? CA.purple200 : CA.purple100, transition: "width 0.6s ease" }} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                  <span style={{ fontSize: 12, color: CA.textSec }}>{r.reservations} reservas</span>
                  <span style={{ fontSize: 12, color: r.occupancy >= 70 ? CA.greenDark : CA.amberDark, fontWeight: 500 }}>{r.occupancy}% ocupación</span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Peak hours */}
      <div style={{ background: CA.purpleLight, borderRadius: 16, padding: "18px 24px" }}>
        <p style={{ margin: "0 0 10px", fontSize: 15, fontWeight: 700, color: CA.purpleDark, fontFamily: FONT_ADMIN }}>Horarios pico</p>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          {["14:00 - 17:00", "22:00 - 01:00"].map(h => (
            <div key={h} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: CA.purple }} />
              <span style={{ fontSize: 14, color: CA.purpleDark, fontWeight: 500 }}>{h}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ─── SETTINGS ───
const SettingsView = ({ onLogout }) => {
  const [profile, setProfile] = useState({ name: "Martín Gómez", email: "martin@suitepalermo.com", phone: "+54 11 5555-4321" });
  const [albergue, setAlbergue] = useState({ name: "Suite Palermo", address: "Av. Santa Fe 4200", zone: "Palermo, CABA", hours: "24 horas" });
  const [editingSection, setEditingSection] = useState(null);
  const [notifications, setNotifications] = useState({ reservas: true, reviews: true, promos: false });
  const [saved, setSaved] = useState(null);

  const handleSave = (section) => {
    setEditingSection(null);
    setSaved(section);
    setTimeout(() => setSaved(null), 2000);
  };

  const SettingsRow = ({ icon, label, value, section, field, onChange }) => {
    const isEditing = editingSection === section;
    return (
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 0", borderBottom: `1px solid ${CA.border}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 0 }}>
          {icon}
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 13, color: CA.textSec, margin: 0 }}>{label}</p>
            {isEditing ? (
              <input value={value} onChange={e => onChange(e.target.value)}
                style={{
                  fontSize: 15, fontWeight: 500, border: "none", borderBottom: `2px solid ${CA.purple}`, outline: "none", padding: "4px 0", width: "100%",
                  background: "transparent", fontFamily: "'DM Sans', sans-serif", color: CA.text
                }} autoFocus />
            ) : (
              <p style={{ fontSize: 15, fontWeight: 500, margin: "2px 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{value}</p>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={{ animation: "fadeUp 0.4s ease" }}>
      {/* Profile header */}
      <div style={{ display: "flex", alignItems: "center", gap: 18, marginBottom: 28 }}>
        <div style={{ width: 68, height: 68, borderRadius: "50%", background: `linear-gradient(135deg, ${CA.purpleDark}, ${CA.purpleMid})`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <span style={{ fontSize: 26, fontWeight: 800, color: "#fff", fontFamily: FONT_ADMIN }}>MG</span>
        </div>
        <div>
          <p style={{ fontSize: 20, fontWeight: 700, margin: 0, fontFamily: FONT_ADMIN }}>{profile.name}</p>
          <p style={{ fontSize: 14, color: CA.textSec, margin: "2px 0 0" }}>{profile.email}</p>
          <span style={{ fontSize: 12, padding: "3px 10px", borderRadius: 8, background: CA.purpleLight, color: CA.purpleDark, fontWeight: 600, marginTop: 6, display: "inline-block" }}>Plan Premium</span>
        </div>
      </div>

      {/* Personal info */}
      <div style={{ background: CA.card, borderRadius: 16, border: `1px solid ${CA.border}`, padding: "6px 20px", marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 0", borderBottom: `1px solid ${CA.border}` }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, fontFamily: FONT_ADMIN }}>Datos personales</h3>
          {editingSection === "profile" ? (
            <button onClick={() => handleSave("profile")} style={{ padding: "6px 16px", borderRadius: 10, border: "none", background: CA.purple, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>Guardar</button>
          ) : (
            <span onClick={() => setEditingSection("profile")} style={{ fontSize: 13, color: CA.purple, fontWeight: 600, cursor: "pointer" }}>Editar</span>
          )}
        </div>
        {saved === "profile" && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 0 4px" }}>
            {I.check(CA.greenDark)}
            <span style={{ fontSize: 13, color: CA.greenDark, fontWeight: 600 }}>Cambios guardados</span>
          </div>
        )}
        <SettingsRow icon={I.user(CA.textSec)} label="Nombre" value={profile.name} section="profile"
          onChange={v => setProfile({ ...profile, name: v })} />
        <SettingsRow icon={I.mail(CA.textSec)} label="Email" value={profile.email} section="profile"
          onChange={v => setProfile({ ...profile, email: v })} />
        <SettingsRow icon={I.phone(CA.textSec)} label="Teléfono" value={profile.phone} section="profile"
          onChange={v => setProfile({ ...profile, phone: v })} />
      </div>

      {/* Albergue info */}
      <div style={{ background: CA.card, borderRadius: 16, border: `1px solid ${CA.border}`, padding: "6px 20px", marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 0", borderBottom: `1px solid ${CA.border}` }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, fontFamily: FONT_ADMIN }}>Datos del albergue</h3>
          {editingSection === "albergue" ? (
            <button onClick={() => handleSave("albergue")} style={{ padding: "6px 16px", borderRadius: 10, border: "none", background: CA.purple, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>Guardar</button>
          ) : (
            <span onClick={() => setEditingSection("albergue")} style={{ fontSize: 13, color: CA.purple, fontWeight: 600, cursor: "pointer" }}>Editar</span>
          )}
        </div>
        {saved === "albergue" && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 0 4px" }}>
            {I.check(CA.greenDark)}
            <span style={{ fontSize: 13, color: CA.greenDark, fontWeight: 600 }}>Cambios guardados</span>
          </div>
        )}
        <SettingsRow icon={I.dashboard(CA.textSec)} label="Nombre del albergue" value={albergue.name} section="albergue"
          onChange={v => setAlbergue({ ...albergue, name: v })} />
        <SettingsRow icon={I.mapPin(CA.textSec)} label="Dirección" value={albergue.address} section="albergue"
          onChange={v => setAlbergue({ ...albergue, address: v })} />
        <SettingsRow icon={I.search(CA.textSec)} label="Barrio / Zona" value={albergue.zone} section="albergue"
          onChange={v => setAlbergue({ ...albergue, zone: v })} />
        <SettingsRow icon={I.clock(CA.textSec)} label="Horario" value={albergue.hours} section="albergue"
          onChange={v => setAlbergue({ ...albergue, hours: v })} />
      </div>

      {/* Notifications */}
      <div style={{ background: CA.card, borderRadius: 16, border: `1px solid ${CA.border}`, padding: "6px 20px", marginBottom: 16 }}>
        <div style={{ padding: "14px 0", borderBottom: `1px solid ${CA.border}` }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, fontFamily: FONT_ADMIN }}>Notificaciones</h3>
        </div>
        {[
          { key: "reservas", label: "Nuevas reservas", desc: "Avisarme cuando alguien reserve" },
          { key: "reviews", label: "Reseñas", desc: "Avisarme cuando dejen una reseña" },
          { key: "promos", label: "Ofertas Rush", desc: "Tips y promociones de la plataforma" },
        ].map(n => (
          <div key={n.key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 0", borderBottom: `1px solid ${CA.border}` }}>
            <div>
              <p style={{ fontSize: 14, fontWeight: 500, margin: 0 }}>{n.label}</p>
              <p style={{ fontSize: 12, color: CA.textSec, margin: "2px 0 0" }}>{n.desc}</p>
            </div>
            <Toggle on={notifications[n.key]} onToggle={() => setNotifications(prev => ({ ...prev, [n.key]: !prev[n.key] }))} />
          </div>
        ))}
      </div>

      {/* Security */}
      <div style={{ background: CA.card, borderRadius: 16, border: `1px solid ${CA.border}`, padding: "6px 20px", marginBottom: 16 }}>
        <div style={{ padding: "14px 0", borderBottom: `1px solid ${CA.border}` }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, fontFamily: FONT_ADMIN }}>Seguridad</h3>
        </div>
        <div style={{ padding: "14px 0", borderBottom: `1px solid ${CA.border}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }} onClick={() => {
            const el = document.getElementById("admin-change-pass");
            if (el) el.style.display = el.style.display === "none" ? "block" : "none";
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              {I.lock(CA.textSec)}
              <p style={{ fontSize: 14, fontWeight: 500, margin: 0 }}>Cambiar contrase\u00f1a</p>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={CA.textTer} strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
          </div>
          <div id="admin-change-pass" style={{ display: "none", marginTop: 14 }}>
            <div style={{ marginBottom: 10 }}>
              <label style={{ fontSize: 12, color: CA.textSec, display: "block", marginBottom: 4 }}>Contrase\u00f1a actual</label>
              <input type="password" placeholder={"\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022"} style={{ width: "100%", padding: "10px 14px", border: `1.5px solid ${CA.border}`, borderRadius: 10, fontSize: 14, fontFamily: "'DM Sans', sans-serif", outline: "none", boxSizing: "border-box" }} />
            </div>
            <div style={{ marginBottom: 10 }}>
              <label style={{ fontSize: 12, color: CA.textSec, display: "block", marginBottom: 4 }}>Nueva contrase\u00f1a</label>
              <input type="password" placeholder={"M\u00ednimo 8 caracteres"} style={{ width: "100%", padding: "10px 14px", border: `1.5px solid ${CA.border}`, borderRadius: 10, fontSize: 14, fontFamily: "'DM Sans', sans-serif", outline: "none", boxSizing: "border-box" }} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, color: CA.textSec, display: "block", marginBottom: 4 }}>Confirmar nueva contrase\u00f1a</label>
              <input type="password" placeholder="Repetir contrase\u00f1a" style={{ width: "100%", padding: "10px 14px", border: `1.5px solid ${CA.border}`, borderRadius: 10, fontSize: 14, fontFamily: "'DM Sans', sans-serif", outline: "none", boxSizing: "border-box" }} />
            </div>
            <button onClick={() => { const el = document.getElementById("admin-change-pass"); if (el) el.style.display = "none"; alert("Contrase\u00f1a actualizada (demo)"); }}
              style={{ padding: "10px 24px", borderRadius: 10, background: CA.purple, color: "#fff", border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>Guardar contrase\u00f1a</button>
          </div>
        </div>
        <div style={{ padding: "14px 0" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }} onClick={() => {
            const el = document.getElementById("admin-privacy");
            if (el) el.style.display = el.style.display === "none" ? "block" : "none";
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              {I.shield(CA.textSec)}
              <p style={{ fontSize: 14, fontWeight: 500, margin: 0 }}>Privacidad y datos</p>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={CA.textTer} strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
          </div>
          <div id="admin-privacy" style={{ display: "none", marginTop: 14, fontSize: 13, color: CA.textSec, lineHeight: 1.7 }}>
            <p style={{ marginBottom: 8 }}>{"Los datos de tu albergue son visibles para los usuarios que buscan reservar."}</p>
            <p style={{ marginBottom: 8 }}>{"Tu informaci\u00f3n personal (email, tel\u00e9fono) solo es visible para el equipo de Rush."}</p>
            <p>{"Pod\u00e9s solicitar la eliminaci\u00f3n de tu cuenta y datos contactando a soporte@rush.app"}</p>
          </div>
        </div>
      </div>

      {/* Plan info */}
      <div style={{ background: CA.purpleLight, borderRadius: 16, padding: "18px 22px", marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div>
          <p style={{ fontSize: 15, fontWeight: 700, color: CA.purpleDark, margin: 0, fontFamily: FONT_ADMIN }}>Plan Premium</p>
          <p style={{ fontSize: 13, color: CA.purple, margin: "2px 0 0" }}>Mejor posicionamiento, estadísticas y promociones</p>
        </div>
        <span style={{ fontSize: 13, fontWeight: 600, color: CA.purple, cursor: "pointer" }}>Gestionar plan</span>
      </div>

      {/* Logout */}
      <div onClick={onLogout}
        style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 20px", background: CA.card, borderRadius: 16, border: `1px solid ${CA.border}`, cursor: "pointer", transition: "all 0.15s" }}
        onMouseEnter={e => e.currentTarget.style.borderColor = CA.red}
        onMouseLeave={e => e.currentTarget.style.borderColor = CA.border}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={CA.red} strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
        <span style={{ fontSize: 15, fontWeight: 600, color: CA.red }}>Cerrar sesión</span>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════
//  MAIN APP
// ═══════════════════════════════════════════
function RushAdminApp({ onLogout, startAuth = "welcome" }) {
  const [authState, setAuthState] = useState(startAuth);
  const [page, setPage] = useState("dashboard");
  const [rooms, setRooms] = useState(ROOMS_DATA);
  const [isMobile, setIsMobile] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [adminNotifs, setAdminNotifs] = useState([
    { id: 1, text: "Nueva reserva en Suite Premium", time: "Hace 5 min", read: false },
    { id: 2, text: "Habitaci\u00f3n Cl\u00e1sica 2 liberada", time: "Hace 20 min", read: false },
    { id: 3, text: "Rese\u00f1a nueva: \u2605\u2605\u2605\u2605\u2606", time: "Hace 1 hora", read: true },
    { id: 4, text: "Pago de $13.000 confirmado", time: "Hace 2 horas", read: true },
  ]);
  const [onboardingData, setOnboardingData] = useState({
    ownerName: "", ownerEmail: "", ownerPhone: "", ownerPass: "",
    name: "", address: "", zone: "", openTime: "00:00", closeTime: "24:00",
    rooms: [],
  });

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Polling de mensajes no leídos cada 30 segundos
  useEffect(() => {
    const token = localStorage.getItem("rush_token");
    if (!token) return;
    const fetchUnread = () => {
      api.get("/messages/admin/unread-count", token)
        .then(data => {
          const count = data.count || 0;
          setUnreadMessages(count);
          if (count > 0) {
            setAdminNotifs(prev => {
              const exists = prev.find(n => n.id === "msg-unread");
              if (exists) return prev.map(n => n.id === "msg-unread" ? { ...n, text: `${count} mensaje${count > 1 ? "s" : ""} sin leer de usuarios`, read: false } : n);
              return [{ id: "msg-unread", text: `${count} mensaje${count > 1 ? "s" : ""} sin leer de usuarios`, time: "Ahora", read: false }, ...prev];
            });
          }
        })
        .catch(() => {});
    };
    fetchUnread();
    const t = setInterval(fetchUnread, 30000);
    return () => clearInterval(t);
  }, []);

  // ── Auth / Onboarding Screens ──
  if (authState === "welcome") return (
    <>
      <style>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'DM Sans', 'Helvetica Neue', sans-serif; background: ${CA.bg}; -webkit-font-smoothing: antialiased; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        input:focus { border-color: ${CA.purple} !important; }
      `}</style>
      <AdminWelcomeScreen onLogin={() => setAuthState("login")} onRegister={() => setAuthState("step1")} />
    </>
  );
  if (authState === "login") return (
    <>
      <style>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'DM Sans', 'Helvetica Neue', sans-serif; background: ${CA.bg}; -webkit-font-smoothing: antialiased; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        input:focus { border-color: ${CA.purple} !important; }
      `}</style>
      <AdminLoginScreen onBack={onLogout} onLogin={(_user) => setAuthState("dashboard")} />
    </>
  );
  if (authState === "step1") return (
    <>
      <style>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'DM Sans', 'Helvetica Neue', sans-serif; background: ${CA.bg}; -webkit-font-smoothing: antialiased; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        input:focus { border-color: ${CA.purple} !important; }
      `}</style>
      <OnboardingStep1 data={onboardingData} setData={setOnboardingData} onNext={() => setAuthState("step2")} onBack={() => setAuthState("welcome")} />
    </>
  );
  if (authState === "step2") return (
    <>
      <style>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'DM Sans', 'Helvetica Neue', sans-serif; background: ${CA.bg}; -webkit-font-smoothing: antialiased; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        input:focus { border-color: ${CA.purple} !important; }
      `}</style>
      <OnboardingStep2 data={onboardingData} setData={setOnboardingData} onNext={() => setAuthState("step3")} onBack={() => setAuthState("step1")} />
    </>
  );
  if (authState === "step3") return (
    <>
      <style>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'DM Sans', 'Helvetica Neue', sans-serif; background: ${CA.bg}; -webkit-font-smoothing: antialiased; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        input:focus { border-color: ${CA.purple} !important; }
      `}</style>
      <OnboardingStep3 data={onboardingData} setData={setOnboardingData} onNext={() => setAuthState("step4")} onBack={() => setAuthState("step2")} />
    </>
  );
  if (authState === "step4") return (
    <>
      <style>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'DM Sans', 'Helvetica Neue', sans-serif; background: ${CA.bg}; -webkit-font-smoothing: antialiased; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        input:focus { border-color: ${CA.purple} !important; }
      `}</style>
      <OnboardingStep4 data={onboardingData} onBack={() => setAuthState("step3")} onFinish={() => setAuthState("dashboard")} />
    </>
  );

  const renderPage = () => {
    switch (page) {
      case "dashboard": return <DashboardView rooms={rooms} setRooms={setRooms} />;
      case "reservations": return <ReservationsView />;
      case "messages": return <MessagesView />;
      case "pricing": return <PricingView rooms={rooms} setRooms={setRooms} />;
      case "metrics": return <MetricsView />;
      case "settings": return <SettingsView onLogout={onLogout} />;
      default: return <DashboardView rooms={rooms} setRooms={setRooms} />;
    }
  };

  const pageTitle = { dashboard: "Inicio", reservations: "Reservas", messages: "Mensajes", pricing: "Precios", metrics: "Métricas", settings: "Ajustes" }[page];

  return (
    <>
      <style>{`
        * { margin: 0; padding: 0; box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
        body { font-family: 'DM Sans', 'Helvetica Neue', sans-serif; background: ${CA.bg}; -webkit-font-smoothing: antialiased; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        input:focus { border-color: ${CA.purple} !important; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${CA.borderSec}; border-radius: 3px; }
      `}</style>

      <div style={{ display: "flex", minHeight: "100dvh", fontFamily: "'DM Sans', sans-serif", color: CA.text, background: CA.bg }}>

        {/* ── Desktop Sidebar ── */}
        {!isMobile && (
          <div style={{ width: 240, background: CA.card, borderRight: `1px solid ${CA.border}`, padding: "24px 0", display: "flex", flexDirection: "column", position: "fixed", top: 0, left: 0, bottom: 0, zIndex: 100 }}>
            <div style={{ padding: "0 24px 28px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: `linear-gradient(135deg, ${CA.purpleDark}, ${CA.purpleMid})`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontSize: 16, fontWeight: 800, color: "#fff", fontFamily: FONT_ADMIN }}>R</span>
                </div>
                <div>
                  <p style={{ fontSize: 18, fontWeight: 800, fontFamily: FONT_ADMIN, margin: 0 }}>Rush</p>
                  <p style={{ fontSize: 11, color: CA.textSec, margin: 0 }}>Panel de gestión</p>
                </div>
              </div>
            </div>
            <nav style={{ flex: 1 }}>
              {NAV_ITEMS.map(item => (
                <div key={item.key} onClick={() => setPage(item.key)}
                  style={{
                    display: "flex", alignItems: "center", gap: 12, padding: "12px 24px", cursor: "pointer", transition: "all 0.15s",
                    background: page === item.key ? CA.purpleLight : "transparent",
                    borderRight: page === item.key ? `3px solid ${CA.purple}` : "3px solid transparent"
                  }}
                  onMouseEnter={e => { if (page !== item.key) e.currentTarget.style.background = CA.bg; }}
                  onMouseLeave={e => { if (page !== item.key) e.currentTarget.style.background = "transparent"; }}>
                  {item.icon(page === item.key ? CA.purple : CA.textSec)}
                  <span style={{ fontSize: 14, fontWeight: page === item.key ? 700 : 500, color: page === item.key ? CA.purple : CA.textSec }}>{item.label}</span>
                </div>
              ))}
            </nav>
            <div style={{ padding: "16px 24px", borderTop: `1px solid ${CA.border}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }} onClick={onLogout}>
                <div style={{ width: 34, height: 34, borderRadius: "50%", background: CA.purpleLight, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: CA.purple }}>SP</span>
                </div>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, margin: 0 }}>Suite Palermo</p>
                  <p style={{ fontSize: 11, color: CA.textSec, margin: 0 }}>Cerrar sesión</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Main Content ── */}
        <div style={{ flex: 1, marginLeft: isMobile ? 0 : 240, paddingBottom: isMobile ? "calc(70px + env(safe-area-inset-bottom, 12px))" : 32 }}>
          {/* Top bar */}
          <div style={{
            padding: isMobile ? "16px 20px" : "20px 32px", paddingTop: isMobile ? "env(safe-area-inset-top, 16px)" : "20px", display: "flex", justifyContent: "space-between", alignItems: "center",
            background: CA.card, borderBottom: `1px solid ${CA.border}`, position: "sticky", top: 0, zIndex: 50
          }}>
            <div>
              {isMobile && <p style={{ fontSize: 11, color: CA.textSec, marginBottom: 2 }}>Suite Palermo</p>}
              <h1 style={{ fontSize: isMobile ? 22 : 24, fontWeight: 800, fontFamily: FONT_ADMIN, margin: 0 }}>{pageTitle}</h1>
            </div>
            <div style={{ position: "relative" }}>
              <div style={{ cursor: "pointer" }} onClick={() => setShowNotifs(!showNotifs)}>
                {I.bell(CA.textSec)}
                {(adminNotifs.filter(n => !n.read).length > 0 || unreadMessages > 0) && <div style={{ position: "absolute", top: -2, right: -2, width: 8, height: 8, borderRadius: "50%", background: CA.red, border: `2px solid ${CA.card}` }} />}
              </div>
              {showNotifs && (
                <div style={{ position: "absolute", top: 32, right: 0, width: 300, background: CA.card, borderRadius: 14, border: `1px solid ${CA.border}`, boxShadow: "0 8px 30px rgba(0,0,0,0.12)", zIndex: 200, overflow: "hidden" }}>
                  <div style={{ padding: "12px 16px", borderBottom: `1px solid ${CA.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <p style={{ fontSize: 14, fontWeight: 700, margin: 0, fontFamily: FONT_ADMIN }}>Notificaciones</p>
                    <span style={{ fontSize: 11, color: CA.purple, fontWeight: 600, cursor: "pointer" }} onClick={() => setShowNotifs(false)}>Cerrar</span>
                  </div>
                  {adminNotifs.map(n => (
                    <div key={n.id} style={{ padding: "10px 16px", borderBottom: `1px solid ${CA.border}`, background: n.read ? "transparent" : CA.purpleLight }}>
                      <p style={{ fontSize: 13, margin: 0, fontWeight: n.read ? 400 : 600 }}>{n.text}</p>
                      <p style={{ fontSize: 11, color: CA.textTer, margin: "2px 0 0" }}>{n.time}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Page content */}
          <div style={{ padding: isMobile ? "20px 16px" : "28px 32px", maxWidth: 1200 }}>
            {renderPage()}
          </div>
        </div>

        {/* ── Mobile Bottom Nav ── */}
        {isMobile && (
          <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: CA.card, borderTop: `1px solid ${CA.border}`, display: "flex", justifyContent: "space-around", alignItems: "flex-start", paddingTop: 10, paddingBottom: "env(safe-area-inset-bottom, 12px)", zIndex: 100 }}>
            {NAV_ITEMS.map(item => (
              <div key={item.key} onClick={() => setPage(item.key)}
                style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, cursor: "pointer", padding: "0 12px", opacity: page === item.key ? 1 : 0.45, transition: "opacity 0.15s", minWidth: 44, minHeight: 44, justifyContent: "center" }}>
                {item.icon(page === item.key ? CA.purple : CA.textSec)}
                <span style={{ fontSize: 10, fontWeight: page === item.key ? 700 : 500, color: page === item.key ? CA.purple : CA.textSec }}>{item.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}


// ┌─────────────────────────────────────────────────────────────┐
// │  SECTION 4: SUPER ADMIN                                    │
// └─────────────────────────────────────────────────────────────┘

// ═══════════════════════════════════════════
//  RUSH SUPER ADMIN — Panel interno del equipo Rush
//  Desktop-first dashboard para gestión de plataforma
// ═══════════════════════════════════════════

const CSA = {
  purple: "#534AB7", purpleLight: "#EEEDFE", purpleMid: "#7F77DD",
  purpleDark: "#3C3489", purple100: "#CECBF6", purple200: "#AFA9EC",
  green: "#1D9E75", greenLight: "#E1F5EE", greenDark: "#0F6E56", green800: "#085041",
  amber: "#EF9F27", amberLight: "#FAEEDA", amberDark: "#854F0B", amber800: "#633806",
  red: "#E24B4A", redLight: "#FCEBEB", redDark: "#A32D2D", red800: "#791F1F",
  bg: "#F4F3F9", card: "#FFFFFF", text: "#1A1A1A", textSec: "#7A7A7A",
  textTer: "#ABABAB", border: "#EBEBEB", borderSec: "#D5D5D5",
};
const FONT_SA = "'Outfit', 'DM Sans', sans-serif";

// ── Sample Data ──
const genCode = () => String(Math.floor(100000 + Math.random() * 900000));

const INIT_REQUESTS = [
  { id: 1, name: "Hotel Devoto", owner: "Carlos Ruiz", email: "carlos@hoteldevoto.com", zone: "Villa Devoto, CABA", rooms: 5, date: "22 Mar 2026", status: "pending", code: null },
  { id: 2, name: "Paradise Suite", owner: "Laura Méndez", email: "laura@paradise.com", zone: "Flores, CABA", rooms: 7, date: "20 Mar 2026", status: "code_sent", code: "834721", sentDate: "Hace 2 días" },
  { id: 3, name: "Motel Blue", owner: "Diego Sosa", email: "diego@motelblue.com", zone: "Avellaneda, GBA", rooms: 4, date: "24 Mar 2026", status: "pending", code: null },
  { id: 4, name: "Suite Caballito", owner: "Ana Torres", email: "ana@suitecaballito.com", zone: "Caballito, CABA", rooms: 3, date: "26 Mar 2026", status: "pending", code: null },
  { id: 5, name: "Express Zone", owner: "Marcos Díaz", email: "marcos@expresszone.com", zone: "Quilmes, GBA", rooms: 6, date: "15 Mar 2026", status: "verified", code: "192847", sentDate: "Hace 8 días" },
];

const SA_ALBERGUES = [
  { id: 1, name: "Suite Palermo", zone: "Palermo", rooms: 6, plan: "premium", status: "active", since: "Jun 2025", reservations: 312, commission: 186000, rating: 4.3 },
  { id: 2, name: "Hotel Recoleta", zone: "Recoleta", rooms: 8, plan: "premium", status: "active", since: "Jul 2025", reservations: 287, commission: 164000, rating: 4.6 },
  { id: 3, name: "Luna Park Suite", zone: "Puerto Madero", rooms: 5, plan: "premium", status: "active", since: "Sep 2025", reservations: 245, commission: 142000, rating: 4.1 },
  { id: 4, name: "Cosmos Suite", zone: "Once", rooms: 4, plan: "basic", status: "active", since: "Ago 2025", reservations: 198, commission: 108000, rating: 3.9 },
  { id: 5, name: "Noche & Día", zone: "Belgrano", rooms: 6, plan: "premium", status: "active", since: "Oct 2025", reservations: 176, commission: 95000, rating: 4.4 },
  { id: 6, name: "Secreto Suite", zone: "San Telmo", rooms: 3, plan: "basic", status: "active", since: "Nov 2025", reservations: 154, commission: 78000, rating: 4.0 },
  { id: 7, name: "Motel Azul", zone: "Lanús", rooms: 3, plan: "basic", status: "suspended", since: "Oct 2025", reservations: 42, commission: 18000, rating: 2.8 },
  { id: 8, name: "Express Zone", zone: "Quilmes", rooms: 6, plan: "basic", status: "active", since: "Mar 2026", reservations: 12, commission: 5400, rating: 4.2 },
];

const MONTHLY_REV = [
  { month: "Abr", value: 420 }, { month: "May", value: 510 }, { month: "Jun", value: 680 },
  { month: "Jul", value: 780 }, { month: "Ago", value: 920 }, { month: "Sep", value: 870 },
  { month: "Oct", value: 1050 }, { month: "Nov", value: 1240 }, { month: "Dic", value: 1480 },
  { month: "Ene", value: 1720 }, { month: "Feb", value: 1950 }, { month: "Mar", value: 2400 },
];

// ── Icons ──
const Ic = {
  dashboard: (c) => <svg width="18" height="18" viewBox="0 0 24 24" fill={c}><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></svg>,
  requests: (c) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="8.5" cy="7" r="4" /><line x1="20" y1="8" x2="20" y2="14" /><line x1="23" y1="11" x2="17" y2="11" /></svg>,
  building: (c) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>,
  dollar: (c) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>,
  chart: (c) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2"><path d="M18 20V10" /><path d="M12 20V4" /><path d="M6 20v-6" /></svg>,
  settings: (c) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09" /></svg>,
  bell: (c = CSA.textSec) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>,
  shield: (c = CSA.greenDark) => <svg width="14" height="14" viewBox="0 0 24 24" fill={c}><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" /></svg>,
  star: (c = CSA.amber) => <svg width="13" height="13" viewBox="0 0 24 24" fill={c}><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>,
  up: () => <svg width="11" height="11" viewBox="0 0 24 24" fill={CSA.greenDark}><path d="M7 14l5-5 5 5z" /></svg>,
  down: () => <svg width="11" height="11" viewBox="0 0 24 24" fill={CSA.redDark}><path d="M7 10l5 5 5-5z" /></svg>,
  check: (c = CSA.greenDark) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>,
  copy: (c = CSA.textSec) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>,
  search: (c = CSA.textSec) => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.35-4.35" /></svg>,
  mail: (c = CSA.textSec) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2" /><path d="M22 4l-10 8L2 4" /></svg>,
  x: (c = CSA.red) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>,
};

const NAV = [
  { key: "dashboard", label: "Dashboard", icon: Ic.dashboard },
  { key: "requests", label: "Solicitudes", icon: Ic.requests },
  { key: "albergues", label: "Albergues", icon: Ic.building },
  { key: "finances", label: "Finanzas", icon: Ic.dollar },
  { key: "metrics", label: "Métricas", icon: Ic.chart },
];

// ── Shared ──
const SABadge = ({ type, children }) => {
  const styles = {
    pending: { bg: CSA.amberLight, color: CSA.amber800 },
    code_sent: { bg: CSA.purpleLight, color: CSA.purpleDark },
    verified: { bg: CSA.greenLight, color: CSA.green800 },
    rejected: { bg: CSA.redLight, color: CSA.red800 },
    active: { bg: CSA.greenLight, color: CSA.green800 },
    suspended: { bg: CSA.redLight, color: CSA.red800 },
    premium: { bg: CSA.purpleLight, color: CSA.purpleDark },
    basic: { bg: CSA.bg, color: CSA.textSec },
  };
  const s = styles[type] || styles.active;
  return <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 8, background: s.bg, color: s.color, fontWeight: 600, whiteSpace: "nowrap" }}>{children}</span>;
};

const Metric = ({ label, value, trend, trendVal, color = CSA.text }) => (
  <div style={{ background: CSA.card, borderRadius: 14, border: `1px solid ${CSA.border}`, padding: "18px 20px" }}>
    <p style={{ fontSize: 13, color: CSA.textSec, margin: 0, fontWeight: 500 }}>{label}</p>
    <p style={{ fontSize: 28, fontWeight: 700, color, margin: "6px 0 4px", fontFamily: FONT_SA }}>{value}</p>
    {trend && <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
      {trend === "up" ? Ic.up() : Ic.down()}
      <span style={{ fontSize: 12, color: trend === "up" ? CSA.greenDark : CSA.redDark, fontWeight: 600 }}>{trendVal}</span>
    </div>}
  </div>
);

const BarChart = ({ data, height = 160 }) => {
  const max = Math.max(...data.map(d => d.value));
  return (
    <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", height, gap: 4 }}>
      {data.map((d, i) => {
        const h = Math.round((d.value / max) * (height - 30));
        const intensity = d.value / max;
        const bg = intensity > 0.85 ? CSA.purple : intensity > 0.6 ? CSA.purpleMid : intensity > 0.4 ? CSA.purple200 : CSA.purple100;
        return (
          <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, flex: 1, minWidth: 0 }}>
            <span style={{ fontSize: 10, fontWeight: 500, color: CSA.textSec }}>${d.value >= 1000 ? (d.value / 1000).toFixed(1) + "M" : d.value + "k"}</span>
            <div style={{ width: "100%", maxWidth: 36, height: h, borderRadius: "4px 4px 0 0", background: bg, transition: "height 0.4s ease" }} />
            <span style={{ fontSize: 10, color: i === data.length - 1 ? CSA.purple : CSA.textSec, fontWeight: i === data.length - 1 ? 600 : 400 }}>{d.month}</span>
          </div>
        );
      })}
    </div>
  );
};

// ── DASHBOARD VIEW ──
const SADashboardView = ({ requests, albergues }) => {
  const pendingCount = requests.filter(r => r.status === "pending").length;
  const activeCount = albergues.filter(a => a.status === "active").length;
  const totalReservations = albergues.reduce((a, b) => a + b.reservations, 0);
  const totalCommission = albergues.reduce((a, b) => a + b.commission, 0);

  return (
    <div style={{ animation: "saFadeUp 0.4s ease" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 24 }}>
        <Metric label="Ingresos del mes" value={`${(totalCommission / 1000000).toFixed(1)}M`} trend="up" trendVal="+24%" color={CSA.purple} />
        <Metric label="Albergues activos" value={activeCount} trend="up" trendVal={`+6 este mes`} />
        <Metric label="Reservas totales" value={totalReservations.toLocaleString()} trend="up" trendVal="+31%" />
        <Metric label="Solicitudes pendientes" value={pendingCount} color={pendingCount > 0 ? CSA.amber : CSA.text} />
      </div>

      <div style={{ background: CSA.card, borderRadius: 14, border: `1px solid ${CSA.border}`, padding: "20px 24px", marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <p style={{ fontSize: 16, fontWeight: 700, margin: 0, fontFamily: FONT_SA }}>Comisiones mensuales (15%)</p>
        </div>
        <BarChart data={MONTHLY_REV} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <div style={{ background: CSA.card, borderRadius: 14, border: `1px solid ${CSA.border}`, padding: "20px 24px" }}>
          <p style={{ fontSize: 16, fontWeight: 700, margin: "0 0 14px", fontFamily: FONT_SA }}>Top albergues por comisión</p>
          {[...albergues].sort((a, b) => b.commission - a.commission).slice(0, 5).map((a, i) => (
            <div key={a.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: i < 4 ? `1px solid ${CSA.border}` : "none" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: CSA.purple, width: 20 }}>{i + 1}</span>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>{a.name}</p>
                  <p style={{ fontSize: 11, color: CSA.textSec, margin: 0 }}>{a.reservations} reservas</p>
                </div>
              </div>
              <span style={{ fontSize: 14, fontWeight: 700, color: CSA.purple }}>${Math.round(a.commission / 1000)}k</span>
            </div>
          ))}
        </div>

        <div style={{ background: CSA.card, borderRadius: 14, border: `1px solid ${CSA.border}`, padding: "20px 24px" }}>
          <p style={{ fontSize: 16, fontWeight: 700, margin: "0 0 14px", fontFamily: FONT_SA }}>Actividad reciente</p>
          {[
            { text: "Suite Palermo recibió 12 reservas hoy", time: "Hace 1h", color: CSA.greenDark },
            { text: "Hotel Devoto envió solicitud de registro", time: "Hace 3h", color: CSA.amber },
            { text: "Express Zone verificó su código correctamente", time: "Hace 5h", color: CSA.greenDark },
            { text: "Motel Azul fue suspendido por inactividad", time: "Hace 1 día", color: CSA.redDark },
            { text: "Nuevo usuario registrado #12.480", time: "Hace 1 día", color: CSA.purple },
          ].map((item, i) => (
            <div key={i} style={{ display: "flex", gap: 10, padding: "10px 0", borderBottom: i < 4 ? `1px solid ${CSA.border}` : "none" }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: item.color, marginTop: 5, flexShrink: 0 }} />
              <div>
                <p style={{ fontSize: 13, margin: 0 }}>{item.text}</p>
                <p style={{ fontSize: 11, color: CSA.textSec, margin: "2px 0 0" }}>{item.time}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ── REQUESTS VIEW ──
const RequestsView = ({ requests, setRequests }) => {
  const [filter, setFilter] = useState("all");
  const [copiedId, setCopiedId] = useState(null);

  const handleGenCode = (id) => {
    setRequests(prev => prev.map(r => r.id === id ? { ...r, status: "code_sent", code: genCode(), sentDate: "Ahora" } : r));
  };
  const handleReject = (id) => {
    setRequests(prev => prev.map(r => r.id === id ? { ...r, status: "rejected" } : r));
  };
  const handleVerify = (id) => {
    setRequests(prev => prev.map(r => r.id === id ? { ...r, status: "verified" } : r));
  };
  const handleCopy = (id, code) => {
    navigator.clipboard?.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filtered = requests.filter(r => {
    if (filter === "pending") return r.status === "pending";
    if (filter === "code_sent") return r.status === "code_sent";
    if (filter === "verified") return r.status === "verified";
    if (filter === "rejected") return r.status === "rejected";
    return true;
  });

  const statusLabels = { pending: "Pendiente", code_sent: "Código enviado", verified: "Verificado", rejected: "Rechazado" };

  return (
    <div style={{ animation: "saFadeUp 0.4s ease" }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        {[{ k: "all", l: "Todas" }, { k: "pending", l: "Pendientes" }, { k: "code_sent", l: "Código enviado" }, { k: "verified", l: "Verificados" }].map(f => (
          <span key={f.k} onClick={() => setFilter(f.k)}
            style={{
              padding: "8px 18px", borderRadius: 12, fontSize: 13, fontWeight: 600, cursor: "pointer",
              background: filter === f.k ? CSA.purple : CSA.card, color: filter === f.k ? "#fff" : CSA.textSec,
              border: filter === f.k ? "none" : `1px solid ${CSA.border}`, transition: "all 0.15s"
            }}>
            {f.l}
          </span>
        ))}
      </div>

      <div style={{ display: "grid", gap: 12 }}>
        {filtered.map((r, i) => (
          <div key={r.id} style={{ background: CSA.card, borderRadius: 14, border: `1px solid ${CSA.border}`, padding: "20px 24px", animation: `saFadeUp 0.3s ease ${i * 0.05}s both` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
              <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: CSA.purpleLight, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontSize: 16, fontWeight: 700, color: CSA.purple }}>{r.name.charAt(0)}</span>
                </div>
                <div>
                  <p style={{ fontSize: 16, fontWeight: 700, margin: 0, fontFamily: FONT_SA }}>{r.name}</p>
                  <p style={{ fontSize: 12, color: CSA.textSec, margin: "2px 0 0" }}>{r.zone} · {r.rooms} habitaciones</p>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <SABadge type={r.status}>{statusLabels[r.status]}</SABadge>
                <span style={{ fontSize: 11, color: CSA.textTer }}>{r.date}</span>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 13, color: CSA.textSec, marginBottom: 14 }}>
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}>{Ic.mail()} {r.email}</span>
              <span>Titular: {r.owner}</span>
            </div>

            {r.status === "pending" && (
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => handleGenCode(r.id)}
                  style={{ padding: "8px 20px", borderRadius: 10, background: CSA.purple, color: "#fff", border: "none", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: FONT_SA }}>
                  Generar código
                </button>
                <button onClick={() => handleReject(r.id)}
                  style={{ padding: "8px 20px", borderRadius: 10, background: "transparent", color: CSA.red, border: `1.5px solid ${CSA.red}`, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
                  Rechazar
                </button>
              </div>
            )}

            {r.status === "code_sent" && (
              <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, background: CSA.bg, padding: "8px 16px", borderRadius: 10 }}>
                  {Ic.shield()}
                  <span style={{ fontSize: 20, fontWeight: 700, letterSpacing: 5, fontFamily: FONT_SA }}>{r.code}</span>
                  <div style={{ cursor: "pointer", padding: 4 }} onClick={() => handleCopy(r.id, r.code)}>
                    {copiedId === r.id ? Ic.check(CSA.greenDark) : Ic.copy(CSA.purple)}
                  </div>
                </div>
                <span style={{ fontSize: 12, color: CSA.textSec }}>{r.sentDate}</span>
                <button onClick={() => handleVerify(r.id)}
                  style={{ padding: "8px 16px", borderRadius: 10, background: CSA.greenLight, color: CSA.greenDark, border: "none", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", marginLeft: "auto" }}>
                  Marcar como verificado
                </button>
              </div>
            )}

            {r.status === "verified" && (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {Ic.check(CSA.greenDark)}
                <span style={{ fontSize: 13, color: CSA.greenDark, fontWeight: 600 }}>Albergue verificado y activo en la plataforma</span>
              </div>
            )}

            {r.status === "rejected" && (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {Ic.x()}
                <span style={{ fontSize: 13, color: CSA.redDark, fontWeight: 600 }}>Solicitud rechazada</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// ── ALBERGUES VIEW ──
const AlberguesView = ({ albergues }) => {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filtered = albergues.filter(a => {
    const matchSearch = a.name.toLowerCase().includes(search.toLowerCase()) || a.zone.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || a.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div style={{ animation: "saFadeUp 0.4s ease" }}>
      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ position: "relative", flex: "1 1 250px" }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar albergue o zona..."
            style={{ width: "100%", padding: "10px 16px 10px 38px", borderRadius: 12, border: `1.5px solid ${CSA.border}`, fontSize: 14, fontFamily: "'DM Sans', sans-serif", outline: "none", background: CSA.card, color: CSA.text }} />
          <div style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }}>{Ic.search()}</div>
        </div>
        {["all", "active", "suspended"].map(s => (
          <span key={s} onClick={() => setStatusFilter(s)}
            style={{
              padding: "8px 16px", borderRadius: 12, fontSize: 13, fontWeight: 600, cursor: "pointer",
              background: statusFilter === s ? CSA.purple : CSA.card, color: statusFilter === s ? "#fff" : CSA.textSec,
              border: statusFilter === s ? "none" : `1px solid ${CSA.border}`
            }}>
            {s === "all" ? "Todos" : s === "active" ? "Activos" : "Suspendidos"}
          </span>
        ))}
      </div>

      <div style={{ background: CSA.card, borderRadius: 14, border: `1px solid ${CSA.border}`, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${CSA.border}` }}>
                {["Albergue", "Zona", "Hab.", "Plan", "Estado", "Reservas", "Comisión", "Rating", "Desde"].map(h => (
                  <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontWeight: 600, color: CSA.textSec, fontSize: 12, whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(a => (
                <tr key={a.id} style={{ borderBottom: `1px solid ${CSA.border}` }}
                  onMouseEnter={e => e.currentTarget.style.background = CSA.bg}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                  <td style={{ padding: "12px 16px", fontWeight: 600 }}>{a.name}</td>
                  <td style={{ padding: "12px 16px", color: CSA.textSec }}>{a.zone}</td>
                  <td style={{ padding: "12px 16px" }}>{a.rooms}</td>
                  <td style={{ padding: "12px 16px" }}><SABadge type={a.plan}>{a.plan === "premium" ? "Premium" : "Básico"}</SABadge></td>
                  <td style={{ padding: "12px 16px" }}><SABadge type={a.status}>{a.status === "active" ? "Activo" : "Suspendido"}</SABadge></td>
                  <td style={{ padding: "12px 16px" }}>{a.reservations}</td>
                  <td style={{ padding: "12px 16px", fontWeight: 600, color: CSA.purple }}>${Math.round(a.commission / 1000)}k</td>
                  <td style={{ padding: "12px 16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 3 }}>{Ic.star()} {a.rating}</div>
                  </td>
                  <td style={{ padding: "12px 16px", color: CSA.textSec }}>{a.since}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <p style={{ fontSize: 12, color: CSA.textSec, marginTop: 10 }}>{filtered.length} albergues encontrados</p>
    </div>
  );
};

// ── FINANCES VIEW ──
const FinancesView = ({ albergues }) => {
  const totalCommission = albergues.reduce((a, b) => a + b.commission, 0);
  const totalReservations = albergues.reduce((a, b) => a + b.reservations, 0);
  const avgTicket = Math.round(totalCommission / totalReservations);
  const premiumCount = albergues.filter(a => a.plan === "premium").length;

  return (
    <div style={{ animation: "saFadeUp 0.4s ease" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 24 }}>
        <Metric label="Comisiones totales" value={`${(totalCommission / 1000).toLocaleString()}k`} trend="up" trendVal="+24%" color={CSA.purple} />
        <Metric label="Reservas procesadas" value={totalReservations.toLocaleString()} trend="up" trendVal="+31%" />
        <Metric label="Ticket promedio" value={`${avgTicket.toLocaleString()}`} trend="up" trendVal="+8%" />
        <Metric label="Suscripciones premium" value={premiumCount} trend="up" trendVal="+2" color={CSA.purple} />
      </div>

      <div style={{ background: CSA.card, borderRadius: 14, border: `1px solid ${CSA.border}`, padding: "20px 24px", marginBottom: 20 }}>
        <p style={{ fontSize: 16, fontWeight: 700, margin: "0 0 16px", fontFamily: FONT_SA }}>Evolución de comisiones (12 meses)</p>
        <BarChart data={MONTHLY_REV} height={180} />
      </div>

      <div style={{ background: CSA.card, borderRadius: 14, border: `1px solid ${CSA.border}`, padding: "20px 24px" }}>
        <p style={{ fontSize: 16, fontWeight: 700, margin: "0 0 14px", fontFamily: FONT_SA }}>Desglose por albergue</p>
        {[...albergues].filter(a => a.status === "active").sort((a, b) => b.commission - a.commission).map((a, i) => (
          <div key={a.id} style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 600 }}>{a.name}</span>
                <SABadge type={a.plan}>{a.plan === "premium" ? "Premium" : "Básico"}</SABadge>
              </div>
              <span style={{ fontSize: 14, fontWeight: 700, color: CSA.purple }}>${Math.round(a.commission / 1000)}k</span>
            </div>
            <div style={{ height: 8, borderRadius: 4, background: CSA.bg, overflow: "hidden" }}>
              <div style={{
                height: "100%", width: `${Math.round((a.commission / albergues[0].commission) * 100)}%`, borderRadius: 4,
                background: i === 0 ? CSA.purple : i < 3 ? CSA.purpleMid : CSA.purple200, transition: "width 0.5s ease"
              }} />
            </div>
            <p style={{ fontSize: 11, color: CSA.textSec, margin: "3px 0 0" }}>{a.reservations} reservas · {a.zone}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

// ── METRICS VIEW ──
const SAMetricsView = ({ albergues, requests }) => {
  const [apiMetrics, setApiMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("rush_token");
    if (!token) { setLoading(false); return; }
    api.get("/metrics/superadmin", token)
      .then(data => { setApiMetrics(data.metrics); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  // Fallback a datos locales si la API no responde
  const totalUsers = apiMetrics?.totalUsers ?? 12480;
  const totalReservations = apiMetrics?.totalReservations ?? albergues.reduce((a, b) => a + b.reservations, 0);
  const totalAlbergues = apiMetrics?.totalAlbergues ?? albergues.filter(a => a.status === "active").length;
  const conversionRate = totalUsers > 0 ? Math.round((totalReservations / totalUsers) * 100) : 0;
  const avgRating = (albergues.filter(a => a.status === "active").reduce((a, b) => a + b.rating, 0) / (albergues.filter(a => a.status === "active").length || 1)).toFixed(1);
  const verifiedPct = requests.length > 0 ? Math.round((requests.filter(r => r.status === "verified").length / requests.length) * 100) : 0;

  const zoneData = apiMetrics?.zoneDistribution?.length > 0
    ? apiMetrics.zoneDistribution
    : Object.entries(
        albergues.filter(a => a.status === "active").reduce((acc, a) => { acc[a.zone] = (acc[a.zone] || 0) + 1; return acc; }, {})
      ).map(([zone, count]) => ({ zone, count }));
  const maxZoneCount = Math.max(...zoneData.map(z => z.count), 1);

  return (
    <div style={{ animation: "saFadeUp 0.4s ease" }}>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
        {!loading && apiMetrics && (
          <span style={{ fontSize: 11, color: CSA.green, fontWeight: 600, padding: "4px 10px", background: CSA.greenLight, borderRadius: 8 }}>● Datos en vivo</span>
        )}
        {loading && (
          <span style={{ fontSize: 11, color: CSA.textSec, padding: "4px 10px" }}>Cargando métricas...</span>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 24 }}>
        <Metric label="Usuarios registrados" value={totalUsers.toLocaleString()} trend="up" trendVal={apiMetrics ? "desde DB" : "+1.200 este mes"} />
        <Metric label="Reservas totales" value={totalReservations.toLocaleString()} trend="up" trendVal={apiMetrics ? "desde DB" : "+18%"} color={CSA.purple} />
        <Metric label="Albergues activos" value={String(totalAlbergues)} trend="up" trendVal={apiMetrics ? "verificados" : "+6 este mes"} color={CSA.green} />
        {apiMetrics?.pendingRequests !== undefined
          ? <Metric label="Solicitudes pendientes" value={String(apiMetrics.pendingRequests)} trend={apiMetrics.pendingRequests > 0 ? "down" : "up"} trendVal={apiMetrics.pendingRequests > 0 ? "requieren atención" : "al día"} color={CSA.amber} />
          : <Metric label="Tasa verificación" value={`${verifiedPct}%`} color={CSA.purple} />
        }
      </div>

      {apiMetrics && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 20 }}>
          <Metric label="Ingresos del mes" value={`$${Math.round((apiMetrics.monthRevenue || 0) / 1000)}k`} trend="up" trendVal="total plataforma" color={CSA.purple} />
          <Metric label="Comisión Rush (15%)" value={`$${Math.round((apiMetrics.monthCommission || 0) / 1000)}k`} trend="up" trendVal="este mes" color={CSA.green} />
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 20 }}>
        <div style={{ background: CSA.card, borderRadius: 14, border: `1px solid ${CSA.border}`, padding: "20px 24px" }}>
          <p style={{ fontSize: 16, fontWeight: 700, margin: "0 0 14px", fontFamily: FONT_SA }}>
            Distribución por zona {apiMetrics ? <span style={{ fontSize: 11, color: CSA.green, fontWeight: 600 }}>● vivo</span> : ""}
          </p>
          {zoneData.sort((a, b) => b.count - a.count).map(({ zone, count }) => (
            <div key={zone} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: `1px solid ${CSA.border}` }}>
              <span style={{ fontSize: 14 }}>{zone}</span>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 60, height: 6, borderRadius: 3, background: CSA.bg, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${(count / maxZoneCount) * 100}%`, borderRadius: 3, background: CSA.purple }} />
                </div>
                <span style={{ fontSize: 13, fontWeight: 600, minWidth: 16, textAlign: "right" }}>{count}</span>
              </div>
            </div>
          ))}
        </div>

        <div style={{ background: CSA.card, borderRadius: 14, border: `1px solid ${CSA.border}`, padding: "20px 24px" }}>
          <p style={{ fontSize: 16, fontWeight: 700, margin: "0 0 14px", fontFamily: FONT_SA }}>Horarios pico (plataforma)</p>
          {[
            { range: "14:00 - 17:00", pct: 35, label: "Tarde" },
            { range: "22:00 - 01:00", pct: 42, label: "Noche" },
            { range: "10:00 - 13:00", pct: 15, label: "Mañana" },
            { range: "01:00 - 06:00", pct: 8, label: "Madrugada" },
          ].map(h => (
            <div key={h.range} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: `1px solid ${CSA.border}` }}>
              <span style={{ fontSize: 13, color: CSA.textSec, width: 60 }}>{h.label}</span>
              <div style={{ flex: 1, height: 8, borderRadius: 4, background: CSA.bg, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${h.pct}%`, borderRadius: 4, background: h.pct > 30 ? CSA.purple : CSA.purple200 }} />
              </div>
              <span style={{ fontSize: 13, fontWeight: 600, width: 35, textAlign: "right" }}>{h.pct}%</span>
              <span style={{ fontSize: 11, color: CSA.textSec, width: 90 }}>{h.range}</span>
            </div>
          ))}
          <div style={{ background: CSA.purpleLight, borderRadius: 10, padding: "12px 14px", marginTop: 14 }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: CSA.purpleDark }}>Insight</p>
            <p style={{ margin: "2px 0 0", fontSize: 12, color: CSA.purple }}>El 77% de las reservas ocurren entre las 14h y la 01h. Oportunidad de precio dinámico en esas franjas.</p>
          </div>
        </div>
      </div>

      {apiMetrics?.topAlbergues?.length > 0 && (
        <div style={{ background: CSA.card, borderRadius: 14, border: `1px solid ${CSA.border}`, padding: "20px 24px", marginBottom: 20 }}>
          <p style={{ fontSize: 16, fontWeight: 700, margin: "0 0 14px", fontFamily: FONT_SA }}>Top albergues por actividad</p>
          {apiMetrics.topAlbergues.map((a, i) => (
            <div key={a.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: i < apiMetrics.topAlbergues.length - 1 ? `1px solid ${CSA.border}` : "none" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: CSA.textSec, width: 18 }}>#{i + 1}</span>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>{a.name}</p>
                  <p style={{ fontSize: 12, color: CSA.textSec, margin: 0 }}>{a.zone}</p>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: CSA.amber }}>★ {a.rating}</span>
                <span style={{ fontSize: 12, color: CSA.textSec, marginLeft: 8 }}>{a.review_count} reseñas</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <Metric label="Tasa de conversión" value={`${conversionRate}%`} trend="up" trendVal="+3%" color={CSA.green} />
        <Metric label="Rating promedio" value={avgRating} color={CSA.amber} />
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════
//  MAIN APP
// ═══════════════════════════════════════════
function RushSuperAdminApp({ onLogout }) {
  const [page, setPage] = useState("dashboard");
  const [requests, setRequests] = useState(INIT_REQUESTS);
  const [showSANotifs, setShowSANotifs] = useState(false);
  const [saNotifs] = useState([
    { id: 1, text: "Nueva solicitud: Hotel Devoto", time: "Hace 10 min", read: false },
    { id: 2, text: "Paradise Suite ingres\u00f3 c\u00f3digo de verificaci\u00f3n", time: "Hace 1 hora", read: false },
    { id: 3, text: "Express Zone verificado exitosamente", time: "Hace 3 horas", read: true },
    { id: 4, text: "Nuevo albergue registrado en Quilmes", time: "Ayer", read: true },
  ]);

  const pageTitle = { dashboard: "Dashboard", requests: "Solicitudes", albergues: "Albergues", finances: "Finanzas", metrics: "Métricas" }[page];
  const pendingCount = requests.filter(r => r.status === "pending").length;

  const renderPage = () => {
    switch (page) {
      case "dashboard": return <SADashboardView requests={requests} albergues={SA_ALBERGUES} />;
      case "requests": return <RequestsView requests={requests} setRequests={setRequests} />;
      case "albergues": return <AlberguesView albergues={SA_ALBERGUES} />;
      case "finances": return <FinancesView albergues={SA_ALBERGUES} />;
      case "metrics": return <SAMetricsView albergues={SA_ALBERGUES} requests={requests} />;
      default: return <SADashboardView requests={requests} albergues={SA_ALBERGUES} />;
    }
  };

  return (
    <>
      <style>{`
        * { margin: 0; padding: 0; box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
        body { font-family: 'DM Sans', 'Helvetica Neue', sans-serif; background: ${CSA.bg}; -webkit-font-smoothing: antialiased; }
        @keyframes saFadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        input:focus { border-color: ${CSA.purple} !important; }
        ::-webkit-scrollbar { width: 6px; } ::-webkit-scrollbar-track { background: transparent; } ::-webkit-scrollbar-thumb { background: ${CSA.borderSec}; border-radius: 3px; }
      `}</style>

      <div style={{ display: "flex", minHeight: "100dvh", fontFamily: "'DM Sans', sans-serif", color: CSA.text, background: CSA.bg }}>
        {/* Sidebar */}
        <div style={{ width: 230, background: CSA.card, borderRight: `1px solid ${CSA.border}`, padding: "20px 0", display: "flex", flexDirection: "column", position: "fixed", top: 0, left: 0, bottom: 0, zIndex: 100 }}>
          <div style={{ padding: "0 20px 24px", display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: CSA.purple, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontSize: 15, fontWeight: 800, color: "#fff", fontFamily: FONT_SA }}>R</span>
            </div>
            <div>
              <p style={{ fontSize: 17, fontWeight: 800, fontFamily: FONT_SA, margin: 0 }}>Rush</p>
              <p style={{ fontSize: 10, color: CSA.textSec, margin: 0 }}>Super admin</p>
            </div>
          </div>
          <nav style={{ flex: 1 }}>
            {NAV.map(item => (
              <div key={item.key} onClick={() => setPage(item.key)}
                style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "11px 20px", cursor: "pointer", transition: "all 0.15s", position: "relative",
                  background: page === item.key ? CSA.purpleLight : "transparent",
                  borderRight: page === item.key ? `3px solid ${CSA.purple}` : "3px solid transparent"
                }}
                onMouseEnter={e => { if (page !== item.key) e.currentTarget.style.background = CSA.bg; }}
                onMouseLeave={e => { if (page !== item.key) e.currentTarget.style.background = "transparent"; }}>
                {item.icon(page === item.key ? CSA.purple : CSA.textSec)}
                <span style={{ fontSize: 13, fontWeight: page === item.key ? 700 : 500, color: page === item.key ? CSA.purple : CSA.textSec }}>{item.label}</span>
                {item.key === "requests" && pendingCount > 0 && (
                  <span style={{ marginLeft: "auto", fontSize: 10, padding: "2px 7px", borderRadius: 8, background: CSA.amber, color: "#fff", fontWeight: 700 }}>{pendingCount}</span>
                )}
              </div>
            ))}
          </nav>
          <div style={{ padding: "14px 20px", borderTop: `1px solid ${CSA.border}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 30, height: 30, borderRadius: "50%", background: CSA.purpleLight, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: CSA.purple }}>A</span>
              </div>
              <div>
                <p style={{ fontSize: 12, fontWeight: 600, margin: 0 }}>Admin Rush</p>
                <p style={{ fontSize: 10, color: CSA.textSec, margin: 0, cursor: "pointer" }} onClick={onLogout}>Cerrar sesión</p>
              </div>
            </div>
          </div>
        </div>

        {/* Main */}
        <div style={{ flex: 1, marginLeft: 230 }}>
          <div style={{ padding: "18px 28px", display: "flex", justifyContent: "space-between", alignItems: "center", background: CSA.card, borderBottom: `1px solid ${CSA.border}`, position: "sticky", top: 0, zIndex: 50 }}>
            <h1 style={{ fontSize: 22, fontWeight: 800, fontFamily: FONT_SA, margin: 0 }}>{pageTitle}</h1>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <span style={{ fontSize: 13, padding: "6px 14px", borderRadius: 10, background: CSA.purpleLight, color: CSA.purpleDark, fontWeight: 600 }}>Marzo 2026</span>
              <div style={{ position: "relative" }}>
                <div style={{ cursor: "pointer" }} onClick={() => setShowSANotifs(!showSANotifs)}>
                  {Ic.bell()}
                  {pendingCount > 0 && <div style={{ position: "absolute", top: -3, right: -3, width: 8, height: 8, borderRadius: "50%", background: CSA.red, border: `2px solid ${CSA.card}` }} />}
                </div>
                {showSANotifs && (
                  <div style={{ position: "absolute", top: 30, right: 0, width: 320, background: CSA.card, borderRadius: 14, border: `1px solid ${CSA.border}`, boxShadow: "0 8px 30px rgba(0,0,0,0.12)", zIndex: 200, overflow: "hidden" }}>
                    <div style={{ padding: "12px 16px", borderBottom: `1px solid ${CSA.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <p style={{ fontSize: 14, fontWeight: 700, margin: 0, fontFamily: FONT_SA }}>Notificaciones</p>
                      <span style={{ fontSize: 11, color: CSA.purple, fontWeight: 600, cursor: "pointer" }} onClick={() => setShowSANotifs(false)}>Cerrar</span>
                    </div>
                    {saNotifs.map(n => (
                      <div key={n.id} style={{ padding: "10px 16px", borderBottom: `1px solid ${CSA.border}`, background: n.read ? "transparent" : CSA.purpleLight }}>
                        <p style={{ fontSize: 13, margin: 0, fontWeight: n.read ? 400 : 600 }}>{n.text}</p>
                        <p style={{ fontSize: 11, color: CSA.textTer, margin: "2px 0 0" }}>{n.time}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
          <div style={{ padding: "24px 28px", maxWidth: 1200 }}>
            {renderPage()}
          </div>
        </div>
      </div>
    </>
  );
}


// ┌─────────────────────────────────────────────────────────────┐
// │  SECTION 3: PUNTO DE ENTRADA UNIFICADO                     │
// └─────────────────────────────────────────────────────────────┘

const UC = {
  purple: "#534AB7", purpleLight: "#EEEDFE", purpleMid: "#7F77DD",
  purpleDark: "#3C3489", green: "#1D9E75", greenLight: "#E1F5EE",
  greenDark: "#0F6E56", amber: "#EF9F27", bg: "#FAFAFA", card: "#FFFFFF",
  text: "#1A1A1A", textSec: "#7A7A7A", textTer: "#ABABAB",
  border: "#EBEBEB", borderSec: "#D5D5D5",
};
const UFONT = "'Outfit', 'DM Sans', sans-serif";

const UBtn = ({ children, onClick, outline }) => (
  <button onClick={onClick}
    style={{
      width: "100%", padding: "15px 24px", borderRadius: 16, fontSize: 17, fontWeight: 700,
      fontFamily: UFONT, cursor: "pointer", transition: "all 0.15s", textAlign: "center",
      background: outline ? "transparent" : UC.purple,
      color: outline ? UC.purple : "#fff",
      border: outline ? `2px solid ${UC.purple}` : "none",
    }}>
    {children}
  </button>
);

const UInputField = ({ label, icon, placeholder, value, onChange, type = "text" }) => (
  <div style={{ marginBottom: 16 }}>
    <label style={{ fontSize: 13, fontWeight: 600, color: UC.textSec, display: "block", marginBottom: 6 }}>{label}</label>
    <div style={{ position: "relative" }}>
      <input type={type} placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)}
        style={{
          width: "100%", padding: "13px 16px", paddingLeft: icon ? 44 : 16,
          border: `1.5px solid ${UC.border}`, borderRadius: 14, fontSize: 15, fontFamily: "'DM Sans', sans-serif",
          background: UC.card, color: UC.text, outline: "none", boxSizing: "border-box"
        }} />
      {icon && <div style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)" }}>{icon}</div>}
    </div>
  </div>
);

const UMailIcon = <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7A7A7A" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2" /><path d="M22 4l-10 8L2 4" /></svg>;
const ULockIcon = <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7A7A7A" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>;
const UBackArrow = <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1A1A1A" strokeWidth="2"><path d="M15 18l-6-6 6-6" /></svg>;
const UShieldIcon = <svg width="16" height="16" viewBox="0 0 24 24" fill="#0F6E56"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" /></svg>;
const UClockIcon = <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0F6E56" strokeWidth="2"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" /></svg>;
const UStarIcon = <svg width="16" height="16" viewBox="0 0 24 24" fill="#0F6E56"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>;
const UCheckIcon = <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0F6E56" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>;

const MainWelcome = ({ onRegister, onLogin, onAdmin }) => (
  <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", background: UC.card, padding: "24px 28px", fontFamily: "'DM Sans', sans-serif" }}>
    <div style={{ width: "100%", maxWidth: 480, margin: "0 auto", textAlign: "center", animation: "rushEntry 0.5s ease" }}>
      <div style={{ width: 88, height: 88, borderRadius: 24, background: UC.purple, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px" }}>
        <span style={{ fontSize: 38, fontWeight: 800, color: "#fff", fontFamily: UFONT }}>R</span>
      </div>
      <h1 style={{ fontSize: 30, fontWeight: 800, fontFamily: UFONT, margin: "0 0 10px" }}>Bienvenido a Rush</h1>
      <p style={{ fontSize: 15, color: UC.textSec, margin: "0 0 28px", lineHeight: 1.6, maxWidth: 300, marginLeft: "auto", marginRight: "auto" }}>
        {"Encontr\u00e1, compar\u00e1 y reserv\u00e1 albergues cerca tuyo en menos de 60 segundos."}
      </p>
      <div style={{ display: "flex", gap: 24, justifyContent: "center", marginBottom: 44 }}>
        {[{ icon: UShieldIcon, label: "An\u00f3nimo" }, { icon: UClockIcon, label: "En vivo" }, { icon: UStarIcon, label: "Validado" }].map(({ icon, label }, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 5 }}>{icon}<span style={{ fontSize: 14, fontWeight: 600, color: UC.greenDark }}>{label}</span></div>
        ))}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 24 }}>
        <UBtn onClick={onRegister}>Crear cuenta</UBtn>
        <UBtn outline onClick={onLogin}>Ya tengo cuenta</UBtn>
      </div>
      <div onClick={onAdmin} style={{ display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer", marginTop: 8, padding: "8px 16px", borderRadius: 10, transition: "all 0.15s" }}
        onMouseEnter={e => e.currentTarget.style.background = UC.purpleLight} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={UC.purple} strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
        <span style={{ fontSize: 13, fontWeight: 600, color: UC.purple }}>Tengo un albergue</span>
      </div>
    </div>
  </div>
);

const UnifiedAdminWelcome = ({ onBack, onRegister, onLogin }) => (
  <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", background: UC.bg, padding: "24px 28px", fontFamily: "'DM Sans', sans-serif" }}>
    <div style={{ width: "100%", maxWidth: 480, margin: "0 auto", textAlign: "center", animation: "rushEntry 0.4s ease" }}>
      <div style={{ width: 80, height: 80, borderRadius: 22, background: UC.purple, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px" }}>
        <span style={{ fontSize: 34, fontWeight: 800, color: "#fff", fontFamily: UFONT }}>R</span>
      </div>
      <h1 style={{ fontSize: 28, fontWeight: 800, fontFamily: UFONT, margin: "0 0 10px" }}>Rush para negocios</h1>
      <p style={{ fontSize: 15, color: UC.textSec, margin: "0 0 28px", lineHeight: 1.6 }}>Digitaliz\u00e1 tu albergue. M\u00e1s clientes, m\u00e1s ocupaci\u00f3n, menos fricci\u00f3n.</p>
      <div style={{ display: "flex", gap: 10, marginBottom: 32 }}>
        {["Reservas online", "Gesti\u00f3n simple", "M\u00e1s ingresos"].map((t, i) => (
          <div key={i} style={{ flex: 1, background: UC.card, borderRadius: 14, padding: "16px 10px", border: `1px solid ${UC.border}` }}>
            <div style={{ marginBottom: 8 }}>{UCheckIcon}</div>
            <span style={{ fontSize: 13, fontWeight: 600, color: UC.text }}>{t}</span>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <UBtn onClick={onRegister}>Registrar mi albergue</UBtn>
        <UBtn outline onClick={onLogin}>Ya tengo cuenta</UBtn>
      </div>
      <p style={{ fontSize: 13, color: UC.purple, fontWeight: 600, cursor: "pointer", marginTop: 20 }} onClick={onBack}>Volver a elegir rol</p>
    </div>
  </div>
);

const UnifiedLoginScreen = ({ onBack, onLogin, role }) => {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotError, setForgotError] = useState("");
  const isAdmin = role === "admin";
  const subtitle = isAdmin ? "Ingres\u00e1 con tu cuenta para gestionar tu albergue" : "Ingres\u00e1 con tu cuenta para encontrar y reservar";

  const handleLogin = async () => {
    if (!email || !pass) { setError("Complet\u00e1 email y contrase\u00f1a"); return; }
    setLoading(true); setError("");
    try {
      const data = await api.post("/auth/login", { email, password: pass });
      localStorage.setItem("rush_token", data.token);
      localStorage.setItem("rush_user", JSON.stringify(data.user));
      onLogin(role, data.user);
    } catch (err) {
      setError(err.message || "Error al iniciar sesi\u00f3n");
    } finally { setLoading(false); }
  };

  const handleForgotSubmit = () => {
    if (!forgotEmail) { setForgotError("Ingres\u00e1 tu email"); return; }
    if (!forgotEmail.includes("@")) { setForgotError("Email inv\u00e1lido"); return; }
    setForgotError("");
    setForgotSent(true);
  };

  // Forgot password - sent confirmation
  if (showForgot && forgotSent) return (
    <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", background: UC.bg, padding: "24px 28px", fontFamily: "'DM Sans', sans-serif" }}>
      <div style={{ width: "100%", maxWidth: 480, margin: "0 auto", animation: "rushEntry 0.4s ease" }}>
        <div style={{ cursor: "pointer", marginBottom: 28 }} onClick={() => { setShowForgot(false); setForgotSent(false); setForgotEmail(""); }}>{UBackArrow}</div>
        <div style={{ textAlign: "center", padding: "20px 0" }}>
          <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#E1F5EE", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#0F6E56" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 700, fontFamily: UFONT, marginBottom: 8 }}>{"Email enviado"}</h2>
          <p style={{ fontSize: 14, color: UC.textSec, lineHeight: 1.6, maxWidth: 280, margin: "0 auto 24px" }}>
            {"Si existe una cuenta con "}<strong>{forgotEmail}</strong>{", vas a recibir un link para restablecer tu contrase\u00f1a."}
          </p>
          <p style={{ fontSize: 13, color: UC.textTer, marginBottom: 24 }}>{"Revis\u00e1 tu bandeja de entrada y spam"}</p>
          <UBtn onClick={() => { setShowForgot(false); setForgotSent(false); setForgotEmail(""); }}>{"Volver al login"}</UBtn>
        </div>
      </div>
    </div>
  );

  // Forgot password - form
  if (showForgot) return (
    <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", background: UC.bg, padding: "24px 28px", fontFamily: "'DM Sans', sans-serif" }}>
      <div style={{ width: "100%", maxWidth: 480, margin: "0 auto", animation: "rushEntry 0.4s ease" }}>
        <div style={{ cursor: "pointer", marginBottom: 28 }} onClick={() => { setShowForgot(false); setForgotError(""); }}>{UBackArrow}</div>
        <h1 style={{ fontSize: 28, fontWeight: 800, fontFamily: UFONT, margin: "0 0 6px" }}>{"Recuperar contrase\u00f1a"}</h1>
        <p style={{ fontSize: 14, color: UC.textSec, margin: "0 0 28px", lineHeight: 1.6 }}>{"Ingres\u00e1 tu email y te enviaremos un link para restablecer tu contrase\u00f1a."}</p>
        <UInputField label="Email" icon={UMailIcon} placeholder="tu@email.com" value={forgotEmail} onChange={setForgotEmail} />
        {forgotError && <p style={{ fontSize: 13, color: "#E24B4A", marginBottom: 12, padding: "8px 12px", background: "#FCEBEB", borderRadius: 10 }}>{forgotError}</p>}
        <UBtn onClick={handleForgotSubmit}>{"Enviar link de recuperaci\u00f3n"}</UBtn>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 20, padding: "12px 14px", background: UC.purpleLight, borderRadius: 12 }}>
          {UShieldIcon}
          <p style={{ fontSize: 12, color: UC.purpleDark, lineHeight: 1.4 }}>{"Tu cuenta es an\u00f3nima. Si no record\u00e1s el email, cre\u00e1 una nueva cuenta."}</p>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", background: UC.bg, padding: "24px 28px", fontFamily: "'DM Sans', sans-serif" }}>
      <div style={{ width: "100%", maxWidth: 480, margin: "0 auto", animation: "rushEntry 0.4s ease" }}>
        <div style={{ cursor: "pointer", marginBottom: 28 }} onClick={onBack}>{UBackArrow}</div>
        <h1 style={{ fontSize: 28, fontWeight: 800, fontFamily: UFONT, margin: "0 0 6px" }}>{"Inici\u00e1 sesi\u00f3n"}</h1>
        <p style={{ fontSize: 14, color: UC.textSec, margin: "0 0 28px" }}>{subtitle}</p>
        <UInputField label="Email" icon={UMailIcon} placeholder="tu@email.com" value={email} onChange={setEmail} />
        <UInputField label={"Contrase\u00f1a"} icon={ULockIcon} placeholder={"Tu contrase\u00f1a"} value={pass} onChange={setPass} type="password" />
        <p style={{ fontSize: 13, color: UC.purple, fontWeight: 600, textAlign: "right", cursor: "pointer", margin: "-8px 0 24px" }} onClick={() => setShowForgot(true)}>{"\u00bfOlvidaste tu contrase\u00f1a?"}</p>
        {error && <p style={{ fontSize: 13, color: "#E24B4A", marginBottom: 12, padding: "8px 12px", background: "#FCEBEB", borderRadius: 10 }}>{error}</p>}
        <UBtn onClick={handleLogin}>{loading ? "Ingresando..." : "Iniciar sesi\u00f3n"}</UBtn>
        <div style={{ display: "flex", alignItems: "center", gap: 14, margin: "20px 0" }}>
          <div style={{ flex: 1, height: 1, background: UC.border }} />
          <span style={{ fontSize: 12, color: UC.textSec }}>{"o continu\u00e1 con"}</span>
          <div style={{ flex: 1, height: 1, background: UC.border }} />
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <div style={{ flex: 1, padding: "12px", borderRadius: 14, border: `1.5px solid ${UC.border}`, textAlign: "center", cursor: "pointer", fontSize: 14, fontWeight: 600, background: UC.card }}>Google</div>
          <div style={{ flex: 1, padding: "12px", borderRadius: 14, border: `1.5px solid ${UC.border}`, textAlign: "center", cursor: "pointer", fontSize: 14, fontWeight: 600, background: UC.card }}>Apple</div>
        </div>
      </div>
    </div>
  );
};

export default function RushUnified() {
  const [screen, setScreen] = useState("select");
  const [loginRole, setLoginRole] = useState("user");
  const [loggedInRole, setLoggedInRole] = useState(null);
  const go = (s) => { window.scrollTo(0, 0); setScreen(s); };
  return (
    <>
      <style>{`
        * { margin: 0; padding: 0; box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
        html, body, #root { width: 100%; min-height: 100dvh; }
        body { font-family: 'DM Sans', 'Helvetica Neue', sans-serif; background: #FAFAFA; -webkit-font-smoothing: antialiased; overflow-x: hidden; }
        button, input, textarea, select { -webkit-appearance: none; appearance: none; }
        input, textarea { font-size: 16px !important; }
        @keyframes rushEntry { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        input:focus { border-color: #534AB7 !important; }
        ::-webkit-scrollbar { display: none; }
      `}</style>
      {screen === "select" && <MainWelcome onRegister={() => go("userRegister")} onLogin={() => { setLoginRole("user"); go("login"); }} onAdmin={() => go("adminWelcome")} />}
      {screen === "adminWelcome" && <UnifiedAdminWelcome onBack={() => go("select")} onRegister={() => go("adminRegister")} onLogin={() => { setLoginRole("admin"); go("login"); }} />}
      {screen === "login" && <UnifiedLoginScreen role={loginRole} onBack={() => go(loginRole === "admin" ? "adminWelcome" : "select")} onLogin={(role, user) => {
        if (user && user.role === "superadmin") { setLoggedInRole("superadmin"); go("superAdmin"); }
        else go(role === "admin" ? "adminDashboard" : "userMap");
      }} />}
      {screen === "userRegister" && <RushUserApp key="user-reg" onLogout={() => go("select")} startScreen="register" />}
      {screen === "userMap" && <RushUserApp key="user-map" onLogout={() => go("select")} startScreen="map" />}
      {screen === "adminRegister" && <RushAdminApp key="admin-reg" onLogout={() => go("select")} startAuth="step1" />}
      {screen === "adminDashboard" && <RushAdminApp key="admin-dash" onLogout={() => go("select")} startAuth="dashboard" />}
      {screen === "superAdmin" && <RushSuperAdminApp key="super-admin" onLogout={() => go("select")} />}
    </>
  );
}
