import { redis } from "bun";
import { Elysia } from "elysia";

type PaymentSummary = {
    totalRequests: number;
    totalAmount: number;
};

const paymentsSummary = new Elysia()
    .get('/payments-summary', async () => {
        const summary: {
            default: PaymentSummary;
            fallback: PaymentSummary;
        } = {
            default: {
                totalAmount: 0,
                totalRequests: 0
            },
            fallback: {
                totalAmount: 0,
                totalRequests: 0
            }
        };
        const keys = await redis.keys('payments:*:*');
        await Promise.all(keys.map(async (key) => {
            const paymentData = await redis.get(key);
            const payment = JSON.parse(paymentData || '{}');
            const isDefault = key.startsWith('payments:default:');
            const store = isDefault ? summary['default'] : summary['fallback'];
            
            store.totalRequests += 1;
            store.totalAmount += payment.amount || 0;
        }));

        return summary;
    });

export default paymentsSummary;
