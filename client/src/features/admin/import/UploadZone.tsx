import { useRef, useState } from 'react';

interface UploadZoneProps {
  onFileSelected: (file: File) => void;
  uploading: boolean;
}

export function UploadZone({ onFileSelected, uploading }: UploadZoneProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  if (!navigator.onLine) {
    return (
      <div className="bg-slate-50 rounded-xl p-8 text-center text-slate-500 mt-4">
        <p className="text-lg font-medium">Import ist nur mit Internetverbindung moeglich.</p>
        <p className="text-sm mt-1">Bitte stelle eine Internetverbindung her und versuche es erneut.</p>
      </div>
    );
  }

  function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setDragOver(true);
  }

  function handleDragEnter(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(true);
  }

  function handleDragLeave(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) validateAndSelect(file);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) validateAndSelect(file);
    // Reset input damit dieselbe Datei nochmal gewählt werden kann
    e.target.value = '';
  }

  function validateAndSelect(file: File) {
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      alert('Bitte nur PDF-Dateien hochladen.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      alert('Die Datei ist zu gross (max. 10 MB).');
      return;
    }
    onFileSelected(file);
  }

  return (
    <div className="mt-4 flex flex-col gap-4">
      <div
        onDragOver={handleDragOver}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`min-h-40 border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-3 p-6 transition-colors ${
          dragOver
            ? 'border-sky-500 bg-sky-50'
            : 'border-slate-300 bg-white hover:border-sky-400 hover:bg-sky-50'
        }`}
      >
        {uploading ? (
          <p className="text-sky-600 font-semibold text-lg">PDF wird verarbeitet...</p>
        ) : (
          <>
            <p className="text-slate-500 text-center">
              PDF-Rechnung hier ablegen oder Datei auswaehlen
            </p>
            <button
              type="button"
              onPointerDown={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="bg-sky-500 hover:bg-sky-600 active:bg-sky-700 disabled:opacity-50 text-white font-semibold px-6 rounded-xl h-14 text-lg transition-colors"
            >
              PDF auswaehlen
            </button>
          </>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
}
