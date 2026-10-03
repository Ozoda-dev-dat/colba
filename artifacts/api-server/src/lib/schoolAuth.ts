import { clerkClient, getAuth } from "@clerk/express";
import type { Request } from "express";
import { count, eq, sql } from "drizzle-orm";
import { db, branchesTable, schoolUsersTable } from "@workspace/db";

export type SchoolRole = "admin" | "teacher" | "printer";

export interface SchoolProfile {
  clerkId: string;
  fullName: string;
  email: string;
  role: SchoolRole;
  branchId: number | null;
  branchName: string | null;
  isActive: boolean;
}

export async function getSchoolProfile(
  req: Request,
): Promise<SchoolProfile | null> {
  const userId = getAuth(req).userId;
  if (!userId) return null;

  let profile = await selectSchoolProfile(userId);
  if (profile) return profile;

  const clerkUser = await clerkClient.users.getUser(userId);
  const email =
    clerkUser.emailAddresses.find(
      (address) => address.id === clerkUser.primaryEmailAddressId,
    )?.emailAddress ??
    clerkUser.emailAddresses[0]?.emailAddress ??
    "";
  const fullName =
    [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") ||
    clerkUser.username ||
    email ||
    "Yangi foydalanuvchi";

  await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(72101002)`);
    const [existing] = await tx
      .select({ clerkId: schoolUsersTable.clerkId })
      .from(schoolUsersTable)
      .where(eq(schoolUsersTable.clerkId, userId))
      .limit(1);

    if (existing) return;

    const [userCount] = await tx
      .select({ value: count() })
      .from(schoolUsersTable);

    await tx.insert(schoolUsersTable).values({
      clerkId: userId,
      fullName,
      email,
      role: userCount.value === 0 ? "admin" : "teacher",
      isActive: true,
    });
  });

  profile = await selectSchoolProfile(userId);
  return profile;
}

async function selectSchoolProfile(
  clerkId: string,
): Promise<SchoolProfile | null> {
  const [profile] = await db
    .select({
      clerkId: schoolUsersTable.clerkId,
      fullName: schoolUsersTable.fullName,
      email: schoolUsersTable.email,
      role: schoolUsersTable.role,
      branchId: schoolUsersTable.branchId,
      branchName: branchesTable.name,
      isActive: schoolUsersTable.isActive,
    })
    .from(schoolUsersTable)
    .leftJoin(branchesTable, eq(schoolUsersTable.branchId, branchesTable.id))
    .where(eq(schoolUsersTable.clerkId, clerkId))
    .limit(1);

  return profile ?? null;
}

export function isAdmin(profile: SchoolProfile): boolean {
  return profile.role === "admin" && profile.isActive;
}

export function hasBranchAccess(
  profile: SchoolProfile,
  branchId: number,
): boolean {
  return (
    profile.isActive &&
    (profile.role === "admin" || profile.branchId === branchId)
  );
}
