import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { mkdir, writeFile, unlink } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { join, resolve, basename } from 'node:path';
import type { Asset } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ENV } from '../config/config.module';
import { ConfigStoreService } from '../config-store/config.service';
import type { Env } from '../config/env';
import { extForUpload } from './mime';

export const MAX_FILE_SIZE = 15 * 1024 * 1024;

export interface SaveFileMeta {
  originalname: string;
  mimetype: string;
  kind: string;
}
export type AssetWithUrl = Asset & { url: string };

@Injectable()
export class AssetsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(ENV) private readonly env: Pick<Env, 'ASSET_DIR'>,
    private readonly config: ConfigStoreService,
  ) {}

  private withUrl(base: string, asset: Asset): AssetWithUrl {
    return { ...asset, url: `${base}/api/assets/file/${asset.filename}` };
  }

  async saveFile(buffer: Buffer, meta: SaveFileMeta): Promise<AssetWithUrl> {
    if (buffer.length > MAX_FILE_SIZE) {
      throw new BadRequestException('File exceeds the 15MB limit');
    }
    const ext = extForUpload(meta.kind, meta.mimetype);
    if (ext === null) {
      throw new BadRequestException('Unsupported image type (allowed: PNG, JPEG, GIF, WebP, ICO)');
    }
    await mkdir(this.env.ASSET_DIR, { recursive: true });
    const filename = `${randomBytes(16).toString('hex')}${ext}`;
    await writeFile(join(this.env.ASSET_DIR, filename), buffer);
    const asset = await this.prisma.asset.create({
      data: { filename, path: join(this.env.ASSET_DIR, filename), mimetype: meta.mimetype, size: buffer.length, kind: meta.kind },
    });
    return this.withUrl(await this.config.publicBaseUrl(), asset);
  }

  async list(): Promise<AssetWithUrl[]> {
    const rows = await this.prisma.asset.findMany({ orderBy: { createdAt: 'desc' } });
    const base = await this.config.publicBaseUrl();
    return rows.map((a) => this.withUrl(base, a));
  }

  async deleteFile(id: string): Promise<void> {
    const asset = await this.prisma.asset.findUnique({ where: { id } });
    if (!asset) throw new NotFoundException('Asset not found');
    await unlink(asset.path).catch(() => undefined);
    await this.prisma.asset.delete({ where: { id } });
  }

  async findByFilename(filename: string): Promise<Asset | null> {
    return this.prisma.asset.findFirst({ where: { filename } });
  }

  /** Resolve a safe absolute path for a stored filename, guarding against traversal. */
  resolveStored(filename: string): string {
    const safe = basename(filename);
    const full = resolve(this.env.ASSET_DIR, safe);
    if (!full.startsWith(resolve(this.env.ASSET_DIR))) {
      throw new BadRequestException('Invalid filename');
    }
    return full;
  }
}
