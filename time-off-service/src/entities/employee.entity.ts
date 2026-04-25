import { Entity, Column, PrimaryGeneratedColumn, OneToMany } from 'typeorm';
import { TimeOffBalance } from './time-off-balance.entity';
import { TimeOffRequest } from './time-off-request.entity';

@Entity()
export class Employee {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  locationId: string;

  @OneToMany(() => TimeOffBalance, (balance) => balance.employee)
  balances: TimeOffBalance[];

  @OneToMany(() => TimeOffRequest, (request) => request.employee)
  requests: TimeOffRequest[];
}
