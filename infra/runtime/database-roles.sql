-- Run as sportsball_owner AFTER restore/migrations. Passwords are supplied separately.
-- These roles cannot log in until an operator assigns strong passwords.
CREATE ROLE sportsball_ingestion LOGIN;
CREATE ROLE sportsball_web LOGIN;
CREATE ROLE sportsball_backup LOGIN;
REVOKE ALL ON DATABASE sportsball FROM PUBLIC;
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
GRANT CONNECT ON DATABASE sportsball TO sportsball_ingestion, sportsball_web, sportsball_backup;
GRANT USAGE ON SCHEMA public TO sportsball_ingestion, sportsball_web, sportsball_backup;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO sportsball_ingestion;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO sportsball_ingestion;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO sportsball_backup;
GRANT SELECT ON ALL SEQUENCES IN SCHEMA public TO sportsball_backup;
-- Keep raw payloads and artifact downloads outside website access.
-- Run metadata remains readable for the existing health-query layer.
SELECT format('GRANT SELECT ON TABLE public.%I TO sportsball_web', tablename)
FROM pg_tables WHERE schemaname = 'public'
AND tablename NOT IN ('source_payloads', 'source_artifacts') \gexec
ALTER DEFAULT PRIVILEGES FOR ROLE sportsball_owner IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO sportsball_ingestion;
ALTER DEFAULT PRIVILEGES FOR ROLE sportsball_owner IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO sportsball_ingestion;
ALTER DEFAULT PRIVILEGES FOR ROLE sportsball_owner IN SCHEMA public
  GRANT SELECT ON TABLES TO sportsball_backup;
ALTER DEFAULT PRIVILEGES FOR ROLE sportsball_owner IN SCHEMA public
  GRANT SELECT ON SEQUENCES TO sportsball_backup;
-- Review website grants for each future migration. Website has no write privileges.
