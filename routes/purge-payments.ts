import { redis } from 'bun';
import { Elysia } from 'elysia';

const purgePayments = new Elysia()
  .get('/purge-payments', async () => {
    const keys = await redis.keys(`payments:*`);
    Promise.all(keys.map(k => {
      redisedis.del(k)
    }));
  });

export default purgePayments;

