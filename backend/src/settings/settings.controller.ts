import { Body, Controller, Get, Param, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums';
import { UpdateSettingDto } from './dto/setting.dto';
import { SettingsService } from './settings.service';

@ApiTags('settings') @ApiBearerAuth() @Controller('settings')
export class SettingsController {
  constructor(private readonly service: SettingsService) {}
  @Get() findAll() { return this.service.findAll(); }
  @Roles(UserRole.ADMIN) @Patch(':id') update(@Param('id') id: string, @Body() dto: UpdateSettingDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.update(id, dto, user.username);
  }
}
