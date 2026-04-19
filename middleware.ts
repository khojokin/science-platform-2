import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { isClerkConfigured } from "@/lib/auth-config";

const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/onboarding(.*)",
  "/feed(.*)",
  "/communities(.*)",
  "/groups(.*)",
  "/messages(.*)",
  "/notifications(.*)",
  "/workspaces(.*)",
  "/search(.*)",
  "/labs(.*)",
  "/vault(.*)",
  "/bounties(.*)",
  "/events(.*)",
  "/recordings(.*)",
  "/experts(.*)",
  "/ambassadors(.*)",
  "/ai(.*)",
  "/calendar(.*)",
  "/pricing(.*)",
  "/profile(.*)",
  "/moderation(.*)",
  "/ops(.*)",
  "/admin(.*)",
  "/calls(.*)",
  "/api/checkout(.*)",
  "/api/zoom(.*)",
  "/api/ai(.*)",
  "/api/portal(.*)",
  "/api/livekit(.*)",
  "/api/calendar/google/start(.*)",
  "/api/mobile(.*)"
]);

const authenticatedMiddleware = clerkMiddleware(async (auth, request) => {
  if (isProtectedRoute(request)) {
    await auth.protect();
  }
});

const unauthenticatedMiddleware = (request: NextRequest) => {
  if (isProtectedRoute(request)) {
    if (request.nextUrl.pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Authentication is not configured." }, { status: 503 });
    }

    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
};

const middleware = isClerkConfigured ? authenticatedMiddleware : unauthenticatedMiddleware;

export default middleware;

export const config = {
  matcher: [
    "/((?!_next|[^?]*\.(?:html?|css|js(?!on)|png|jpg|jpeg|gif|svg|webp|ico|ttf|woff2?|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)"
  ]
};
