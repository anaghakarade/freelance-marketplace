-- Migration: 000007_create_contracts_and_milestones.down
-- Description: Rolls back contracts, milestones, and milestone_submissions tables

DROP TABLE IF EXISTS milestone_submissions CASCADE;
DROP TABLE IF EXISTS milestones CASCADE;
DROP TABLE IF EXISTS contracts CASCADE;
