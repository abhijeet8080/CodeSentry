import "./worker";
import { logger } from "@config/logger";
import { startHealthServer } from "./health";

const healthPort = Number(process.env.WORKER_HEALTH_PORT ?? 3030);
startHealthServer(healthPort);

logger.info("Worker started");

