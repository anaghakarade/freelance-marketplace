-- WorkStream Initial Data Seed - 000002_seed_initial_data.up.sql

-- 1. Seed Categories
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
ON CONFLICT (id) DO NOTHING;

-- 2. Seed Subcategories
INSERT INTO subcategories (id, category_id, category_slug, name, slug, description, sort_order, is_active)
VALUES
-- Programming & Tech
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

-- Graphics & Design
('sub_11', 'cat_1', 'graphics-design', 'Logo & Brand Identity', 'logo-brand-identity', 'Logos, vector identity packages, and comprehensive brand books.', 1, true),
('sub_12', 'cat_1', 'graphics-design', 'UI/UX Design', 'ui-ux-design', 'Figma wireframes, high-fidelity prototypes, and design systems.', 2, true),
('sub_13', 'cat_1', 'graphics-design', 'Landing Page Design', 'landing-pages', 'Conversion-focused landing page layouts and Figma designs.', 3, true),
('sub_14', 'cat_1', 'graphics-design', 'Mobile App Design', 'mobile-app-design', 'iOS & Android mobile screen UI designs and prototypes.', 4, true),
('sub_15', 'cat_1', 'graphics-design', 'Vector Illustrations', 'vector-illustrations', 'Custom flat illustrations, SVG assets, and digital art.', 5, true),
('sub_16', 'cat_1', 'graphics-design', 'Print & Packaging', 'print-packaging', 'Product boxes, business cards, brochures, and print layouts.', 6, true),
('sub_17', 'cat_1', 'graphics-design', 'Presentation & Pitch Decks', 'presentation-design', 'Investor pitch deck slides, Google Slides, and PowerPoint decks.', 7, true),

-- Digital Marketing
('sub_18', 'cat_3', 'digital-marketing', 'SEO & Organic Search', 'seo', 'On-page SEO, technical audits, backlink strategy, and keyword mapping.', 1, true),
('sub_19', 'cat_3', 'digital-marketing', 'Search & Paid Ads (PPC)', 'ppc-ads', 'Google Search Ads, Facebook/Instagram ads, and conversion optimization.', 2, true),
('sub_20', 'cat_3', 'digital-marketing', 'Social Media Marketing', 'social-media-marketing', 'Content calendars, profile growth, and community management.', 3, true),
('sub_21', 'cat_3', 'digital-marketing', 'Content Marketing', 'content-marketing', 'Growth strategies, funnel optimization, and editorial planning.', 4, true),
('sub_22', 'cat_3', 'digital-marketing', 'Email & Marketing Automation', 'email-marketing', 'Klaviyo, Mailchimp campaigns, newsletter design, and lifecycle emails.', 5, true),

-- Writing & Translation
('sub_23', 'cat_4', 'writing-translation', 'SEO Blogs & Articles', 'seo-blogs', 'High-ranking blog posts, authority technical articles, and guides.', 1, true),
('sub_24', 'cat_4', 'writing-translation', 'Website Copywriting', 'website-copywriting', 'Conversion copy for landing pages, SaaS features, and sales pages.', 2, true),
('sub_25', 'cat_4', 'writing-translation', 'Technical & API Writing', 'technical-writing', 'API docs, developer guides, whitepapers, and software specs.', 3, true),
('sub_26', 'cat_4', 'writing-translation', 'Proofreading & Editing', 'proofreading', 'Grammar review, tone polish, and manuscript editing.', 4, true),
('sub_27', 'cat_4', 'writing-translation', 'Translation & Localization', 'translation', 'Multi-language translation, website localization, and subtitles.', 5, true),

-- Video & Animation
('sub_28', 'cat_5', 'video-animation', 'Video Editing', 'video-editing', 'YouTube video editing, Premiere Pro cuts, color grading, and shorts.', 1, true),
('sub_29', 'cat_5', 'video-animation', '2D Animated Explainers', 'animated-explainers', 'Custom motion graphics, character animation, and SaaS explainer videos.', 2, true),
('sub_30', 'cat_5', 'video-animation', 'Social Media Video Ads', 'video-ads', 'High-converting TikTok, Instagram Reels, and YouTube ads.', 3, true),
('sub_31', 'cat_5', 'video-animation', 'Logo & Intro Animation', 'logo-animation', 'Animated logo stings, openers, and title reveals.', 4, true),

