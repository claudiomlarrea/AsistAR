# AsistAR

**Asistencia por QR. Planilla lista.**

Hermano de [EvaluAR](../evaluar): el docente calibra teóricas/prácticas, abre la clase con un QR en el celular, los alumnos escanean al entrar, y la asistencia se descarga en Excel por clase.

## Cómo mostrar el QR (recomendación)

La forma más práctica en el aula:

1. El docente abre **Abrir clase → Ver QR** en un celular.
2. Deja el celular en el escritorio / atril con **brillo al máximo** (modo presentación a pantalla completa).
3. Los alumnos escanean al pasar.
4. Si hay proyector o smart TV, abrí la misma URL del QR en la PC y proyectala.

No hace falta un QR estático pegado en la pared: cada clase genera un código propio y se puede **rotar** para evitar fotos compartidas fuera del aula.

## Despliegue público (Vercel)

AsistAR es **Next.js**, no Streamlit. Streamlit Cloud sirve apps Python (como EvaluAR); para AsistAR usamos **Vercel**.

1. Subí el repo a GitHub.
2. Entrá a [vercel.com](https://vercel.com) → **Add New Project** → importá `AsistAR`.
3. En **Environment Variables** agregá:

```text
DATABASE_URL=postgresql://...-pooler.../neondb?sslmode=require
DIRECT_URL=postgresql://.../neondb?sslmode=require
NEXT_PUBLIC_APP_URL=https://TU-APP.vercel.app
```

4. Deploy. En el primer build, si hace falta schema: en el dashboard → Settings o corré local `npx prisma db push` contra Neon (ya hecho si usaste el seed).
5. Actualizá `NEXT_PUBLIC_APP_URL` con la URL real de Vercel y redeploy.

Los alumnos van a `https://TU-APP.vercel.app/a/...` al escanear el QR.

## Persistencia con Neon (obligatorio)

Como EvaluAR en la nube: las asistencias viven en **Neon PostgreSQL**.

1. Creá proyecto en [neon.tech](https://neon.tech) → nombre `asistar`.
2. **Connect** → copiá:
   - **Pooled** → `DATABASE_URL` (host con `-pooler`)
   - **Direct** → `DIRECT_URL` (sin `-pooler`)
3. Pegá ambas en `.env` (ver `.env.example`).
4. Aplicá schema y seed:

```bash
npx prisma generate
npx prisma db push
npm run db:seed
npm run dev
```

**Cuenta demo:** `Dra. Demo` · PIN `1234`

## Uso local

```bash
cd AsistAR
npm install
# configurá .env con Neon (arriba)
npx prisma db push
npm run db:seed
npm run dev
```

Abrí http://localhost:3000

## Flujo

1. **Docente** → cuenta → curso → padrón + calendario (T/P).
2. **Abrir clase** → pantalla QR (celular o proyector).
3. **Alumnos** escanean → nombre + DNI → quedan presentes.
4. **Cerrar** → **Descargar Excel** de esa clase.

## Stack

- Next.js 16 + React 19
- Prisma 7 + **Neon PostgreSQL** (`@prisma/adapter-neon`)
- ExcelJS · QRCode
- UI responsive (PC + celular)

## Licencia

MIT
