import { redis } from "bun";
import { Elysia, t } from "elysia";

type PaymentSummary = {
  totalRequests: number;
  totalAmount: number;
};

const paymentsSummary = new Elysia().get(
  "/payments-summary",
  async ({ query: { from, to } }) => {
    const fromDate = from ? Date.parse(from) : undefined;
    const toDate = to ? Date.parse(to) : undefined;
    const summary: {
      default: PaymentSummary;
      fallback: PaymentSummary;
    } = {
      default: {
        totalAmount: 0,
        totalRequests: 0,
      },
      fallback: {
        totalAmount: 0,
        totalRequests: 0,
      },
    };
    const keys = await redis.keys("payments:*:*");
    await Promise.all(
      keys.map(async (key) => {
        const paymentData = await redis.get(key);
        const payment = JSON.parse(paymentData || "{}") as {
          correlationId: string;
          amount: number;
          requestedAt: Date;
        };
        const isDefault = key.startsWith("payments:default:");
        const store = isDefault ? summary["default"] : summary["fallback"];
        console.log("comparing dates", {
          from,
          fromDate,
          to,
          toDate,
          id: payment.correlationId,
          requestedAt: payment.requestedAt,
        });

        if (
          (!fromDate || payment.requestedAt >= fromDate) &&
          (!toDate || payment.requestedAt <= toDate)
        ) {
          console.log('date in range')
          store.totalRequests += 1;
          store.totalAmount += payment.amount || 0;
        }
      }),
    );

    return summary;
  },
  {
    query: t.Object({
      from: t.Optional(t.String()),
      to: t.Optional(t.String()),
    }),
  },
);

export default paymentsSummary;
