import { Elysia, t } from "elysia";
import { PaymentRedisRepository, PaymentSqlRepository } from "@repositories/payments";

const paymentsSummary = new Elysia().get(
  "/payments-summary",
  async ({ query: { from, to } }) => {
    //const repo = new PaymentRedisRepository();
    const repo = new PaymentSqlRepository();
    return repo.getPaymentsSummary(from, to);
  },
  {
    query: t.Object({
      from: t.Optional(t.Date()),
      to: t.Optional(t.Date()),
    }),
  },
);

export default paymentsSummary;
