import { redis } from "bun";
import Queue from "bull";
import { PAYMENTS_QUEUE } from "@queues/constants";
import { PaymentSqlRepository } from "@repositories/payments";

type PaymentProcessorType = "default" | "fallback";
type PaymentRequest = {
  amount: number;
  correlation_id: string;
  requested_at: Date;
};

type PaymentProcessorConfig = {
  [key in PaymentProcessorType]: {
    url: string;
  };
};

const config: PaymentProcessorConfig = {
  default: {
    url: process.env.PAYMENT_PROCESSOR_DEFAULT_URL || "not-set",
  },
  fallback: {
    url: process.env.PAYMENT_PROCESSOR_FALLBACK_URL || "not-set",
  },
};

const paymentsQueue = new Queue<PaymentRequest>(PAYMENTS_QUEUE, process.env.REDIS_URL || "");

export function initializeQueue() {
  paymentsQueue.process(async (job, done) => {
    const { correlation_id } = job.data;

    try {
      console.log(`Processing payment: ${correlation_id}`);

      let processor: PaymentProcessorType = "default";
      let processorResponse: { success: boolean; code: number } = { success: false, code: 0 };
      const defaultProcessorHealth = await getProcessorHealth("default");

      if (!defaultProcessorHealth.failing) {
        processorResponse = await callProcessor("default", job.data);

        if (processorResponse.success) {
          await persistPayment(job.data, processor);
          done();
          return;
        }

        if (processorResponse.code === 422) {
          console.log("payment already exists");
          done();
          return;
        }
      }

      const fallbackProcessorHealth = await getProcessorHealth("fallback");

      if (!fallbackProcessorHealth.failing) {
        processorResponse = await callProcessor("fallback", job.data);
        processor = "fallback";

        if (processorResponse.success) {
          await persistPayment(job.data, processor);
          done();
          return;
        }

        if (processorResponse.code === 422) {
          console.log("payment already exists");
          done();
          return;
        }
      }

      // re-queue
      console.log(`unable to proccess payment ${correlation_id}. Sending back to queue`);
      await paymentsQueue.add(job.data);
    } catch (err) {
      console.error(err, `error while processing payment ${correlation_id}`);
    } finally {
      done();
    }
  });
}

async function persistPayment(payment: PaymentRequest, processor: PaymentProcessorType) {
  const repo = new PaymentSqlRepository();
  await repo.persistPayment({ ...payment, processor });

  console.log(`Payment processed via ${processor}: ${payment.correlation_id}`);
}

type PaymentProcessorHealth = {
  failing: boolean;
  minResponseTime: number;
};

async function getProcessorHealth(
  processor: PaymentProcessorType,
): Promise<PaymentProcessorHealth> {
  console.log(`checking processor health: ${processor}`);
  const key = "payment-processor-health:" + processor;
  const cached = (await redis.get(key)) || "";

  if (cached) {
    console.log("returning from cache: ", cached);
    return JSON.parse(cached) as PaymentProcessorHealth;
  }

  const response = await fetch({
    url: `${config[processor].url}/payments/service-health`,
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    console.error(`error checking processor's health: `, response.statusText);
    return {
      failing: true,
      minResponseTime: 0,
    };
  }

  const FIVE_MIN_IN_SECONDS = 1000 * 60 * 5;
  const json = await response.text();
  await redis.set(key, json);
  await redis.expire(key, FIVE_MIN_IN_SECONDS);
  console.log(`processor's ${processor} health:`, json);

  return JSON.parse(json) as PaymentProcessorHealth;
}

async function callProcessor(processor: PaymentProcessorType, payment: PaymentRequest) {
  const response = await fetch({
    url: `${config[processor].url}/payments`,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      correlationId: payment.correlation_id,
      amount: payment.amount,
      requestedAt: payment.requested_at,
    }),
  });

  if (!response.ok) {
    console.error(
      `error processing payment via ${processor} processor: ${response.status} ${response.statusText}`,
    );

    return { success: false, code: response.status };
  }

  const json = await response.json();
  console.log(`processor response: `, json);

  return { success: true, code: response.status };
}

export default paymentsQueue;
