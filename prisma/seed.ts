import "dotenv/config";
import { PrismaNeon } from "@prisma/adapter-neon";
import { neonConfig } from "@neondatabase/serverless";
import { PrismaClient } from "@prisma/client";
import { createHash } from "crypto";
import { customAlphabet } from "nanoid";
import ws from "ws";

neonConfig.webSocketConstructor = ws;

const nano = customAlphabet("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", 10);

function hashPin(pin: string) {
  return createHash("sha256").update(pin).digest("hex");
}

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString?.startsWith("postgres")) {
    throw new Error("DATABASE_URL de Neon requerida para el seed.");
  }

  const adapter = new PrismaNeon({ connectionString });
  const prisma = new PrismaClient({ adapter });

  await prisma.attendanceRecord.deleteMany();
  await prisma.classSession.deleteMany();
  await prisma.enrollment.deleteMany();
  await prisma.course.deleteMany();
  await prisma.teacher.deleteMany();

  const teacher = await prisma.teacher.create({
    data: {
      name: "Dra. Demo",
      pinHash: hashPin("1234"),
    },
  });

  const course = await prisma.course.create({
    data: {
      teacherId: teacher.id,
      title: "Anatomía I — Comisión A",
      subject: "Anatomía",
      commission: "A",
    },
  });

  const students = [
    ["Gómez, Ana", "40111222", "1013"],
    ["Ruiz, Luis", "40222333", "1060"],
    ["Pérez, María", "40333444", "1107"],
    ["López, Juan", "40444555", "1154"],
    ["Fernández, Sofía", "40555666", "1201"],
  ];

  for (const [studentName, studentDni, matricula] of students) {
    await prisma.enrollment.create({
      data: { courseId: course.id, studentName, studentDni, matricula },
    });
  }

  const today = new Date();
  today.setHours(10, 0, 0, 0);
  const ends = new Date(today);
  ends.setHours(12, 0, 0, 0);

  await prisma.classSession.create({
    data: {
      courseId: course.id,
      classType: "theoretical",
      label: "Aula Magna",
      startsAt: today,
      endsAt: ends,
      status: "scheduled",
      qrToken: nano(),
    },
  });

  const nextWeek = new Date(today);
  nextWeek.setDate(nextWeek.getDate() + 2);
  const nextWeekEnd = new Date(nextWeek);
  nextWeekEnd.setHours(12, 0, 0, 0);

  await prisma.classSession.create({
    data: {
      courseId: course.id,
      classType: "practical",
      label: "Lab 2",
      startsAt: nextWeek,
      endsAt: nextWeekEnd,
      status: "scheduled",
      qrToken: nano(),
    },
  });

  console.log("Seed OK en Neon");
  console.log("Docente: Dra. Demo / PIN 1234");
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  process.exit(1);
});
