import { createHash } from "node:crypto";
import { Router, type IRouter } from "express";
import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  inArray,
  isNull,
  lt,
} from "drizzle-orm";
import {
  CreateBranchBody,
  CreateBranchResponse,
  CreatePrintRequestBody,
  CreatePrintRequestResponse,
  GetCurrentUserResponse,
  GetDashboardResponse,
  GetPrintRequestParams,
  GetPrintRequestResponse,
  ListBranchesResponse,
  ListPublicBranchesResponse,
  ListPrintRequestsQueryParams,
  ListPrintRequestsResponse,
  ListUsersResponse,
  PrinterLoginBody,
  PrinterLoginResponse,
  UpdatePrintRequestStatusBody,
  UpdatePrintRequestStatusParams,
  UpdatePrintRequestStatusResponse,
  UpdateUserAssignmentBody,
  UpdateUserAssignmentParams,
  UpdateUserAssignmentResponse,
} from "@workspace/api-zod";
import {
  branchesTable,
  db,
  printRequestsTable,
  requestStatusEnum,
  schoolUsersTable,
  uploadedFilesTable,
} from "@workspace/db";
import type { Response } from "express";
import type { Request } from "express";
import {
  clearPrinterSession,
  ensurePrinterBranches,
  findPrinterAccountForBranch,
  getPrinterProfile,
  getSchoolProfile,
  hasBranchAccess,
  isAdmin,
  setPrinterSession,
  type SchoolProfile,
  verifyPrinterCredentials,
} from "../lib/schoolAuth";
import { objectStorageService } from "../lib/objectStorage";
import { sql } from "drizzle-orm";

const router: IRouter = Router();

type RequestRow = {
  id: number;
  title: string;
  copies: number;
  dueAt: Date;
  note: string | null;
  status: (typeof requestStatusEnum.enumValues)[number];
  createdAt: Date;
  branchId: number;
  branchName: string;
  requesterName: string;
  attachments: Array<{
    fileIndex: number;
    name: string;
    size: number;
    contentType: string;
  }>;
};

async function activeProfile(
  req: Request,
  res: Response,
): Promise<SchoolProfile | null> {
  const profile = await getSchoolProfile(req);
  if (!profile) {
    res.status(401).json({ error: "Tizimga kirish kerak." });
    return null;
  }
  if (!profile.isActive) {
    res.status(403).json({ error: "Hisobingiz vaqtincha o‘chirilgan." });
    return null;
  }
  return profile;
}

function requestVisibility(profile: SchoolProfile) {
  if (profile.role === "admin") return undefined;
  if (profile.role === "printer") {
    return profile.branchId
      ? eq(printRequestsTable.branchId, profile.branchId)
      : sqlFalse();
  }
  return eq(printRequestsTable.requestedByUserId, profile.clerkId);
}

function sqlFalse() {
  return eq(printRequestsTable.id, -1);
}

function hashUploadToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

const loginAttempts = new Map<string, { count: number; resetAt: number }>();
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const MAX_LOGIN_ATTEMPTS = 8;

function isLoginRateLimited(ip: string): boolean {
  const now = Date.now();
  for (const [key, attempt] of loginAttempts) {
    if (attempt.resetAt <= now) loginAttempts.delete(key);
  }
  const current = loginAttempts.get(ip);
  if (!current || current.resetAt <= now) {
    loginAttempts.set(ip, { count: 0, resetAt: now + LOGIN_WINDOW_MS });
    return false;
  }
  return current.count >= MAX_LOGIN_ATTEMPTS;
}

function recordLoginFailure(ip: string): void {
  const current = loginAttempts.get(ip);
  if (current) current.count += 1;
}

