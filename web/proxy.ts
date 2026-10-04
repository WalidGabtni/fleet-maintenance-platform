import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Paths the proxy never gates behind auth (e.g. the invite/magic-link callback,
// which is what establishes the session in the first place).
const AUTH_EXEMPT_PATHS = ["/auth/finish"];
// Paths only a signed-out visitor should see; authenticated users get bounced to "/".
const PUBLIC_ONLY_PATHS = ["/login", "/forgot-password"];

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  if (AUTH_EXEMPT_PATHS.some((path) => request.nextUrl.pathname.startsWith(path))) {
    return response;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("active, is_platform_admin, tenants(active)")
      .eq("id", user.id)
      .maybeSingle();

    if (profile && !profile.active) {
      await supabase.auth.signOut();
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("error", "Votre compte a été désactivé. Contactez un administrateur.");
      const redirectResponse = NextResponse.redirect(url);
      for (const cookie of response.cookies.getAll()) {
        redirectResponse.cookies.set(cookie);
      }
      return redirectResponse;
    }

    // A suspended tenant blocks its members the same way — except platform
    // admins, who must stay able to reach /platform-admin to un-suspend it.
    // (Their own tenant's business data stays blocked regardless — this only
    // exempts them from being signed out at the door.)
    // PostgREST returns a to-one embed as a plain object, but the generated
    // types call it an array — read defensively so this doesn't silently
    // break again if that ever flips.
    const tenantsField = profile?.tenants as { active: boolean } | { active: boolean }[] | null | undefined;
    const tenantActive = Array.isArray(tenantsField) ? tenantsField[0]?.active : tenantsField?.active;
    if (profile && !profile.is_platform_admin && tenantActive === false) {
      await supabase.auth.signOut();
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("error", "Ce compte a été suspendu. Contactez l'administrateur de la plateforme.");
      const redirectResponse = NextResponse.redirect(url);
      for (const cookie of response.cookies.getAll()) {
        redirectResponse.cookies.set(cookie);
      }
      return redirectResponse;
    }
  }

  const isPublicOnlyPath = PUBLIC_ONLY_PATHS.includes(request.nextUrl.pathname);

  if (!user && !isPublicOnlyPath) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && isPublicOnlyPath) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
