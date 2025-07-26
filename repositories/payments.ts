import { sql } from "bun";

export type Payment = {
  correlation_id: string;
  amount: number;
  requested_at: Date;
  // requested_at: number;
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

type PaymentSummaryQueryType = {
  total_request: number;
  total_amount: number;
  processor: string;
};

export interface IPaymentRepository {
  persistPayment(payment: Payment): Promise<void>;
  getPaymentsSummary(
    from: Date | undefined,
    to: Date | undefined,
  ): Promise<PaymentSummary>;
  purgePayments(): Promise<void>;
}

export class PaymentSqlRepository implements IPaymentRepository {
  async getPaymentsSummary(
    from: Date | undefined,
    to: Date | undefined,
  ): Promise<PaymentSummary> {
    const fromFilter = sql` AND requested_at >= ${from}`;
    const toFilter = sql` AND requested_at <= ${to}`;
    const summaries = (await sql`
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
      `) as Array<PaymentSummaryQueryType>;

    let default_summary: PaymentSummaryQueryType | undefined,
      fallback_summary: PaymentSummaryQueryType | undefined;

    for (const r of summaries) {
      if (r.processor === "default") default_summary = r;
      else if (r.processor === 'fallback') fallback_summary = r;
    }

    return {
      default: {
        totalRequests: Number(default_summary?.total_request ?? 0),
        totalAmount: Number(default_summary?.total_amount ?? 0),
      },
      fallback: {
        totalRequests: Number(fallback_summary?.total_request ?? 0),
        totalAmount: Number(fallback_summary?.total_amount ?? 0),
      },
    };
  }

  async purgePayments(): Promise<void> {
    await sql`DELETE FROM "public".payments`;
  }

  async persistPayment(payment: Payment): Promise<void> {
    await sql`INSERT INTO "public".payments ${sql(payment)} RETURNING *`;
  }
}
