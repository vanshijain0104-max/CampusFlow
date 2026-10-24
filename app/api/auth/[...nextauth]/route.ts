/**
 * CampusFlow — NextAuth API Route Handler
 * app/api/auth/[...nextauth]/route.ts
 */

import { handlers } from "@/lib/auth";

export const { GET, POST } = handlers;
