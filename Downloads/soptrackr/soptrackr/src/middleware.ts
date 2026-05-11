import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

// Routes that REQUIRE the user to be signed in.
// Everything else (marketing pages, auth pages, public APIs) stays public.
// /admin requires sign-in here; super-admin authorization happens inside the
// route handlers via requireSuperAdmin().
const isProtectedRoute = createRouteMatcher([
  '/app(.*)',
  '/admin(.*)',
]);

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    const { userId, redirectToSignIn } = await auth();
    if (!userId) {
      return redirectToSignIn({ returnBackUrl: req.url });
    }
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
