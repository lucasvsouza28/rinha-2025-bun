import Elysia from 'elysia';
import health from '@routes/health.ts';
import payments from '@routes/payments.ts';

new Elysia()
  .get('/', () => 'rinha-2025-bun is running!')
  .use(health)
  .use(payments)
  .listen({
    port: process.env.PORT || 3000,
  }, ({ port }) => console.log(`Server is listening on port ${port}`));