import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';

@Injectable()
export class AuthService {
  constructor(private readonly users: UsersService, private readonly jwt: JwtService) {}

  async login(username: string, password: string) {
    const user = await this.users.findByUsername(username);
    if (!user?.active || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new UnauthorizedException('Usuario o contraseña incorrectos');
    }
    await this.users.registerLogin(user.id);
    const accessToken = await this.jwt.signAsync({ sub: user.id, username: user.username, role: user.role });
    return { accessToken, user: this.users.toPublic(user) };
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.users.findOneEntity(userId);
    if (!(await bcrypt.compare(currentPassword, user.passwordHash))) {
      throw new UnauthorizedException('La contraseña actual no es correcta');
    }
    await this.users.changePassword(userId, newPassword);
    return { message: 'Contraseña actualizada' };
  }
}

