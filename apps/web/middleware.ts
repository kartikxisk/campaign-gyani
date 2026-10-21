import { NextResponse, type NextRequest } from 'next/server';

// Cheap gate: presence of the session cookie. The API is the real authority
// (401 on protected routes); this only avoids flashing the admin shell.
export function middleware(req: NextRequest) {
  const hasSession = req.cookies.has('cg.sid');
  const { pathname } = req.nextUrl;
  if (!hasSession && !pathname.startsWith('/login')) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  // Admin + login only; exclude api, public report/view, and static assets.
  matcher: ['/((?!api|v/|r/|_next|fonts|favicon).*)'],
};