async function loadRequests(
  profile: SchoolProfile,
  status?: string,
  requestId?: number,
): Promise<RequestRow[]> {
  const conditions = [
    requestVisibility(profile),
    status
      ? eq(
          printRequestsTable.status,
          status as (typeof requestStatusEnum.enumValues)[number],
        )
      : undefined,
    requestId ? eq(printRequestsTable.id, requestId) : undefined,
  ];
  const rows = await db
    .select({
      id: printRequestsTable.id,
      title: printRequestsTable.title,
      copies: printRequestsTable.copies,
      dueAt: printRequestsTable.dueAt,
      note: printRequestsTable.note,
      status: printRequestsTable.status,
      createdAt: printRequestsTable.createdAt,
      branchId: printRequestsTable.branchId,
      branchName: branchesTable.name,
      requesterName: sql<string>`coalesce(${printRequestsTable.requesterName}, ${schoolUsersTable.fullName}, 'Ustoz')`,
    })
    .from(printRequestsTable)
    .innerJoin(branchesTable, eq(printRequestsTable.branchId, branchesTable.id))
    .leftJoin(
      schoolUsersTable,
      eq(printRequestsTable.requestedByUserId, schoolUsersTable.clerkId),
    )
    .where(and(...conditions))
    .orderBy(asc(printRequestsTable.dueAt), asc(printRequestsTable.id));

  if (rows.length === 0) return [];
  const ids = rows.map((row) => row.id);
  const files = await db
    .select()
    .from(uploadedFilesTable)
    .where(inArray(uploadedFilesTable.requestId, ids))
    .orderBy(asc(uploadedFilesTable.id));
  const filesByRequest = new Map<number, typeof files>();
  for (const file of files) {
    if (file.requestId === null) continue;
    const requestFiles = filesByRequest.get(file.requestId) ?? [];
    requestFiles.push(file);
    filesByRequest.set(file.requestId, requestFiles);
  }

  return rows.map((row) => ({
    ...row,
    attachments: (filesByRequest.get(row.id) ?? []).map((file, fileIndex) => ({
      fileIndex,
      name: file.name,
      size: file.size,
      contentType: file.contentType,
    })),
  }));
}

router.get("/me", async (req, res): Promise<void> => {
  const profile = await getSchoolProfile(req);
  if (!profile) {
    res.status(401).json({ error: "Tizimga kirish kerak." });
    return;
  }
  res.json(GetCurrentUserResponse.parse(profile));
});

router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = PrinterLoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Login va parolni kiriting." });
    return;
  }
  const ip = req.ip || "unknown";
  if (isLoginRateLimited(ip)) {
    res.status(429).json({ error: "Urinishlar ko‘payib ketdi. 15 daqiqadan so‘ng qayta urinib ko‘ring." });
    return;
  }
  if (
    !(await verifyPrinterCredentials(
      parsed.data.username,
      parsed.data.password,
    ))
  ) {
    recordLoginFailure(ip);
    res.status(401).json({ error: "Login yoki parol noto‘g‘ri." });
    return;
  }

  await ensurePrinterBranches();
  const profile = await getPrinterProfile(parsed.data.username);
  if (!profile) {
    res.status(503).json({ error: "Filial hisobi vaqtincha ishlamayapti." });
    return;
  }
  loginAttempts.delete(ip);
  setPrinterSession(res, parsed.data.username);
  res.json(PrinterLoginResponse.parse(profile));
});

router.post("/auth/logout", (_req, res): void => {
  clearPrinterSession(res);
  res.json({ success: true });
});

router.get("/public/branches", async (_req, res): Promise<void> => {
  const branches = await ensurePrinterBranches();
  res.json(ListPublicBranchesResponse.parse(branches));
});

router.get("/dashboard", async (req, res): Promise<void> => {
  const profile = await activeProfile(req, res);
  if (!profile) return;

  const requests = await loadRequests(profile);
  const openRequests = requests.filter((request) =>
    ["queued", "in_progress", "ready"].includes(request.status),
  );
  const now = new Date();
  const urgentUntil = new Date(now.getTime() + 4 * 60 * 60 * 1000);
  const day = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tashkent",
  }).format(now);
  const dayStart = new Date(`${day}T00:00:00+05:00`);
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

  const completedConditions = [
    requestVisibility(profile),
    eq(printRequestsTable.status, "completed"),
    gte(printRequestsTable.completedAt, dayStart),
    lt(printRequestsTable.completedAt, dayEnd),
  ];
  const [completedCount] = await db
    .select({ value: count() })
    .from(printRequestsTable)
    .where(and(...completedConditions));

  res.json(
    GetDashboardResponse.parse({
      openCount: openRequests.length,
      urgentCount: requests.filter(
        (request) =>
          request.status === "queued" && request.dueAt <= urgentUntil,
      ).length,
      inProgressCount: requests.filter(
        (request) => request.status === "in_progress",
      ).length,
      readyCount: requests.filter((request) => request.status === "ready")
        .length,
      completedToday: completedCount.value,
      overdueCount: openRequests.filter((request) => request.dueAt < now).length,
    }),
  );
});

