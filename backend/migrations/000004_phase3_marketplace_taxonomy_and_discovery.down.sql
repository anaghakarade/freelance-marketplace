-- Migration: 000004_phase3_marketplace_taxonomy_and_discovery.down.sql
-- Rolls back Phase 3 Marketplace discovery tables and added services

DROP TABLE IF EXISTS trending_group_services;
DROP TABLE IF EXISTS trending_groups;
ALTER TABLE services DROP COLUMN IF EXISTS views_count;
