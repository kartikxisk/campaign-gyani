export interface CircuitOptions {
  threshold: number;
  cooldownMs: number;
}

interface HostState {
  failures: number;
  openUntil: number;
}

/**
 * Per-host failure breaker. After `threshold` consecutive failures a host is
 * "open" (skipped) for `cooldownMs`; a success closes it. In-memory: one worker
 * process per single-box deployment. Move to Redis if the worker is scaled out.
 */
export class Circuit {
  private readonly hosts = new Map<string, HostState>();
  constructor(private readonly opts: CircuitOptions = { threshold: 5, cooldownMs: 30_000 }) {}

  canSend(host: string, now = Date.now()): boolean {
    const s = this.hosts.get(host);
    if (!s) return true;
    if (s.openUntil > now) return false;
    return true;
  }

  recordSuccess(host: string): void {
    this.hosts.set(host, { failures: 0, openUntil: 0 });
  }

  recordFailure(host: string, now = Date.now()): void {
    const s = this.hosts.get(host) ?? { failures: 0, openUntil: 0 };
    s.failures += 1;
    if (s.failures >= this.opts.threshold) {
      s.openUntil = now + this.opts.cooldownMs;
      s.failures = 0;
    }
    this.hosts.set(host, s);
  }
}

export class CircuitOpenError extends Error {}
