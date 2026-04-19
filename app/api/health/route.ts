import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "science-platform",
    timestamp: new Date().toISOString()
  });
}
