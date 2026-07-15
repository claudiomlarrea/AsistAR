import { NextResponse } from "next/server";
import { getTeacherIdFromSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const teacherId = await getTeacherIdFromSession();
  if (!teacherId) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const courses = await prisma.course.findMany({
    where: { teacherId },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { students: true, sessions: true } },
    },
  });

  return NextResponse.json({ courses });
}

export async function POST(request: Request) {
  const teacherId = await getTeacherIdFromSession();
  if (!teacherId) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const body = await request.json();
  const title = String(body.title ?? "").trim();
  const subject = String(body.subject ?? "").trim();
  const commission = String(body.commission ?? "").trim() || null;

  if (!title) {
    return NextResponse.json(
      { error: "La carrera es obligatoria." },
      { status: 400 },
    );
  }

  if (!subject) {
    return NextResponse.json(
      { error: "La materia es obligatoria." },
      { status: 400 },
    );
  }

  const course = await prisma.course.create({
    data: { teacherId, title, subject, commission },
  });

  return NextResponse.json({ course });
}
