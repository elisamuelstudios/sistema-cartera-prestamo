import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';

@Injectable()
export class UsersService {
  constructor(@InjectRepository(User) private readonly repository: Repository<User>) {}

  async findAll() { return (await this.repository.find({ order: { fullName: 'ASC' } })).map((user) => this.toPublic(user)); }
  findByUsername(username: string) { return this.repository.findOne({ where: { username } }); }
  async findOneEntity(id: string) {
    const user = await this.repository.findOne({ where: { id } });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    return user;
  }
  async findOne(id: string) { return this.toPublic(await this.findOneEntity(id)); }

  async create(dto: CreateUserDto) {
    if (await this.findByUsername(dto.username.trim())) throw new ConflictException('El usuario ya existe');
    const user = this.repository.create({
      username: dto.username.trim().toLowerCase(), fullName: dto.fullName.trim(), role: dto.role,
      passwordHash: await bcrypt.hash(dto.password, 12), active: true, mustChangePassword: true,
    });
    return this.toPublic(await this.repository.save(user));
  }

  async update(id: string, dto: UpdateUserDto) {
    const user = await this.findOneEntity(id);
    if (dto.fullName !== undefined) user.fullName = dto.fullName.trim();
    if (dto.role !== undefined) user.role = dto.role;
    if (dto.active !== undefined) user.active = dto.active;
    if (dto.password) { user.passwordHash = await bcrypt.hash(dto.password, 12); user.mustChangePassword = true; }
    return this.toPublic(await this.repository.save(user));
  }

  async changePassword(id: string, password: string) {
    const user = await this.findOneEntity(id);
    user.passwordHash = await bcrypt.hash(password, 12);
    user.mustChangePassword = false;
    await this.repository.save(user);
  }

  async registerLogin(id: string) { await this.repository.update(id, { lastLoginAt: new Date() }); }
  toPublic({ passwordHash: _passwordHash, ...user }: User) { return user; }
}

