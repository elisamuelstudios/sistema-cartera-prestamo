import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { ClientStatus } from '../common/enums';
import { Loan } from './loan.entity';
import { Route } from './route.entity';

@Entity('clients')
export class Client {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Index({ unique: true }) @Column({ unique: true, length: 20 }) code!: string;
  @Column({ name: 'first_names', length: 160 }) firstNames!: string;
  @Column({ name: 'last_names', length: 160 }) lastNames!: string;
  @Index() @Column({ type: 'varchar', length: 50, nullable: true }) identification!: string | null;
  @Column({ name: 'birth_date', type: 'date', nullable: true }) birthDate!: string | null;
  @Column({ type: 'text', nullable: true }) address!: string | null;
  @Column({ type: 'varchar', length: 160, nullable: true }) neighborhood!: string | null;
  @Column({ type: 'varchar', length: 160, nullable: true }) city!: string | null;
  @Column({ name: 'primary_phone', type: 'varchar', length: 40, nullable: true }) primaryPhone!: string | null;
  @Column({ name: 'alternate_phone', type: 'varchar', length: 40, nullable: true }) alternatePhone!: string | null;
  @Column({ type: 'varchar', length: 160, nullable: true }) email!: string | null;
  @Column({ type: 'varchar', length: 160, nullable: true }) occupation!: string | null;
  @Column({ name: 'workplace', type: 'varchar', length: 160, nullable: true }) workplace!: string | null;
  @Column({ name: 'monthly_income', type: 'numeric', precision: 16, scale: 2, default: 0 }) monthlyIncome!: number;
  @Column({ name: 'personal_references', type: 'text', nullable: true }) personalReferences!: string | null;
  @Column({ name: 'family_references', type: 'text', nullable: true }) familyReferences!: string | null;
  @Column({ type: 'text', nullable: true }) observations!: string | null;
  @Column({ type: 'varchar', length: 30, default: ClientStatus.ACTIVE }) status!: ClientStatus;
  @Column({ name: 'photo_path', type: 'text', nullable: true }) photoPath!: string | null;
  @Column({ name: 'route_id', type: 'uuid', nullable: true }) routeId!: string | null;
  @ManyToOne(() => Route, (route) => route.clients, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'route_id' }) route!: Route | null;
  @OneToMany(() => Loan, (loan) => loan.client) loans!: Loan[];
  @Column({ name: 'created_by', type: 'varchar', length: 60, nullable: true }) createdBy!: string | null;
  @Column({ name: 'updated_by', type: 'varchar', length: 60, nullable: true }) updatedBy!: string | null;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt!: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' }) updatedAt!: Date;
}
