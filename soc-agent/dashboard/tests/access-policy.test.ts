import assert from 'node:assert/strict';
import test from 'node:test';

import { canAccess, isAdminOnly, isPublicRoute } from '../lib/access-policy.ts';

test('only explicitly declared routes are public', () => {
    assert.equal(isPublicRoute('/login'), true);
    assert.equal(isPublicRoute('/api/auth/login'), true);
    assert.equal(isPublicRoute('/api/health'), true);
    assert.equal(isPublicRoute('/api/settings'), false);
    assert.equal(isPublicRoute('/api/debug/wazuh'), false);
});

test('analyst cannot access administrative routes', () => {
    const adminRoutes = [
        ['/api/debug/wazuh', 'GET'],
        ['/api/system/fix', 'POST'],
        ['/api/logs/cleanup', 'POST'],
        ['/api/email/test', 'POST'],
        ['/api/settings', 'GET'],
        ['/api/rules', 'POST'],
        ['/api/wazuh/agents', 'POST'],
    ] as const;

    for (const [pathname, method] of adminRoutes) {
        assert.equal(isAdminOnly(pathname, method), true);
        assert.equal(canAccess('analyst', pathname, method), false);
        assert.equal(canAccess('admin', pathname, method), true);
    }
});

test('analyst retains read access to non-administrative SOC data', () => {
    assert.equal(canAccess('analyst', '/api/wazuh/agents', 'GET'), true);
    assert.equal(canAccess('analyst', '/api/wazuh/alerts', 'GET'), true);
    assert.equal(canAccess('analyst', '/api/logs', 'GET'), true);
});
