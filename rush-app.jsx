import { useState, useEffect, useRef, useCallback } from "react";
import L from "leaflet";

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

const ALBERGUES = [
  {
    id: 1, name: "Suite Palermo", address: "Av. Santa Fe 4200", distance: "0.3 km",
    rating: 4.3, reviews: 128, tags: ["Wi-Fi", "Cochera", "Bar"],
    lat: -34.585, lng: -58.425,
    rooms: [
      { id: 1, name: "Clásica", price: 6500, amenities: "Jacuzzi · TV · Frigobar", available: 3, popular: false },
      { id: 2, name: "Suite Premium", price: 8500, amenities: "Jacuzzi XL · Smart TV · Minibar", available: 1, popular: true },
      { id: 3, name: "VIP", price: 12000, amenities: "Sala privada · Terraza · Premium bar", available: 0, popular: false },
    ],
  },
  {
    id: 2, name: "Hotel Recoleta", address: "Junín 1500", distance: "0.8 km",
    rating: 4.6, reviews: 95, tags: ["Wi-Fi", "Piscina"],
    lat: -34.588, lng: -58.395,
    rooms: [
      { id: 1, name: "Standard", price: 5000, amenities: "TV · Frigobar", available: 5, popular: false },
      { id: 2, name: "Superior", price: 7500, amenities: "Jacuzzi · Smart TV · Minibar", available: 2, popular: true },
      { id: 3, name: "Presidencial", price: 15000, amenities: "Living · Jacuzzi doble · Terraza", available: 0, popular: false },
    ],
  },
  {
    id: 3, name: "Cosmos Suite", address: "Av. Corrientes 3200", distance: "1.2 km",
    rating: 3.9, reviews: 64, tags: ["Cochera", "24hs"],
    lat: -34.604, lng: -58.410,
    rooms: [
      { id: 1, name: "Express", price: 4000, amenities: "TV · Ducha", available: 4, popular: false },
      { id: 2, name: "Confort", price: 6000, amenities: "Jacuzzi · TV · Frigobar", available: 2, popular: true },
    ],
  },
  {
    id: 4, name: "Luna Park Suite", address: "Bouchard 465", distance: "2.1 km",
    rating: 4.1, reviews: 42, tags: ["Wi-Fi", "Vista al río"],
    lat: -34.600, lng: -58.368,
    rooms: [
      { id: 1, name: "Clásica", price: 5500, amenities: "TV · Frigobar · Vista", available: 3, popular: false },
      { id: 2, name: "Panorámica", price: 9000, amenities: "Jacuzzi · Vista 180° · Minibar", available: 1, popular: true },
    ],
  },
  {
    id: 5, name: "Test Hotel MP", address: "Calle Falsa 123", distance: "0.1 km",
    rating: 5.0, reviews: 1, tags: ["Prueba API", "Mercado Pago"],
    lat: -34.594, lng: -58.405, // Default map center (Buenos Aires)
    rooms: [
      { id: 1, name: "Habitación Prueba", price: 1, amenities: "Solo test de cobros reales", available: 99, popular: true },
    ],
  },
];

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
    width: 375, maxWidth: "100%", minHeight: "100dvh", background: COLORS.bg,
    fontFamily: FONTS.sans, color: COLORS.text, position: "relative",
    margin: "0 auto", overflow: "hidden",
  },
  statusBar: {
    height: 44, padding: "14px 20px 0", display: "flex", justifyContent: "space-between",
    alignItems: "center", fontSize: 13, fontWeight: 600,
  },
  header: { padding: "8px 20px 12px" },
  navBar: {
    position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)",
    width: 375, maxWidth: "100%", height: 64, background: COLORS.card,
    borderTop: `1px solid ${COLORS.border}`, display: "flex",
    justifyContent: "space-around", alignItems: "center", zIndex: 100,
  },
  navItem: (active) => ({
    display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
    cursor: "pointer", padding: "4px 12px", opacity: active ? 1 : 0.5,
    transition: "all 0.2s",
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
const GlobalCSS = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Outfit:wght@400;500;600;700;800&display=swap');
    @import url('https://unpkg.com/leaflet@1.9.4/dist/leaflet.css');
    * { margin: 0; padding: 0; box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
    body { background: #f0f0f0; }
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
    .rush-marker-icon { background: ${COLORS.purple}; color: #fff; border-radius: 20px 20px 20px 4px; padding: 4px 8px; font-size: 11px; font-weight: 700; white-space: nowrap; box-shadow: 0 2px 8px rgba(83,74,183,0.35); border: 2px solid #fff; font-family: 'DM Sans', sans-serif; cursor: pointer; transform: translateY(-2px); transition: all 0.15s; }
    .rush-user-dot { width: 16px; height: 16px; border-radius: 50%; background: #378ADD; border: 3px solid #fff; box-shadow: 0 0 0 6px rgba(55,138,221,0.18); }
  `}</style>
);

// ---- COMPONENTS ----
const StatusBar = ({ light }) => null;

const HeartIcon = (c = COLORS.textSec, s = 22, filled = false) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill={filled ? c : "none"} stroke={c} strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg>
);

const BottomNav = ({ active, onNavigate }) => (
  <div style={S.navBar}>
    {[
      { key: "map", icon: (c) => Icons.map(c), label: "Explorar" },
      { key: "favorites", icon: (c) => HeartIcon(c, 22, active === "favorites"), label: "Favoritos" },
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
const OnboardingScreen = ({ onLogin, onRegister }) => (
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

// 3. LOGIN
const LoginScreen = ({ onBack, onLogin, onGoRegister }) => {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [showPass, setShowPass] = useState(false);
  return (
    <div style={{ ...S.phone, minHeight: "100dvh", background: COLORS.card, ...S.fadeIn }}>
      <StatusBar />
      <div style={{ padding: "8px 20px" }}>
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
        <p style={{ fontSize: 13, color: COLORS.purple, fontWeight: 500, textAlign: "right", cursor: "pointer", marginBottom: 28 }}>¿Olvidaste tu contraseña?</p>
        <button style={S.btn()} onClick={onLogin}>Iniciar sesión</button>
        <p style={{ fontSize: 13, color: COLORS.textSec, textAlign: "center", marginTop: 20 }}>
          ¿No tenés cuenta? <span style={{ color: COLORS.purple, fontWeight: 600, cursor: "pointer" }} onClick={onGoRegister}>Registrate</span>
        </p>
      </div>
    </div>
  );
};

// 4. REGISTER
const RegisterScreen = ({ onBack, onRegister }) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  return (
    <div style={{ ...S.phone, minHeight: "100dvh", background: COLORS.card, ...S.fadeIn }}>
      <StatusBar />
      <div style={{ padding: "8px 20px" }}>
        <div style={{ cursor: "pointer", marginBottom: 20 }} onClick={onBack}>{Icons.back()}</div>
        <h1 style={{ fontSize: 26, fontWeight: 700, fontFamily: FONTS.display, marginBottom: 6 }}>Crear cuenta</h1>
        <p style={{ fontSize: 14, color: COLORS.textSec, marginBottom: 28 }}>Tu información es 100% privada</p>
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
        <button style={S.btn()} onClick={onRegister}>Crear mi cuenta</button>
      </div>
    </div>
  );
};

// ---- LEAFLET MAP COMPONENT ----
const LeafletMap = ({ onSelectAlbergue }) => {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const userMarkerRef = useRef(null);
  const markersRef = useRef([]);

  const createPriceIcon = useCallback((albergue) => {
    const minPrice = Math.min(...albergue.rooms.map(r => r.price));
    return L.divIcon({
      className: "",
      html: `<div class="rush-marker-icon">$${(minPrice / 1000).toFixed(1)}k/h</div>`,
      iconAnchor: [0, 0],
      popupAnchor: [16, -4],
    });
  }, []);

  const createUserIcon = useCallback(() => {
    return L.divIcon({
      className: "",
      html: `<div class="rush-user-dot"></div>`,
      iconAnchor: [8, 8],
    });
  }, []);

  useEffect(() => {
    if (mapInstanceRef.current) return;

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
    ALBERGUES.forEach((albergue) => {
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
  }, [onSelectAlbergue]);

  const centerOnUser = () => {
    if (!navigator.geolocation || !mapInstanceRef.current) return;
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
    <div style={{ position: "relative", margin: "0 20px 12px", borderRadius: 16, overflow: "hidden", boxShadow: "0 2px 12px rgba(0,0,0,0.08)" }}>
      <div ref={mapRef} style={{ height: 240, width: "100%", borderRadius: 16 }} />
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

// 5. MAP / EXPLORE
const MapScreen = ({ onSelectAlbergue, activeNav, onNavigate }) => {
  const [activeFilter, setActiveFilter] = useState("Cerca");
  const [search, setSearch] = useState("");
  const filters = ["Cerca", "Precio", "Calidad", "Suite", "24hs"];

  const filtered = ALBERGUES.filter(a =>
    search === "" ||
    a.name.toLowerCase().includes(search.toLowerCase()) ||
    a.address.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ ...S.phone, minHeight: "100dvh", paddingBottom: 80, ...S.fadeIn }}>
      <StatusBar />
      <div style={S.header}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <p style={{ fontSize: 24, fontWeight: 700, fontFamily: FONTS.display }}>Rush</p>
            <p style={{ fontSize: 12, color: COLORS.textSec }}>Tu espacio privado</p>
          </div>
          <div style={{ width: 38, height: 38, borderRadius: "50%", background: COLORS.purpleLight, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            {Icons.user(COLORS.purple)}
          </div>
        </div>
      </div>
      {/* Search */}
      <div style={{ ...S.section }}>
        <div style={{ position: "relative" }}>
          <input
            style={{ ...S.input, paddingLeft: 42, borderRadius: 14, background: COLORS.bg }}
            placeholder="Buscar zona o albergue..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <div style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)" }}>{Icons.search()}</div>
        </div>
      </div>
      {/* Real Leaflet Map */}
      <LeafletMap onSelectAlbergue={onSelectAlbergue} />
      {/* Filters */}
      <div style={{ display: "flex", gap: 8, padding: "0 20px", marginBottom: 16, overflowX: "auto" }}>
        {filters.map(f => (
          <span key={f} style={S.chip(activeFilter === f)} onClick={() => setActiveFilter(f)}>{f}</span>
        ))}
      </div>
      {/* List */}
      <div style={S.section}>
        <p style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Cerca de vos</p>
        {filtered.map(a => (
          <AlbergueCard key={a.id} albergue={a} onClick={() => onSelectAlbergue(a)} />
        ))}
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
const DetailScreen = ({ albergue, onBack, onBookRoom, isFavorite, onToggleFavorite }) => (
  <div style={{ ...S.phone, minHeight: "100dvh", background: COLORS.card, paddingBottom: 20, ...S.fadeIn }}>
    {/* Hero */}
    <div style={{ height: 220, background: `linear-gradient(135deg, ${COLORS.purpleDark} 0%, ${COLORS.purple} 50%, ${COLORS.purpleMid} 100%)`, position: "relative" }}>
      <StatusBar light />
      <div style={{ position: "absolute", top: 48, left: 16, width: 36, height: 36, borderRadius: "50%", background: "rgba(0,0,0,0.25)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", backdropFilter: "blur(4px)" }} onClick={onBack}>
        {Icons.back("#fff")}
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
      <div style={{ borderTop: `1px solid ${COLORS.border}`, margin: "16px 0" }} />
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
const MP_PUBLIC_KEY = import.meta.env.VITE_MP_PUBLIC_KEY;

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
  );
};

// 8. CONFIRMATION
const ConfirmationScreen = ({ albergue, room, total, hours, onDone }) => {
  const code = String(Math.floor(1000 + Math.random() * 9000));
  return (
    <div style={{ ...S.phone, minHeight: "100dvh", background: COLORS.card }}>
      <StatusBar />
      <div style={{ padding: "8px 20px", ...S.fadeIn }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, fontFamily: FONTS.display }}>Reserva confirmada</h2>
        </div>
        {/* Success */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "20px 0 16px" }}>
          <div style={{ width: 72, height: 72, borderRadius: "50%", background: COLORS.greenLight, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14, animation: "rushSlideUp 0.5s ease" }}>
            {Icons.check()}
          </div>
          <p style={{ fontSize: 18, fontWeight: 700, fontFamily: FONTS.display }}>¡Todo listo!</p>
          <p style={{ fontSize: 13, color: COLORS.textSec, marginTop: 4 }}>Mostrá este código al llegar</p>
        </div>
        {/* Code */}
        <div style={{ margin: "12px 0 20px", padding: 24, borderRadius: 16, background: COLORS.bg, textAlign: "center" }}>
          <p style={{ fontSize: 11, color: COLORS.textSec, textTransform: "uppercase", letterSpacing: 2, marginBottom: 8 }}>Código de acceso</p>
          <p style={{ fontSize: 48, fontWeight: 800, letterSpacing: 12, color: COLORS.purple, fontFamily: FONTS.display }}>
            {code.split("").join(" ")}
          </p>
        </div>
        {/* Details */}
        <div style={{ border: `1px solid ${COLORS.border}`, borderRadius: 14, padding: 16 }}>
          {[
            { label: "Lugar", value: albergue.name },
            { label: "Habitación", value: room.name },
            { label: "Duración", value: `${hours} horas` },
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
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 16 }}>
          {Icons.shield(COLORS.greenDark, 12)}
          <span style={{ fontSize: 11, color: COLORS.textSec }}>Tus datos personales no se comparten con el albergue</span>
        </div>
        <button style={{ ...S.btn(), marginTop: 24 }} onClick={onDone}>Volver al inicio</button>
      </div>
    </div>
  );
};

// 9. HISTORY
const HistoryScreen = ({ reservations, activeNav, onNavigate }) => (
  <div style={{ ...S.phone, minHeight: "100dvh", paddingBottom: 80, ...S.fadeIn }}>
    <StatusBar />
    <div style={S.header}>
      <h2 style={{ fontSize: 22, fontWeight: 700, fontFamily: FONTS.display }}>Historial</h2>
      <p style={{ fontSize: 13, color: COLORS.textSec, marginTop: 2 }}>Tus reservas anteriores</p>
    </div>
    <div style={S.section}>
      {reservations.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px 0" }}>
          {Icons.clock(COLORS.textTer, 40)}
          <p style={{ fontSize: 14, color: COLORS.textSec, marginTop: 12 }}>Todavía no tenés reservas</p>
        </div>
      ) : (
        reservations.map((r, i) => (
          <div key={i} style={{ ...S.card, animation: `rushFadeIn 0.3s ease ${i * 0.1}s both` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
              <div>
                <p style={{ fontSize: 15, fontWeight: 600 }}>{r.albergue}</p>
                <p style={{ fontSize: 12, color: COLORS.textSec }}>{r.room} · {r.hours}h</p>
              </div>
              <span style={S.badge(COLORS.greenLight, COLORS.greenDark)}>Completada</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", borderTop: `1px solid ${COLORS.border}`, paddingTop: 8, marginTop: 4 }}>
              <span style={{ fontSize: 12, color: COLORS.textSec }}>Código: {r.code}</span>
              <span style={{ fontSize: 13, fontWeight: 600 }}>${r.total.toLocaleString()}</span>
            </div>
          </div>
        ))
      )}
    </div>
    <BottomNav active={activeNav} onNavigate={onNavigate} />
  </div>
);

// 10. FAVORITES
const FavoritesScreen = ({ favorites, onSelectAlbergue, onRemoveFavorite, activeNav, onNavigate }) => (
  <div style={{ ...S.phone, minHeight: "100dvh", paddingBottom: 80, ...S.fadeIn }}>
    <StatusBar />
    <div style={S.header}>
      <h2 style={{ fontSize: 22, fontWeight: 700, fontFamily: FONTS.display }}>Favoritos</h2>
      <p style={{ fontSize: 13, color: COLORS.textSec, marginTop: 2 }}>Tus albergues guardados</p>
    </div>
    <div style={S.section}>
      {favorites.length === 0 ? (
        <div style={{ textAlign: "center", padding: "50px 0" }}>
          <div style={{ marginBottom: 12 }}>{HeartIcon(COLORS.textTer, 44)}</div>
          <p style={{ fontSize: 15, fontWeight: 500, color: COLORS.textSec, marginBottom: 4 }}>Sin favoritos todavía</p>
          <p style={{ fontSize: 13, color: COLORS.textTer, lineHeight: 1.5, maxWidth: 240, margin: "0 auto" }}>
            Tocá el corazón en cualquier albergue para guardarlo acá
          </p>
        </div>
      ) : (
        favorites.map((a, i) => {
          const minPrice = Math.min(...a.rooms.map(r => r.price));
          const totalAvail = a.rooms.reduce((acc, r) => acc + r.available, 0);
          return (
            <div key={a.id} style={{ ...S.card, animation: `rushFadeIn 0.3s ease ${i * 0.08}s both`, position: "relative" }}>
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
        })
      )}
    </div>
    <BottomNav active={activeNav} onNavigate={onNavigate} />
  </div>
);

// 11. PROFILE
const ProfileScreen = ({ onLogout, activeNav, onNavigate }) => (
  <div style={{ ...S.phone, minHeight: "100dvh", paddingBottom: 80, ...S.fadeIn }}>
    <StatusBar />
    <div style={S.header}>
      <h2 style={{ fontSize: 22, fontWeight: 700, fontFamily: FONTS.display }}>Perfil</h2>
    </div>
    <div style={{ ...S.section, display: "flex", alignItems: "center", gap: 14, marginBottom: 24 }}>
      <div style={{ width: 56, height: 56, borderRadius: "50%", background: `linear-gradient(135deg, ${COLORS.purpleDark}, ${COLORS.purpleMid})`, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontSize: 22, fontWeight: 700, color: "#fff", fontFamily: FONTS.display }}>U</span>
      </div>
      <div>
        <p style={{ fontSize: 17, fontWeight: 600 }}>Usuario Rush</p>
        <p style={{ fontSize: 13, color: COLORS.textSec }}>usuario@rush.app</p>
      </div>
    </div>
    <div style={S.section}>
      {[
        { icon: Icons.user, label: "Editar perfil" },
        { icon: Icons.shield, label: "Privacidad y seguridad" },
        { icon: Icons.settings, label: "Configuración" },
      ].map(({ icon, label }, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 0", borderBottom: `1px solid ${COLORS.border}`, cursor: "pointer" }}>
          {typeof icon === "function" ? icon() : icon()}
          <span style={{ fontSize: 15, flex: 1 }}>{label}</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={COLORS.textTer} strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
        </div>
      ))}
      <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 0", cursor: "pointer" }} onClick={onLogout}>
        {Icons.logout(COLORS.red)}
        <span style={{ fontSize: 15, color: COLORS.red, fontWeight: 500 }}>Cerrar sesión</span>
      </div>
    </div>
    <BottomNav active={activeNav} onNavigate={onNavigate} />
  </div>
);

// ---- MAIN APP ----
export default function RushApp() {
  const [screen, setScreen] = useState("splash");
  const [selectedAlbergue, setSelectedAlbergue] = useState(null);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [bookingInfo, setBookingInfo] = useState({});
  const [reservations, setReservations] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [activeNav, setActiveNav] = useState("map");

  // Detect MP redirect back (success/failure/pending)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const mpStatus = params.get("mp_status");
    if (!mpStatus) return;
    // Clean URL
    window.history.replaceState({}, document.title, window.location.pathname);
    const pending = sessionStorage.getItem("rush_pending_booking");
    if (mpStatus === "success" && pending) {
      const { total, hours, method, albergueName, roomName } = JSON.parse(pending);
      sessionStorage.removeItem("rush_pending_booking");
      // Reconstruct minimal albergue/room objects for the ConfirmationScreen
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
    else if (key === "history") navigate("history");
    else if (key === "profile") navigate("profile");
  };

  const toggleFavorite = (albergue) => {
    setFavorites(prev => prev.find(a => a.id === albergue.id) ? prev.filter(a => a.id !== albergue.id) : [...prev, albergue]);
  };

  const isFavorite = (id) => favorites.some(a => a.id === id);

  const handleSelectAlbergue = (a) => { setSelectedAlbergue(a); navigate("detail"); };
  const handleBookRoom = (r) => { setSelectedRoom(r); navigate("payment"); };
  const handleConfirm = (total, hours, method) => {
    setBookingInfo({ total, hours, method });
    setReservations(prev => [...prev, {
      albergue: selectedAlbergue.name, room: selectedRoom.name,
      total, hours, code: String(Math.floor(1000 + Math.random() * 9000)),
    }]);
    navigate("confirmation");
  };

  return (
    <>
      <GlobalCSS />
      {screen === "splash" && <SplashScreen onFinish={() => navigate("onboarding")} />}
      {screen === "onboarding" && <OnboardingScreen onLogin={() => navigate("login")} onRegister={() => navigate("register")} />}
      {screen === "login" && <LoginScreen onBack={() => navigate("onboarding")} onLogin={() => { setActiveNav("map"); navigate("map"); }} onGoRegister={() => navigate("register")} />}
      {screen === "register" && <RegisterScreen onBack={() => navigate("onboarding")} onRegister={() => { setActiveNav("map"); navigate("map"); }} />}
      {screen === "map" && <MapScreen onSelectAlbergue={handleSelectAlbergue} activeNav={activeNav} onNavigate={handleNavigation} />}
      {screen === "detail" && <DetailScreen albergue={selectedAlbergue} onBack={() => navigate("map")} onBookRoom={handleBookRoom} isFavorite={isFavorite(selectedAlbergue?.id)} onToggleFavorite={() => toggleFavorite(selectedAlbergue)} />}
      {screen === "payment" && <PaymentScreen albergue={selectedAlbergue} room={selectedRoom} onBack={() => navigate("detail")} onConfirm={handleConfirm} />}
      {screen === "confirmation" && <ConfirmationScreen albergue={selectedAlbergue} room={selectedRoom} total={bookingInfo.total} hours={bookingInfo.hours} onDone={() => { setActiveNav("map"); navigate("map"); }} />}
      {screen === "favorites" && <FavoritesScreen favorites={favorites} onSelectAlbergue={handleSelectAlbergue} onRemoveFavorite={(id) => setFavorites(prev => prev.filter(a => a.id !== id))} activeNav={activeNav} onNavigate={handleNavigation} />}
      {screen === "history" && <HistoryScreen reservations={reservations} activeNav={activeNav} onNavigate={handleNavigation} />}
      {screen === "profile" && <ProfileScreen onLogout={() => navigate("onboarding")} activeNav={activeNav} onNavigate={handleNavigation} />}
    </>
  );

}

