-- Core extensions for DevAI
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Optional tuning defaults; change per environment needs
-- SET default_statistics_target = 500;