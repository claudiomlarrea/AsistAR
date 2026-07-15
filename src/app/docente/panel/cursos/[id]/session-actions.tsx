"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui";

export function SessionActions({
  sessionId,
  status,
}: {
  sessionId: string;
  status: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function act(action: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/sessions/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        if (action === "open") {
          window.location.href = `/docente/panel/sesiones/${sessionId}/qr`;
          return;
        }
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {status === "open" ? (
        <>
          <Link href={`/docente/panel/sesiones/${sessionId}/qr`}>
            <Button size="sm">Ver QR</Button>
          </Link>
          <Button
            size="sm"
            variant="danger"
            disabled={loading}
            onClick={() => act("close")}
          >
            Cerrar
          </Button>
        </>
      ) : (
        <Button size="sm" disabled={loading} onClick={() => act("open")}>
          Abrir clase
        </Button>
      )}
      <a href={`/api/sessions/${sessionId}/excel`}>
        <Button size="sm" variant="secondary">
          Excel
        </Button>
      </a>
    </div>
  );
}
