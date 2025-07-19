import { redis } from "bun";
import { Elysia } from "elysia";

const paymentsSummary = new Elysia()
    .get('/payments-summary', async () => {
        const payments = await redis.keys('payments:*');
        const summary = await Promise.all(payments.map(async (key) => {
            const paymentData = await redis.get(key);
            return JSON.parse(paymentData || '{}');
        }));

        return summary
    });

export default paymentsSummary;
