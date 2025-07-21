import Elysia from 'elysia';
import health from '@routes/health.ts';
import payments from '@routes/payments.ts';
import paymentsSummary from '@routes/payments-summary.ts';
import purgePayments from '@routes/purge-payments';
import '@queues/payment-processing';

new Elysia()
  .get('/', () => 'rinha-bun is running')
  .use(health)
  .use(payments)
  .use(paymentsSummary)
  .use(purgePayments)
  .listen({
    port: process.env.PORT || 3000,
    idleTimeout: 255,
  }, ({ port }) => console.log(`Server is listening on port ${port}`));
