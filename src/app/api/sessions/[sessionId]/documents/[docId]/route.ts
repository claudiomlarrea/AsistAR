import { NextResponse } from "next/server";
import { getTeacherIdFromSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { safeDownloadName } from "@/lib/session-documents";

type Params = { params: Promise<{ sessionId: string; docId: string }> };

async function getOwnedDocument(sessionId: string, docId: string, teacherId: string) {
  return prisma.sessionDocument.findFirst({
    where: {
      id: docId,
      sessionId,
      session: { course: { teacherId } },
    },
  });
}

export async function GET(_request: Request, { params }: Params) {
  const teacherId = await getTeacherIdFromSession();
  if (!teacherId) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const { sessionId, docId } = await params;
  const doc = await getOwnedDocument(sessionId, docId, teacherId);
  if (!doc) {
    return NextResponse.json({ error: "Documento no encontrado." }, { status: 404 });
  }

  const name = safeDownloadName(doc.fileName);
  return new NextResponse(new Uint8Array(doc.data), {
    status: 200,
    headers: {
      "Content-Type": doc.mimeType,
      "Content-Length": String(doc.sizeBytes),
      "Content-Disposition": `attachment; filename="${name}"`,
      "Cache-Control": "private, no-store",
    },
  });
}

export async function DELETE(_request: Request, { params }: Params) {
  const teacherId = await getTeacherIdFromSession();
  if (!teacherId) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const { sessionId, docId } = await params;
  const doc = await getOwnedDocument(sessionId, docId, teacherId);
  if (!doc) {
    return NextResponse.json({ error: "Documento no encontrado." }, { status: 404 });
  }

  await prisma.sessionDocument.delete({ where: { id: docId } });
  return NextResponse.json({ ok: true });
}
