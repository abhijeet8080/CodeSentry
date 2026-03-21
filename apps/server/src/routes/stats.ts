import { Hono } from "hono";
import { prisma } from "../lib/db";

const stats = new Hono();

stats.get("/", async (c) => {
  const total = await prisma.reviewJob.count();

  const completed = await prisma.reviewJob.count({
    where: { status: "completed" }
  });

  const failed = await prisma.reviewJob.count({
    where: { status: "failed" }
  });

  return c.json({
    total,
    completed,
    failed
  });
});

export default stats;
