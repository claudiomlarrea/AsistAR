import { NextResponse } from "next/server";
import { setTeacherSession, verifyPin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = String(body.email ?? "").trim().toLowerCase();
    const pin = String(body.pin ?? "").trim();

    const teacher = await prisma.teacher.findUnique({ where: { email } });
    if (!teacher || !verifyPin(pin, teacher.pinHash)) {
      return NextResponse.json(
        { error: "Email o PIN incorrectos." },
        { status: 401 },
      );
    }

    await setTeacherSession(teacher.id);
    return NextResponse.json({
      id: teacher.id,
      name: teacher.name,
      email: teacher.email,
    });
  } catch {
    return NextResponse.json(
      { error: "No se pudo iniciar sesión." },
      { status: 500 },
    );
  }
}