router.get("/branches", async (req, res): Promise<void> => {
  const profile = await activeProfile(req, res);
  if (!profile) return;

  const branches = profile.role === "admin"
    ? await db.select({ id: branchesTable.id, name: branchesTable.name })
        .from(branchesTable)
        .orderBy(asc(branchesTable.name))
    : profile.branchId
      ? await db
          .select({ id: branchesTable.id, name: branchesTable.name })
          .from(branchesTable)
          .where(eq(branchesTable.id, profile.branchId))
      : [];
  res.json(ListBranchesResponse.parse(branches));
});

router.post("/branches", async (req, res): Promise<void> => {
  const profile = await activeProfile(req, res);
  if (!profile) return;
  if (!isAdmin(profile)) {
    res.status(403).json({ error: "Faqat administrator filial qo‘sha oladi." });
    return;
  }
  const parsed = CreateBranchBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const name = parsed.data.name.trim();
  if (name.length < 2) {
    res.status(400).json({ error: "Filial nomi kamida 2 ta belgidan iborat bo‘lsin." });
    return;
  }
  try {
    const [branch] = await db
      .insert(branchesTable)
      .values({ name })
      .returning({ id: branchesTable.id, name: branchesTable.name });
    res.status(201).json(CreateBranchResponse.parse(branch));
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "23505"
    ) {
      res.status(409).json({ error: "Bu filial nomi allaqachon mavjud." });
      return;
    }
    throw error;
  }
});

router.get("/users", async (req, res): Promise<void> => {
  const profile = await activeProfile(req, res);
  if (!profile) return;
  if (!isAdmin(profile)) {
    res.status(403).json({ error: "Faqat administrator foydalanuvchilarni boshqaradi." });
    return;
  }

  const users = await db
    .select({
      clerkId: schoolUsersTable.clerkId,
      fullName: schoolUsersTable.fullName,
      email: schoolUsersTable.email,
      role: schoolUsersTable.role,
      branchId: schoolUsersTable.branchId,
      branchName: branchesTable.name,
      isActive: schoolUsersTable.isActive,
      createdAt: schoolUsersTable.createdAt,
    })
    .from(schoolUsersTable)
    .leftJoin(branchesTable, eq(schoolUsersTable.branchId, branchesTable.id))
    .orderBy(desc(schoolUsersTable.createdAt));
  res.json(ListUsersResponse.parse(users));
});

