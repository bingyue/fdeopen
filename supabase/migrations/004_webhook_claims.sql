-- Existing delivery IDs already represent successful deliveries.
ALTER TABLE webhook_deliveries ADD COLUMN IF NOT EXISTS completed boolean NOT NULL DEFAULT true;
ALTER TABLE webhook_deliveries ADD COLUMN IF NOT EXISTS claim_token text NOT NULL DEFAULT '';
