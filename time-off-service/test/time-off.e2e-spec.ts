import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';

describe('Time-Off Microservice (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    
    // We also need to start the mock server on port 3000 to accept the axios requests made by the TimeOffService
    await app.listen(3000);
  });

  afterAll(async () => {
    await app.close();
  });

  it('1. Seed Mock HCM with 10 days', async () => {
    return request(app.getHttpServer())
      .post('/mock-hcm/set-balance')
      .send({ employeeId: 'emp_e2e_1', locationId: 'loc_e2e_1', balanceDays: 10 })
      .expect(201)
      .expect((res) => {
        expect(res.body.success).toBe(true);
      });
  });

  it('2. Fetch balance from Time-Off Service (Lazily syncs from Mock HCM)', async () => {
    return request(app.getHttpServer())
      .get('/time-off/balances/emp_e2e_1/loc_e2e_1')
      .expect(200)
      .expect((res) => {
        expect(res.body.balanceDays).toBe(10);
      });
  });

  it('3. Make a 2-day request via Time-Off Service', async () => {
    return request(app.getHttpServer())
      .post('/time-off/requests')
      .send({ employeeId: 'emp_e2e_1', locationId: 'loc_e2e_1', daysRequested: 2 })
      .expect(201)
      .expect((res) => {
        expect(res.body.request.status).toBe('PENDING');
      });
  });

  it('4. Assert Mock HCM has 8 days (after async deduction sync)', async () => {
    // wait a brief moment for the async axios call in requestTimeOff to finish
    await new Promise(resolve => setTimeout(resolve, 500));

    return request(app.getHttpServer())
      .get('/mock-hcm/balances/emp_e2e_1/loc_e2e_1')
      .expect(200)
      .expect((res) => {
        expect(res.body.balanceDays).toBe(8);
      });
  });

  it('5. Assert local balance is 8', async () => {
    return request(app.getHttpServer())
      .get('/time-off/balances/emp_e2e_1/loc_e2e_1')
      .expect(200)
      .expect((res) => {
        expect(res.body.balanceDays).toBe(8);
      });
  });

  it('6. Simulate an independent update in Mock HCM (e.g., anniversary adds 5 days)', async () => {
    return request(app.getHttpServer())
      .post('/mock-hcm/set-balance')
      .send({ employeeId: 'emp_e2e_1', locationId: 'loc_e2e_1', balanceDays: 13 })
      .expect(201);
  });

  it('7. Trigger batch sync from Mock HCM', async () => {
    return request(app.getHttpServer())
      .post('/mock-hcm/trigger-batch')
      .send({ webhookUrl: 'http://localhost:3000/time-off/webhooks/hcm/batch-sync' })
      .expect(200)
      .expect((res) => {
        expect(res.body.success).toBe(true);
      });
  });

  it('8. Assert local balance is 13 (after batch sync)', async () => {
    // Wait briefly for batch webhook to finish processing
    await new Promise(resolve => setTimeout(resolve, 500));

    return request(app.getHttpServer())
      .get('/time-off/balances/emp_e2e_1/loc_e2e_1')
      .expect(200)
      .expect((res) => {
        expect(res.body.balanceDays).toBe(13);
      });
  });
});
