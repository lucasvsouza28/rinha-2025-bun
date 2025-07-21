import { redis } from 'bun';
import { Elysia } from 'elysia';
import PaymentsQueue from "@queues/payment-processing";

const purgePayments = new Elysia()
  .get('/purge-payments', async () => {
    const keys = await redis.keys(`payments:*`);
    await Promise.all(keys.map(k => {
      redis.del(k)
    }));
    
    await PaymentsQueue.empty();
  });

export default purgePayments;

