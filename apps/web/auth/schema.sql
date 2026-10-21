-- Apply only to the dedicated authentication database, as its owner.
-- Better Auth 1.6.23 and @better-auth/passkey 1.6.23.
BEGIN;
CREATE TABLE IF NOT EXISTS auth_user (
 id text PRIMARY KEY, name text NOT NULL, email text NOT NULL UNIQUE,
 "emailVerified" boolean NOT NULL DEFAULT false, image text,
 "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS auth_session (
 id text PRIMARY KEY, token text NOT NULL UNIQUE, "expiresAt" timestamptz NOT NULL,
 "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now(),
 "ipAddress" text, "userAgent" text, "userId" text NOT NULL REFERENCES auth_user(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS auth_session_user ON auth_session("userId");
CREATE TABLE IF NOT EXISTS auth_account (
 id text PRIMARY KEY, "accountId" text NOT NULL, "providerId" text NOT NULL,
 "userId" text NOT NULL REFERENCES auth_user(id) ON DELETE CASCADE,
 "accessToken" text, "refreshToken" text, "idToken" text,
 "accessTokenExpiresAt" timestamptz, "refreshTokenExpiresAt" timestamptz,
 scope text, password text, "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS auth_account_user ON auth_account("userId");
CREATE TABLE IF NOT EXISTS auth_verification (
 id text PRIMARY KEY, identifier text NOT NULL, value text NOT NULL,
 "expiresAt" timestamptz NOT NULL, "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS auth_verification_identifier ON auth_verification(identifier);
CREATE TABLE IF NOT EXISTS auth_passkey (
 id text PRIMARY KEY, name text, "publicKey" text NOT NULL,
 "userId" text NOT NULL REFERENCES auth_user(id) ON DELETE CASCADE,
 "credentialID" text NOT NULL UNIQUE, counter bigint NOT NULL,
 "deviceType" text NOT NULL, "backedUp" boolean NOT NULL, transports text,
 "createdAt" timestamptz, aaguid text
);
CREATE INDEX IF NOT EXISTS auth_passkey_user ON auth_passkey("userId");
CREATE TABLE IF NOT EXISTS auth_rate_limit (
 id text PRIMARY KEY, key text NOT NULL UNIQUE, count bigint NOT NULL, "lastRequest" bigint NOT NULL
);
COMMIT;
