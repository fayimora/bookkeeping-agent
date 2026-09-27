-- better-auth 1.7 requires accounts.issuer. Backfill existing rows with the
-- synthetic issuers better-auth itself generates:
--   createLocalAccountIssuer('credential') => 'local:credential'
--   createOAuthAccountIssuer(providerId)   => 'local:oauth:<providerId>'
ALTER TABLE "accounts" ADD COLUMN "issuer" text;--> statement-breakpoint
UPDATE "accounts" SET "issuer" = CASE
	WHEN "provider_id" = 'credential' THEN 'local:credential'
	ELSE 'local:oauth:' || "provider_id"
END WHERE "issuer" IS NULL;--> statement-breakpoint
ALTER TABLE "accounts" ALTER COLUMN "issuer" SET NOT NULL;--> statement-breakpoint
UPDATE "verifications" SET "created_at" = now() WHERE "created_at" IS NULL;--> statement-breakpoint
UPDATE "verifications" SET "updated_at" = now() WHERE "updated_at" IS NULL;--> statement-breakpoint
ALTER TABLE "verifications" ALTER COLUMN "created_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "verifications" ALTER COLUMN "updated_at" SET NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "accounts_issuer_account_id_unique" ON "accounts" ("issuer","account_id");--> statement-breakpoint
CREATE INDEX "verifications_identifier_idx" ON "verifications" ("identifier");
