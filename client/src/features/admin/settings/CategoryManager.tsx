import { useState } from 'react';
import { PenLine, Trash2, Plus } from 'lucide-react';
import { useCategories, useCreateCategory, useRenameCategory, useDeleteCategory } from '../../../hooks/api/useCategories.js';

export function CategoryManager() {
  const [newCatName, setNewCatName] = useState('');
  const [renameTarget, setRenameTarget] = useState<{ id: string; name: string } | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [alertMessage, setAlertMessage] = useState<string | null>(null);

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
      setAlertMessage(err instanceof Error ? err.message : 'Fehler beim Anlegen');
    }
  }

  function openRenameModal(id: string, oldName: string) {
    setRenameTarget({ id, name: oldName });
    setRenameValue(oldName);
  }

  async function handleRenameConfirm() {
    if (!renameTarget) return;
    const newName = renameValue.trim();
    if (!newName || newName === renameTarget.name) {
      setRenameTarget(null);
      return;
    }
    try {
      await renameCategory.mutateAsync({ id: renameTarget.id, name: newName });
      setRenameTarget(null);
    } catch (err) {
      setAlertMessage(err instanceof Error ? err.message : 'Fehler beim Umbenennen');
      setRenameTarget(null);
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteCategory.mutateAsync(id);
    } catch (err) {
      setAlertMessage(err instanceof Error ? err.message : 'Fehler beim Löschen');
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
                onPointerDown={() => openRenameModal(cat.id, cat.name)}
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

      {/* Umbenennen-Modal */}
      {renameTarget && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
          onPointerDown={() => setRenameTarget(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 flex flex-col gap-4"
            onPointerDown={e => e.stopPropagation()}
          >
            <h4 className="font-semibold text-slate-800 text-lg">Kategorie umbenennen</h4>
            <input
              type="text"
              value={renameValue}
              onChange={e => setRenameValue(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleRenameConfirm()}
              autoFocus
              className="min-h-[44px] border border-slate-200 rounded-xl px-3 text-base focus:outline-none focus:border-sky-400"
              placeholder="Neuer Name"
            />
            <div className="flex gap-3">
              <button
                onPointerDown={() => setRenameTarget(null)}
                className="flex-1 py-3 rounded-xl bg-slate-100 text-slate-700 font-medium text-sm hover:bg-slate-200 active:bg-slate-300 transition-colors min-h-[44px]"
              >
                Abbrechen
              </button>
              <button
                onPointerDown={handleRenameConfirm}
                className="flex-1 py-3 rounded-xl bg-sky-500 text-white font-medium text-sm hover:bg-sky-600 active:bg-sky-700 transition-colors min-h-[44px]"
              >
                Bestätigen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Alert-Modal (ersetzt window.alert) */}
      {alertMessage && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onPointerDown={() => setAlertMessage(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 flex flex-col gap-4"
            onPointerDown={e => e.stopPropagation()}
          >
            <p className="text-sm text-slate-700">{alertMessage}</p>
            <button
              onPointerDown={() => setAlertMessage(null)}
              className="w-full py-3 rounded-xl bg-sky-500 text-white font-medium text-sm hover:bg-sky-600 active:bg-sky-700 transition-colors min-h-[44px]"
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
