import { NextResponse } from "next/server";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/lib/generated/prisma/client";

function inspectDatabaseUrl(value: string | undefined) {
  if (!value) {
    return { present: false };
  }

  try {
    const url = new URL(value);
    return {
      present: true,
      host: url.hostname,
      port: url.port || null,
      database: url.pathname.replace(/^\//, ""),
      username: decodeURIComponent(url.username),
      hasPassword: Boolean(url.password),
      usesEncodedAt: value.includes("%40"),
    };
  } catch {
    return { present: true, parseError: true };
  }
}

function inspectSupabaseUrl(value: string | undefined) {
  if (!value) {
    return { present: false };
  }

  try {
    const url = new URL(value);
    return {
      present: true,
      host: url.hostname,
    };
  } catch {
    return { present: true, parseError: true };
  }
}

export async function GET() {
  const databaseUrl = process.env.DATABASE_URL;
  const prisma = databaseUrl
    ? new PrismaClient({
        adapter: new PrismaPg({ connectionString: databaseUrl }),
      })
    : null;

  try {
    const counts = prisma
      ? {
          users: await prisma.user.count(),
          teams: await prisma.team.count(),
          members: await prisma.teamMember.count(),
        }
      : null;

    return NextResponse.json({
      ok: true,
      database: inspectDatabaseUrl(databaseUrl),
      supabase: inspectSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL),
      counts,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        database: inspectDatabaseUrl(databaseUrl),
        supabase: inspectSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL),
        error:
          error instanceof Error
            ? {
                name: error.name,
                message: error.message,
              }
            : { message: "Unknown database health check error" },
      },
      { status: 500 }
    );
  } finally {
    await prisma?.$disconnect();
  }
}
