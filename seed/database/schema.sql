-- Enable required extensions are handled in extensions.sql mounted as 00-extensions.sql
-- This file defines the core schema.

-- Projects
CREATE TABLE IF NOT EXISTS projects (
	id SERIAL PRIMARY KEY,
	name TEXT NOT NULL,
	description TEXT,
	repository_url TEXT,
	language TEXT,
	framework TEXT,
	metadata JSONB,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_projects_name ON projects (name);
CREATE INDEX IF NOT EXISTS idx_projects_metadata_gin ON projects USING GIN (metadata);

-- Memories with vector for semantic search
-- text-embedding-3-small has 1536 dimensions
CREATE TABLE IF NOT EXISTS memories (
	id BIGSERIAL PRIMARY KEY,
	project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
	memory_type TEXT NOT NULL,
	content TEXT NOT NULL,
	context TEXT,
	reasoning TEXT,
	confidence DOUBLE PRECISION,
	tags TEXT[] DEFAULT '{}',
	embedding VECTOR(1536),
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_memories_project_id ON memories (project_id);
CREATE INDEX IF NOT EXISTS idx_memories_memory_type ON memories (memory_type);
-- IVFFlat requires setting number of lists; tune as needed. Requires ANALYZE after populate.
CREATE INDEX IF NOT EXISTS idx_memories_embedding_ivfflat ON memories USING ivfflat (embedding vector_cosine_ops);

-- Stories
CREATE TABLE IF NOT EXISTS stories (
	id BIGSERIAL PRIMARY KEY,
	project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
	title TEXT,
	description TEXT,
	acceptance_criteria JSONB,
	story_points INTEGER,
	priority TEXT,
	status TEXT DEFAULT 'todo',
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stories_project_id ON stories (project_id);
CREATE INDEX IF NOT EXISTS idx_stories_priority ON stories (priority);
CREATE INDEX IF NOT EXISTS idx_stories_acceptance_criteria_gin ON stories USING GIN (acceptance_criteria);

-- Workflows
CREATE TABLE IF NOT EXISTS workflows (
	id BIGSERIAL PRIMARY KEY,
	project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
	workflow_type TEXT NOT NULL,
	steps JSONB,
	status TEXT DEFAULT 'pending',
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workflows_project_id ON workflows (project_id);
CREATE INDEX IF NOT EXISTS idx_workflows_type ON workflows (workflow_type);
CREATE INDEX IF NOT EXISTS idx_workflows_steps_gin ON workflows USING GIN (steps);

-- Triggers to auto-update updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
	NEW.updated_at = NOW();
	RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM pg_trigger WHERE tgname = 'set_projects_updated_at'
	) THEN
		CREATE TRIGGER set_projects_updated_at
		BEFORE UPDATE ON projects
		FOR EACH ROW EXECUTE FUNCTION set_updated_at();
	END IF;
END $$;

DO $$ BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM pg_trigger WHERE tgname = 'set_memories_updated_at'
	) THEN
		CREATE TRIGGER set_memories_updated_at
		BEFORE UPDATE ON memories
		FOR EACH ROW EXECUTE FUNCTION set_updated_at();
	END IF;
END $$;

DO $$ BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM pg_trigger WHERE tgname = 'set_stories_updated_at'
	) THEN
		CREATE TRIGGER set_stories_updated_at
		BEFORE UPDATE ON stories
		FOR EACH ROW EXECUTE FUNCTION set_updated_at();
	END IF;
END $$;

DO $$ BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM pg_trigger WHERE tgname = 'set_workflows_updated_at'
	) THEN
		CREATE TRIGGER set_workflows_updated_at
		BEFORE UPDATE ON workflows
		FOR EACH ROW EXECUTE FUNCTION set_updated_at();
	END IF;
END $$;

-- Policies
CREATE TABLE IF NOT EXISTS policies (
	id BIGSERIAL PRIMARY KEY,
	name TEXT NOT NULL,
	description TEXT,
	rules JSONB NOT NULL,
	active BOOLEAN NOT NULL DEFAULT TRUE,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_policies_active ON policies (active);
CREATE INDEX IF NOT EXISTS idx_policies_rules_gin ON policies USING GIN (rules);

DO $$ BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM pg_trigger WHERE tgname = 'set_policies_updated_at'
	) THEN
		CREATE TRIGGER set_policies_updated_at
		BEFORE UPDATE ON policies
		FOR EACH ROW EXECUTE FUNCTION set_updated_at();
	END IF;
END $$;