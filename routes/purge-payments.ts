import { redis } from 'bun';
import { Elysia } from 'elysia';
import PaymentsQueue from "@queues/payment-processing";

const purgePayments = new Elysia()
  .get('/purge-payments', async () => {
    const keys = await redis.keys(`payments:*`);
    Promise.all(keys.map(k => {
      redis.del(k)
    }));
    
    PaymentsQueue.empty();
  });

export default purgePayments;

