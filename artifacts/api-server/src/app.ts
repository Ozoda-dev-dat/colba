import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();
app.set("trust proxy", 1);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

// WEB_ORIGIN o'rnatilgan bo'lsa o'shani, bo'lmasa Vercel / Localhost domenlarini qo'llab-quvvatlash
const webOrigin = process.env.WEB_ORIGIN?.trim();

app.use(
  cors({
    origin: webOrigin || true, // Agar WEB_ORIGIN bo'lmasa, kelgan manzilni avtomatik qabul qiladi
    credentials: true,
  }),
);

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

export default app;
