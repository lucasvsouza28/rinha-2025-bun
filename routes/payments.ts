import { Elysia, status, t } from "elysia";
import PaymentsQueue from "@queues/payment-processing";

const payments = new Elysia()
    .post('/payments', ({ body }) => {
        const { amount } = body;

        // generate a unique correlation ID
        const correlationId = crypto.randomUUID();
    
        // get the current timestamp
        const requestedAt = new Date();
    
        console.log('Enqueuing payment', { amount, correlationId, requestedAt });
        
        // enqueue the payment with the amount, correlationId, and requestedAt
        PaymentsQueue.add({
            amount,
            correlationId,
            requestedAt,
        });

        return status(202);
    }, {
        body: t.Object({
            amount: t.Number({ description: 'Amount to be processed' }),
        }),
    });

export default payments;
