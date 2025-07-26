import { PaymentSqlRepository, type IPaymentRepository } from "@repositories/payments";

export function buildPaymentRepository(): IPaymentRepository {
  return new PaymentSqlRepository();
}
