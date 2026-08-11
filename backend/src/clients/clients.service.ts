import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { ClientStatus, LoanStatus } from '../common/enums';
import { nextCode } from '../common/utils/codes';
import { Client } from '../entities/client.entity';
import { CreateClientDto, UpdateClientDto } from './dto/client.dto';

@Injectable()
export class ClientsService {
  constructor(@InjectRepository(Client) private readonly repository: Repository<Client>, private readonly audit: AuditService) {}

  async findAll(search = '', status = '', page = 1, pageSize = 25, collectable = false) {
    const query = this.repository.createQueryBuilder('client')
      .leftJoinAndSelect('client.route', 'route')
      .leftJoinAndSelect('client.loans', 'loan', 'loan.status IN (:...loanStatuses)', { loanStatuses: [LoanStatus.ACTIVE, LoanStatus.OVERDUE] })
      .orderBy('client.createdAt', 'DESC').addOrderBy('client.code', 'DESC');
    if (status) query.andWhere('client.status = :status', { status });
    if (collectable) query.andWhere('loan.id IS NOT NULL');
    if (search.trim()) {
      const value = `%${search.trim()}%`;
      query.andWhere(new Brackets((where) => where
        .where('client.code ILIKE :value', { value }).orWhere('client.firstNames ILIKE :value', { value })
        .orWhere('client.lastNames ILIKE :value', { value }).orWhere('client.identification ILIKE :value', { value })
        .orWhere('client.primaryPhone ILIKE :value', { value }).orWhere('client.city ILIKE :value', { value })
        .orWhere('client.status ILIKE :value', { value }).orWhere('route.name ILIKE :value', { value })
        .orWhere('loan.status ILIKE :value', { value })));
    }
    const total = await query.getCount();
    const clients = await query.skip((page - 1) * pageSize).take(pageSize).getMany();
    return { items: clients.map((client) => this.present(client)), total, page, pageSize };
  }

  async findOne(id: string) {
    const client = await this.repository.findOne({ where: [{ id }, { code: id }], relations: { route: true, loans: true } });
    if (!client) throw new NotFoundException('Cliente no encontrado');
    return this.present(client);
  }

  async findEntity(id: string) {
    const client = await this.repository.findOne({ where: [{ id }, { code: id }] });
    if (!client) throw new NotFoundException('Cliente no encontrado');
    return client;
  }

  async create(dto: CreateClientDto, username: string) {
    if (await this.repository.findOne({ where: { identification: dto.identification.trim() } })) {
      throw new ConflictException('Ya existe un cliente con esa identificación');
    }
    const codes = (await this.repository.find({ select: { code: true } })).map((client) => client.code);
    const client = this.repository.create({ ...this.mapDto(dto), code: nextCode('CL', codes, 5), createdBy: username, updatedBy: username });
    const saved = await this.repository.save(client);
    await this.audit.log(username, 'Clientes', 'Crear', saved.code);
    return this.findOne(saved.id);
  }

  async update(id: string, dto: UpdateClientDto, username: string) {
    const client = await this.findEntity(id);
    const duplicate = await this.repository.findOne({ where: { identification: dto.identification.trim() } });
    if (duplicate && duplicate.id !== client.id) throw new ConflictException('Ya existe un cliente con esa identificación');
    Object.assign(client, this.mapDto(dto), { updatedBy: username });
    const saved = await this.repository.save(client);
    await this.audit.log(username, 'Clientes', 'Editar', saved.code);
    return this.findOne(saved.id);
  }

  private mapDto(dto: CreateClientDto) {
    return {
      firstNames: dto.firstNames.trim(), lastNames: dto.lastNames.trim(), identification: dto.identification.trim(),
      birthDate: dto.birthDate || null, address: dto.address?.trim() || null, neighborhood: dto.neighborhood?.trim() || null,
      city: dto.city?.trim() || null, primaryPhone: dto.primaryPhone.trim(), alternatePhone: dto.alternatePhone?.trim() || null,
      email: dto.email?.trim().toLowerCase() || null, occupation: dto.occupation?.trim() || null, workplace: dto.workplace?.trim() || null,
      monthlyIncome: dto.monthlyIncome ?? 0, personalReferences: dto.personalReferences?.trim() || null,
      familyReferences: dto.familyReferences?.trim() || null, observations: dto.observations?.trim() || null,
      status: dto.status ?? ClientStatus.ACTIVE, routeId: dto.routeId || null,
    };
  }

  private present(client: Client) {
    const activeLoans = client.loans?.filter((loan) => [LoanStatus.ACTIVE, LoanStatus.OVERDUE].includes(loan.status)) ?? [];
    const loanStatus = activeLoans.some((loan) => loan.status === LoanStatus.OVERDUE) ? 'EN MORA' : activeLoans.length ? 'ACTIVO' : 'SIN PRÉSTAMO ACTIVO';
    const { loans: _loans, ...result } = client;
    return { ...result, fullName: `${client.firstNames} ${client.lastNames}`.replace(/\s+/g, ' ').trim(), loanStatus };
  }
}
