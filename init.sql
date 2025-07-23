CREATE TABLE  IF NOT EXISTS "public".payments(
  correlation_id UUID PRIMARY KEY,
  amount DECIMAL NOT NULL,
  requested_at TIMESTAMP NOT NULL,
  processor TEXT NOT NULL
);

CREATE INDEX idx_payments_requested_at ON "public".payments (requested_at);
