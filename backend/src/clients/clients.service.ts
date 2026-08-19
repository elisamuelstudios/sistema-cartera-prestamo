import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { ClientStatus, LoanStatus } from '../common/enums';
import { nextCode } from '../common/utils/codes';
import { Client } from '../entities/client.entity';
import { CreateClientDto, UpdateClientDto } from './dto/client.dto';

@Injectable()
export class ClientsService {
  constructor(
    @InjectRepository(Client) private readonly repository: Repository<Client>,
    private readonly audit: AuditService,
  ) {}

  async findAll(
    code = '',
    name = '',
    identification = '',
    status = '',
    page = 1,
    pageSize = 25,
    collectable = false,
    routeId = '',
    q = '',
  ) {
    const query = this.repository
      .createQueryBuilder('client')
      .leftJoinAndSelect('client.route', 'route')
      .leftJoinAndSelect(
        'client.loans',
        'loan',
        'loan.status IN (:...loanStatuses)',
        { loanStatuses: [LoanStatus.ACTIVE, LoanStatus.OVERDUE] },
      )
      .orderBy('client.createdAt', 'DESC')
      .addOrderBy('client.code', 'DESC');
    if (status) query.andWhere('client.status = :status', { status });
    if (routeId) query.andWhere('client.routeId = :routeId', { routeId });
    if (collectable) query.andWhere('loan.id IS NOT NULL');
    if (code.trim())
      query.andWhere('client.code ILIKE :code', { code: `%${code.trim()}%` });
    if (name.trim())
      query.andWhere(
        "(client.firstNames ILIKE :name OR client.lastNames ILIKE :name OR CONCAT(client.firstNames, ' ', client.lastNames) ILIKE :name)",
        { name: `%${name.trim()}%` },
      );
    if (identification.trim())
      query.andWhere('client.identification ILIKE :identification', {
        identification: `%${identification.trim()}%`,
      });
    // Búsqueda rápida (selector de cliente en Préstamos/Pagos): un solo campo,
    // coincide con varias columnas a la vez. Distinta de los filtros por
    // columna de arriba, que son AND entre sí.
    if (q.trim()) {
      const value = `%${q.trim()}%`;
      query.andWhere(
        new Brackets((where) =>
          where
            .where('client.code ILIKE :q', { q: value })
            .orWhere('client.firstNames ILIKE :q', { q: value })
            .orWhere('client.lastNames ILIKE :q', { q: value })
            .orWhere('client.identification ILIKE :q', { q: value })
            .orWhere('client.primaryPhone ILIKE :q', { q: value })
            .orWhere('route.name ILIKE :q', { q: value }),
        ),
      );
    }
    const total = await query.getCount();
    const clients = await query
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getMany();
    return {
      items: clients.map((client) => this.present(client)),
      total,
      page,
      pageSize,
    };
  }

  async findOne(id: string) {
    const client = await this.repository.findOne({
      where: [{ id }, { code: id }],
      relations: { route: true, loans: true },
    });
    if (!client) throw new NotFoundException('Cliente no encontrado');
    return this.present(client);
  }

  async findEntity(id: string) {
    const client = await this.repository.findOne({
      where: [{ id }, { code: id }],
    });
    if (!client) throw new NotFoundException('Cliente no encontrado');
    return client;
  }

  async create(dto: CreateClientDto, username: string) {
    if (
      await this.repository.findOne({
        where: { identification: dto.identification.trim() },
      })
    ) {
      throw new ConflictException(
        'Ya existe un cliente con esa identificación',
      );
    }
    const codes = (await this.repository.find({ select: { code: true } })).map(
      (client) => client.code,
    );
    const client = this.repository.create({
      ...this.mapDto(dto),
      code: nextCode('CL', codes, 5),
      createdBy: username,
      updatedBy: username,
    });
    const saved = await this.repository.save(client);
    await this.audit.log(username, 'Clientes', 'Crear', saved.code);
    return this.findOne(saved.id);
  }

  async update(id: string, dto: UpdateClientDto, username: string) {
    const client = await this.findEntity(id);
    const duplicate = await this.repository.findOne({
      where: { identification: dto.identification.trim() },
    });
    if (duplicate && duplicate.id !== client.id)
      throw new ConflictException(
        'Ya existe un cliente con esa identificación',
      );
    Object.assign(client, this.mapDto(dto), { updatedBy: username });
    const saved = await this.repository.save(client);
    await this.audit.log(username, 'Clientes', 'Editar', saved.code);
    return this.findOne(saved.id);
  }

  private mapDto(dto: CreateClientDto) {
    return {
      firstNames: dto.firstNames.trim(),
      lastNames: dto.lastNames.trim(),
      identification: dto.identification.trim(),
      birthDate: dto.birthDate || null,
      address: dto.address?.trim() || null,
      neighborhood: dto.neighborhood?.trim() || null,
      city: dto.city?.trim() || null,
      primaryPhone: dto.primaryPhone.trim(),
      alternatePhone: dto.alternatePhone?.trim() || null,
      email: dto.email?.trim().toLowerCase() || null,
      occupation: dto.occupation?.trim() || null,
      workplace: dto.workplace?.trim() || null,
      monthlyIncome: dto.monthlyIncome ?? 0,
      personalReferences: dto.personalReferences?.trim() || null,
      familyReferences: dto.familyReferences?.trim() || null,
      observations: dto.observations?.trim() || null,
      status: dto.status ?? ClientStatus.ACTIVE,
      routeId: dto.routeId,
    };
  }

  private present(client: Client) {
    const activeLoans =
      client.loans?.filter((loan) =>
        [LoanStatus.ACTIVE, LoanStatus.OVERDUE].includes(loan.status),
      ) ?? [];
    const loanStatus = activeLoans.some(
      (loan) => loan.status === LoanStatus.OVERDUE,
    )
      ? 'EN MORA'
      : activeLoans.length
        ? 'ACTIVO'
        : 'SIN PRÉSTAMO ACTIVO';
    const { loans, ...result } = client;
    void loans;
    return {
      ...result,
      fullName: `${client.firstNames} ${client.lastNames}`
        .replace(/\s+/g, ' ')
        .trim(),
      loanStatus,
    };
  }
}
