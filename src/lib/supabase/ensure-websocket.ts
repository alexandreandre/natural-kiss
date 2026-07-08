import WS from "ws";

/**
 * Polyfill WebSocket côté serveur.
 *
 * `supabase-js` (realtime) exige un constructeur WebSocket global dès la création
 * du client. Node < 22 n'expose pas `globalThis.WebSocket` → on le fournit via `ws`.
 * Effet de bord à l'import ; à ne charger QUE côté serveur (jamais dans un bundle
 * navigateur, où `WebSocket` est natif).
 */
if (typeof globalThis.WebSocket === "undefined") {
  (globalThis as { WebSocket?: unknown }).WebSocket = WS;
}
