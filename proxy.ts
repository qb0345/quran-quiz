import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options);
        },
      },
    },
  );

  const { data: { user } } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;

  if (path.startsWith('/admin')) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = '/auth/login';
      url.searchParams.set('next', path);
      return NextResponse.redirect(url);
    }
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    if (profile?.role !== 'admin') return new NextResponse('Forbidden', { status: 403 });
    // AAL2 (TOTP) is not enforced on the admin route by default. TOTP enroll
    // remains available at /profile/security; login flow still routes through
    // /auth/mfa when a user has an enrolled factor. Uncomment the block below
    // to require AAL2 for /admin/*.
    // const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    // if (aalData?.currentLevel !== 'aal2') {
    //   const url = request.nextUrl.clone();
    //   url.pathname = '/auth/mfa';
    //   url.searchParams.set('next', path);
    //   return NextResponse.redirect(url);
    // }
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
