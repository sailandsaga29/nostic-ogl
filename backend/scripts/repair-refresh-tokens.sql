-- Repair orphaned refresh tokens after UUID → identity migration.
-- Safe to run anytime.

DELETE FROM refresh_tokens WHERE "userId" IS NULL;
