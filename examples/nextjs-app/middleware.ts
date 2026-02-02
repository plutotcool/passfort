import { withPasswordProtect } from '@tommyvez/passfort/next';

export default withPasswordProtect({
  paths: ['/admin', '/dashboard'],
});

export const config = {
  matcher: ['/admin', '/admin/:path*', '/dashboard', '/dashboard/:path*'],
};
