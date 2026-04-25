import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, Unique } from 'typeorm';
import { Employee } from './employee.entity';

@Entity()
@Unique(['employeeId', 'locationId'])
export class TimeOffBalance {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  employeeId: string;

  @Column()
  locationId: string;

  @Column('float')
  balanceDays: number;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  lastSyncedAt: Date;

  @ManyToOne(() => Employee, (employee) => employee.balances)
  employee: Employee;
}
