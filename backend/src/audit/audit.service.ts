import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from '../entities/audit-log.entity';

@Injectable()
export class AuditService {
  constructor(@InjectRepository(AuditLog) private readonly repository: Repository<AuditLog>) {}
  log(username: string, module: string, action: string, recordKey?: string, changes?: Record<string, unknown>) {
    return this.repository.save(this.repository.create({ username, module, action, recordKey: recordKey ?? null, changes: changes ?? null }));
  }
  findAll(limit = 200) { return this.repository.find({ order: { createdAt: 'DESC' }, take: Math.min(limit, 1000) }); }
}

