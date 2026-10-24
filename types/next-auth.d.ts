/**
 * CampusFlow — NextAuth TypeScript Augmentation
 * types/next-auth.d.ts
 *
 * Extends Session and JWT types with CampusFlow-specific fields:
 * role, rollNumber, studentId.
 */

import { Role } from "@prisma/client";
import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      image?: string | null;
      role: Role;
      rollNumber?: string | null;
      studentId?: string | null;
    };
  }

  interface User {
    role: Role;
    rollNumber?: string | null;
    studentId?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: Role;
    rollNumber?: string | null;
    studentId?: string | null;
  }
}
