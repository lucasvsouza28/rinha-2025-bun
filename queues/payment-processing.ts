import { redis } from "bun";
import Queue from 'bull';
import { PAYMENTS_QUEUE } from '@queues/constants';

type PaymentProcessorType = 'default' | 'fallback';
type PaymentRequest = {
  amount: number;
  correlationId: string;
  requestedAt: Date;
};

const paymentsQueue = new Queue<PaymentRequest>(PAYMENTS_QUEUE, process.env.REDIS_URL || '');

paymentsQueue.process(async (job, done) => {
    const { amount, correlationId, requestedAt } = job.data;

    console.log(`Processing payment: ${correlationId}`);

    let processor: PaymentProcessorType = 'default';
    let defaultSucceeded = false, fallbackSuccedded = false;
    defaultSucceeded = await callProcessor('default', job.data);
    
    if (!defaultSucceeded) {
      fallbackSuccedded = await callProcessor('fallback', job.data);
      processor = 'fallback';
    }

    if (!defaultSucceeded && !fallbackSuccedded) {
      // re-queue
      await paymentsQueue.add(job.data);
      done();
      return;
    }

    const ok = await redis.set(`payments:${processor}:${correlationId}`, JSON.stringify({
        amount,
        requestedAt,
        status: 'processed',
        processor,
    }));
    
    console.log(`Payment processed via ${processor}: ${correlationId}`, ok);
    done();
});

async function callProcessor(processor: PaymentProcessorType, payment: PaymentRequest){
  const url = processor == 'default' ? process.env.PAYMENT_PROCESSOR_DEFAULT_URL : process.env.PAYMENT_PROCESSOR_FALLBACK_URL;

  if (!url) throw new Error('processor url not set');

  const response = await fetch({
    url: url + '/payments',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payment)
  });
  
  if (!response.ok) {
    console.error(`error processing payment via ${processor} processor: ${response.statusText}`);
    return false;
  }

  const json = await response.json();
  console.log(`processor response: `, json);

  return true;
}

export default paymentsQueue;
