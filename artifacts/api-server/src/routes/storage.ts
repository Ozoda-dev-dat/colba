import express, { Router, type IRouter } from "express";
import { createHash, randomBytes } from "node:crypto";
import { and, asc, eq, isNull } from "drizzle-orm";
import {
  GetPrintRequestFileParams,
  RequestUploadUrlBody,
  RequestUploadUrlResponse,
} from "@workspace/api-zod";
import { db, printRequestsTable, uploadedFilesTable } from "@workspace/db";
import type { Request, Response } from "express";
import {
  getSchoolProfile,
  hasBranchAccess,
  type SchoolProfile,
} from "../lib/schoolAuth";

const router: IRouter = Router();
const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);
const uploadAttempts = new Map<string, { count: number; resetAt: number }>();

function hashUploadToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

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

router.post("/storage/uploads/request-url", async (req, res): Promise<void> => {
  const now = Date.now();
  for (const [key, attempt] of uploadAttempts) {
    if (attempt.resetAt <= now) uploadAttempts.delete(key);
  }
  const ip = req.ip || "unknown";
  const current = uploadAttempts.get(ip);
  if (current && current.count >= 30 && current.resetAt > now) {
    res.status(429).json({ error: "Juda ko‘p fayl yuklandi. Keyinroq qayta urinib ko‘ring." });
    return;
  }
  const parsed = RequestUploadUrlBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const contentType = parsed.data.contentType.toLowerCase();
  if (parsed.data.size > MAX_UPLOAD_BYTES) {
    res.status(400).json({ error: "Har bir fayl 50 MB gacha bo‘lishi kerak." });
    return;
  }
  if (!ALLOWED_TYPES.has(contentType)) {
    res.status(400).json({
      error: "PDF, JPG, PNG, WEBP yoki Word faylini yuklang.",
    });
    return;
  }

  const ownerToken = randomBytes(32).toString("hex");
  const uploadId = randomBytes(16).toString("hex");
  const objectPath = `/objects/uploads/${uploadId}`;
  const currentAttempt = uploadAttempts.get(ip);
  if (currentAttempt && currentAttempt.resetAt > now) {
    currentAttempt.count += 1;
  } else {
    uploadAttempts.set(ip, { count: 1, resetAt: now + 60 * 60 * 1000 });
  }
  await db.insert(uploadedFilesTable).values({
    objectPath,
    ownerClerkId: null,
    uploadToken: hashUploadToken(ownerToken),
    name: parsed.data.name,
    size: parsed.data.size,
    contentType,
  });
  res.json(
    RequestUploadUrlResponse.parse({
      uploadURL: `/api/storage/uploads/${uploadId}`,
      objectPath,
      ownerToken,
    }),
  );
});

router.put(
  "/storage/uploads/:uploadId",
  express.raw({ type: "*/*", limit: MAX_UPLOAD_BYTES }),
  async (req, res): Promise<void> => {
    const uploadId = req.params.uploadId;
    const ownerToken = req.get("x-upload-token");
    const objectPath = `/objects/uploads/${uploadId}`;
    if (!/^[a-f0-9]{32}$/.test(uploadId) || !ownerToken) {
      res.status(400).json({ error: "Fayl yuklash ma’lumoti noto‘g‘ri." });
      return;
    }
    if (!Buffer.isBuffer(req.body)) {
      res.status(400).json({ error: "Fayl ma’lumotlari olinmadi." });
      return;
    }
    const [stored] = await db
      .select({
        id: uploadedFilesTable.id,
        uploadToken: uploadedFilesTable.uploadToken,
        size: uploadedFilesTable.size,
        contentType: uploadedFilesTable.contentType,
        requestId: uploadedFilesTable.requestId,
      })
      .from(uploadedFilesTable)
      .where(eq(uploadedFilesTable.objectPath, objectPath))
      .limit(1);
    if (
      !stored ||
      stored.requestId !== null ||
      stored.uploadToken !== hashUploadToken(ownerToken)
    ) {
      res.status(404).json({ error: "Yuklash manzili topilmadi." });
      return;
    }
    if (
      req.body.length !== stored.size ||
      req.body.length > MAX_UPLOAD_BYTES ||
      req.get("content-type")?.split(";")[0].trim().toLowerCase() !==
        "application/octet-stream"
    ) {
      res.status(400).json({ error: "Fayl hajmi yoki turi mos kelmadi." });
      return;
    }
    const [updated] = await db
      .update(uploadedFilesTable)
      .set({ fileData: req.body })
      .where(
        and(
          eq(uploadedFilesTable.id, stored.id),
          isNull(uploadedFilesTable.requestId),
          eq(uploadedFilesTable.uploadToken, hashUploadToken(ownerToken)),
        ),
      )
      .returning({ id: uploadedFilesTable.id });
    if (!updated) {
      res.status(404).json({ error: "Yuklash manzili topilmadi." });
      return;
    }
    res.status(204).end();
  },
);

router.get(
  "/storage/requests/:requestId/files/:fileIndex",
  async (req, res): Promise<void> => {
    const profile = await activeProfile(req, res);
    if (!profile) return;
    const params = GetPrintRequestFileParams.safeParse(req.params);
    if (!params.success) {
      res.status(404).json({ error: "Fayl topilmadi." });
      return;
    }
    const [request] = await db
      .select({
        id: printRequestsTable.id,
        branchId: printRequestsTable.branchId,
        requestedByUserId: printRequestsTable.requestedByUserId,
      })
      .from(printRequestsTable)
      .where(eq(printRequestsTable.id, params.data.requestId))
      .limit(1);
    if (
      !request ||
      !hasBranchAccess(profile, request.branchId) ||
      (profile.role === "teacher" &&
        request.requestedByUserId !== profile.clerkId)
    ) {
      res.status(404).json({ error: "Fayl topilmadi." });
      return;
    }

    const files = await db
      .select({
        name: uploadedFilesTable.name,
        size: uploadedFilesTable.size,
        contentType: uploadedFilesTable.contentType,
        fileData: uploadedFilesTable.fileData,
      })
      .from(uploadedFilesTable)
      .where(eq(uploadedFilesTable.requestId, request.id))
      .orderBy(asc(uploadedFilesTable.id))
      .limit(1)
      .offset(params.data.fileIndex);
    const attachment = files[0];
    if (!attachment || !Buffer.isBuffer(attachment.fileData)) {
      res.status(404).json({ error: "Fayl topilmadi." });
      return;
    }

    const safeName = encodeURIComponent(attachment.name).replace(/'/g, "%27");
    res.setHeader("Content-Type", attachment.contentType);
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename*=UTF-8''${safeName}`,
    );
    res.setHeader("Cache-Control", "private, no-store");
    res.setHeader("Content-Length", String(attachment.size));
    res.end(attachment.fileData);
  },
);

export default router;
