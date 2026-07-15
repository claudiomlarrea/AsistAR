import { NextResponse } from "next/server";
import { hashPin, setTeacherSession, verifyPin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const name = String(body.name ?? "").trim();
    const email = String(body.email ?? "").trim().toLowerCase();
    const pin = String(body.pin ?? "").trim();

    if (!name || !email || pin.length < 4) {
      return NextResponse.json(
        { error: "Nombre, email y PIN de al menos 4 dígitos son obligatorios." },
        { status: 400 },
      );
    }

    const existing = await prisma.teacher.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: "Ya existe una cuenta con ese email." },
        { status: 409 },
      );
    }

    const teacher = await prisma.teacher.create({
      data: { name, email, pinHash: hashPin(pin) },
    });

    await setTeacherSession(teacher.id);
    return NextResponse.json({
      id: teacher.id,
      name: teacher.name,
      email: teacher.email,
    });
  } catch {
    return NextResponse.json(
      { error: "No se pudo crear la cuenta." },
      { status: 500 },
    );
  }
}
