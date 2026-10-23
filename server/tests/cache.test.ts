import { describe, it, expect, beforeEach } from 'vitest';
import cacheService from '../src/services/cache.service';

describe('CacheService Unit Tests', () => {
  beforeEach(async () => {
    await cacheService.invalidatePattern('test:*');
  });

  it('should set and get values correctly', async () => {
    const payload = { id: 'proj-1', name: 'Project Alpha', count: 42 };
    await cacheService.set('test:project:1', payload, 60);

    const retrieved = await cacheService.get<typeof payload>('test:project:1');
    expect(retrieved).toEqual(payload);
  });

  it('should return null for non-existent keys', async () => {
    const result = await cacheService.get('test:does:not:exist');
    expect(result).toBeNull();
  });

  it('should delete keys explicitly with del', async () => {
    await cacheService.set('test:key:to:delete', { active: true }, 60);
    expect(await cacheService.get('test:key:to:delete')).toEqual({ active: true });

    await cacheService.del('test:key:to:delete');
    expect(await cacheService.get('test:key:to:delete')).toBeNull();
  });

  it('should invalidate matching keys by pattern wildcard', async () => {
    await cacheService.set('test:workspace:ws-101:user:usr-1', ['project-a'], 60);
    await cacheService.set('test:workspace:ws-101:user:usr-2', ['project-b'], 60);
    await cacheService.set('test:workspace:ws-202:user:usr-1', ['project-c'], 60);

    await cacheService.invalidatePattern('test:workspace:ws-101:*');

    expect(await cacheService.get('test:workspace:ws-101:user:usr-1')).toBeNull();
    expect(await cacheService.get('test:workspace:ws-101:user:usr-2')).toBeNull();
    // ws-202 should remain unaffected
    expect(await cacheService.get('test:workspace:ws-202:user:usr-1')).toEqual(['project-c']);
  });

  it('should respect TTL expiration', async () => {
    // Set TTL to 0 seconds or simulate expired
    await cacheService.set('test:expiring:key', { data: 'temporary' }, 0);
    // Wait tiny interval to ensure expiry timestamp is passed
    await new Promise((resolve) => setTimeout(resolve, 50));

    const result = await cacheService.get('test:expiring:key');
    expect(result).toBeNull();
  });
});
