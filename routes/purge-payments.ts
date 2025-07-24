import { Elysia } from "elysia";
import PaymentsQueue from "@queues/payment-processing";
import { PaymentSqlRepository } from "@repositories/payments";

const purgePayments = new Elysia().post("/purge-payments", async () => {
  await Promise.all([new PaymentSqlRepository().purgePayments(), PaymentsQueue.empty()]);
});

export default purgePayments;
