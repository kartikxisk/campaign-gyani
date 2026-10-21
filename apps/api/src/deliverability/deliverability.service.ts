import { Injectable } from '@nestjs/common';
import { resolveTxt } from 'node:dns/promises';
import { parseSpf, parseDmarc, parseDkim, scoreSpam, type RecordCheck, type SpamResult } from './dns-checks';

export interface DomainReport {
  domain: string;
  spf: RecordCheck;
  dmarc: RecordCheck;
  dkim: RecordCheck;
}

@Injectable()
export class DeliverabilityService {
  private async txt(host: string): Promise<string[][] | null> {
    try {
      return await resolveTxt(host);
    } catch {
      // ENODATA / ENOTFOUND / NXDOMAIN all mean "no usable record here".
      return null;
    }
  }

  async checkDomain(domain: string, selector?: string): Promise<DomainReport> {
    const clean = domain.trim().toLowerCase().replace(/^.*@/, '');
    const [root, dmarc, dkim] = await Promise.all([
      this.txt(clean),
      this.txt(`_dmarc.${clean}`),
      selector ? this.txt(`${selector}._domainkey.${clean}`) : Promise.resolve(null),
    ]);
    return {
      domain: clean,
      spf: parseSpf(root ?? []),
      dmarc: parseDmarc(dmarc ?? []),
      dkim: parseDkim(selector ? dkim : null, selector),
    };
  }

  scoreContent(input: { subject?: string; html?: string; text?: string }): SpamResult {
    return scoreSpam(input);
  }
}
