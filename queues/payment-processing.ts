import { redis } from "bun";
import Queue from 'bull';
import { PAYMENTS_QUEUE } from '@queues/constants';

const paymentsQueue = new Queue<{
    amount: number;
    correlationId: string;
    requestedAt: Date;
}>(PAYMENTS_QUEUE, process.env.REDIS_URL || '');

paymentsQueue.process(async (job, done) => {
    const { amount, correlationId, requestedAt } = job.data;

    console.log(`Processing payment: ${correlationId}`);

    
    const ok = await redis.set(`payments:${correlationId}`, JSON.stringify({
        amount,
        requestedAt,
        status: 'processed',
    }));
    
    console.log(`Payment processed: ${correlationId}`, ok);
    done();
});

export default paymentsQueue;
