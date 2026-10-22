import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { mkdtempSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PrismaService } from '../../prisma/prisma.service';
import { AssetsService } from '../assets.service';

describe('AssetsService', () => {
  const prisma = new PrismaService();
  const dir = mkdtempSync(join(tmpdir(), 'cg-assets-'));
  const config = { publicBaseUrl: async () => 'http://localhost:8099' } as any;
  const service = new AssetsService(prisma, { ASSET_DIR: dir } as any, config);

  beforeAll(async () => {
    await prisma.$connect();
  });
  afterEach(async () => {
    await prisma.asset.deleteMany();
  });
  afterAll(async () => {
    await prisma.$disconnect();
    rmSync(dir, { recursive: true, force: true });
  });

  it('saves a buffer to disk and records an Asset row with a URL', async () => {
    const asset = await service.saveFile(Buffer.from('hello'), { originalname: 'a.png', mimetype: 'image/png', kind: 'image' });
    expect(asset.url).toContain('/api/assets/file/');
    expect(existsSync(join(dir, asset.filename))).toBe(true);
    const row = await prisma.asset.findUnique({ where: { id: asset.id } });
    expect(row?.mimetype).toBe('image/png');
  });

  it('rejects a file larger than 15MB', async () => {
    const big = Buffer.alloc(15 * 1024 * 1024 + 1);
    await expect(service.saveFile(big, { originalname: 'big.bin', mimetype: 'application/octet-stream', kind: 'attachment' })).rejects.toThrow();
  });

  it('deletes the row and the file', async () => {
    const asset = await service.saveFile(Buffer.from('x'), { originalname: 'x.txt', mimetype: 'text/plain', kind: 'attachment' });
    await service.deleteFile(asset.id);
    expect(existsSync(join(dir, asset.filename))).toBe(false);
    expect(await prisma.asset.findUnique({ where: { id: asset.id } })).toBeNull();
  });
});
