-- Migration: 000004_phase3_marketplace_taxonomy_and_discovery.up.sql
-- Completes Phase 3 Marketplace Schema, Taxonomy (15 categories, 49 subcategories), Trending Groups, Sample Services, Packages & Reviews.

-- 1. Schema Extensions & Alterations
ALTER TABLE services
    ADD COLUMN IF NOT EXISTS views_count INT NOT NULL DEFAULT 0;

-- 2. Create Trending Groups Tables
CREATE TABLE IF NOT EXISTS trending_groups (
    id VARCHAR(64) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    image TEXT,
    sort_order INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS trending_group_services (
    trending_group_id VARCHAR(64) NOT NULL REFERENCES trending_groups(id) ON DELETE CASCADE,
    service_id VARCHAR(64) NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (trending_group_id, service_id)
);

CREATE INDEX IF NOT EXISTS idx_trending_groups_slug ON trending_groups(slug);
CREATE INDEX IF NOT EXISTS idx_trending_groups_is_active ON trending_groups(is_active);
CREATE INDEX IF NOT EXISTS idx_trending_group_services_group ON trending_group_services(trending_group_id);
CREATE INDEX IF NOT EXISTS idx_trending_group_services_service ON trending_group_services(service_id);

-- 3. Seed All 15 Categories (Idempotent)
INSERT INTO categories (id, name, slug, icon_name, description, image, is_active, sort_order, created_at, updated_at)
VALUES
('cat_1', 'Graphics & Design', 'graphics-design', 'Image', 'Logo design, brand identity, web UI/UX, vector illustrations, 3D design, and packaging.', 'https://images.unsplash.com/photo-1626785774573-4b799315345d?w=800&q=80', true, 1, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
('cat_2', 'Programming & Tech', 'programming-tech', 'Code', 'Website development, mobile apps, full-stack software, APIs, DevOps, and cloud architecture.', 'https://images.unsplash.com/photo-1547082299-de196ea013d6?w=800&q=80', true, 2, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
('cat_3', 'Digital Marketing', 'digital-marketing', 'TrendingUp', 'SEO strategy, search ads, social media campaigns, content marketing, and paid advertising.', 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80', true, 3, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
('cat_4', 'Writing & Translation', 'writing-translation', 'PenTool', 'Articles, SEO blogs, website copywriting, technical documentation, and translations.', 'https://images.unsplash.com/photo-1455390582262-044cdead277a?w=800&q=80', true, 4, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
('cat_5', 'Video & Animation', 'video-animation', 'Video', 'Video editing, 2D/3D motion graphics, YouTube editing, video ads, and animated explainers.', 'https://images.unsplash.com/photo-1536240478700-b869070f9279?w=800&q=80', true, 5, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
('cat_6', 'AI Services', 'ai-services', 'Cpu', 'AI web apps, custom AI agents, LLM integrations, chatbots, and generative automation.', 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800&q=80', true, 6, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
('cat_7', 'Data', 'data', 'BarChart2', 'Data analytics, interactive dashboards, web scraping, data science, and python pipelines.', 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&q=80', true, 7, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
('cat_8', 'Business', 'business', 'Briefcase', 'Market research, pitch decks, virtual assistance, business plans, and lead generation.', 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800&q=80', true, 8, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
('cat_9', 'Music & Audio', 'music-audio', 'Music', 'Music production, voice overs, sound design, audio editing, and podcast production.', 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&q=80', true, 9, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
('cat_10', 'Consulting', 'consulting', 'MessageSquare', 'Technology consulting, marketing strategy, AI advisories, and career guidance.', 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800&q=80', true, 10, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
('cat_11', 'Finance', 'finance', 'DollarSign', 'Financial analysis, tax consulting, bookkeeping, valuation, and financial planning.', 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=800&q=80', true, 11, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
('cat_12', 'Photography', 'photography', 'Camera', 'Product photography, photo editing, retouching, fashion, and real estate imaging.', 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800&q=80', true, 12, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
('cat_13', 'Personal Growth & Hobbies', 'personal-growth', 'Smile', 'Career coaching, life coaching, fitness guidance, gaming coaching, and language lessons.', 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800&q=80', true, 13, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
('cat_14', 'End-to-End Projects', 'end-to-end-projects', 'Layers', 'Turnkey website builds, complete app launches, full rebrand campaigns, and SaaS MVPs.', 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=800&q=80', true, 14, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
('cat_15', 'Service Catalog', 'service-catalog', 'Grid', 'Curated discovery directory across all specialized marketplace disciplines.', 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=800&q=80', true, 15, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z')
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    slug = EXCLUDED.slug,
    icon_name = EXCLUDED.icon_name,
    description = EXCLUDED.description,
    image = EXCLUDED.image,
    is_active = EXCLUDED.is_active,
    sort_order = EXCLUDED.sort_order;

-- 4. Seed All 49 Subcategories (Idempotent)
INSERT INTO subcategories (id, category_id, category_slug, name, slug, description, sort_order, is_active)
VALUES
-- Programming & Tech (cat_2)
('sub_1', 'cat_2', 'programming-tech', 'Website Development', 'website-development', 'Custom responsive web builds, landing pages, and web apps.', 1, true),
('sub_2', 'cat_2', 'programming-tech', 'Mobile App Development', 'mobile-app-development', 'iOS, Android, and cross-platform Flutter/React Native apps.', 2, true),
('sub_3', 'cat_2', 'programming-tech', 'AI Development & Agents', 'ai-development', 'Custom AI models, LLM integrations, autonomous agents, and chatbots.', 3, true),
('sub_4', 'cat_2', 'programming-tech', 'Frontend Development', 'frontend-development', 'React, Next.js, Vue, and modern UI engineering.', 4, true),
('sub_5', 'cat_2', 'programming-tech', 'Backend & APIs', 'backend-apis', 'Node.js, Express, Python, REST/GraphQL APIs, and microservices.', 5, true),
('sub_6', 'cat_2', 'programming-tech', 'Full Stack Development', 'full-stack', 'Complete web platforms from database schema to user interface.', 6, true),
('sub_7', 'cat_2', 'programming-tech', 'WordPress & CMS', 'wordpress-cms', 'WordPress custom themes, WooCommerce, Elementor, and CMS builds.', 7, true),
('sub_8', 'cat_2', 'programming-tech', 'E-Commerce Development', 'ecommerce-development', 'Shopify stores, WooCommerce, and custom checkout integrations.', 8, true),
('sub_9', 'cat_2', 'programming-tech', 'Databases & Cloud DevOps', 'databases-devops', 'PostgreSQL, Supabase, Docker, AWS, and CI/CD pipelines.', 9, true),
('sub_10', 'cat_2', 'programming-tech', 'Game Development', 'game-development', 'Unity, Unreal Engine, 2D/3D games, and interactive WebGL experiences.', 10, true),

-- Graphics & Design (cat_1)
('sub_11', 'cat_1', 'graphics-design', 'Logo & Brand Identity', 'logo-brand-identity', 'Logos, vector identity packages, and comprehensive brand books.', 1, true),
('sub_12', 'cat_1', 'graphics-design', 'UI/UX Design', 'ui-ux-design', 'Figma wireframes, high-fidelity prototypes, and design systems.', 2, true),
('sub_13', 'cat_1', 'graphics-design', 'Landing Page Design', 'landing-pages', 'Conversion-focused landing page layouts and Figma designs.', 3, true),
('sub_14', 'cat_1', 'graphics-design', 'Mobile App Design', 'mobile-app-design', 'iOS & Android mobile screen UI designs and prototypes.', 4, true),
('sub_15', 'cat_1', 'graphics-design', 'Vector Illustrations', 'vector-illustrations', 'Custom flat illustrations, SVG assets, and digital art.', 5, true),
('sub_16', 'cat_1', 'graphics-design', 'Print & Packaging', 'print-packaging', 'Product boxes, business cards, brochures, and print layouts.', 6, true),
('sub_17', 'cat_1', 'graphics-design', 'Presentation & Pitch Decks', 'presentation-design', 'Investor pitch deck slides, Google Slides, and PowerPoint decks.', 7, true),

-- Digital Marketing (cat_3)
('sub_18', 'cat_3', 'digital-marketing', 'SEO & Organic Search', 'seo', 'On-page SEO, technical audits, backlink strategy, and keyword mapping.', 1, true),
('sub_19', 'cat_3', 'digital-marketing', 'Search & Paid Ads (PPC)', 'ppc-ads', 'Google Search Ads, Facebook/Instagram ads, and conversion optimization.', 2, true),
('sub_20', 'cat_3', 'digital-marketing', 'Social Media Marketing', 'social-media-marketing', 'Content calendars, profile growth, and community management.', 3, true),
('sub_21', 'cat_3', 'digital-marketing', 'Content Marketing', 'content-marketing', 'Growth strategies, funnel optimization, and editorial planning.', 4, true),
('sub_22', 'cat_3', 'digital-marketing', 'Email & Marketing Automation', 'email-marketing', 'Klaviyo, Mailchimp campaigns, newsletter design, and lifecycle emails.', 5, true),

-- Writing & Translation (cat_4)
('sub_23', 'cat_4', 'writing-translation', 'SEO Blogs & Articles', 'seo-blogs', 'High-ranking blog posts, authority technical articles, and guides.', 1, true),
('sub_24', 'cat_4', 'writing-translation', 'Website Copywriting', 'website-copywriting', 'Conversion copy for landing pages, SaaS features, and sales pages.', 2, true),
('sub_25', 'cat_4', 'writing-translation', 'Technical & API Writing', 'technical-writing', 'API docs, developer guides, whitepapers, and software specs.', 3, true),
('sub_26', 'cat_4', 'writing-translation', 'Proofreading & Editing', 'proofreading', 'Grammar review, tone polish, and manuscript editing.', 4, true),
('sub_27', 'cat_4', 'writing-translation', 'Translation & Localization', 'translation', 'Multi-language translation, website localization, and subtitles.', 5, true),

-- Video & Animation (cat_5)
('sub_28', 'cat_5', 'video-animation', 'Video Editing', 'video-editing', 'YouTube video editing, Premiere Pro cuts, color grading, and shorts.', 1, true),
('sub_29', 'cat_5', 'video-animation', '2D Animated Explainers', 'animated-explainers', 'Custom motion graphics, character animation, and SaaS explainer videos.', 2, true),
('sub_30', 'cat_5', 'video-animation', 'Social Media Video Ads', 'video-ads', 'High-converting TikTok, Instagram Reels, and YouTube ads.', 3, true),
('sub_31', 'cat_5', 'video-animation', 'Logo & Intro Animation', 'logo-animation', 'Animated logo stings, openers, and title reveals.', 4, true),

-- AI Services (cat_6)
('sub_32', 'cat_6', 'ai-services', 'AI Applications & Web Apps', 'ai-websites', 'Full-stack Next.js web applications powered by OpenAI/Claude APIs.', 1, true),
('sub_33', 'cat_6', 'ai-services', 'AI Agents & Automation', 'ai-agents', 'Autonomous agentic workflows, LangChain, and Zapier/Make automation.', 2, true),
('sub_34', 'cat_6', 'ai-services', 'AI Chatbots & Assistants', 'ai-chatbots', 'Customer support chatbots trained on custom knowledge bases.', 3, true),
('sub_35', 'cat_6', 'ai-services', 'AI Image & Content Generation', 'ai-content-creation', 'Midjourney art prompts, Stable Diffusion pipelines, and LLM fine-tuning.', 4, true),

-- Data (cat_7)
('sub_36', 'cat_7', 'data', 'Web Scraping & Extraction', 'web-scraping', 'Python Scrapy, BeautifulSoup, Selenium, and automated data crawlers.', 1, true),
('sub_37', 'cat_7', 'data', 'Data Analytics & Dashboards', 'data-analytics', 'Streamlit, PowerBI, Tableau, and Pandas interactive reporting.', 2, true),
('sub_38', 'cat_7', 'data', 'Machine Learning Pipelines', 'machine-learning', 'TensorFlow, Scikit-learn classification, regression, and NLP models.', 3, true),

-- Business (cat_8)
('sub_39', 'cat_8', 'business', 'Pitch Decks & Presentations', 'pitch-decks', 'Investor presentation design for startups seeking funding.', 1, true),
('sub_40', 'cat_8', 'business', 'Market Research & SWOT', 'market-research', 'Industry reports, TAM/SAM sizing, and competitor analysis.', 2, true),
('sub_41', 'cat_8', 'business', 'Virtual Assistance & Admin', 'virtual-assistance', 'Executive admin, email triage, lead enrichment, and scheduling.', 3, true),

-- Music & Audio (cat_9)
('sub_42', 'cat_9', 'music-audio', 'Voice Over', 'voice-over', 'Professional male and female voiceovers for ads and explainers.', 1, true),
('sub_43', 'cat_9', 'music-audio', 'Audio Editing & Mixing', 'audio-editing', 'Podcast noise reduction, audio mastering, and jingle production.', 2, true),

-- Consulting (cat_10)
('sub_44', 'cat_10', 'consulting', 'Technology & AI Advisories', 'tech-consulting', '1-on-1 strategy sessions on software stack and AI roadmap.', 1, true),

-- Finance (cat_11)
('sub_45', 'cat_11', 'finance', 'Financial Modeling & Valuation', 'financial-planning', 'Excel financial projections, cap tables, and SaaS metrics.', 1, true),

-- Photography (cat_12)
('sub_46', 'cat_12', 'photography', 'Product Photography & Editing', 'product-photography', 'High-res studio product shots and Photoshop background cleanup.', 1, true),

-- Personal Growth (cat_13)
('sub_47', 'cat_13', 'personal-growth', 'Career & Resume Coaching', 'career-coaching', 'Resume rewrites, LinkedIn optimization, and mock interview prep.', 1, true),

-- End-to-End Projects (cat_14)
('sub_48', 'cat_14', 'end-to-end-projects', 'Turnkey SaaS MVP Builds', 'saas-mvp-projects', 'End-to-end launch of SaaS product from design to live deployment.', 1, true),

-- Service Catalog (cat_15)
('sub_49', 'cat_15', 'service-catalog', 'Curated Pro Directory', 'pro-directory', 'Top 1% vetted freelance talent across all domains.', 1, true)
ON CONFLICT (id) DO UPDATE SET
    category_id = EXCLUDED.category_id,
    category_slug = EXCLUDED.category_slug,
    name = EXCLUDED.name,
    slug = EXCLUDED.slug,
    description = EXCLUDED.description,
    sort_order = EXCLUDED.sort_order,
    is_active = EXCLUDED.is_active;

-- 5. Seed Trending Groups
INSERT INTO trending_groups (id, title, slug, description, image, sort_order, is_active)
VALUES
('trg_1', 'Create Your Website', 'create-your-website', 'High-performing web applications, custom responsive designs, and CMS platforms built to convert.', 'https://images.unsplash.com/photo-1547082299-de196ea013d6?w=800&q=80', 1, true),
('trg_2', 'Build Your Brand', 'build-your-brand', 'Establish a memorable identity with bespoke logo packages, brand systems, and pitch decks.', 'https://images.unsplash.com/photo-1626785774573-4b799315345d?w=800&q=80', 2, true),
('trg_3', 'AI & Automation Services', 'ai-automation', 'Accelerate productivity with custom AI agents, web apps, chatbots, and automated scrapers.', 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800&q=80', 3, true),
('trg_4', 'Scale & Market Your Business', 'scale-your-business', 'Drive high-quality organic search traffic and high-converting paid advertising campaigns.', 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80', 4, true),
('trg_5', 'Video & Animation Studio', 'video-animation-studio', 'Engage your audience with 2D animated explainers, promo ads, and professional video editing.', 'https://images.unsplash.com/photo-1536240478700-b869070f9279?w=800&q=80', 5, true),
('trg_6', 'Launch Your Career', 'launch-your-career', 'Professional resume optimization, LinkedIn profile rewrites, and career strategy coaching.', 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800&q=80', 6, true),
('trg_7', 'Grow Your Business', 'grow-your-business', 'Turnkey investor pitch decks, market research reports, and virtual assistant support.', 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800&q=80', 7, true)
ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    slug = EXCLUDED.slug,
    description = EXCLUDED.description,
    image = EXCLUDED.image,
    sort_order = EXCLUDED.sort_order,
    is_active = EXCLUDED.is_active;

-- 6. Seed Complete Users (Preserving password_hash and is_active)
INSERT INTO users (id, name, email, role, account_type, avatar, title, location, rating, reviews_count, skills, about, languages, completed_projects, starting_price, status, is_active, password_hash)
VALUES
('usr_1', 'Sarah Jenkins', 'sarah.j@workstream.io', 'freelancer', 'individual', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150', 'Senior UI/UX & Brand Designer', 'London, UK', 4.9, 48, '["Figma", "User Research", "Design Systems", "Prototyping", "Web Design"]'::jsonb, 'I am a passionate product designer with over 6 years of experience creating digital interfaces that are intuitive, accessible, and aligned with business goals.', '["English (Native)", "French (Conversational)"]'::jsonb, 72, 85.00, 'active', true, '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lN0y'),
('usr_2', 'David Chen', 'd.chen@coderlabs.co', 'freelancer', 'corporate', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150', 'Full Stack React & Node Developer', 'Vancouver, Canada', 4.8, 36, '["React", "Node.js", "PostgreSQL", "Express", "TailwindCSS", "TypeScript"]'::jsonb, 'Full-stack software developer focusing on modern web applications. I provide end-to-end development from database architecture to smooth frontend interactivity.', '["English (Fluent)", "Mandarin (Native)"]'::jsonb, 45, 95.00, 'active', true, '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lN0y'),
('usr_3', 'Elena Rostova', 'elena.rostov@textcraft.com', 'freelancer', 'individual', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150', 'Technical & Copy Writer', 'Berlin, Germany', 5.0, 22, '["Technical Writing", "SEO Copywriting", "Blog Posts", "Content Strategy"]'::jsonb, 'Engaging content writer specialized in translating complex technical concepts into clear, conversion-oriented copy.', '["English (Native)", "German (Fluent)"]'::jsonb, 28, 50.00, 'active', true, '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lN0y'),
('usr_4', 'Marcus Sterling', 'm.sterling@sterlinggrowth.agency', 'freelancer', 'corporate', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150', 'SEO & Growth Marketing Strategist', 'Austin, USA', 4.7, 19, '["Google Ads", "SEO Strategy", "Conversion Optimization", "Email Marketing"]'::jsonb, 'Growth marketer with an agency background. We help eCommerce brands scale their revenue through organic traffic optimizations.', '["English (Native)"]'::jsonb, 31, 120.00, 'active', true, '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lN0y'),
('usr_5', 'Liam Martinez', 'liam.m@datasolve.net', 'freelancer', 'individual', 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150', 'Data Analyst & ML Specialist', 'Madrid, Spain', 4.9, 14, '["Python", "Pandas", "TensorFlow", "Data Visualization", "SQL"]'::jsonb, 'Data scientist offering script development, data cleanups, and custom machine learning modules.', '["Spanish (Native)", "English (Fluent)"]'::jsonb, 18, 110.00, 'active', true, '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lN0y'),
('usr_6', 'Alice Cooper', 'alice@corporateventures.com', 'buyer', 'corporate', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150', 'Product Director', 'New York, USA', 5.0, 5, '[]'::jsonb, 'Looking for world-class freelance designers and developers for corporate venture projects.', '["English (Native)"]'::jsonb, 12, 0.00, 'active', true, '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lN0y'),
('usr_7', 'James Peterson', 'james.p@independentlabs.io', 'buyer', 'individual', 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150', 'Startup Founder', 'San Francisco, USA', 5.0, 4, '[]'::jsonb, 'Building developer tooling and high-performance cloud applications.', '["English (Native)"]'::jsonb, 9, 0.00, 'active', true, '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lN0y'),
('usr_8', 'Sofia Alvarez', 'sofia.a@creativeminds.agency', 'buyer', 'corporate', 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=150', 'Creative Director', 'Barcelona, Spain', 4.9, 8, '[]'::jsonb, 'Hiring elite designers, copywriters, and video animators for agency client projects.', '["Spanish (Native)", "English (Fluent)"]'::jsonb, 15, 0.00, 'active', true, '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lN0y'),
('usr_9', 'Nikhil Sharma', 'nikhil.s@techstack.in', 'buyer', 'individual', 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=150', 'Engineering Lead', 'Bangalore, India', 5.0, 6, '[]'::jsonb, 'Sourcing reliable backend engineers, DevOps specialists, and data analysts.', '["English (Fluent)", "Hindi (Native)"]'::jsonb, 11, 0.00, 'active', true, '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lN0y'),
('usr_10', 'Admin Chief', 'admin@workstream.io', 'admin', 'corporate', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150', 'Platform Administrator', 'Seattle, USA', 5.0, 0, '[]'::jsonb, 'WorkStream Operations and Quality Assurance Team.', '["English (Native)"]'::jsonb, 0, 0.00, 'active', true, '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi'),
('usr_11', 'Thomas Mueller', 't.mueller@freelance.org', 'freelancer', 'individual', 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150', 'Logo Designer & Brand Illustrator', 'Munich, Germany', 4.6, 15, '["Illustrator", "Photoshop", "Logo Design", "Vector Art", "AfterEffects"]'::jsonb, 'Illustrator and motion designer creating unique vector artwork, animated explainers, and logo concepts.', '["German (Native)", "English (Conversational)"]'::jsonb, 22, 60.00, 'active', true, '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lN0y'),
('usr_12', 'Grace Hopper', 'grace.h@systematic.tech', 'buyer', 'corporate', 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150', 'Senior Systems Architect', 'Boston, USA', 4.8, 3, '[]'::jsonb, 'Enterprise systems procurement and technology integration specialist.', '["English (Native)"]'::jsonb, 5, 0.00, 'suspended', false, '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lN0y')
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    email = EXCLUDED.email,
    role = EXCLUDED.role,
    account_type = EXCLUDED.account_type,
    avatar = EXCLUDED.avatar,
    title = EXCLUDED.title,
    location = EXCLUDED.location,
    rating = EXCLUDED.rating,
    reviews_count = EXCLUDED.reviews_count,
    skills = EXCLUDED.skills,
    about = EXCLUDED.about,
    languages = EXCLUDED.languages,
    completed_projects = EXCLUDED.completed_projects,
    starting_price = EXCLUDED.starting_price,
    status = EXCLUDED.status,
    is_active = EXCLUDED.is_active;

-- 7. Seed Realistic Marketplace Services (srv_1 to srv_20)
INSERT INTO services (id, title, slug, seller_id, category_id, category_slug, subcategory_id, subcategory_slug, tag_ids, status, is_featured, is_trending, views_count, cover_image, gallery_images, description, tags, starting_price, currency, delivery_days, rating, review_count, order_count, created_at, updated_at)
VALUES
('srv_1', 'Professional Figma Landing Page Design for Startups', 'professional-figma-landing-page-design-for-startups', 'usr_1', 'cat_1', 'graphics-design', 'sub_13', 'landing-pages', '["tag_5", "tag_6", "tag_7", "tag_31"]'::jsonb, 'published', true, true, 450, 'https://images.unsplash.com/photo-1581291518655-9523c932dedf?w=800&q=80', '["https://images.unsplash.com/photo-1581291518655-9523c932dedf?w=800&q=80", "https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=800&q=80"]'::jsonb, 'Get a clean, modern, conversion-optimized landing page designed in Figma. Includes typography system, custom component layout, responsive grid design, and revisions. Ideal for SaaS or mobile app startups.', '["Figma", "Landing Page", "UI Design", "UX Strategy", "SaaS Design"]'::jsonb, 150.00, 'USD', 3, 4.9, 18, 42, '2026-01-15T10:00:00Z', '2026-01-15T10:00:00Z'),

('srv_2', 'Custom Interactive Mobile App Prototype (iOS & Android)', 'custom-interactive-mobile-app-prototype', 'usr_1', 'cat_1', 'graphics-design', 'sub_14', 'mobile-app-design', '["tag_5", "tag_6", "tag_32", "tag_33", "tag_34"]'::jsonb, 'published', true, false, 280, 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=800&q=80', '["https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=800&q=80", "https://images.unsplash.com/photo-1551650975-87deedd944c3?w=800&q=80"]'::jsonb, 'Transform your concept into a high-fidelity mobile prototype. I will design screens for iOS & Android in Figma with interactive transitions and developer specs.', '["Mobile UI", "Figma Prototype", "App Design", "iOS Design", "Android"]'::jsonb, 250.00, 'USD', 4, 5.0, 12, 28, '2026-01-20T14:30:00Z', '2026-01-20T14:30:00Z'),

('srv_4', 'Custom React Frontend Development using Vite & JavaScript', 'custom-react-frontend-development', 'usr_2', 'cat_2', 'programming-tech', 'sub_4', 'frontend-development', '["tag_1", "tag_35", "tag_36"]'::jsonb, 'published', true, true, 610, 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=800&q=80', '["https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=800&q=80", "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&q=80"]'::jsonb, 'Transform Figma designs or business ideas into pixel-perfect, responsive React web apps built with modern performance standards and clean architecture.', '["React", "JavaScript", "Frontend", "Vite", "Web Development"]'::jsonb, 200.00, 'USD', 3, 4.8, 22, 65, '2026-01-18T09:00:00Z', '2026-01-18T09:00:00Z'),

('srv_5', 'Node.js Express REST API Backend with PostgreSQL', 'nodejs-express-rest-api-backend', 'usr_2', 'cat_2', 'programming-tech', 'sub_5', 'backend-apis', '["tag_9", "tag_10", "tag_11", "tag_37", "tag_38"]'::jsonb, 'published', false, false, 390, 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&q=80', '["https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&q=80"]'::jsonb, 'Develop a secure, scalable RESTful API with Node.js Express. Includes database migrations, JWT authentication, request validation, and Swagger documentation.', '["Node.js", "Express", "API Development", "PostgreSQL", "JWT"]'::jsonb, 200.00, 'USD', 4, 4.9, 14, 38, '2026-01-12T11:00:00Z', '2026-01-12T11:00:00Z'),

('srv_6', 'SEO Article & Blog Writing for Tech & SaaS Companies', 'seo-article-blog-writing-for-tech-saas', 'usr_3', 'cat_4', 'writing-translation', 'sub_23', 'seo-blogs', '["tag_16", "tag_39"]'::jsonb, 'published', true, false, 520, 'https://images.unsplash.com/photo-1455390582262-044cdead277a?w=800&q=80', '["https://images.unsplash.com/photo-1455390582262-044cdead277a?w=800&q=80"]'::jsonb, 'High-quality SEO articles on technical and SaaS topics. Keyword research, engaging copywriting, and readability optimized for Google search rankings.', '["SEO Blog", "SaaS Copywriting", "Tech Writer", "Article Writing"]'::jsonb, 75.00, 'USD', 2, 4.9, 15, 52, '2026-01-05T08:00:00Z', '2026-01-05T08:00:00Z'),

('srv_8', 'Comprehensive SEO Audit and Competitor Keyword Mapping', 'comprehensive-seo-audit-and-keyword-mapping', 'usr_4', 'cat_3', 'digital-marketing', 'sub_18', 'seo', '["tag_14", "tag_48"]'::jsonb, 'published', true, true, 340, 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80', '["https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80"]'::jsonb, 'Full technical SEO report auditing site speed, indexing errors, and core Web Vitals. Includes 20 high-value competitor keyword targets and actionable fixes.', '["SEO Audit", "Keyword Research", "Google Analytics", "Search Console"]'::jsonb, 120.00, 'USD', 3, 4.7, 11, 30, '2026-01-18T16:00:00Z', '2026-01-18T16:00:00Z'),

('srv_9', 'High-Converting Google Search Ads Campaign Setup', 'high-converting-google-search-ads-campaign', 'usr_4', 'cat_3', 'digital-marketing', 'sub_19', 'ppc-ads', '["tag_15", "tag_49"]'::jsonb, 'published', false, false, 210, 'https://images.unsplash.com/photo-1542744094-3a31f103e35f?w=800&q=80', '["https://images.unsplash.com/photo-1542744094-3a31f103e35f?w=800&q=80"]'::jsonb, 'Build and launch high-performing Google Search Ads. Includes match type configuration, ad copywriting (3 variants per ad group), and negative keywords.', '["Google Ads", "PPC Campaign", "Ad Copywriting", "Lead Generation"]'::jsonb, 200.00, 'USD', 5, 4.8, 8, 20, '2026-01-19T10:00:00Z', '2026-01-19T10:00:00Z'),

('srv_10', 'Data Extraction & Web Scraping Python Script', 'data-extraction-web-scraping-python-script', 'usr_5', 'cat_7', 'data', 'sub_36', 'web-scraping', '["tag_8", "tag_20", "tag_21"]'::jsonb, 'published', true, true, 410, 'https://images.unsplash.com/photo-1515879218367-8466d910aaa4?w=800&q=80', '["https://images.unsplash.com/photo-1515879218367-8466d910aaa4?w=800&q=80"]'::jsonb, 'Custom Python script using Scrapy, BeautifulSoup, or Selenium to extract public data from target websites. Outputs data to CSV, JSON, or SQL format.', '["Python Scraping", "Data Extraction", "Selenium", "Web Crawler"]'::jsonb, 100.00, 'USD', 2, 4.8, 10, 35, '2026-01-22T10:00:00Z', '2026-01-22T10:00:00Z'),

('srv_11', 'Interactive Python Pandas & Streamlit Data Dashboard', 'interactive-python-streamlit-data-dashboard', 'usr_5', 'cat_7', 'data', 'sub_37', 'data-analytics', '["tag_8", "tag_22"]'::jsonb, 'published', false, false, 180, 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&q=80', '["https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&q=80"]'::jsonb, 'Custom analytical dashboard web app built with Streamlit and Pandas. Includes custom charting (Plotly), data aggregation controls, and file uploads.', '["Streamlit", "Python", "Data Analytics", "Dashboards", "Pandas"]'::jsonb, 250.00, 'USD', 5, 5.0, 4, 15, '2026-01-24T11:00:00Z', '2026-01-24T11:00:00Z'),

('srv_12', 'Custom Brand Identity Pack & Modern Logo Design', 'custom-brand-identity-pack-modern-logo-design', 'usr_11', 'cat_1', 'graphics-design', 'sub_11', 'logo-brand-identity', '["tag_23", "tag_24", "tag_46"]'::jsonb, 'published', true, true, 530, 'https://images.unsplash.com/photo-1626785774573-4b799315345d?w=800&q=80', '["https://images.unsplash.com/photo-1626785774573-4b799315345d?w=800&q=80"]'::jsonb, 'Modern brand identity package. Contains 3 custom vector logo concepts, brand typography selections, color palette guide, and assets formatted for web and print.', '["Logo Design", "Vector Branding", "Identity Style", "Adobe Illustrator"]'::jsonb, 100.00, 'USD', 3, 4.7, 9, 22, '2026-01-25T12:00:00Z', '2026-01-25T12:00:00Z'),

('srv_13', 'Custom Vector Illustrations for Websites & Blogs', 'custom-vector-illustrations-for-websites', 'usr_11', 'cat_1', 'graphics-design', 'sub_15', 'vector-illustrations', '["tag_24", "tag_47"]'::jsonb, 'published', false, false, 290, 'https://images.unsplash.com/photo-1557683316-973673baf926?w=800&q=80', '["https://images.unsplash.com/photo-1557683316-973673baf926?w=800&q=80"]'::jsonb, 'Flat-style vector illustrations for your landing page or digital product. Up to 3 scenes matching your brand colors and style guide.', '["Flat Illustration", "Vector Illustration", "Landing Page Art", "SVG"]'::jsonb, 90.00, 'USD', 3, 4.6, 6, 14, '2026-01-26T09:00:00Z', '2026-01-26T09:00:00Z'),

('srv_14', 'Market Research Report & Competitor Analysis', 'market-research-report-competitor-analysis', 'usr_4', 'cat_8', 'business', 'sub_40', 'market-research', '["tag_40", "tag_41"]'::jsonb, 'published', false, false, 190, 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800&q=80', '["https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800&q=80"]'::jsonb, 'Thorough industry market analysis report. Includes TAM/SAM sizing, trends forecasts, SWOT analysis of top 3 players, and executive PDF summary.', '["Market Research", "SWOT Analysis", "Business Strategy", "PDF Report"]'::jsonb, 280.00, 'USD', 6, 4.8, 5, 12, '2026-01-27T14:00:00Z', '2026-01-27T14:00:00Z'),

('srv_15', 'Pitch Deck & Business Plan Presentation Design', 'pitch-deck-business-plan-presentation-design', 'usr_1', 'cat_8', 'business', 'sub_39', 'pitch-decks', '["tag_25", "tag_26"]'::jsonb, 'published', true, true, 380, 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800&q=80', '["https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800&q=80"]'::jsonb, 'Professional pitch deck layout for startup founders seeking funding. Up to 12 slides designed in Google Slides or PowerPoint with high-quality tables.', '["Pitch Deck", "PowerPoint Design", "Investor Presentation", "SaaS Business"]'::jsonb, 180.00, 'USD', 3, 4.9, 7, 19, '2026-01-28T09:00:00Z', '2026-01-28T09:00:00Z'),

('srv_16', 'Full-Stack Next.js 14 Web App with Supabase Integration', 'full-stack-nextjs-14-web-app-with-supabase', 'usr_2', 'cat_2', 'programming-tech', 'sub_6', 'full-stack', '["tag_1", "tag_2", "tag_12", "tag_13", "tag_35"]'::jsonb, 'published', true, true, 780, 'https://images.unsplash.com/photo-1547082299-de196ea013d6?w=800&q=80', '["https://images.unsplash.com/photo-1547082299-de196ea013d6?w=800&q=80"]'::jsonb, 'SaaS web application built with Next.js App Router, Tailwind CSS, Supabase database, and Stripe payment gateway. Ideal for launching your SaaS MVP fast.', '["Next.js", "Supabase", "Stripe", "React", "TailwindCSS"]'::jsonb, 450.00, 'USD', 5, 4.9, 16, 40, '2026-02-01T10:00:00Z', '2026-02-01T10:00:00Z'),

('srv_17', 'Professional Explainer Video & 2D Motion Graphics Animation', 'professional-explainer-video-2d-motion-graphics', 'usr_11', 'cat_5', 'video-animation', 'sub_29', 'animated-explainers', '["tag_29", "tag_30"]'::jsonb, 'published', true, true, 420, 'https://images.unsplash.com/photo-1536240478700-b869070f9279?w=800&q=80', '["https://images.unsplash.com/photo-1536240478700-b869070f9279?w=800&q=80"]'::jsonb, '30-second premium 2D animated explainer video. Includes custom graphics, voiceover sync, background music licensing, and sound mixing.', '["Explainer Video", "2D Animation", "Motion Graphics", "Adobe AfterEffects"]'::jsonb, 400.00, 'USD', 7, 4.7, 3, 10, '2026-02-03T11:00:00Z', '2026-02-03T11:00:00Z'),

('srv_18', 'YouTube Video Editing & Color Grading Service', 'youtube-video-editing-color-grading', 'usr_11', 'cat_5', 'video-animation', 'sub_28', 'video-editing', '["tag_27", "tag_28"]'::jsonb, 'published', false, false, 310, 'https://images.unsplash.com/photo-1622737133809-d95047b9e673?w=800&q=80', '["https://images.unsplash.com/photo-1622737133809-d95047b9e673?w=800&q=80"]'::jsonb, 'Professional editing for your raw footage (up to 15 mins). Includes dynamic cuts, text overlays, color correction, noise reduction, and transitions.', '["Video Editing", "Premiere Pro", "YouTube Editor", "Color Grading"]'::jsonb, 80.00, 'USD', 4, 4.5, 6, 18, '2026-02-04T12:00:00Z', '2026-02-04T12:00:00Z'),

('srv_19', 'Machine Learning Model Development & Training Pipeline', 'machine-learning-model-development-training', 'usr_5', 'cat_7', 'data', 'sub_38', 'machine-learning', '["tag_8", "tag_42", "tag_43"]'::jsonb, 'published', true, true, 490, 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800&q=80', '["https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800&q=80"]'::jsonb, 'Train a custom ML model for classification, regression, or NLP task. Includes data cleaning, feature engineering, model optimization, and deployment files.', '["Machine Learning", "TensorFlow", "Scikit Learn", "Python AI", "NLP"]'::jsonb, 380.00, 'USD', 9, 4.9, 5, 11, '2026-02-05T08:00:00Z', '2026-02-05T08:00:00Z'),

('srv_20', 'WordPress E-Commerce Website & Custom WooCommerce Build', 'wordpress-ecommerce-website-woocommerce', 'usr_2', 'cat_2', 'programming-tech', 'sub_7', 'wordpress-cms', '["tag_3", "tag_44", "tag_45"]'::jsonb, 'published', false, false, 550, 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80', '["https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80"]'::jsonb, 'E-commerce store built on WordPress and WooCommerce. Includes product checkout integrations, inventory controls, payment gateways (Stripe/PayPal), and security plugins.', '["WordPress", "WooCommerce", "E-Commerce", "PHP", "Plugin Setup"]'::jsonb, 400.00, 'USD', 8, 4.7, 18, 45, '2026-02-06T15:00:00Z', '2026-02-06T15:00:00Z')
ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    slug = EXCLUDED.slug,
    seller_id = EXCLUDED.seller_id,
    category_id = EXCLUDED.category_id,
    category_slug = EXCLUDED.category_slug,
    subcategory_id = EXCLUDED.subcategory_id,
    subcategory_slug = EXCLUDED.subcategory_slug,
    tag_ids = EXCLUDED.tag_ids,
    status = EXCLUDED.status,
    is_featured = EXCLUDED.is_featured,
    is_trending = EXCLUDED.is_trending,
    views_count = EXCLUDED.views_count,
    cover_image = EXCLUDED.cover_image,
    gallery_images = EXCLUDED.gallery_images,
    description = EXCLUDED.description,
    tags = EXCLUDED.tags,
    starting_price = EXCLUDED.starting_price,
    currency = EXCLUDED.currency,
    delivery_days = EXCLUDED.delivery_days,
    rating = EXCLUDED.rating,
    review_count = EXCLUDED.review_count,
    order_count = EXCLUDED.order_count;

-- 8. Seed Service Packages for All Services (Basic, Standard, Premium)
INSERT INTO service_packages (id, service_id, tier, name, title, description, price, delivery_time, revisions, features)
VALUES
-- srv_1
('pkg_1_basic', 'srv_1', 'basic', 'Basic', 'Starter Hero Section', 'Single landing page hero section in Figma with mobile responsive layout.', 150.00, 3, 2, '[{"label": "Number of Screens", "value": "1"}, {"label": "Responsive Design", "included": true}, {"label": "Figma Source File", "included": true}]'::jsonb),
('pkg_1_standard', 'srv_1', 'standard', 'Standard', 'Full Product Landing Page', 'Complete multi-section landing page + interactive clickable prototype.', 350.00, 5, 4, '[{"label": "Number of Screens", "value": "3"}, {"label": "Responsive Design", "included": true}, {"label": "Figma Source File", "included": true}, {"label": "Clickable Prototype", "included": true}]'::jsonb),
('pkg_1_premium', 'srv_1', 'premium', 'Premium', 'Complete SaaS Product Design Suite', 'Up to 7 screens including Landing Page, Pricing, Features, + Design System.', 650.00, 8, 8, '[{"label": "Number of Screens", "value": "7"}, {"label": "Responsive Design", "included": true}, {"label": "Figma Source File", "included": true}, {"label": "Clickable Prototype", "included": true}]'::jsonb),

-- srv_2
('pkg_2_basic', 'srv_2', 'basic', 'Basic', 'Core Screen Flow (3 Screens)', '3 primary app screens with click-through navigation.', 250.00, 4, 2, '[{"label": "App Screens", "value": "3"}, {"label": "Clickable Prototype", "included": true}]'::jsonb),
('pkg_2_standard', 'srv_2', 'standard', 'Standard', 'Full App Flow (8 Screens)', '8 interactive screens with micro-animations and component system.', 450.00, 7, 4, '[{"label": "App Screens", "value": "8"}, {"label": "Clickable Prototype", "included": true}]'::jsonb),
('pkg_2_premium', 'srv_2', 'premium', 'Premium', 'Complete Mobile App System (15 Screens)', '15 screens with Dark/Light themes and developer specs.', 850.00, 12, 6, '[{"label": "App Screens", "value": "15"}, {"label": "Clickable Prototype", "included": true}]'::jsonb),

-- srv_4
('pkg_4_basic', 'srv_4', 'basic', 'Basic', 'Single React Page', '1 responsive React page component coded from Figma.', 200.00, 3, 2, '[{"label": "Pages", "value": "1"}, {"label": "Responsive Layout", "included": true}]'::jsonb),
('pkg_4_standard', 'srv_4', 'standard', 'Standard', 'Multi-Page Frontend', 'Up to 5 pages + React Router navigation and state.', 450.00, 6, 4, '[{"label": "Pages", "value": "5"}, {"label": "Responsive Layout", "included": true}]'::jsonb),
('pkg_4_premium', 'srv_4', 'premium', 'Premium', 'Complete Web App Frontend', '10+ pages, dashboard layout, authentication UI, mock data.', 850.00, 10, 6, '[{"label": "Pages", "value": "10+"}, {"label": "Responsive Layout", "included": true}]'::jsonb),

-- srv_5
('pkg_5_basic', 'srv_5', 'basic', 'Basic', 'Core Endpoints (3 Endpoints)', '3 CRUD API endpoints with Express and PostgreSQL.', 200.00, 4, 2, '[{"label": "Endpoints", "value": "3"}, {"label": "Swagger Docs", "included": true}]'::jsonb),
('pkg_5_standard', 'srv_5', 'standard', 'Standard', 'Full Backend (8 Endpoints)', '8 CRUD endpoints + JWT Auth, role permissions, request validation.', 450.00, 7, 3, '[{"label": "Endpoints", "value": "8"}, {"label": "JWT Auth", "included": true}]'::jsonb),
('pkg_5_premium', 'srv_5', 'premium', 'Premium', 'Enterprise Backend Infrastructure', '15+ endpoints, file upload handling, email notifications, Docker setup.', 800.00, 12, 5, '[{"label": "Endpoints", "value": "15+"}, {"label": "JWT Auth", "included": true}]'::jsonb),

-- srv_6
('pkg_6_basic', 'srv_6', 'basic', 'Basic', 'Short Blog Post (800 Words)', '800-word SEO blog post with targeted focus keyword research.', 75.00, 2, 2, '[{"label": "Word Count", "value": "800 words"}]'::jsonb),
('pkg_6_standard', 'srv_6', 'standard', 'Standard', 'Comprehensive Guide (1,500 Words)', '1,500-word deep-dive article with subheadings and meta tags.', 140.00, 3, 3, '[{"label": "Word Count", "value": "1,500 words"}]'::jsonb),
('pkg_6_premium', 'srv_6', 'premium', 'Premium', 'Authority Whitepaper (3,000 Words)', '3,000-word technical pillar page with executive summary.', 280.00, 5, 4, '[{"label": "Word Count", "value": "3,000 words"}]'::jsonb),

-- srv_8
('pkg_8_basic', 'srv_8', 'basic', 'Basic', 'Technical Site Audit', 'PDF report highlighting crawl errors and speed bottlenecks.', 120.00, 3, 1, '[{"label": "Crawl Audit", "included": true}]'::jsonb),
('pkg_8_standard', 'srv_8', 'standard', 'Standard', 'Full Audit + Keyword Strategy', 'Technical audit + 20 competitor keywords + consultation call.', 250.00, 5, 2, '[{"label": "Crawl Audit", "included": true}]'::jsonb),
('pkg_8_premium', 'srv_8', 'premium', 'Premium', 'Complete SEO Roadmap', 'Technical audit, 50-keyword mapping, backlink gap analysis.', 500.00, 8, 3, '[{"label": "Crawl Audit", "included": true}]'::jsonb),

-- srv_9
('pkg_9_basic', 'srv_9', 'basic', 'Basic', '1 Ad Group Setup', 'Setup 1 targeted Google Search ad group.', 200.00, 5, 2, '[{"label": "Ad Groups", "value": "1"}]'::jsonb),
('pkg_9_standard', 'srv_9', 'standard', 'Standard', 'Full PPC Campaign (3 Ad Groups)', '3 ad groups with conversion tracking setup.', 400.00, 7, 3, '[{"label": "Ad Groups", "value": "3"}]'::jsonb),
('pkg_9_premium', 'srv_9', 'premium', 'Premium', 'Scale Search Ads System', '5 ad groups, negative keywords list, 1-month bidding management.', 750.00, 10, 4, '[{"label": "Ad Groups", "value": "5"}]'::jsonb),

-- srv_10
('pkg_10_basic', 'srv_10', 'basic', 'Basic', 'Single Site Scraper (Up to 1k Rows)', 'Scrape 1 website without CAPTCHAs and export to CSV.', 100.00, 2, 2, '[{"label": "Target Sites", "value": "1"}]'::jsonb),
('pkg_10_standard', 'srv_10', 'standard', 'Standard', 'Advanced Scraper (With Proxies)', 'Scrape complex JS sites using Selenium/Playwright with pagination.', 220.00, 4, 3, '[{"label": "Target Sites", "value": "Up to 3"}]'::jsonb),
('pkg_10_premium', 'srv_10', 'premium', 'Premium', 'Automated Scraping Bot + Database Sync', 'Full recurring scraper bot with scheduled cron execution.', 450.00, 7, 4, '[{"label": "Target Sites", "value": "Up to 5"}]'::jsonb),

-- srv_11
('pkg_11_basic', 'srv_11', 'basic', 'Basic', 'Single Tab Dashboard', 'Single tab Streamlit dashboard with 3 interactive charts.', 250.00, 5, 2, '[{"label": "Charts", "value": "3"}]'::jsonb),
('pkg_11_standard', 'srv_11', 'standard', 'Standard', 'Multi-Tab Analytics Dashboard', 'Multi-page Streamlit dashboard with SQL database connection.', 480.00, 8, 3, '[{"label": "Charts", "value": "8"}]'::jsonb),
('pkg_11_premium', 'srv_11', 'premium', 'Premium', 'Production BI Web App', 'Full Streamlit app with user authentication and automated data sync.', 900.00, 14, 5, '[{"label": "Charts", "value": "15+"}]'::jsonb),

-- srv_12
('pkg_12_basic', 'srv_12', 'basic', 'Basic', 'Essential Logo Concept', '2 vector logo concepts + PNG/SVG exports.', 100.00, 3, 2, '[{"label": "Concepts", "value": "2"}]'::jsonb),
('pkg_12_standard', 'srv_12', 'standard', 'Standard', 'Full Brand Identity Kit', '3 logo concepts + brand typography, color palette, social banners.', 220.00, 5, 4, '[{"label": "Concepts", "value": "3"}]'::jsonb),
('pkg_12_premium', 'srv_12', 'premium', 'Premium', 'Corporate Branding Package', '5 logo concepts + 15-page brand style guide and stationery mockups.', 450.00, 8, 6, '[{"label": "Concepts", "value": "5"}]'::jsonb),

-- srv_13
('pkg_13_basic', 'srv_13', 'basic', 'Basic', '1 Vector Scene', '1 custom vector illustration scene.', 90.00, 3, 2, '[{"label": "Scenes", "value": "1"}]'::jsonb),
('pkg_13_standard', 'srv_13', 'standard', 'Standard', '3 Vector Scenes', '3 illustrations matching your website brand style.', 240.00, 5, 3, '[{"label": "Scenes", "value": "3"}]'::jsonb),
('pkg_13_premium', 'srv_13', 'premium', 'Premium', 'Full Illustration Suite (6 Scenes)', '6 high-res vector scenes + SVG source files.', 450.00, 8, 5, '[{"label": "Scenes", "value": "6"}]'::jsonb),

-- srv_14
('pkg_14_basic', 'srv_14', 'basic', 'Basic', 'Competitor SWOT Summary', 'SWOT analysis of top 3 industry competitors.', 280.00, 6, 2, '[{"label": "Competitors Analyzed", "value": "3"}]'::jsonb),
('pkg_14_standard', 'srv_14', 'standard', 'Standard', 'Full Market Opportunity Report', 'TAM/SAM market sizing + competitor analysis of 5 players.', 550.00, 9, 3, '[{"label": "Competitors Analyzed", "value": "5"}]'::jsonb),
('pkg_14_premium', 'srv_14', 'premium', 'Premium', 'Enterprise Business Strategy Report', 'Comprehensive 30-page market research report with raw data tables.', 950.00, 14, 4, '[{"label": "Competitors Analyzed", "value": "10"}]'::jsonb),

-- srv_15
('pkg_15_basic', 'srv_15', 'basic', 'Basic', 'Standard Pitch Deck (5 Slides)', 'Redesign 5 essential pitch deck slides.', 180.00, 3, 2, '[{"label": "Slides", "value": "5"}]'::jsonb),
('pkg_15_standard', 'srv_15', 'standard', 'Standard', 'Full Investor Deck (12 Slides)', 'Complete 12-slide investor deck with custom charts.', 350.00, 5, 4, '[{"label": "Slides", "value": "12"}]'::jsonb),
('pkg_15_premium', 'srv_15', 'premium', 'Premium', 'Comprehensive Founder Deck (20 Slides)', '20 slides + financial model charts and PDF export.', 600.00, 8, 6, '[{"label": "Slides", "value": "20"}]'::jsonb),

-- srv_16
('pkg_16_basic', 'srv_16', 'basic', 'Basic', 'MVP Starter (2 Pages + Auth)', 'Next.js App Router with Supabase Auth setup.', 450.00, 5, 2, '[{"label": "Pages", "value": "2"}, {"label": "Auth", "included": true}]'::jsonb),
('pkg_16_standard', 'srv_16', 'standard', 'Standard', 'Complete SaaS MVP (5 Pages + Stripe)', 'Full SaaS app with authentication, Stripe subscriptions, dashboard.', 850.00, 9, 4, '[{"label": "Pages", "value": "5"}, {"label": "Stripe", "included": true}]'::jsonb),
('pkg_16_premium', 'srv_16', 'premium', 'Premium', 'Production Ready SaaS Platform', '10+ pages, team roles permissions, Stripe webhooks, Vercel deployment.', 1500.00, 14, 6, '[{"label": "Pages", "value": "10+"}, {"label": "Stripe Webhooks", "included": true}]'::jsonb),

-- srv_17
('pkg_17_basic', 'srv_17', 'basic', 'Basic', '30-Second Explainer', '30s 2D animated video + voiceover sync.', 400.00, 7, 4, '[{"label": "Duration", "value": "30s"}]'::jsonb),
('pkg_17_standard', 'srv_17', 'standard', 'Standard', '60-Second Explainer', '60s animation with custom storyboard and background music.', 700.00, 10, 5, '[{"label": "Duration", "value": "60s"}]'::jsonb),
('pkg_17_premium', 'srv_17', 'premium', 'Premium', '90-Second Full Commercial Video', '90s full 2D motion graphics video with 4K resolution render.', 1100.00, 14, 6, '[{"label": "Duration", "value": "90s"}]'::jsonb),

-- srv_18
('pkg_18_basic', 'srv_18', 'basic', 'Basic', 'Basic Edit (Up to 10 mins)', 'Trim cuts and audio leveling for 10-minute video.', 80.00, 4, 2, '[{"label": "Footage Length", "value": "10m"}]'::jsonb),
('pkg_18_standard', 'srv_18', 'standard', 'Standard', 'Pro YouTube Edit (Up to 20 mins)', 'Dynamic jump cuts, sound effects, subtitles, color grading.', 160.00, 6, 3, '[{"label": "Footage Length", "value": "20m"}]'::jsonb),
('pkg_18_premium', 'srv_18', 'premium', 'Premium', 'Cinematic Edit (Up to 45 mins)', 'Full documentary/vlog editing with motion graphics and custom thumbnails.', 320.00, 9, 4, '[{"label": "Footage Length", "value": "45m"}]'::jsonb),

-- srv_19
('pkg_19_basic', 'srv_19', 'basic', 'Basic', 'Baseline ML Model', 'Train 1 Scikit-learn classification/regression model.', 380.00, 9, 3, '[{"label": "Models", "value": "1"}]'::jsonb),
('pkg_19_standard', 'srv_19', 'standard', 'Standard', 'Deep Learning Pipeline', 'TensorFlow/PyTorch model with hyperparameter tuning & evaluation metrics.', 750.00, 12, 4, '[{"label": "Models", "value": "2"}]'::jsonb),
('pkg_19_premium', 'srv_19', 'premium', 'Premium', 'Production AI Model API', 'Complete ML training pipeline + FastAPI Docker deployment container.', 1400.00, 18, 5, '[{"label": "Deployment API", "included": true}]'::jsonb),

-- srv_20
('pkg_20_basic', 'srv_20', 'basic', 'Basic', 'Starter Store (Up to 5 Products)', 'WordPress WooCommerce setup with Stripe payment.', 400.00, 8, 3, '[{"label": "Products", "value": "5"}]'::jsonb),
('pkg_20_standard', 'srv_20', 'standard', 'Standard', 'Pro E-Commerce Store (Up to 20 Products)', 'Custom WooCommerce theme styling, shipping calculator, coupons.', 750.00, 12, 4, '[{"label": "Products", "value": "20"}]'::jsonb),
('pkg_20_premium', 'srv_20', 'premium', 'Premium', 'Enterprise WooCommerce Portal', 'Unlimited products setup, multi-currency support, speed optimization.', 1200.00, 16, 6, '[{"label": "Products", "value": "Unlimited"}]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
    tier = EXCLUDED.tier,
    name = EXCLUDED.name,
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    price = EXCLUDED.price,
    delivery_time = EXCLUDED.delivery_time,
    revisions = EXCLUDED.revisions,
    features = EXCLUDED.features;

-- 9. Seed Trending Group Services Mappings
INSERT INTO trending_group_services (trending_group_id, service_id)
VALUES
('trg_1', 'srv_1'),
('trg_1', 'srv_4'),
('trg_1', 'srv_16'),
('trg_1', 'srv_20'),

('trg_2', 'srv_12'),
('trg_2', 'srv_15'),
('trg_2', 'srv_13'),

('trg_3', 'srv_10'),
('trg_3', 'srv_19'),
('trg_3', 'srv_11'),
('trg_3', 'srv_16'),

('trg_4', 'srv_8'),
('trg_4', 'srv_9'),
('trg_4', 'srv_6'),
('trg_4', 'srv_14'),

('trg_5', 'srv_17'),
('trg_5', 'srv_18'),

('trg_6', 'srv_6'),
('trg_6', 'srv_15'),

('trg_7', 'srv_14'),
('trg_7', 'srv_15'),
('trg_7', 'srv_8')
ON CONFLICT (trending_group_id, service_id) DO NOTHING;

-- 10. Seed Realistic Sample Reviews
INSERT INTO reviews (id, service_id, order_id, user_id, rating, comment, created_at, updated_at)
VALUES
('rev_1', 'srv_1', NULL, 'usr_6', 5.0, 'Sarah exceeded all expectations with our SaaS landing page! The Figma design system and mobile responsive screens were clean, elegant, and ready for development.', '2026-02-10T14:20:00Z', '2026-02-10T14:20:00Z'),
('rev_2', 'srv_1', NULL, 'usr_7', 4.8, 'Outstanding design sensibility. The typography system and responsive layouts saved our frontend team weeks of guesswork.', '2026-02-14T09:15:00Z', '2026-02-14T09:15:00Z'),
('rev_3', 'srv_4', NULL, 'usr_8', 5.0, 'David built an incredibly fast and reactive Vite frontend from our designs. The code is modular, well-commented, and super maintainable.', '2026-02-12T16:40:00Z', '2026-02-12T16:40:00Z'),
('rev_4', 'srv_4', NULL, 'usr_9', 4.7, 'Great experience working with David. Clean React structure and handled complex state with ease.', '2026-02-18T11:30:00Z', '2026-02-18T11:30:00Z'),
('rev_5', 'srv_6', NULL, 'usr_7', 5.0, 'Elena writes exceptionally clear technical content. Our blog post ranked on Google page 1 within three weeks!', '2026-02-08T10:00:00Z', '2026-02-08T10:00:00Z'),
('rev_6', 'srv_8', NULL, 'usr_6', 4.8, 'Marcus delivered a thorough technical SEO audit that uncovered critical crawl errors and speed optimizations.', '2026-02-15T13:00:00Z', '2026-02-15T13:00:00Z'),
('rev_7', 'srv_10', NULL, 'usr_9', 5.0, 'Liam delivered a robust Python scraper with proxy handling and exported structured data flawlessly.', '2026-02-20T08:30:00Z', '2026-02-20T08:30:00Z'),
('rev_8', 'srv_12', NULL, 'usr_8', 4.7, 'Thomas crafted a memorable brand identity for our venture. Vector assets and color palettes were top quality.', '2026-02-22T15:45:00Z', '2026-02-22T15:45:00Z'),
('rev_9', 'srv_16', NULL, 'usr_6', 5.0, 'David delivered a full Next.js 14 and Supabase MVP on time. Authentication, Stripe, and dashboard were all functional out of the box.', '2026-02-25T17:10:00Z', '2026-02-25T17:10:00Z')
ON CONFLICT (id) DO NOTHING;

-- 11. Seed Realistic Sample Orders
INSERT INTO orders (id, buyer_id, seller_id, service_id, package_tier, amount, currency, status, requirements, delivery_date, created_at, updated_at)
VALUES
('ord_1', 'usr_6', 'usr_1', 'srv_1', 'basic', 150.00, 'USD', 'completed', 'Please focus on modern typography and dark charcoal accents for the hero section.', '2026-08-15T00:00:00Z', '2026-08-10T14:32:00Z', '2026-08-15T12:00:00Z'),
('ord_2', 'usr_7', 'usr_3', 'srv_6', 'basic', 75.00, 'USD', 'completed', 'Write an article on React Server Components vs. Client Components highlighting performance differences.', '2026-08-08T00:00:00Z', '2026-08-05T10:00:00Z', '2026-08-07T12:30:00Z'),
('ord_3', 'usr_8', 'usr_2', 'srv_4', 'basic', 200.00, 'USD', 'in_progress', 'Need single responsive dashboard view coded with React and Vite.', '2026-08-20T00:00:00Z', '2026-08-12T09:00:00Z', '2026-08-12T09:00:00Z'),
('ord_4', 'usr_9', 'usr_11', 'srv_12', 'basic', 100.00, 'USD', 'cancelled', 'Order cancelled by mutual agreement before design commencement.', '2026-08-05T00:00:00Z', '2026-08-01T08:00:00Z', '2026-08-02T10:00:00Z')
ON CONFLICT (id) DO NOTHING;

-- 12. Seed Realistic Sample Favorites
INSERT INTO favorites (id, user_id, service_id, created_at, updated_at)
VALUES
('fav_1', 'usr_6', 'srv_1', '2026-02-01T10:00:00Z', '2026-02-01T10:00:00Z'),
('fav_2', 'usr_6', 'srv_4', '2026-02-02T11:00:00Z', '2026-02-02T11:00:00Z'),
('fav_3', 'usr_7', 'srv_16', '2026-02-03T12:00:00Z', '2026-02-03T12:00:00Z'),
('fav_4', 'usr_8', 'srv_12', '2026-02-04T13:00:00Z', '2026-02-04T13:00:00Z'),
('fav_5', 'usr_9', 'srv_10', '2026-02-05T14:00:00Z', '2026-02-05T14:00:00Z')
ON CONFLICT (id) DO NOTHING;
