import { Column, Entity, PrimaryGeneratedColumn, Unique, UpdateDateColumn } from 'typeorm';

@Entity('settings')
@Unique(['key', 'value'])
export class Setting {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ length: 100 }) key!: string;
  @Column({ type: 'text' }) value!: string;
  @Column({ type: 'text', nullable: true }) note!: string | null;
  @Column({ name: 'value_type', length: 30, default: 'text' }) valueType!: string;
  @Column({ default: true }) editable!: boolean;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' }) updatedAt!: Date;
}

