import { Elysia, status, t } from "elysia";
import PaymentsQueue from "@queues/payment-processing";

const payments = new Elysia().post(
  "/payments",
  ({ body }) => {
    const { amount, correlationId } = body;

    // get the current timestamp
    const requested_at = new Date();

    console.log("Enqueuing payment", { amount, correlationId, requested_at });

    // enqueue the payment with the amount, correlationId, and requestedAt
    PaymentsQueue.add({
      amount,
      correlation_id: correlationId,
      requested_at,
    });

    return status(202);
  },
  {
    body: t.Object({
      amount: t.Number({ description: "Amount to be processed" }),
      correlationId: t.String({ description: "Payment correlation id" }),
    }),
  },
);

export default payments;
