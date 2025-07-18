import Elysia from "elysia";

const health = new Elysia()
    .get('/health', () => {
        const pp_default = process.env.PAYMENT_PROCESSOR_DEFAULT_URL || 'not set';
        const pp_fallback = process.env.PAYMENT_PROCESSOR_FALLBACK_URL || 'not set';

        return {
            pp_default,
            pp_fallback,
        };
    });

export default health;
