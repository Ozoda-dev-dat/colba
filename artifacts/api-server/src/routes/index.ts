import { Router, type IRouter } from "express";
import healthRouter from "./health";
import schoolRouter from "./school";
import storageRouter from "./storage";

const router: IRouter = Router();

router.use(healthRouter);
router.use(schoolRouter);
router.use(storageRouter);

export default router;
