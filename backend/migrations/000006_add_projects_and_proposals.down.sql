-- Migration: 000006_add_projects_and_proposals (down)
-- Reverts tables created for Phase 5

DROP TABLE IF EXISTS proposals CASCADE;
DROP TABLE IF EXISTS project_skills CASCADE;
DROP TABLE IF EXISTS projects CASCADE;