router.patch("/users/:clerkId", async (req, res): Promise<void> => {
  const profile = await activeProfile(req, res);
  if (!profile) return;
  if (!isAdmin(profile)) {
    res.status(403).json({ error: "Faqat administrator foydalanuvchilarni boshqaradi." });
    return;
  }
  const params = UpdateUserAssignmentParams.safeParse(req.params);
  const body = UpdateUserAssignmentBody.safeParse(req.body);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  if (body.data.role !== "admin" && body.data.branchId === null) {
    res.status(400).json({ error: "Ustoz yoki printerchi uchun filial tanlang." });
    return;
  }
  if (body.data.branchId !== null) {
    const [branch] = await db
      .select({ id: branchesTable.id })
      .from(branchesTable)
      .where(eq(branchesTable.id, body.data.branchId))
      .limit(1);
    if (!branch) {
      res.status(400).json({ error: "Tanlangan filial topilmadi." });
      return;
    }
  }

  const [target] = await db
    .select({
      clerkId: schoolUsersTable.clerkId,
      role: schoolUsersTable.role,
      isActive: schoolUsersTable.isActive,
    })
    .from(schoolUsersTable)
    .where(eq(schoolUsersTable.clerkId, params.data.clerkId))
    .limit(1);
  if (!target) {
    res.status(404).json({ error: "Foydalanuvchi topilmadi." });
    return;
  }

  if (
    target.role === "admin" &&
    target.isActive &&
    (body.data.role !== "admin" || !body.data.isActive)
  ) {
    const [adminCount] = await db
      .select({ value: count() })
      .from(schoolUsersTable)
      .where(
        and(
          eq(schoolUsersTable.role, "admin"),
          eq(schoolUsersTable.isActive, true),
        ),
      );
    if (adminCount.value <= 1) {
      res.status(409).json({
        error: "Maktabda kamida bitta faol administrator qolishi kerak.",
      });
      return;
    }
  }

  await db
    .update(schoolUsersTable)
    .set(body.data)
    .where(eq(schoolUsersTable.clerkId, params.data.clerkId));
  const [updated] = await db
    .select({
      clerkId: schoolUsersTable.clerkId,
      fullName: schoolUsersTable.fullName,
      email: schoolUsersTable.email,
      role: schoolUsersTable.role,
      branchId: schoolUsersTable.branchId,
      branchName: branchesTable.name,
      isActive: schoolUsersTable.isActive,
      createdAt: schoolUsersTable.createdAt,
    })
    .from(schoolUsersTable)
    .leftJoin(branchesTable, eq(schoolUsersTable.branchId, branchesTable.id))
    .where(eq(schoolUsersTable.clerkId, params.data.clerkId))
    .limit(1);
  res.json(UpdateUserAssignmentResponse.parse(updated));
});

router.get("/print-requests", async (req, res): Promise<void> => {
  const profile = await activeProfile(req, res);
  if (!profile) return;
  const query = ListPrintRequestsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }
  const requests = await loadRequests(profile, query.data.status);
  res.json(ListPrintRequestsResponse.parse(requests));
});

router.post("/print-requests", async (req, res): Promise<void> => {
  const parsed = CreatePrintRequestBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const branches = await ensurePrinterBranches();
  const branch = branches.find((candidate) => candidate.id === parsed.data.branchId);
  if (!branch) {
    res.status(400).json({ error: "Uchta mavjud filialdan birini tanlang." });
    return;
  }
  if (parsed.data.dueAt.getTime() <= Date.now()) {
    res.status(400).json({ error: "Kerakli vaqt kelajakda bo‘lishi kerak." });
    return;
  }

  const attachmentPaths = parsed.data.attachments.map((file) => file.objectPath);
  const uploadTokens = parsed.data.attachments.map((file) =>
    hashUploadToken(file.ownerToken),
  );
  if (
    new Set(attachmentPaths).size !== attachmentPaths.length ||
    new Set(uploadTokens).size !== uploadTokens.length
  ) {
    res.status(400).json({ error: "Bir xil faylni takroran qo‘shib bo‘lmaydi." });
    return;
  }
  const uploadedFiles = await db
    .select()
    .from(uploadedFilesTable)
    .where(
      and(
        isNull(uploadedFilesTable.requestId),
        inArray(uploadedFilesTable.objectPath, attachmentPaths),
        inArray(uploadedFilesTable.uploadToken, uploadTokens),
      ),
    );
  if (uploadedFiles.length !== parsed.data.attachments.length) {
    res.status(400).json({
      error: "Fayllardan biri sizga tegishli emas yoki avval boshqa buyurtmaga biriktirilgan.",
    });
    return;
  }
  const filesByPath = new Map(uploadedFiles.map((file) => [file.objectPath, file]));
  for (const attachment of parsed.data.attachments) {
    const stored = filesByPath.get(attachment.objectPath);
    if (
      !stored ||
      stored.uploadToken !== hashUploadToken(attachment.ownerToken) ||
      stored.name !== attachment.name ||
      stored.size !== attachment.size ||
      stored.contentType !== attachment.contentType
    ) {
      res.status(400).json({ error: "Fayl ma’lumotlari mos kelmadi." });
      return;
    }
    try {
      const objectFile = await objectStorageService.getObjectEntityFile(
        stored.objectPath,
      );
      const [metadata] = await objectFile.getMetadata();
      const actualSize = Number(metadata.size);
      if (
        !Number.isFinite(actualSize) ||
        actualSize !== stored.size ||
        actualSize > 15 * 1024 * 1024 ||
        metadata.contentType !== stored.contentType
      ) {
        res.status(400).json({
          error: `“${stored.name}” faylining hajmi yoki turi mos kelmadi.`,
        });
        return;
      }
    } catch {
      res.status(400).json({
        error: `“${stored.name}” fayli yuklanmagan. Qayta yuklab ko‘ring.`,
      });
      return;
    }
  }

  const created = await db.transaction(async (tx) => {
    const [request] = await tx
      .insert(printRequestsTable)
      .values({
        title: parsed.data.title.trim(),
        requesterName: parsed.data.requesterName.trim(),
        copies: parsed.data.copies,
        dueAt: parsed.data.dueAt,
        note: parsed.data.note?.trim() || null,
        branchId: branch.id,
        requestedByUserId: null,
      })
      .returning();
    await tx
      .update(uploadedFilesTable)
      .set({ requestId: request.id })
      .where(
        and(
          isNull(uploadedFilesTable.requestId),
          inArray(uploadedFilesTable.objectPath, attachmentPaths),
          inArray(uploadedFilesTable.uploadToken, uploadTokens),
        ),
      );
    return request;
  });

  const printerUsername = await findPrinterAccountForBranch(branch.id);
  const profile = printerUsername
    ? await getPrinterProfile(printerUsername)
    : null;
  if (!profile) {
    res.status(500).json({ error: "So‘rov saqlandi, lekin uni qaytarib bo‘lmadi." });
    return;
  }
  const [request] = await loadRequests(profile, undefined, created.id);
  res.status(201).json(CreatePrintRequestResponse.parse(request));
});

