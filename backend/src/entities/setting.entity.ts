import { Column, Entity, PrimaryGeneratedColumn, Unique, UpdateDateColumn } from 'typeorm';

@Entity('settings')
// La clave identifica el parámetro: debe ser única por sí sola.
// Antes era @Unique(['key','value']), lo que permitía claves duplicadas con
// valores distintos y hacía que getValue() devolviera una fila arbitraria.
@Unique('uq_settings_key', ['key'])
export class Setting {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ length: 100 }) key!: string;
  @Column({ type: 'text' }) value!: string;
  @Column({ type: 'text', nullable: true }) note!: string | null;
  @Column({ name: 'value_type', length: 30, default: 'text' }) valueType!: string;
  @Column({ default: true }) editable!: boolean;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' }) updatedAt!: Date;
}
