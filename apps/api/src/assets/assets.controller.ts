import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  Body,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import type { Response } from 'express';
import { ASSET_KINDS } from '@cg/shared';
import { SessionGuard } from '../auth/session.guard';
import { isSafeImage } from './mime';
import { AssetsService, MAX_FILE_SIZE, type AssetWithUrl } from './assets.service';

@Controller('assets')
export class AssetsController {
  constructor(private readonly assets: AssetsService) {}

  @Post()
  @UseGuards(SessionGuard)
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: MAX_FILE_SIZE } }))
  async upload(@UploadedFile() file: Express.Multer.File, @Body('kind') kind: string): Promise<AssetWithUrl> {
    if (!file) throw new BadRequestException('A file is required');
    const assetKind = (ASSET_KINDS as readonly string[]).includes(kind) ? kind : 'image';
    return this.assets.saveFile(file.buffer, { originalname: file.originalname, mimetype: file.mimetype, kind: assetKind });
  }

  @Get()
  @UseGuards(SessionGuard)
  list(): Promise<AssetWithUrl[]> {
    return this.assets.list();
  }

  @Delete(':id')
  @UseGuards(SessionGuard)
  async remove(@Param('id') id: string): Promise<{ ok: true }> {
    await this.assets.deleteFile(id);
    return { ok: true };
  }

  // Public: assets (logos, inline images) must be fetchable by mail clients.
  @Get('file/:filename')
  async serve(@Param('filename') filename: string, @Res() res: Response): Promise<void> {
    // One normalized key for both the DB lookup and the filesystem read, so a
    // parser differential cannot select a different file than the one vetted.
    if (!/^[a-f0-9]{32}\.[a-z0-9]+$/.test(filename)) {
      res.status(404).end();
      return;
    }
    const asset = await this.assets.findByFilename(filename);
    if (!asset) {
      res.status(404).end();
      return;
    }
    res.setHeader('X-Content-Type-Options', 'nosniff');
    // Helmet defaults to same-origin, which blocks <img> loads from the web
    // origin and from mail clients; assets are public by design.
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    if (isSafeImage(asset.mimetype)) {
      res.type(asset.mimetype);
    } else {
      // Never reflect an untrusted mimetype: force a neutral type + download +
      // locked-down CSP so a stored file cannot act as a same-origin gadget.
      res.type('application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="${asset.filename}"`);
      res.setHeader('Content-Security-Policy', "default-src 'none'; sandbox");
    }
    res.sendFile(this.assets.resolveStored(filename), (err) => {
      if (err && !res.headersSent) res.status(404).end();
    });
  }
}
