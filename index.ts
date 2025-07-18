import Elysia from 'elysia';
import health from './routes/health.ts';

new Elysia()
  .get('/', () => 'rinha-2025-bun is running!')
  .use(health)
  .listen({
    port: process.env.PORT || 3000,
  }, ({ port }) => console.log(`Server is listening on port ${port}`));