export type DashboardRole = 'admin' | 'analyst';

const PUBLIC_ROUTES = [
    '/login',
    '/api/auth/login',
    '/api/health',
    '/_next',
    '/favicon.ico',
];

const ADMIN_ONLY_PREFIXES = [
    '/api/debug',
    '/api/system/fix',
    '/api/logs/cleanup',
    '/api/email/test',
];

export function isPublicRoute(pathname: string): boolean {
    return PUBLIC_ROUTES.some(route => pathname === route || pathname.startsWith(`${route}/`));
}

export function isAdminOnly(pathname: string, method: string): boolean {
    if (ADMIN_ONLY_PREFIXES.some(prefix => pathname === prefix || pathname.startsWith(`${prefix}/`))) {
        return true;
    }
    if (['/api/settings', '/api/rules'].includes(pathname)) return true;
    if (method !== 'GET' && pathname === '/api/wazuh/agents') return true;
    return false;
}

export function canAccess(role: DashboardRole, pathname: string, method: string): boolean {
    return !isAdminOnly(pathname, method) || role === 'admin';
}
