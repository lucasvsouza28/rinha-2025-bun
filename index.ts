import { redis } from "bun";
import Elysia from "elysia";
import { swagger } from "@elysiajs/swagger";
import health from "@routes/health.ts";
import payments from "@routes/payments.ts";
import paymentsSummary from "@routes/payments-summary.ts";
import purgePayments from "@routes/purge-payments";
import { initializeQueue } from "@queues/payment-processing";
import { PaymentSqlRepository } from "@repositories/payments";

new Elysia()
  .get("/", () => "rinha-bun is running")
  .use(health)
  .use(payments)
  .use(paymentsSummary)
  .use(purgePayments)
  .use(swagger())
  .get("reset", async () => {
    await Promise.all([
      new PaymentSqlRepository().purgePayments(),
      redis.del("payment-processor-health:default"),
      redis.del("payment-processor-health:fallback"),
    ]);
  })
  .listen(
    {
      port: process.env.PORT || 3000,
      idleTimeout: 255,
    },
    ({ port }) => console.log(`Server is listening on port ${port}`),
  );

initializeQueue();
