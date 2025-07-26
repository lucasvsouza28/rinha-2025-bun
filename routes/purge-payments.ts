import { Elysia } from "elysia";
import PaymentsQueue from "@queues/payment-processing";
import { buildPaymentRepository } from "@repositories/factory";

const purgePayments = new Elysia().post("/purge-payments", async () => {
  await Promise.all([buildPaymentRepository().purgePayments(), PaymentsQueue.empty()]);
});

export default purgePayments;
