// ─── Rush Push Notifications — Web Push VAPID ───

const API_BASE = import.meta.env.VITE_API_URL || "https://rush-api.onrender.com/api";

let _swRegistration = null;

/** Registra el service worker. Llamar una vez al iniciar la app. */
export const registerServiceWorker = async () => {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return null;
  try {
    const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
    _swRegistration = reg;
    return reg;
  } catch (err) {
    console.warn("SW registration failed:", err);
    return null;
  }
};

/** Pide permiso y suscribe el dispositivo. Llama al backend para guardar la suscripción. */
export const subscribePush = async (token) => {
  if (!token) return;
  try {
    const reg = _swRegistration || await navigator.serviceWorker.ready;
    if (!reg) return;

    // Pedir permiso
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return;

    // Obtener VAPID public key del backend
    const res = await fetch(`${API_BASE}/push/vapid-public-key`);
    const { publicKey } = await res.json();
    if (!publicKey) return;

    // Suscribir
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });

    // Enviar al backend
    await fetch(`${API_BASE}/push/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(sub.toJSON()),
    });

    localStorage.setItem("rush_push_endpoint", sub.endpoint);
  } catch (err) {
    console.warn("Push subscribe error:", err);
  }
};

/** Desuscribe el dispositivo. Llamar al cerrar sesión. */
export const unsubscribePush = async (token) => {
  const endpoint = localStorage.getItem("rush_push_endpoint");
  if (!endpoint || !token) return;
  try {
    await fetch(`${API_BASE}/push/unregister`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ endpoint }),
    });
    localStorage.removeItem("rush_push_endpoint");
  } catch {}
};

// Convierte la VAPID public key de base64url a Uint8Array
function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}
