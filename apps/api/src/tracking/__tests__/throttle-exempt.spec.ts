import 'reflect-metadata';
import { describe, it, expect } from 'vitest';
import { THROTTLER_SKIP } from '@nestjs/throttler/dist/throttler.constants';
import { TrackingController } from '../tracking.controller';
import { HealthController } from '../../health/health.controller';

// The global ThrottlerGuard caps every route at 300 req/min/IP. The high-volume
// GET tracking beacons (open pixel, click redirect, view, report, unsubscribe)
// are hit from shared corporate egress IPs — many recipients behind one NAT —
// so a per-IP cap would silently drop opens/clicks and undercount the campaign.
// Those opt out. The unauthenticated POST /t/s/:rid write stays throttled.
const SKIP_KEY = `${THROTTLER_SKIP}default`;
const skipped = (target: unknown): boolean => Reflect.getMetadata(SKIP_KEY, target as object) === true;
const proto = TrackingController.prototype;

describe('throttle exemptions', () => {
  it('skips throttling on the GET tracking beacons', () => {
    for (const m of ['open', 'click', 'view', 'report', 'unsubscribe'] as const) {
      expect(skipped(proto[m])).toBe(true);
    }
  });

  it('keeps throttling on the unauthenticated submit write', () => {
    expect(skipped(proto.submit)).not.toBe(true);
    expect(skipped(TrackingController)).not.toBe(true);
  });

  it('skips throttling on the health controller', () => {
    expect(skipped(HealthController)).toBe(true);
  });
});
