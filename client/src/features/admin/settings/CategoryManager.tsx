import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { PenLine, Trash2, Plus } from 'lucide-react';
import { db, getShopId } from '../../../db/index.js';
import { downloadCategories, downloadProducts } from '../../../sync/engine.js';
import { getAuthHeaders } from '../../auth/serverAuth.js';

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
        headers: await getAuthHeaders(),
        body: JSON.stringify({ name }),
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
        headers: await getAuthHeaders(),
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
      const res = await fetch(`/api/categories/${id}`, {
        method: 'DELETE',
        headers: await getAuthHeaders(),
      });
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
            <div key={cat.id} className="flex items-center gap-2 bg-white rounded-xl shadow-sm px-4 py-3">
              <span className="text-slate-800 font-medium text-base leading-snug flex-1 min-w-0 truncate">{cat.name}</span>
              <button
                onPointerDown={() => handleRename(cat.id, cat.name)}
                title="Umbenennen"
                className="bg-sky-100 active:bg-sky-300 text-sky-700 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg transition-colors shrink-0"
              >
                <PenLine size={18} />
              </button>
              <button
                onPointerDown={() => handleDelete(cat.id)}
                title="Löschen"
                className="bg-rose-100 active:bg-rose-300 text-rose-700 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg transition-colors shrink-0"
              >
                <Trash2 size={18} />
              </button>
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
          className="flex-1 min-h-[44px] border border-slate-200 rounded-lg px-3 text-base focus:outline-none focus:border-sky-400"
        />
        <button
          onPointerDown={handleAdd}
          className="bg-sky-500 active:bg-sky-700 text-white min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg transition-colors"
          title="Hinzufügen"
        >
          <Plus size={20} />
        </button>
      </div>
    </div>
  );
}
