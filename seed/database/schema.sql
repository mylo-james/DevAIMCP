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

-- Personas
CREATE TABLE IF NOT EXISTS personas (
	id BIGSERIAL PRIMARY KEY,
	name TEXT NOT NULL,
	role TEXT NOT NULL,
	biography TEXT NOT NULL,
	specialties JSONB NOT NULL,
	preferences JSONB NOT NULL,
	style TEXT NOT NULL,
	procedures JSONB NOT NULL,
	checklists JSONB NOT NULL,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_personas_role ON personas (role);
CREATE INDEX IF NOT EXISTS idx_personas_name ON personas (name);
CREATE INDEX IF NOT EXISTS idx_personas_specialties_gin ON personas USING GIN (specialties);

-- Knowledge Base Resources
CREATE TABLE IF NOT EXISTS kb_resources (
	id BIGSERIAL PRIMARY KEY,
	project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
	uri TEXT NOT NULL,
	type TEXT NOT NULL,
	content TEXT,
	access_tags TEXT[] DEFAULT '{}',
	metadata JSONB,
	embedding VECTOR(1536),
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kb_resources_project_id ON kb_resources (project_id);
CREATE INDEX IF NOT EXISTS idx_kb_resources_type ON kb_resources (type);
CREATE INDEX IF NOT EXISTS idx_kb_resources_access_tags_gin ON kb_resources USING GIN (access_tags);
CREATE INDEX IF NOT EXISTS idx_kb_resources_embedding_ivfflat ON kb_resources USING ivfflat (embedding vector_cosine_ops);

-- Per-Actor Importance Scoring
CREATE TABLE IF NOT EXISTS kb_actor_importance (
	id BIGSERIAL PRIMARY KEY,
	actor_id INTEGER NOT NULL REFERENCES personas(id) ON DELETE CASCADE,
	resource_id INTEGER NOT NULL REFERENCES kb_resources(id) ON DELETE CASCADE,
	importance INTEGER NOT NULL DEFAULT 0,
	last_touched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	UNIQUE(actor_id, resource_id)
);

CREATE INDEX IF NOT EXISTS idx_kb_actor_importance_actor_id ON kb_actor_importance (actor_id);
CREATE INDEX IF NOT EXISTS idx_kb_actor_importance_resource_id ON kb_actor_importance (resource_id);
CREATE INDEX IF NOT EXISTS idx_kb_actor_importance_importance ON kb_actor_importance (importance DESC);
CREATE INDEX IF NOT EXISTS idx_kb_actor_importance_last_touched ON kb_actor_importance (last_touched_at);

-- Activity Log for tracking actor activity
CREATE TABLE IF NOT EXISTS activity_log (
	id BIGSERIAL PRIMARY KEY,
	actor_id INTEGER NOT NULL REFERENCES personas(id) ON DELETE CASCADE,
	action TEXT NOT NULL,
	resource_id INTEGER REFERENCES kb_resources(id) ON DELETE SET NULL,
	story_id INTEGER REFERENCES stories(id) ON DELETE SET NULL,
	metadata JSONB,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_log_actor_id ON activity_log (actor_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_created_at ON activity_log (created_at);
CREATE INDEX IF NOT EXISTS idx_activity_log_action ON activity_log (action);

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
		SELECT 1 FROM pg_trigger WHERE tgname = 'set_personas_updated_at'
	) THEN
		CREATE TRIGGER set_personas_updated_at
		BEFORE UPDATE ON personas
		FOR EACH ROW EXECUTE FUNCTION set_updated_at();
	END IF;
END $$;

DO $$ BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM pg_trigger WHERE tgname = 'set_kb_resources_updated_at'
	) THEN
		CREATE TRIGGER set_kb_resources_updated_at
		BEFORE UPDATE ON kb_resources
		FOR EACH ROW EXECUTE FUNCTION set_updated_at();
	END IF;
END $$;

DO $$ BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM pg_trigger WHERE tgname = 'set_kb_actor_importance_updated_at'
	) THEN
		CREATE TRIGGER set_kb_actor_importance_updated_at
		BEFORE UPDATE ON kb_actor_importance
		FOR EACH ROW EXECUTE FUNCTION set_updated_at();
	END IF;
END $$;

DO $$ BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM pg_trigger WHERE tgname = 'set_policies_updated_at'
	) THEN
		CREATE TRIGGER set_policies_updated_at
		BEFORE UPDATE ON policies
		FOR EACH ROW EXECUTE FUNCTION set_updated_at();
	END IF;
END $$;