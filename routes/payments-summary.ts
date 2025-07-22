import { redis } from "bun";
import { Elysia, t } from "elysia";

type PaymentSummary = {
  totalRequests: number;
  totalAmount: number;
};

const paymentsSummary = new Elysia()
  .get('/payments-summary', async ({ query: { from, to } }) => {
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
      const payment = JSON.parse(paymentData || '{}') as { amount: number; requestedAt: Date; };
      const isDefault = key.startsWith('payments:default:');
      const store = isDefault ? summary['default'] : summary['fallback'];

      if ((!from || payment.requestedAt >= from) || (!to || payment.requestedAt <= to)) {
        store.totalRequests += 1;
        store.totalAmount += payment.amount || 0;
      }
    }));

    return summary;
  }, {
    query: t.Object({
      from: t.Optional(t.Date()),
      to: t.Optional(t.Date())
    })
  }
  );

export default paymentsSummary;
