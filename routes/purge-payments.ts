import { Elysia } from 'elysia';
import PaymentsQueue from "@queues/payment-processing";
import { PaymentRedisRepository, PaymentSqlRepository } from '@repositories/payments';

const purgePayments = new Elysia()
  .get('/purge-payments', async () => {
    //const repo = new PaymentRedisRepository();
    const repo = new PaymentSqlRepository();
    repo.purgePayments();
    
    await PaymentsQueue.clean(1);
  });

export default purgePayments;

