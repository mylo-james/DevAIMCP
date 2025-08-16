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

-- Post-Job Memories
CREATE TABLE IF NOT EXISTS post_job_memories (
	id BIGSERIAL PRIMARY KEY,
	actor_id INTEGER NOT NULL REFERENCES personas(id) ON DELETE CASCADE,
	story_id INTEGER REFERENCES stories(id) ON DELETE SET NULL,
	job_type TEXT NOT NULL,
	summary TEXT NOT NULL,
	critical_learnings JSONB DEFAULT '[]',
	confidence DOUBLE PRECISION NOT NULL,
	tags TEXT[] DEFAULT '{}',
	embedding VECTOR(1536),
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_post_job_memories_actor_id ON post_job_memories (actor_id);
CREATE INDEX IF NOT EXISTS idx_post_job_memories_story_id ON post_job_memories (story_id);
CREATE INDEX IF NOT EXISTS idx_post_job_memories_job_type ON post_job_memories (job_type);
CREATE INDEX IF NOT EXISTS idx_post_job_memories_tags_gin ON post_job_memories USING GIN (tags);
CREATE INDEX IF NOT EXISTS idx_post_job_memories_embedding_ivfflat ON post_job_memories USING ivfflat (embedding vector_cosine_ops);

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

-- Defects
CREATE TABLE IF NOT EXISTS defects (
	id BIGSERIAL PRIMARY KEY,
	story_id INTEGER NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
	qa_actor_id INTEGER NOT NULL REFERENCES personas(id) ON DELETE CASCADE,
	title TEXT NOT NULL,
	description TEXT NOT NULL,
	severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
	status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_defects_story_id ON defects (story_id);
CREATE INDEX IF NOT EXISTS idx_defects_qa_actor_id ON defects (qa_actor_id);
CREATE INDEX IF NOT EXISTS idx_defects_severity ON defects (severity);
CREATE INDEX IF NOT EXISTS idx_defects_status ON defects (status);

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
		SELECT 1 FROM pg_trigger WHERE tgname = 'set_post_job_memories_updated_at'
	) THEN
		CREATE TRIGGER set_post_job_memories_updated_at
		BEFORE UPDATE ON post_job_memories
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
		SELECT 1 FROM pg_trigger WHERE tgname = 'set_defects_updated_at'
	) THEN
		CREATE TRIGGER set_defects_updated_at
		BEFORE UPDATE ON defects
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

-- Actor Keys for Authorization
CREATE TABLE IF NOT EXISTS actor_keys (
	id BIGSERIAL PRIMARY KEY,
	actor_id INTEGER NOT NULL REFERENCES personas(id) ON DELETE CASCADE,
	key_hash TEXT NOT NULL UNIQUE,
	scopes TEXT[] DEFAULT '{}',
	expires_at TIMESTAMPTZ,
	active BOOLEAN NOT NULL DEFAULT TRUE,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_actor_keys_actor_id ON actor_keys (actor_id);
CREATE INDEX IF NOT EXISTS idx_actor_keys_key_hash ON actor_keys (key_hash);
CREATE INDEX IF NOT EXISTS idx_actor_keys_active ON actor_keys (active);
CREATE INDEX IF NOT EXISTS idx_actor_keys_expires_at ON actor_keys (expires_at);

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

-- Audit Log for Access Control
CREATE TABLE IF NOT EXISTS audit_log (
	id BIGSERIAL PRIMARY KEY,
	actor_id INTEGER REFERENCES personas(id) ON DELETE SET NULL,
	action TEXT NOT NULL,
	resource_id INTEGER REFERENCES kb_resources(id) ON DELETE SET NULL,
	decision TEXT NOT NULL CHECK (decision IN ('allow', 'deny')),
	reason TEXT NOT NULL,
	metadata JSONB,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_actor_id ON audit_log (actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_resource_id ON audit_log (resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_decision ON audit_log (decision);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log (created_at);

-- HITL Requests
CREATE TABLE IF NOT EXISTS hitl_requests (
	id BIGSERIAL PRIMARY KEY,
	epic_id INTEGER NOT NULL REFERENCES epics(id) ON DELETE CASCADE,
	requester_actor_id INTEGER REFERENCES personas(id) ON DELETE SET NULL,
	request_type TEXT NOT NULL CHECK (request_type IN ('epic_completion', 'escalation')),
	title TEXT NOT NULL,
	description TEXT NOT NULL,
	context JSONB NOT NULL,
	priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
	status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'escalated')),
	human_reviewer TEXT,
	decision_reason TEXT,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	decided_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_hitl_requests_epic_id ON hitl_requests (epic_id);
CREATE INDEX IF NOT EXISTS idx_hitl_requests_requester_actor_id ON hitl_requests (requester_actor_id);
CREATE INDEX IF NOT EXISTS idx_hitl_requests_request_type ON hitl_requests (request_type);
CREATE INDEX IF NOT EXISTS idx_hitl_requests_status ON hitl_requests (status);
CREATE INDEX IF NOT EXISTS idx_hitl_requests_priority ON hitl_requests (priority);
CREATE INDEX IF NOT EXISTS idx_hitl_requests_created_at ON hitl_requests (created_at);

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
		SELECT 1 FROM pg_trigger WHERE tgname = 'set_actor_keys_updated_at'
	) THEN
		CREATE TRIGGER set_actor_keys_updated_at
		BEFORE UPDATE ON actor_keys
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
		SELECT 1 FROM pg_trigger WHERE tgname = 'set_hitl_requests_updated_at'
	) THEN
		CREATE TRIGGER set_hitl_requests_updated_at
		BEFORE UPDATE ON hitl_requests
		FOR EACH ROW EXECUTE FUNCTION set_updated_at();
	END IF;
END $$;

DO $$ BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM pg_trigger WHERE tgname = 'set_hitl_requests_updated_at'
	) THEN
		CREATE TRIGGER set_hitl_requests_updated_at
		BEFORE UPDATE ON hitl_requests
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