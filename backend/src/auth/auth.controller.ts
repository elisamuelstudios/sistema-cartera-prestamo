import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';
import { ChangePasswordDto, LoginDto } from './dto/login.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService, private readonly users: UsersService) {}

  @Public() @Post('login') login(@Body() dto: LoginDto) { return this.auth.login(dto.username.trim(), dto.password); }
  @ApiBearerAuth() @Get('me') async me(@CurrentUser() current: AuthenticatedUser) { return this.users.findOne(current.sub); }
  @ApiBearerAuth() @Post('change-password') changePassword(@CurrentUser() current: AuthenticatedUser, @Body() dto: ChangePasswordDto) {
    return this.auth.changePassword(current.sub, dto.currentPassword, dto.newPassword);
  }
}
