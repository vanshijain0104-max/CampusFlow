/**
 * CampusFlow — Prisma Client Singleton & Fast Fallback Gateway
 * lib/prisma.ts
 *
 * Prevents multiple PrismaClient instances during hot-reload.
 * Provides withDbTimeout() to gracefully fail in <400ms when PostgreSQL
 * is not running on localhost:5432, preventing dev-server & UI stalls.
 */

import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  dbAvailable: boolean | undefined;
  lastDbCheck: number | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["error"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

/**
 * Executes a Prisma query with a strict 400ms timeout.
 * If PostgreSQL is unreachable or times out, immediately returns null,
 * preventing Next.js pages and API routes from hanging for 9-10 seconds.
 */
export async function withDbTimeout<T>(queryPromise: Promise<T>, timeoutMs = 400): Promise<T | null> {
  if (globalForPrisma.dbAvailable === false) {
    const elapsed = Date.now() - (globalForPrisma.lastDbCheck || 0);
    // Retry DB connection only once every 60 seconds
    if (elapsed < 60000) {
      return null;
    }
  }

  try {
    const result = await Promise.race([
      queryPromise,
      new Promise<null>((_, reject) =>
        setTimeout(() => reject(new Error("Prisma connection timeout")), timeoutMs)
      ),
    ]);
    globalForPrisma.dbAvailable = true;
    globalForPrisma.lastDbCheck = Date.now();
    return result;
  } catch {
    globalForPrisma.dbAvailable = false;
    globalForPrisma.lastDbCheck = Date.now();
    return null;
  }
}
