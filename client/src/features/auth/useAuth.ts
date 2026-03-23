import { useState, useEffect, useCallback } from 'react';
import { isSessionValid, verifyPin, setupPin, updateActivity, hasPinSetup, logout } from './pinAuth.js';

type AuthState = 'checking' | 'setup' | 'locked' | 'unlocked';

export function useAuth() {
  const [state, setState] = useState<AuthState>('checking');

  useEffect(() => {
    (async () => {
      const hasPin = await hasPinSetup();
      if (!hasPin) { setState('setup'); return; }
      const valid = await isSessionValid();
      setState(valid ? 'unlocked' : 'locked');
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
    const ok = await verifyPin(pin);
    if (ok) {
      await updateActivity();
      setState('unlocked');
    }
    return ok;
  }, []);

  const setup = useCallback(async (pin: string): Promise<void> => {
    await setupPin(pin);
    await updateActivity();
    setState('unlocked');
  }, []);

  const lock = useCallback(async () => {
    await logout();
    setState('locked');
  }, []);

  return { state, unlock, setup, lock };
}
