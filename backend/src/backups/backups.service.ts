import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { execFile } from 'child_process';
import { promises as fs } from 'fs';
import * as path from 'path';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

export interface BackupFile {
  name: string;
  size: number;
  createdAt: string;
}

/**
 * Respaldos manuales de la base de datos (pg_dump), guardados en el volumen
 * `BACKUPS_DIR` (montado en Docker sobre la carpeta `backups/` del repo).
 */
@Injectable()
export class BackupsService {
  private readonly dir: string;

  constructor(private readonly config: ConfigService) {
    this.dir = path.resolve(this.config.get<string>('BACKUPS_DIR', 'backups'));
  }

  private async ensureDir() {
    await fs.mkdir(this.dir, { recursive: true });
  }

  async findAll(): Promise<BackupFile[]> {
    await this.ensureDir();
    const entries = await fs.readdir(this.dir);
    const files = await Promise.all(
      entries
        .filter((name) => name.endsWith('.sql'))
        .map(async (name) => {
          const stat = await fs.stat(path.join(this.dir, name));
          return { name, size: stat.size, createdAt: stat.mtime.toISOString() };
        }),
    );
    return files.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async read(name: string) {
    const files = await this.findAll();
    const match = files.find((file) => file.name === name);
    if (!match) throw new NotFoundException('Archivo de backup no encontrado');
    const buffer = await fs.readFile(path.join(this.dir, match.name));
    return { buffer, filename: match.name };
  }

  async create(): Promise<BackupFile> {
    await this.ensureDir();
    const stamp = new Date()
      .toISOString()
      .replace(/[-:]/g, '')
      .replace('T', '_')
      .slice(0, 15);
    const filename = `cartera_${stamp}.sql`;
    const target = path.join(this.dir, filename);
    const env = {
      ...process.env,
      PGPASSWORD: this.config.get<string>('DB_PASSWORD', 'cartera_local_2026'),
    };
    try {
      await execFileAsync(
        'pg_dump',
        [
          '-h', this.config.get<string>('DB_HOST', 'localhost'),
          '-p', String(this.config.get<number>('DB_PORT', 5432)),
          '-U', this.config.get<string>('DB_USER', 'cartera'),
          '-d', this.config.get<string>('DB_NAME', 'cartera_eli'),
          '-f', target,
          '--no-owner', '--no-privileges',
        ],
        { env },
      );
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error
          ? `No fue posible crear el backup: ${error.message}`
          : 'No fue posible crear el backup',
      );
    }
    const stat = await fs.stat(target);
    return { name: filename, size: stat.size, createdAt: stat.mtime.toISOString() };
  }
}
