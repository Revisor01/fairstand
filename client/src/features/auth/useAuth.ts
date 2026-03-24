import { useState, useEffect, useCallback } from 'react';
import {
  serverLogin,
  getStoredSession,
  clearSession,
  updateActivity,
  isSessionValid,
} from './serverAuth.js';
import { setShopId } from '../../db/index.js';

type AuthState = 'checking' | 'setup' | 'locked' | 'unlocked';

export function useAuth() {
  const [state, setState] = useState<AuthState>('checking');

  useEffect(() => {
    (async () => {
      // Gespeicherte Session prüfen
      const valid = await isSessionValid();
      if (valid) {
        const session = await getStoredSession();
        if (session) {
          setShopId(session.shopId); // Shop-Kontext setzen
          setState('unlocked');
          return;
        }
      }
      // Kein Setup-Mode mehr (server-seitig konfiguriert) — direkt zu locked
      setState('locked');
    })();
  }, []);

  // Activity-Timer: bei Benutzerinteraktion lastActivity aktualisieren
  useEffect(() => {
    if (state !== 'unlocked') return;
    const handler = () => updateActivity();
    window.addEventListener('pointerdown', handler);
    return () => window.removeEventListener('pointerdown', handler);
  }, [state]);

  const unlock = useCallback(async (pin: string): Promise<boolean> => {
    // Pfad 1: Online — Server-Auth versuchen
    if (navigator.onLine) {
      try {
        // serverLogin gibt null zurück bei falschem PIN (HTTP 401)
        // serverLogin gibt null zurück bei Netzwerkfehler (catch im serverLogin)
        const session = await serverLogin(pin);
        if (session) {
          // Erfolg: shopId setzen und entsperren
          setShopId(session.shopId);
          setState('unlocked');
          return true;
        }
        // null = falscher PIN oder Serverfehler — gesperrte Kasse bleibt gesperrt
        return false;
      } catch {
        // Unerwarteter Fehler (sollte nicht auftreten, da serverLogin intern catch hat)
        return false;
      }
    }

    // Pfad 2: Offline — gespeicherte Session prüfen
    // Wir können den PIN offline NICHT verifizieren (kein Zugriff auf Server-Hashes).
    // Offline-Fallback gilt nur wenn die Session noch nicht abgelaufen war
    // (= Nutzer war zuletzt vor <2h eingeloggt).
    const stored = await getStoredSession();
    if (!stored) return false; // Noch nie eingeloggt offline — kein Fallback möglich

    const valid = await isSessionValid();
    if (valid) {
      // Gespeicherte Session ist noch gültig — Zugang ohne PIN-Prüfung gewähren
      setShopId(stored.shopId);
      setState('unlocked');
      return true;
    }
    return false;
  }, []);

  // setup wird nicht mehr benötigt (server-seitig konfiguriert), bleibt aber für App.tsx-Kompatibilität
  const setup = useCallback(async (_pin: string): Promise<void> => {
    // No-op: PIN-Setup erfolgt nur server-seitig durch Admin
  }, []);

  const lock = useCallback(async () => {
    await clearSession();
    setShopId(''); // _shopId zurücksetzen — getShopId() wirft ab jetzt bis zum nächsten Login
    setState('locked');
  }, []);

  return { state, unlock, setup, lock };
}
