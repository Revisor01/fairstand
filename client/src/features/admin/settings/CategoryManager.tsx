import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, getShopId } from '../../../db/index.js';
import { downloadCategories, downloadProducts } from '../../../sync/engine.js';

export function CategoryManager() {
  const [newCatName, setNewCatName] = useState('');

  const categories = useLiveQuery(
    () => db.categories.where('shopId').equals(getShopId()).sortBy('name'),
    []
  );

  async function handleAdd() {
    const name = newCatName.trim();
    if (!name) return;
    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shopId: getShopId(), name }),
      });
      if (!res.ok) throw new Error('Fehler beim Anlegen');
      await downloadCategories();
      setNewCatName('');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Fehler beim Anlegen');
    }
  }

  async function handleRename(id: string, oldName: string) {
    const newName = window.prompt('Neuer Name:', oldName);
    if (!newName || !newName.trim() || newName.trim() === oldName) return;
    try {
      const res = await fetch(`/api/categories/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim() }),
      });
      if (!res.ok) throw new Error('Fehler beim Umbenennen');
      await downloadCategories();
      await downloadProducts();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Fehler beim Umbenennen');
    }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/categories/${id}`, { method: 'DELETE' });
      if (res.status === 409) {
        const data = await res.json() as { error: string };
        alert(data.error);
        return;
      }
      if (!res.ok) throw new Error('Fehler beim Löschen');
      await downloadCategories();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Fehler beim Löschen');
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold text-sky-800">Kategorien</h2>

      {/* Kategorienliste */}
      <div className="flex flex-col gap-2">
        {!categories || categories.length === 0 ? (
          <p className="text-slate-500 text-sm text-center py-4">Noch keine Kategorien angelegt.</p>
        ) : (
          categories.map(cat => (
            <div key={cat.id} className="flex items-center justify-between bg-white rounded-xl shadow-sm px-4 py-3">
              <span className="text-slate-800 font-medium">{cat.name}</span>
              <div className="flex items-center gap-2">
                <button
                  onPointerDown={() => handleRename(cat.id, cat.name)}
                  className="bg-sky-100 hover:bg-sky-200 active:bg-sky-300 text-sky-700 font-medium px-3 py-2 rounded-lg h-11 text-sm transition-colors"
                >
                  Umbenennen
                </button>
                <button
                  onPointerDown={() => handleDelete(cat.id)}
                  className="bg-rose-100 hover:bg-rose-200 active:bg-rose-300 text-rose-700 font-medium px-3 py-2 rounded-lg h-11 text-sm transition-colors"
                >
                  Löschen
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Neue Kategorie */}
      <div className="flex gap-2">
        <input
          type="text"
          value={newCatName}
          onChange={e => setNewCatName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
          placeholder="Neue Kategorie..."
          className="flex-1 h-11 border border-slate-200 rounded-lg px-3 text-sm focus:outline-none focus:border-sky-400"
        />
        <button
          onPointerDown={handleAdd}
          className="bg-sky-500 hover:bg-sky-600 active:bg-sky-700 text-white font-medium px-4 py-2 rounded-lg h-11 text-sm transition-colors"
        >
          Hinzufügen
        </button>
      </div>
    </div>
  );
}
