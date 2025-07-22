import { redis } from "bun";
import Queue from 'bull';
import { PAYMENTS_QUEUE } from '@queues/constants';
import { cache } from "react";

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
  let processorResponse: { success: boolean; code: number; } | undefined;
  const defaultProcessorHealth = await getProcessorHealth('default');

  if (!defaultProcessorHealth.failing) {
    processorResponse = await callProcessor('default', job.data);
  }

  const fallbackProcessorHealth = await getProcessorHealth('fallback');

  if (!processorResponse.success && !fallbackProcessorHealth.failing) {
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

type PaymentProcessorHealth = {
  failing: boolean,
  minResponseTime: number,
}

async function getProcessorHealth(processor: PaymentProcessorType): PaymentProcessorHealth {
  console.log(`checking processor health: ${processor}`);
  const key = 'payment-processor-health:' + processor;
  const hasCache = await redis.exists(key);

  if (hasCache) {
    const cached = await redis.get(key);
    return JSON.parse(cached) as PaymentProcessorHealth;
  }

  const url = processor == 'default' ? process.env.PAYMENT_PROCESSOR_DEFAULT_URL : process.env.PAYMENT_PROCESSOR_FALLBACK_URL;
  const response = await fetch({
    url: `${url}/payments/service-health`,
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  });
  if (!response.ok) {
    console.error(`error checking processor's health`)
    return {
      failing: true,
      minResponseTime: 0
    };
  }

  const FIVE_MIN_IN_SECONDS = 1000 * 60 * 5;
  await redis.set(key, JSON.stringify(await response.json()))
  await redis.expire(FIVE_MIN_IN_SECONDS);
}

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
