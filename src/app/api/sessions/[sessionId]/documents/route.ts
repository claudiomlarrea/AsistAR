import { NextResponse } from "next/server";
import {
  classTypeAllowsDocuments,
  MAX_SESSION_DOCUMENT_BYTES,
  MAX_SESSION_DOCUMENTS,
} from "@/lib/class-types";
import { getTeacherIdFromSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  isAllowedSessionDocument,
  mimeForFileName,
} from "@/lib/session-documents";

type Params = { params: Promise<{ sessionId: string }> };

async function getOwnedSession(sessionId: string, teacherId: string) {
  return prisma.classSession.findFirst({
    where: { id: sessionId, course: { teacherId } },
    include: { _count: { select: { documents: true } } },
  });
}

export async function GET(_request: Request, { params }: Params) {
  const teacherId = await getTeacherIdFromSession();
  if (!teacherId) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const { sessionId } = await params;
  const session = await getOwnedSession(sessionId, teacherId);
  if (!session) {
    return NextResponse.json({ error: "Sesión no encontrada." }, { status: 404 });
  }

  const documents = await prisma.sessionDocument.findMany({
    where: { sessionId },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      fileName: true,
      mimeType: true,
      sizeBytes: true,
      createdAt: true,
    },
  });

  return NextResponse.json({
    documents,
    max: MAX_SESSION_DOCUMENTS,
    allowsDocuments: classTypeAllowsDocuments(session.classType),
  });
}

export async function POST(request: Request, { params }: Params) {
  const teacherId = await getTeacherIdFromSession();
  if (!teacherId) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const { sessionId } = await params;
  const session = await getOwnedSession(sessionId, teacherId);
  if (!session) {
    return NextResponse.json({ error: "Sesión no encontrada." }, { status: 404 });
  }

  if (!classTypeAllowsDocuments(session.classType)) {
    return NextResponse.json(
      { error: "Solo se pueden subir materiales en clases teóricas o prácticas." },
      { status: 400 },
    );
  }

  if (session._count.documents >= MAX_SESSION_DOCUMENTS) {
    return NextResponse.json(
      { error: `Máximo ${MAX_SESSION_DOCUMENTS} documentos por clase.` },
      { status: 400 },
    );
  }

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Falta el archivo." }, { status: 400 });
  }

  const fileName = file.name || "documento.pdf";
  const mimeType = mimeForFileName(fileName, file.type || "application/octet-stream");

  if (!isAllowedSessionDocument(fileName, mimeType)) {
    return NextResponse.json(
      { error: "Solo se permiten PDF o Word (.pdf, .doc, .docx)." },
      { status: 400 },
    );
  }

  if (file.size <= 0 || file.size > MAX_SESSION_DOCUMENT_BYTES) {
    return NextResponse.json(
      { error: "Cada archivo puede pesar hasta 4 MB." },
      { status: 400 },
    );
  }

  const remaining = MAX_SESSION_DOCUMENTS - session._count.documents;
  if (remaining <= 0) {
    return NextResponse.json(
      { error: `Máximo ${MAX_SESSION_DOCUMENTS} documentos por clase.` },
      { status: 400 },
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const doc = await prisma.sessionDocument.create({
    data: {
      sessionId,
      fileName,
      mimeType,
      sizeBytes: buffer.length,
      data: buffer,
    },
    select: {
      id: true,
      fileName: true,
      mimeType: true,
      sizeBytes: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ document: doc });
}
