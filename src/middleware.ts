export { auth as middleware } from '@/lib/auth';

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/wizard/:path*',
    '/recommendations/:path*',
    '/funding/:path*',
  ],
};
