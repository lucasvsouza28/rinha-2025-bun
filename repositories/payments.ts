import { redis, sql } from "bun";

export type Payment = {
  correlation_id: string;
  amount: number;
  requested_at: Date;
  processor: "default" | "fallback";
};

type SummaryItem = {
  totalRequests: number;
  totalAmount: number;
};

type PaymentSummary = {
  default: SummaryItem;
  fallback: SummaryItem;
};

export interface IPaymentRepository {
  persistPayment(payment: Payment): Promise<void>;
  getPaymentsSummary(from: Date | undefined, to: Date | undefined): Promise<PaymentSummary>;
  purgePayments(): Promise<void>;
}

export class PaymentSqlRepository implements IPaymentRepository {
  async getPaymentsSummary(from: Date | undefined, to: Date | undefined): Promise<PaymentSummary> {
    const fromFilter = sql`AND requested_at >= ${from}`;
    const toFilter = sql`AND requested_at <= ${to}`;
    const [default_summary, fallback_summary] = await sql`
      select
        count(1) as total_request,
        sum(amount) as total_amount,
        processor
      from "public".payments
      where 1=1
      ${from ? fromFilter : sql``}
      ${to ? toFilter : sql``}
      group by processor
      order by processor
      `;

      return {
        default: {
          totalRequests: Number(default_summary?.total_request ?? 0),
          totalAmount: Number(default_summary?.total_amount ?? 0),
        },
        fallback: {
          totalRequests: Number(fallback_summary?.total_request ?? 0),
          totalAmount: Number(fallback_summary?.total_amount ?? 0)
        }
      };
  }

  async purgePayments(): Promise<void> {
    await sql`DELETE FROM "public".payments`;
  }

  async persistPayment(payment: Payment): Promise<void> {
    await sql`INSERT INTO "public".payments ${sql(payment)} RETURNING *`;
  }
}

export class PaymentRedisRepository implements IPaymentRepository {
  async getPaymentsSummary(from: Date | undefined, to: Date | undefined): Promise<PaymentSummary> {
    const summary: PaymentSummary = {
      default: { totalAmount: 0, totalRequests: 0 },
      fallback: { totalAmount: 0, totalRequests: 0 },
    };
    const keys = await redis.keys("payments:*:*");
    await Promise.all(
      keys.map(async (key) => {
        const paymentData = await redis.get(key);
        const payment = JSON.parse(paymentData || "{}") as Payment;
        const isDefault = key.startsWith("payments:default:");
        const store = isDefault ? summary["default"] : summary["fallback"];
        console.log("comparing dates", {
          from,
          to,
          id: payment.correlation_id,
          requestedAt: payment.requested_at,
        });

        if (
          (!from || payment.requested_at >= from) &&
          (!to || payment.requested_at <= to)
        ) {
          console.log('date in range')
          store.totalRequests += 1;
          store.totalAmount += payment.amount || 0;
        }
      }),
    );

    return summary;
  }

  async purgePayments(): Promise<void> {
    const keys = await redis.keys(`payments:*`);
    await Promise.all(keys.map(k => {
      redis.del(k)
    }));
  }

  async persistPayment(payment: Payment): Promise<void> {
    await redis.set(
      `payments:${payment.processor}:${payment.correlation_id}`,
      JSON.stringify(payment),
    );
  }
}