-- AI Services
('sub_32', 'cat_6', 'ai-services', 'AI Applications & Web Apps', 'ai-websites', 'Full-stack Next.js web applications powered by OpenAI/Claude APIs.', 1, true),
('sub_33', 'cat_6', 'ai-services', 'AI Agents & Automation', 'ai-agents', 'Autonomous agentic workflows, LangChain, and Zapier/Make automation.', 2, true),
('sub_34', 'cat_6', 'ai-services', 'AI Chatbots & Assistants', 'ai-chatbots', 'Customer support chatbots trained on custom knowledge bases.', 3, true),
('sub_35', 'cat_6', 'ai-services', 'AI Image & Content Generation', 'ai-content-creation', 'Midjourney art prompts, Stable Diffusion pipelines, and LLM fine-tuning.', 4, true)
ON CONFLICT (id) DO NOTHING;

-- 3. Seed Representative Users
INSERT INTO users (id, name, email, role, account_type, avatar, title, location, rating, reviews_count, skills, about, languages, completed_projects, starting_price, status)
VALUES
('usr_1', 'Sarah Jenkins', 'sarah.j@workstream.io', 'freelancer', 'individual', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150', 'Senior UI/UX & Brand Designer', 'London, UK', 4.9, 48, '["Figma", "User Research", "Design Systems", "Prototyping", "Web Design"]'::jsonb, 'I am a passionate product designer with over 6 years of experience creating digital interfaces that are intuitive, accessible, and aligned with business goals.', '["English (Native)", "French (Conversational)"]'::jsonb, 72, 85.00, 'active'),
('usr_2', 'David Chen', 'd.chen@coderlabs.co', 'freelancer', 'corporate', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150', 'Full Stack React & Node Developer', 'Vancouver, Canada', 4.8, 36, '["React", "Node.js", "PostgreSQL", "Express", "TailwindCSS", "TypeScript"]'::jsonb, 'Full-stack software developer focusing on modern web applications. I provide end-to-end development from database architecture to smooth frontend interactivity.', '["English (Fluent)", "Mandarin (Native)"]'::jsonb, 45, 95.00, 'active'),
('usr_3', 'Elena Rostova', 'elena.rostov@textcraft.com', 'freelancer', 'individual', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150', 'Technical & Copy Writer', 'Berlin, Germany', 5.0, 22, '["Technical Writing", "SEO Copywriting", "Blog Posts", "Content Strategy"]'::jsonb, 'Engaging content writer specialized in translating complex technical concepts into clear, conversion-oriented copy.', '["English (Native)", "German (Fluent)"]'::jsonb, 28, 50.00, 'active'),
('usr_4', 'Marcus Sterling', 'm.sterling@sterlinggrowth.agency', 'freelancer', 'corporate', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150', 'SEO & Growth Marketing Strategist', 'Austin, USA', 4.7, 19, '["Google Ads", "SEO Strategy", "Conversion Optimization", "Email Marketing"]'::jsonb, 'Growth marketer with an agency background. We help eCommerce brands scale their revenue through organic traffic optimizations.', '["English (Native)"]'::jsonb, 31, 120.00, 'active'),
('usr_5', 'Liam Martinez', 'liam.m@datasolve.net', 'freelancer', 'individual', 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150', 'Data Analyst & ML Specialist', 'Madrid, Spain', 4.9, 14, '["Python", "Pandas", "TensorFlow", "Data Visualization", "SQL"]'::jsonb, 'Data scientist offering script development, data cleanups, and custom machine learning modules.', '["Spanish (Native)", "English (Fluent)"]'::jsonb, 18, 110.00, 'active'),
('usr_6', 'Alice Cooper', 'alice@corporateventures.com', 'client', 'corporate', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150', 'Product Director', 'New York, USA', 5.0, 5, '[]'::jsonb, 'Looking for world-class freelance designers and developers for corporate venture projects.', '["English (Native)"]'::jsonb, 12, 0.00, 'active')
ON CONFLICT (id) DO NOTHING;

-- 4. Seed Representative Services
INSERT INTO services (id, title, slug, seller_id, category_id, category_slug, subcategory_id, subcategory_slug, tag_ids, status, is_featured, is_trending, cover_image, gallery_images, description, tags, starting_price, currency, delivery_days, rating, review_count, order_count, created_at, updated_at)
VALUES
('srv_1', 'Professional Figma Landing Page Design for Startups', 'professional-figma-landing-page-design-for-startups', 'usr_1', 'cat_1', 'graphics-design', 'sub_13', 'landing-pages', '["tag_5", "tag_6", "tag_7", "tag_31"]'::jsonb, 'published', true, true, 'https://images.unsplash.com/photo-1581291518655-9523c932dedf?w=800&q=80', '["https://images.unsplash.com/photo-1581291518655-9523c932dedf?w=800&q=80", "https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=800&q=80"]'::jsonb, 'Get a clean, modern, conversion-optimized landing page designed in Figma. Includes typography system, custom component layout, responsive grid design, and revisions. Ideal for SaaS or mobile app startups.', '["Figma", "Landing Page", "UI Design", "UX Strategy", "SaaS Design"]'::jsonb, 150.00, 'USD', 3, 4.9, 18, 42, '2026-01-15T10:00:00Z', '2026-01-15T10:00:00Z'),

('srv_2', 'Custom Interactive Mobile App Prototype (iOS & Android)', 'custom-interactive-mobile-app-prototype', 'usr_1', 'cat_1', 'graphics-design', 'sub_14', 'mobile-app-design', '["tag_5", "tag_6", "tag_32", "tag_33", "tag_34"]'::jsonb, 'published', true, false, 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=800&q=80', '["https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=800&q=80", "https://images.unsplash.com/photo-1551650975-87deedd944c3?w=800&q=80"]'::jsonb, 'Transform your concept into a high-fidelity mobile prototype. I will design screens for iOS & Android in Figma with interactive transitions and developer specs.', '["Mobile UI", "Figma Prototype", "App Design", "iOS Design", "Android"]'::jsonb, 250.00, 'USD', 4, 5.0, 12, 28, '2026-01-20T14:30:00Z', '2026-01-20T14:30:00Z'),

('srv_4', 'Custom React Frontend Development using Vite & JavaScript', 'custom-react-frontend-development', 'usr_2', 'cat_2', 'programming-tech', 'sub_4', 'frontend-development', '["tag_1", "tag_35", "tag_36"]'::jsonb, 'published', true, true, 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=800&q=80', '["https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=800&q=80"]'::jsonb, 'Transform Figma designs or business ideas into pixel-perfect, responsive React web apps built with modern performance standards.', '["React", "JavaScript", "Frontend", "Vite", "Web Development"]'::jsonb, 200.00, 'USD', 3, 4.9, 24, 56, '2026-01-18T09:00:00Z', '2026-01-18T09:00:00Z'),

('srv_5', 'Production REST API & Backend Architecture in Go & Node.js', 'production-rest-api-backend-architecture', 'usr_2', 'cat_2', 'programming-tech', 'sub_5', 'backend-apis', '["tag_2", "tag_3", "tag_4"]'::jsonb, 'published', true, true, 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800&q=80', '["https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800&q=80"]'::jsonb, 'Scalable backend API service with database schemas, clean architecture, authentication, and endpoint documentation.', '["Go", "Node.js", "PostgreSQL", "REST API", "Backend Architecture"]'::jsonb, 300.00, 'USD', 5, 5.0, 31, 64, '2026-01-22T11:00:00Z', '2026-01-22T11:00:00Z')
ON CONFLICT (id) DO NOTHING;

-- 5. Seed Service Packages
INSERT INTO service_packages (id, service_id, tier, name, title, description, price, delivery_time, revisions, features)
VALUES
('pkg_1_basic', 'srv_1', 'basic', 'Basic', 'Starter Hero Section', 'Single landing page hero section in Figma with mobile responsive layout.', 150.00, 3, 2, '[{"label": "Number of Screens", "value": "1"}, {"label": "Responsive Design", "included": true}, {"label": "Figma Source File", "included": true}]'::jsonb),
('pkg_1_standard', 'srv_1', 'standard', 'Standard', 'Full Product Landing Page', 'Complete multi-section landing page + interactive clickable prototype.', 350.00, 5, 4, '[{"label": "Number of Screens", "value": "3"}, {"label": "Responsive Design", "included": true}, {"label": "Figma Source File", "included": true}, {"label": "Clickable Prototype", "included": true}]'::jsonb),
('pkg_1_premium', 'srv_1', 'premium', 'Premium', 'Complete SaaS Product Design Suite', 'Up to 7 screens including Landing Page, Pricing, Features, + Design System.', 650.00, 8, 8, '[{"label": "Number of Screens", "value": "7"}, {"label": "Responsive Design", "included": true}, {"label": "Figma Source File", "included": true}, {"label": "Clickable Prototype", "included": true}]'::jsonb),

('pkg_2_basic', 'srv_2', 'basic', 'Basic', 'Core Screen Flow (3 Screens)', '3 primary app screens with click-through navigation.', 250.00, 4, 2, '[{"label": "App Screens", "value": "3"}, {"label": "Clickable Prototype", "included": true}]'::jsonb),
('pkg_2_standard', 'srv_2', 'standard', 'Standard', 'Full App Flow (8 Screens)', '8 interactive screens with micro-animations and component system.', 450.00, 7, 4, '[{"label": "App Screens", "value": "8"}, {"label": "Clickable Prototype", "included": true}]'::jsonb),
('pkg_2_premium', 'srv_2', 'premium', 'Premium', 'Complete Mobile App System (15 Screens)', '15 screens with Dark/Light themes and developer specs.', 850.00, 12, 6, '[{"label": "App Screens", "value": "15"}, {"label": "Clickable Prototype", "included": true}]'::jsonb),

('pkg_4_basic', 'srv_4', 'basic', 'Basic', 'Single Page React View', 'Clean React component implementation for 1 landing page or dashboard view.', 200.00, 3, 2, '[{"label": "Pages", "value": "1"}, {"label": "Responsive Design", "included": true}, {"label": "Clean Modular Code", "included": true}]'::jsonb),
('pkg_4_standard', 'srv_4', 'standard', 'Standard', 'Multi-Page Responsive Web App', 'Up to 4 interactive pages with state management and routing.', 450.00, 6, 4, '[{"label": "Pages", "value": "4"}, {"label": "State Management", "included": true}, {"label": "API Integration Ready", "included": true}]'::jsonb),
('pkg_4_premium', 'srv_4', 'premium', 'Premium', 'Full Frontend Platform MVP', 'Complete client interface with animation, custom hooks, and mock data.', 900.00, 10, 6, '[{"label": "Pages", "value": "8+"}, {"label": "Design System", "included": true}, {"label": "Performance Optimized", "included": true}]'::jsonb),

('pkg_5_basic', 'srv_5', 'basic', 'Basic', 'CRUD REST API Core', '3-5 REST endpoints with PostgreSQL integration and schema design.', 300.00, 5, 2, '[{"label": "Endpoints", "value": "5"}, {"label": "Database Schema", "included": true}, {"label": "Documentation", "included": true}]'::jsonb),
('pkg_5_standard', 'srv_5', 'standard', 'Standard', 'Production Microservice API', 'Full modular API service with repository layer, caching, and validation.', 650.00, 8, 4, '[{"label": "Endpoints", "value": "12"}, {"label": "Clean Architecture", "included": true}, {"label": "Seed Scripts", "included": true}]'::jsonb),
('pkg_5_premium', 'srv_5', 'premium', 'Premium', 'Complete Enterprise Backend Solution', 'Comprehensive backend platform with migrations, auth foundation, and Docker compose.', 1200.00, 14, 6, '[{"label": "Endpoints", "value": "25+"}, {"label": "High Availability Design", "included": true}, {"label": "Security Hardening", "included": true}]'::jsonb)
ON CONFLICT (id) DO NOTHING;
