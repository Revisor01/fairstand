import { useState } from 'react';
import { PenLine, Trash2, Plus } from 'lucide-react';
import { useCategories, useCreateCategory, useRenameCategory, useDeleteCategory } from '../../../hooks/api/useCategories.js';

export function CategoryManager() {
  const [newCatName, setNewCatName] = useState('');

  const { data: categories, isLoading } = useCategories();
  const createCategory = useCreateCategory();
  const renameCategory = useRenameCategory();
  const deleteCategory = useDeleteCategory();

  async function handleAdd() {
    const name = newCatName.trim();
    if (!name) return;
    try {
      await createCategory.mutateAsync(name);
      setNewCatName('');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Fehler beim Anlegen');
    }
  }

  async function handleRename(id: string, oldName: string) {
    const newName = window.prompt('Neuer Name:', oldName);
    if (!newName || !newName.trim() || newName.trim() === oldName) return;
    try {
      await renameCategory.mutateAsync({ id, name: newName.trim() });
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Fehler beim Umbenennen');
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteCategory.mutateAsync(id);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Fehler beim Löschen');
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold text-sky-800">Kategorien</h2>

      {/* Kategorienliste */}
      <div className="flex flex-col gap-2">
        {isLoading || !categories || categories.length === 0 ? (
          <p className="text-slate-500 text-sm text-center py-4">
            {isLoading ? 'Laden...' : 'Noch keine Kategorien angelegt.'}
          </p>
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
