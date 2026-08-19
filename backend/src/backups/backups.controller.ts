import { Controller, Get, Param, Post, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums';
import { BackupsService } from './backups.service';

@ApiTags('backups') @ApiBearerAuth() @Controller('backups') @Roles(UserRole.ADMIN)
export class BackupsController {
  constructor(private readonly service: BackupsService) {}

  @Get() findAll() { return this.service.findAll(); }
  @Post() create() { return this.service.create(); }

  @Get(':file/download')
  async download(@Param('file') file: string, @Res() response: Response) {
    const { buffer, filename } = await this.service.read(file);
    response.setHeader('Content-Type', 'application/sql');
    response.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    response.send(buffer);
  }
}
