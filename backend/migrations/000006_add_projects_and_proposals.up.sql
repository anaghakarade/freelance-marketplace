-- Migration: 000006_add_projects_and_proposals
-- Description: Creates projects, project_skills, and proposals tables for Phase 5 buyer project marketplace

-- 1. Projects Table
CREATE TABLE IF NOT EXISTS projects (
    id VARCHAR(64) PRIMARY KEY,
    buyer_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    category_id VARCHAR(64) NOT NULL REFERENCES categories(id),
    subcategory_id VARCHAR(64) REFERENCES subcategories(id),
    skills JSONB NOT NULL DEFAULT '[]'::jsonb,
    budget_type VARCHAR(32) NOT NULL DEFAULT 'fixed',
    budget_min NUMERIC(10, 2),
    budget_max NUMERIC(10, 2),
    fixed_budget NUMERIC(10, 2),
    experience_level VARCHAR(32) NOT NULL DEFAULT 'intermediate',
    estimated_duration VARCHAR(64) NOT NULL DEFAULT '1 to 3 months',
    status VARCHAR(32) NOT NULL DEFAULT 'open',
    visibility VARCHAR(32) NOT NULL DEFAULT 'public',
    proposal_count INT NOT NULL DEFAULT 0,
    selected_proposal_id VARCHAR(64),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Project Skills (normalized index table for fast skill lookups)
CREATE TABLE IF NOT EXISTS project_skills (
    id SERIAL PRIMARY KEY,
    project_id VARCHAR(64) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    skill VARCHAR(100) NOT NULL
);

-- 3. Proposals Table
CREATE TABLE IF NOT EXISTS proposals (
    id VARCHAR(64) PRIMARY KEY,
    project_id VARCHAR(64) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    freelancer_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    cover_letter TEXT NOT NULL,
    bid_amount NUMERIC(10, 2) NOT NULL,
    delivery_days INT NOT NULL,
    estimated_duration VARCHAR(64),
    status VARCHAR(32) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_proposals_project_freelancer UNIQUE(project_id, freelancer_id)
);

-- 4. Foreign key for selected_proposal_id on projects (deferred)
ALTER TABLE projects
    DROP CONSTRAINT IF EXISTS fk_projects_selected_proposal;

ALTER TABLE projects
    ADD CONSTRAINT fk_projects_selected_proposal
    FOREIGN KEY (selected_proposal_id) REFERENCES proposals(id) ON DELETE SET NULL;

-- 5. Indexes
CREATE INDEX IF NOT EXISTS idx_projects_buyer_id ON projects(buyer_id);
CREATE INDEX IF NOT EXISTS idx_projects_category_id ON projects(category_id);
CREATE INDEX IF NOT EXISTS idx_projects_subcategory_id ON projects(subcategory_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_projects_budget_type ON projects(budget_type);
CREATE INDEX IF NOT EXISTS idx_projects_experience_level ON projects(experience_level);

CREATE INDEX IF NOT EXISTS idx_project_skills_project_id ON project_skills(project_id);
CREATE INDEX IF NOT EXISTS idx_project_skills_skill ON project_skills(LOWER(skill));

CREATE INDEX IF NOT EXISTS idx_proposals_project_id ON proposals(project_id);
CREATE INDEX IF NOT EXISTS idx_proposals_freelancer_id ON proposals(freelancer_id);
CREATE INDEX IF NOT EXISTS idx_proposals_status ON proposals(status);
CREATE INDEX IF NOT EXISTS idx_proposals_created_at ON proposals(created_at DESC);

-- 6. Seed Realistic Demo Projects
INSERT INTO projects (
    id, buyer_id, title, description, category_id, subcategory_id,
    skills, budget_type, budget_min, budget_max, fixed_budget,
    experience_level, estimated_duration, status, visibility, proposal_count, created_at, updated_at
) VALUES
(
    'prj_1',
    'usr_6',
    'Build a High-Performance React SaaS Analytics Dashboard',
    'We are looking for an experienced full-stack frontend engineer to build a multi-tenant analytics dashboard. Requires interactive chart visualizations, responsive glassmorphism dark/light UI, and clean REST API integration with real-time updates.',
    'cat_2',
    'sub_4',
    '["React", "TypeScript", "Vite", "TailwindCSS", "Chart.js", "REST APIs"]'::jsonb,
    'fixed',
    800.00,
    1400.00,
    1100.00,
    'expert',
    '1 to 3 months',
    'open',
    'public',
    2,
    NOW() - INTERVAL '5 days',
    NOW() - INTERVAL '5 days'
),
(
    'prj_2',
    'usr_6',
    'Brand Identity & Design System for Clean Energy Startup',
    'Seeking a brand identity designer to develop complete visual guidelines, vector logo system, Figma typography scales, color palette, presentation slide decks, and marketing stationery assets.',
    'cat_1',
    'sub_11',
    '["Figma", "Branding", "Logo Design", "Design Systems", "Typography", "Illustrator"]'::jsonb,
    'fixed',
    450.00,
    850.00,
    650.00,
    'intermediate',
    'Less than 1 month',
    'open',
    'public',
    2,
    NOW() - INTERVAL '4 days',
    NOW() - INTERVAL '4 days'
),
(
    'prj_3',
    'usr_6',
    'Autonomous AI Customer Support & Ticketing Assistant',
    'We need a specialized AI developer to build an autonomous support agent capable of reading user documentation, triaging inbound support tickets, summarizing conversations, and drafting responses using LLM tools and embeddings.',
    'cat_6',
    'sub_31',
    '["Python", "OpenAI API", "LangChain", "Vector Databases", "PostgreSQL", "FastAPI"]'::jsonb,
    'hourly',
    45.00,
    85.00,
    NULL,
    'expert',
    '1 to 3 months',
    'open',
    'public',
    1,
    NOW() - INTERVAL '3 days',
    NOW() - INTERVAL '3 days'
),
(
    'prj_4',
    'usr_6',
    'SEO Content Strategy & High-Impact Tech Blog Articles',
    'Looking for a technical copywriter to write 8 in-depth blog posts covering cloud DevOps, microservices architecture, and modern developer tooling. Must include organic keyword research and semantic search optimization.',
    'cat_4',
    'sub_22',
    '["SEO Writing", "Technical Writing", "Content Strategy", "DevOps", "Blogging"]'::jsonb,
    'fixed',
    300.00,
    600.00,
    450.00,
    'intermediate',
    'Less than 1 month',
    'open',
    'public',
    1,
    NOW() - INTERVAL '2 days',
    NOW() - INTERVAL '2 days'
),
(
    'prj_5',
    'usr_6',
    '3D Product Launch Animation & Interactive Visual Showcase',
    'Produce a 30-second cinema-grade 3D product reveal video showcasing our industrial hardware sensor. Requires 3D modeling, dynamic lighting, texturing, sound design, and vertical social aspect crops.',
    'cat_5',
    'sub_28',
    '["3D Animation", "Blender", "After Effects", "Motion Design", "Cinema 4D"]'::jsonb,
    'fixed',
    750.00,
    1500.00,
    1000.00,
    'expert',
    'Less than 1 month',
    'open',
    'public',
    1,
    NOW() - INTERVAL '1 day',
    NOW() - INTERVAL '1 day'
),
(
    'prj_6',
    'usr_6',
    'PostgreSQL Database Architecture & Query Optimization',
    'Our marketplace queries are slowing down on large joins. Need a senior PostgreSQL DBA to profile slow query logs, optimize composite indexing, restructure connection pool settings, and design partitioned tables for historical records.',
    'cat_2',
    'sub_9',
    '["PostgreSQL", "Database Optimization", "Query Tuning", "SQL", "DevOps"]'::jsonb,
    'hourly',
    60.00,
    110.00,
    NULL,
    'expert',
    'Less than 1 month',
    'open',
    'public',
    0,
    NOW() - INTERVAL '12 hours',
    NOW() - INTERVAL '12 hours'
),
(
    'prj_7',
    'usr_6',
    'E-Commerce Shopify Plus Custom Checkout & Theme Engineering',
    'Migrating custom direct-to-consumer store to Shopify Plus with custom Liquid sections, Klaviyo integrations, and optimized mobile page speeds (< 1.5s First Contentful Paint).',
    'cat_2',
    'sub_8',
    '["Shopify Plus", "Liquid", "JavaScript", "E-Commerce", "CSS3", "Web Performance"]'::jsonb,
    'fixed',
    1200.00,
    2200.00,
    1800.00,
    'intermediate',
    '1 to 3 months',
    'open',
    'public',
    0,
    NOW() - INTERVAL '8 hours',
    NOW() - INTERVAL '8 hours'
),
(
    'prj_8',
    'usr_6',
    'B2B Growth Marketing Funnel & Google Search Ad Optimization',
    'Scale qualified lead generation for our enterprise SaaS product. Optimize Google Ads search campaigns, implement conversion tracking, and conduct A/B landing page experiments.',
    'cat_3',
    'sub_17',
    '["Google Ads", "Conversion Rate Optimization", "Growth Marketing", "Analytics"]'::jsonb,
    'hourly',
    40.00,
    75.00,
    NULL,
    'intermediate',
    '3 to 6 months',
    'open',
    'public',
    0,
    NOW() - INTERVAL '4 hours',
    NOW() - INTERVAL '4 hours'
)
ON CONFLICT (id) DO NOTHING;

-- 7. Populate project_skills helper table from project skills JSON
INSERT INTO project_skills (project_id, skill)
SELECT p.id, jsonb_array_elements_text(p.skills)
FROM projects p
WHERE NOT EXISTS (
    SELECT 1 FROM project_skills ps WHERE ps.project_id = p.id
);

-- 8. Seed Proposals from Existing Freelancers
INSERT INTO proposals (
    id, project_id, freelancer_id, cover_letter, bid_amount,
    delivery_days, estimated_duration, status, created_at, updated_at
) VALUES
(
    'prop_1',
    'prj_1',
    'usr_2',
    'Hello Alice! I have 7+ years of expertise developing enterprise React and TypeScript dashboards. In my recent contract, I built an analytics platform supporting 50k daily active users with sub-second chart re-renders and clean Vite architecture. I can deliver the core milestone within 20 days.',
    1050.00,
    21,
    '3 weeks',
    'pending',
    NOW() - INTERVAL '4 days',
    NOW() - INTERVAL '4 days'
),
(
    'prop_2',
    'prj_1',
    'usr_1',
    'Hi! While my primary specialty is UI/UX product design in Figma, I frequently partner on full React frontends. I can design the high-fidelity component library and build pixel-perfect interactive dashboards with excellent accessibility and mobile responsiveness.',
    1200.00,
    25,
    '4 weeks',
    'shortlisted',
    NOW() - INTERVAL '3 days',
    NOW() - INTERVAL '3 days'
),
(
    'prop_3',
    'prj_2',
    'usr_1',
    'Greetings! Brand systems and Figma design packages are my core craft. I have designed complete visual identities for 15+ Y Combinator and European tech startups. I will provide full vector logos, typography scales, light/dark palettes, and a ready-to-use Figma component UI kit.',
    650.00,
    14,
    '2 weeks',
    'shortlisted',
    NOW() - INTERVAL '3 days',
    NOW() - INTERVAL '3 days'
),
(
    'prop_4',
    'prj_2',
    'usr_3',
    'I specialize in brand strategy and distinctive vector illustrations. I will create a tailored visual narrative that highlights your clean energy mission, ensuring consistency across web, social, and investor collateral.',
    600.00,
    16,
    '2-3 weeks',
    'pending',
    NOW() - INTERVAL '2 days',
    NOW() - INTERVAL '2 days'
),
(
    'prop_5',
    'prj_3',
    'usr_5',
    'Hi Alice, I am a data scientist and machine learning engineer with extensive experience building autonomous agents and LangChain pipelines. I have implemented vector embeddings retrieval (RAG) for customer support bots that reduced human ticket volume by 42%.',
    65.00,
    28,
    '1 month',
    'pending',
    NOW() - INTERVAL '2 days',
    NOW() - INTERVAL '2 days'
),
(
    'prop_6',
    'prj_4',
    'usr_4',
    'As a growth marketer and technical SEO specialist, I don’t just write articles—I structure them to rank on Google and convert enterprise leads. I will conduct comprehensive SERP competitor analysis before drafting each piece.',
    450.00,
    20,
    '3 weeks',
    'pending',
    NOW() - INTERVAL '1 day',
    NOW() - INTERVAL '1 day'
),
(
    'prop_7',
    'prj_5',
    'usr_3',
    'I craft cinematic 3D motion pieces in Blender and After Effects. I will model your hardware device with realistic PBR shaders, dynamic lighting reveals, and deliver in both 16:9 and 9:16 vertical video formats.',
    950.00,
    18,
    '2-3 weeks',
    'pending',
    NOW() - INTERVAL '18 hours',
    NOW() - INTERVAL '18 hours'
)
ON CONFLICT (id) DO NOTHING;
