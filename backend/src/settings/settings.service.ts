import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { Setting } from '../entities/setting.entity';
import { UpdateSettingDto } from './dto/setting.dto';

@Injectable()
export class SettingsService {
  constructor(@InjectRepository(Setting) private readonly repository: Repository<Setting>, private readonly audit: AuditService) {}
  findAll() { return this.repository.find({ order: { key: 'ASC', value: 'ASC' } }); }
  async getValue(key: string, fallback: string) { return (await this.repository.findOne({ where: { key } }))?.value ?? fallback; }
  async update(id: string, dto: UpdateSettingDto, username: string) {
    const setting = await this.repository.findOne({ where: { id } });
    if (!setting) throw new NotFoundException('Configuración no encontrada');
    setting.value = dto.value.trim(); setting.note = dto.note?.trim() || null;
    if (dto.editable !== undefined) setting.editable = dto.editable;
    const saved = await this.repository.save(setting);
    await this.audit.log(username, 'Configuración', 'Editar', saved.key, { value: saved.value });
    return saved;
  }
}

