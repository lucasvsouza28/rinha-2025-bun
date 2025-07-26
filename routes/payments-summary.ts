import { Elysia, t } from "elysia";
import { buildPaymentRepository } from "@repositories/factory";

const paymentsSummary = new Elysia().get(
  "/payments-summary",
  async ({ query: { from, to } }) => {
    return buildPaymentRepository().getPaymentsSummary(from, to);
  },
  {
    query: t.Object({
      from: t.Optional(t.Date()),
      to: t.Optional(t.Date()),
    }),
  },
);

export default paymentsSummary;