router.get("/print-requests/:id", async (req, res): Promise<void> => {
  const profile = await activeProfile(req, res);
  if (!profile) return;
  const params = GetPrintRequestParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [request] = await loadRequests(profile, undefined, params.data.id);
  if (!request) {
    res.status(404).json({ error: "Buyurtma topilmadi." });
    return;
  }
  res.json(GetPrintRequestResponse.parse(request));
});

router.patch("/print-requests/:id/status", async (req, res): Promise<void> => {
  const profile = await activeProfile(req, res);
  if (!profile) return;
  if (profile.role !== "admin" && profile.role !== "printer") {
    res.status(403).json({ error: "Faqat printerchi buyurtma holatini o‘zgartira oladi." });
    return;
  }
  const params = UpdatePrintRequestStatusParams.safeParse(req.params);
  const body = UpdatePrintRequestStatusBody.safeParse(req.body);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  const [current] = await db
    .select()
    .from(printRequestsTable)
    .where(eq(printRequestsTable.id, params.data.id))
    .limit(1);
  if (!current || !hasBranchAccess(profile, current.branchId)) {
    res.status(404).json({ error: "Buyurtma topilmadi." });
    return;
  }
  const transitions: Record<
    (typeof requestStatusEnum.enumValues)[number],
    Array<(typeof requestStatusEnum.enumValues)[number]>
  > = {
    queued: ["in_progress", "cancelled"],
    in_progress: ["ready", "cancelled"],
    ready: ["completed", "cancelled"],
    completed: [],
    cancelled: [],
  };
  if (
    profile.role !== "admin" &&
    !transitions[current.status].includes(body.data.status)
  ) {
    res.status(409).json({ error: "Buyurtma holatini bu bosqichga o‘tkazib bo‘lmaydi." });
    return;
  }

  await db
    .update(printRequestsTable)
    .set({
      status: body.data.status,
      completedAt: body.data.status === "completed" ? new Date() : null,
      updatedAt: new Date(),
    })
    .where(eq(printRequestsTable.id, params.data.id));
  const [updated] = await loadRequests(profile, undefined, params.data.id);
  res.json(UpdatePrintRequestStatusResponse.parse(updated));
});

export default router;