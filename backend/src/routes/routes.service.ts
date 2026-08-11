import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { nextCode } from '../common/utils/codes';
import { Route } from '../entities/route.entity';
import { CreateRouteDto, UpdateRouteDto } from './dto/route.dto';

@Injectable()
export class RoutesService {
  constructor(@InjectRepository(Route) private readonly repository: Repository<Route>) {}
  findAll(active?: boolean) { return this.repository.find({ where: active === undefined ? {} : { active }, order: { code: 'ASC' } }); }
  async findOne(id: string) {
    const route = await this.repository.findOne({ where: [{ id }, { code: id }] });
    if (!route) throw new NotFoundException('Ruta no encontrada');
    return route;
  }
  async create(dto: CreateRouteDto, username: string) {
    const codes = (await this.repository.find({ select: { code: true } })).map((route) => route.code);
    return this.repository.save(this.repository.create({
      code: nextCode('RT', codes, 4), name: dto.name.trim(), collector: dto.collector?.trim() || null,
      zone: dto.zone?.trim() || null, description: dto.description?.trim() || null, active: true, createdBy: username,
    }));
  }
  async update(id: string, dto: UpdateRouteDto) {
    const route = await this.findOne(id);
    Object.assign(route, {
      name: dto.name?.trim() ?? route.name, collector: dto.collector?.trim() ?? route.collector,
      zone: dto.zone?.trim() ?? route.zone, description: dto.description?.trim() ?? route.description,
      active: dto.active ?? route.active,
    });
    return this.repository.save(route);
  }
}

