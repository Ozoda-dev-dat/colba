import {
  createHash,
  createHmac,
  timingSafeEqual,
} from "node:crypto";
import type { Request, Response } from "express";
import { and, asc, eq, inArray } from "drizzle-orm";
import {
  db,
  branchesTable,
  printerAccountsTable,
} from "@workspace/db";

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

const PRINTER_BRANCH_NAMES = ["Tinchlik", "Chilonzor", "Yunusobod"];

const SESSION_COOKIE = "maktab_printer_session";
const SESSION_LIFETIME_SECONDS = 12 * 60 * 60;
type SessionPayload = { username: string; expiresAt: number };

function sessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is required for printer sessions.");
  return secret;
}

function digest(value: string): Buffer {
  return createHash("sha256").update(value).digest();
}

function safeEqual(left: string, right: string): boolean {
  return timingSafeEqual(digest(left), digest(right));
}

function sign(payload: string): string {
  return createHmac("sha256", sessionSecret()).update(payload).digest("base64url");
}

function readCookie(req: Request, name: string): string | undefined {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return undefined;
  for (const part of cookieHeader.split(";")) {
    const separator = part.indexOf("=");
    if (separator < 0) continue;
    if (part.slice(0, separator).trim() === name) {
      return part.slice(separator + 1).trim();
    }
  }
  return undefined;
}

function sessionUsername(req: Request): string | null {
  const token = readCookie(req, SESSION_COOKIE);
  if (!token) return null;
  const [encodedPayload, suppliedSignature, ...extra] = token.split(".");
  if (!encodedPayload || !suppliedSignature || extra.length) return null;

  let expectedSignature: string;
  try {
    expectedSignature = sign(encodedPayload);
  } catch {
    return null;
  }
  if (!safeEqual(suppliedSignature, expectedSignature)) return null;

  try {
    const payload = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8"),
    ) as SessionPayload;
    if (
      typeof payload.username !== "string" ||
      typeof payload.expiresAt !== "number" ||
      payload.expiresAt <= Date.now()
    ) {
      return null;
    }
    return payload.username;
  } catch {
    return null;
  }
}

export async function verifyPrinterCredentials(
  username: string,
  password: string,
): Promise<boolean> {
  const [account] = await db
    .select({
      passwordHash: printerAccountsTable.passwordHash,
      isActive: printerAccountsTable.isActive,
    })
    .from(printerAccountsTable)
    .where(eq(printerAccountsTable.username, username))
    .limit(1);

  if (!account) {
    return false;
  }

  // Parollarni to'g'ridan-to'g'ri (oddiy matn sifatida) solishtirish
  const matches = account.passwordHash === password;
  return account.isActive && matches;
}

export function setPrinterSession(res: Response, username: string): void {
  const encodedPayload = Buffer.from(
    JSON.stringify({
      username,
      expiresAt: Date.now() + SESSION_LIFETIME_SECONDS * 1000,
    } satisfies SessionPayload),
  ).toString("base64url");
  const token = `${encodedPayload}.${sign(encodedPayload)}`;
  res.append(
    "Set-Cookie",
    `${SESSION_COOKIE}=${token}; Path=/; Max-Age=${SESSION_LIFETIME_SECONDS}; HttpOnly; Secure; SameSite=Strict`,
  );
}

export function clearPrinterSession(res: Response): void {
  res.append(
    "Set-Cookie",
    `${SESSION_COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict`,
  );
}

export async function ensurePrinterBranches() {
  await Promise.all(
    PRINTER_BRANCH_NAMES.map((name) =>
      db.insert(branchesTable).values({ name }).onConflictDoNothing(),
    ),
  );
  const rows = await db
    .select({ id: branchesTable.id, name: branchesTable.name })
    .from(branchesTable)
    .where(inArray(branchesTable.name, PRINTER_BRANCH_NAMES));
  return PRINTER_BRANCH_NAMES.flatMap((name) =>
    rows.filter((row) => row.name === name),
  );
}

export async function findPrinterAccountForBranch(
  branchId: number,
): Promise<string | null> {
  const [account] = await db
    .select({ username: printerAccountsTable.username })
    .from(printerAccountsTable)
    .where(
      and(
        eq(printerAccountsTable.branchId, branchId),
        eq(printerAccountsTable.isActive, true),
      ),
    )
    .orderBy(asc(printerAccountsTable.username))
    .limit(1);
  return account?.username ?? null;
}

export async function getPrinterProfile(
  username: string,
): Promise<SchoolProfile | null> {
  const [account] = await db
    .select({
      username: printerAccountsTable.username,
      fullName: printerAccountsTable.fullName,
      branchId: printerAccountsTable.branchId,
      branchName: branchesTable.name,
      isActive: printerAccountsTable.isActive,
    })
    .from(printerAccountsTable)
    .innerJoin(
      branchesTable,
      eq(printerAccountsTable.branchId, branchesTable.id),
    )
    .where(eq(printerAccountsTable.username, username))
    .limit(1);
  if (!account) return null;
  return {
    clerkId: account.username,
    fullName: account.fullName,
    email: "",
    role: "printer",
    branchId: account.branchId,
    branchName: account.branchName,
    isActive: account.isActive,
  };
}

export async function getSchoolProfile(
  req: Request,
): Promise<SchoolProfile | null> {
  const username = sessionUsername(req);
  if (!username) return null;
  return getPrinterProfile(username);
}

export function isAdmin(_profile: SchoolProfile): boolean {
  return false;
}

export function hasBranchAccess(
  profile: SchoolProfile,
  branchId: number,
): boolean {
  return profile.isActive && profile.role === "printer" && profile.branchId === branchId;
}
