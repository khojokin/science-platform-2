import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { dispatchDueJobs } from "@/lib/background-jobs";

export async function POST(request: Request) {
  const secret = request.headers.get("x-jobs-secret") ?? "";
  if (!env.jobsDispatchSecret || secret !== env.jobsDispatchSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const batchSize = Number(body?.batchSize ?? 20);
  const summary = await dispatchDueJobs({
    workerName: "api-dispatch",
    batchSize: Number.isFinite(batchSize) ? Math.min(Math.max(batchSize, 1), 50) : 20
  });

  return NextResponse.json(summary);
}
