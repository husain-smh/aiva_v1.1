import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Check if the path is protected
  const isProtectedPath = path.startsWith('/chat');
  
  if (!isProtectedPath) {
    return NextResponse.next();
  }

  const token = await getToken({ req: request });

  // If the user is not logged in, redirect to the home page
  if (!token) {
    const url = new URL('/', request.url);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/chat/:path*'],
}; 