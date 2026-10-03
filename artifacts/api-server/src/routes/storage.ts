import { Router, type IRouter } from "express";
import { asc, eq } from "drizzle-orm";
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
import { objectStorageService } from "../lib/objectStorage";

const router: IRouter = Router();
const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

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
  const profile = await activeProfile(req, res);
  if (!profile) return;
  if (profile.role !== "teacher" || profile.branchId === null) {
    res.status(403).json({
      error: "Fayl yuklash uchun ustoz roli va filial biriktirilgan bo‘lishi kerak.",
    });
    return;
  }
  const parsed = RequestUploadUrlBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const contentType = parsed.data.contentType.toLowerCase();
  if (parsed.data.size > MAX_UPLOAD_BYTES) {
    res.status(400).json({ error: "Har bir fayl 15 MB dan kichik bo‘lishi kerak." });
    return;
  }
  if (!ALLOWED_TYPES.has(contentType)) {
    res.status(400).json({
      error: "PDF, JPG, PNG, WEBP yoki Word faylini yuklang.",
    });
    return;
  }

  const upload = await objectStorageService.getObjectEntityUploadUrlWithPath();
  await db.insert(uploadedFilesTable).values({
    objectPath: upload.objectPath,
    ownerClerkId: profile.clerkId,
    name: parsed.data.name,
    size: parsed.data.size,
    contentType,
  });
  res.json(
    RequestUploadUrlResponse.parse({
      uploadURL: upload.uploadURL,
      objectPath: upload.objectPath,
    }),
  );
});

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
      .select()
      .from(uploadedFilesTable)
      .where(eq(uploadedFilesTable.requestId, request.id))
      .orderBy(asc(uploadedFilesTable.id));
    const attachment = files[params.data.fileIndex];
    if (!attachment) {
      res.status(404).json({ error: "Fayl topilmadi." });
      return;
    }

    const objectFile = await objectStorageService.getObjectEntityFile(
      attachment.objectPath,
    );
    const [metadata] = await objectFile.getMetadata();
    const safeName = encodeURIComponent(attachment.name).replace(/'/g, "%27");
    res.setHeader("Content-Type", attachment.contentType);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename*=UTF-8''${safeName}`,
    );
    res.setHeader("Cache-Control", "private, no-store");
    if (metadata.size) {
      res.setHeader("Content-Length", String(metadata.size));
    }
    const stream = objectFile.createReadStream();
    stream.on("error", (error: Error) => {
      req.log.error({ err: error, requestId: request.id }, "Attachment stream failed");
      if (!res.headersSent) {
        res.status(404).json({ error: "Faylni yuklab bo‘lmadi." });
      } else {
        res.destroy(error);
      }
    });
    stream.pipe(res);
  },
);

export default router;