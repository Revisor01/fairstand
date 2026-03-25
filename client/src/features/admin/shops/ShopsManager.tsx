import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAuthHeaders } from '../../auth/serverAuth.js';
import { Plus, PowerOff, Power } from 'lucide-react';

interface ShopItem {
  id: string;
  shopId: string;
  name: string;
  isMaster: boolean;
  active: boolean;
  createdAt: number;
}

interface CreateShopInput {
  name: string;
  shopId: string;
  pin: string;
}

export function ShopsManager() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<CreateShopInput>({ name: '', shopId: '', pin: '' });
  const [formError, setFormError] = useState<string | null>(null);

  const { data: shops = [], isLoading } = useQuery({
    queryKey: ['shops'],
    queryFn: async () => {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/shops', { headers });
      if (!res.ok) throw new Error('Fehler beim Laden der Shops');
      return res.json() as Promise<ShopItem[]>;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (input: CreateShopInput) => {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/shops', {
        method: 'POST',
        headers,
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const err = await res.json() as { error: string };
        throw new Error(typeof err.error === 'string' ? err.error : 'Fehler beim Anlegen');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shops'] });
      setForm({ name: '', shopId: '', pin: '' });
      setShowForm(false);
      setFormError(null);
    },
    onError: (err: Error) => setFormError(err.message),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ shopId, active }: { shopId: string; active: boolean }) => {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/shops/${shopId}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ active }),
      });
      if (!res.ok) {
        const err = await res.json() as { error: string };
        throw new Error(typeof err.error === 'string' ? err.error : 'Fehler');
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['shops'] }),
  });

  // shopId-Vorschlag aus Name generieren
  const suggestShopId = (name: string) =>
    name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-700">Shops verwalten</h2>
        <button
          onPointerDown={() => setShowForm(v => !v)}
          className="flex items-center gap-1.5 bg-sky-500 active:bg-sky-600 text-white px-4 py-2 rounded-lg text-sm font-semibold min-h-[44px]"
        >
          <Plus size={16} />
          Neuer Shop
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-sky-100 p-4 space-y-3">
          <h3 className="font-semibold text-slate-700 text-sm">Neuen Shop anlegen</h3>
          {formError && (
            <p className="text-red-600 text-sm bg-red-50 rounded-lg p-2">{formError}</p>
          )}
          <div className="space-y-2">
            <input
              type="text"
              placeholder="Name (z.B. Gemeinde Heide)"
              value={form.name}
              onChange={e => setForm(f => ({
                ...f,
                name: e.target.value,
                shopId: suggestShopId(e.target.value),
              }))}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm min-h-[44px]"
            />
            <input
              type="text"
              placeholder="Shop-ID (z.B. gemeinde-heide)"
              value={form.shopId}
              onChange={e => setForm(f => ({ ...f, shopId: e.target.value }))}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm min-h-[44px] font-mono"
            />
            <input
              type="password"
              placeholder="PIN (4-8 Stellen)"
              value={form.pin}
              onChange={e => setForm(f => ({ ...f, pin: e.target.value }))}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm min-h-[44px]"
            />
          </div>
          <div className="flex gap-2">
            <button
              onPointerDown={() => {
                setFormError(null);
                createMutation.mutate(form);
              }}
              disabled={createMutation.isPending}
              className="flex-1 bg-sky-500 active:bg-sky-600 disabled:opacity-50 text-white font-semibold py-2 rounded-lg text-sm min-h-[44px]"
            >
              {createMutation.isPending ? 'Wird angelegt...' : 'Anlegen'}
            </button>
            <button
              onPointerDown={() => { setShowForm(false); setFormError(null); }}
              className="px-4 py-2 bg-slate-100 active:bg-slate-200 text-slate-600 rounded-lg text-sm min-h-[44px]"
            >
              Abbrechen
            </button>
          </div>
        </div>
      )}

      {isLoading && <p className="text-slate-400 text-sm">Laedt...</p>}

      <div className="space-y-2">
        {shops.map(shop => (
          <div
            key={shop.shopId}
            className={`bg-white rounded-xl border p-4 flex items-center justify-between gap-3 ${
              shop.active ? 'border-sky-100' : 'border-slate-200 opacity-60'
            }`}
          >
            <div>
              <p className={`font-semibold text-sm ${shop.active ? 'text-slate-700' : 'text-slate-400'}`}>
                {shop.name}
                {shop.isMaster && (
                  <span className="ml-2 text-[10px] bg-sky-100 text-sky-700 px-2 py-0.5 rounded-full font-bold uppercase">
                    Master
                  </span>
                )}
              </p>
              <p className="text-slate-400 text-xs font-mono mt-0.5">{shop.shopId}</p>
            </div>
            {!shop.isMaster && (
              <button
                onPointerDown={() => toggleMutation.mutate({ shopId: shop.shopId, active: !shop.active })}
                disabled={toggleMutation.isPending}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold min-h-[44px] ${
                  shop.active
                    ? 'bg-red-50 text-red-600 active:bg-red-100'
                    : 'bg-green-50 text-green-700 active:bg-green-100'
                }`}
              >
                {shop.active ? <PowerOff size={14} /> : <Power size={14} />}
                {shop.active ? 'Deaktivieren' : 'Aktivieren'}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
