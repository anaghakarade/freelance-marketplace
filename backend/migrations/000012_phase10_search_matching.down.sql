-- Phase 10: Down migration
DROP TABLE IF EXISTS user_interactions CASCADE;
DROP INDEX IF EXISTS idx_projects_skills_gin;
DROP INDEX IF EXISTS idx_users_skills_gin;
DROP INDEX IF EXISTS idx_services_status_delivery;
DROP INDEX IF EXISTS idx_services_status_price;
DROP INDEX IF EXISTS idx_services_status_rating;
DROP INDEX IF EXISTS idx_services_tags_gin;
