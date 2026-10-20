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
    const full = this.assets.resolveStored(filename);
    const asset = await this.assets.findByFilename(filename);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    if (asset) {
      res.type(asset.mimetype);
      // Anything not a known-safe inline image is forced to download, so an
      // uploaded SVG/HTML cannot execute script from this origin.
      if (!isSafeImage(asset.mimetype)) {
        res.setHeader('Content-Disposition', `attachment; filename="${asset.filename}"`);
      }
    }
    res.sendFile(full, (err) => {
      if (err && !res.headersSent) res.status(404).end();
    });
  }
}
