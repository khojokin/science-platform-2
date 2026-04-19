
import { NextResponse } from "next/server";
import { getDemoScenarios, getInvestorDemoSnapshot } from "@/lib/demo";

export async function GET() {
  const [scenarios, investor] = await Promise.all([getDemoScenarios(), getInvestorDemoSnapshot()]);
  return NextResponse.json({ scenarios, investor });
}
