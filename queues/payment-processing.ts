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
  let processorResponse = await callProcessor('default', job.data);

  // if default processor returns 200 with failing + minResponseTime, delay the job
  // if default processor returns 500, try fallback

  if (!processorResponse.success) {
    processorResponse = await callProcessor('fallback', job.data);
    processor = 'fallback';
  }

  if (processorResponse.success) {
    const ok = await redis.set(`payments:${processor}:${correlationId}`, JSON.stringify({
      amount,
      requestedAt,
      status: 'processed',
      processor,
    }));

    console.log(`Payment processed via ${processor}: ${correlationId}`, ok);
    done();
    return;
  }

  // re-queue
  console.log(`unable to proccess payment ${correlationId}. Sending back to queue`);
  await paymentsQueue.add(job.data);
  done();
});

async function callProcessor(processor: PaymentProcessorType, payment: PaymentRequest) {
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
    console.error(`error processing payment via ${processor} processor: ${response.status} ${response.statusText}`);

    return { success: false, code: response.status };
  }

  const json = await response.json();
  console.log(`processor response: `, json);

  return { success: true, code: response.status };
}

export default paymentsQueue;
