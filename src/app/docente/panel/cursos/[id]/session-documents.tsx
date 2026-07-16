"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import {
  MAX_SESSION_DOCUMENT_BYTES,
  MAX_SESSION_DOCUMENTS,
} from "@/lib/class-types";

type DocMeta = {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
};

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function SessionDocuments({
  sessionId,
  initialCount = 0,
}: {
  sessionId: string;
  initialCount?: number;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [docs, setDocs] = useState<DocMeta[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [booted, setBooted] = useState(false);

  async function load() {
    const res = await fetch(`/api/sessions/${sessionId}/documents`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || "No se pudieron listar los documentos.");
      return;
    }
    setDocs(data.documents ?? []);
    setBooted(true);
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  async function onFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setError("");
    setLoading(true);
    try {
      let current = docs.length;
      for (const file of Array.from(files)) {
        if (current >= MAX_SESSION_DOCUMENTS) {
          setError(`Máximo ${MAX_SESSION_DOCUMENTS} documentos por clase.`);
          break;
        }
        if (file.size > MAX_SESSION_DOCUMENT_BYTES) {
          setError(`“${file.name}” supera 4 MB.`);
          continue;
        }
        const form = new FormData();
        form.append("file", file);
        const res = await fetch(`/api/sessions/${sessionId}/documents`, {
          method: "POST",
          body: form,
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(data.error || `No se pudo subir “${file.name}”.`);
          break;
        }
        current += 1;
      }
      await load();
      router.refresh();
    } finally {
      setLoading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function remove(docId: string, fileName: string) {
    if (!confirm(`¿Quitar “${fileName}” de esta clase?`)) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/sessions/${sessionId}/documents/${docId}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "No se pudo eliminar.");
        return;
      }
      await load();
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  const count = booted ? docs.length : initialCount;
  const full = count >= MAX_SESSION_DOCUMENTS;

  return (
    <div className="w-full space-y-2 rounded-xl border border-teal-200 bg-teal-50/60 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-medium text-slate-700">
          Materiales · {count}/{MAX_SESSION_DOCUMENTS} (PDF o Word)
        </p>
        <div>
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            multiple
            className="hidden"
            disabled={loading || full}
            onChange={(e) => onFiles(e.target.files)}
          />
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={loading || full}
            onClick={() => fileRef.current?.click()}
          >
            {loading ? "Subiendo…" : full ? "Límite alcanzado" : "Subir documentos"}
          </Button>
        </div>
      </div>

      {docs.length > 0 ? (
        <ul className="space-y-1.5">
          {docs.map((doc) => (
            <li
              key={doc.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white px-2.5 py-1.5 text-sm"
            >
              <a
                href={`/api/sessions/${sessionId}/documents/${doc.id}`}
                className="min-w-0 flex-1 truncate text-teal-800 hover:underline"
                title={doc.fileName}
              >
                {doc.fileName}
                <span className="ml-2 text-xs text-slate-400">
                  {formatSize(doc.sizeBytes)}
                </span>
              </a>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={loading}
                onClick={() => remove(doc.id, doc.fileName)}
              >
                Quitar
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-slate-500">
          Hasta 10 archivos PDF o Word (máx. 4 MB c/u) para esta clase.
        </p>
      )}

      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
