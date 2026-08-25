export const services = [
  {
    id: 'srv_1',
    title: 'Professional Figma Landing Page Design for Startups',
    slug: 'professional-figma-landing-page-design-for-startups',
    sellerId: 'usr_1',
    categoryId: 'cat_1',
    categorySlug: 'graphics-design',
    subcategoryId: 'sub_13',
    subcategorySlug: 'landing-pages',
    tagIds: ['tag_5', 'tag_6', 'tag_7', 'tag_31'],
    status: 'published',
    isFeatured: true,
    isTrending: true,

    coverImage: 'https://images.unsplash.com/photo-1581291518655-9523c932dedf?w=800&q=80',
    galleryImages: [
      'https://images.unsplash.com/photo-1581291518655-9523c932dedf?w=800&q=80',
      'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=800&q=80',
      'https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?w=800&q=80'
    ],
    description: 'Get a clean, modern, conversion-optimized landing page designed in Figma. Includes typography system, custom component layout, responsive grid design, and 3 revisions. Ideal for SaaS or mobile app startups.',
    tags: ['Figma', 'Landing Page', 'UI Design', 'UX Strategy', 'SaaS Design'],

    startingPrice: 150,
    currency: 'USD',
    deliveryDays: 3,
    rating: 4.9,
    reviewCount: 18,
    orderCount: 42,
    createdAt: '2026-01-15T10:00:00Z',

    packages: {
      basic: {
        name: 'Basic', title: 'Starter Hero Section', description: 'Single landing page hero section in Figma with mobile responsive layout.',
        price: 150, deliveryTime: 3, revisions: 2,
        features: [
          { label: 'Number of Screens', value: '1' },
          { label: 'Responsive Design', included: true },
          { label: 'Figma Source File', included: true },
          { label: 'Clickable Prototype', included: false }
        ]
      },
      standard: {
        name: 'Standard', title: 'Full Product Landing Page', description: 'Complete multi-section landing page + interactive clickable prototype.',
        price: 350, deliveryTime: 5, revisions: 4,
        features: [
          { label: 'Number of Screens', value: '3' },
          { label: 'Responsive Design', included: true },
          { label: 'Figma Source File', included: true },
          { label: 'Clickable Prototype', included: true }
        ]
      },
      premium: {
        name: 'Premium', title: 'Complete SaaS Product Design Suite', description: 'Up to 7 screens including Landing Page, Pricing, Features, + Design System.',
        price: 650, deliveryTime: 8, revisions: 8,
        features: [
          { label: 'Number of Screens', value: '7' },
          { label: 'Responsive Design', included: true },
          { label: 'Figma Source File', included: true },
          { label: 'Clickable Prototype', included: true }
        ]
      }
    },
    deliverables: {
      included: ['Organized Figma source file (.fig)', 'Click-through prototype link', 'Exported PNG/SVG assets'],
      excluded: ['React code conversion', 'Domain registration']
    },
    extras: [
      { id: 'ext_1', title: '24-Hour Express Delivery', description: 'Priority delivery within 24 hours', price: 75, deliveryTimeSavings: 2 },
      { id: 'ext_2', title: 'React Code Conversion', description: 'Convert Figma to React component code', price: 200, deliveryTimeSavings: 0 }
    ],
    requirementsSchema: [
      { id: 'req_1', question: 'What is your product name and URL?', type: 'short_text', required: true, options: [] },
      { id: 'req_2', question: 'Describe your target audience.', type: 'long_text', required: true, options: [] }
    ]
  },
  {
    id: 'srv_2',
    title: 'Custom Interactive Mobile App Prototype (iOS & Android)',
    slug: 'custom-interactive-mobile-app-prototype',
    sellerId: 'usr_1',
    categoryId: 'cat_1',
    categorySlug: 'graphics-design',
    subcategoryId: 'sub_14',
    subcategorySlug: 'mobile-app-design',
    tagIds: ['tag_5', 'tag_6', 'tag_32', 'tag_33', 'tag_34'],
    status: 'published',
    isFeatured: true,
    isTrending: false,

    coverImage: 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=800&q=80',
    galleryImages: [
      'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=800&q=80',
      'https://images.unsplash.com/photo-1551650975-87deedd944c3?w=800&q=80'
    ],
    description: 'Transform your concept into a high-fidelity mobile prototype. I will design screens for iOS & Android in Figma with interactive transitions and developer specs.',
    tags: ['Mobile UI', 'Figma Prototype', 'App Design', 'iOS Design', 'Android'],

    startingPrice: 250,
    currency: 'USD',
    deliveryDays: 4,
    rating: 5.0,
    reviewCount: 12,
    orderCount: 28,
    createdAt: '2026-01-20T14:30:00Z',

    packages: {
      basic: {
        name: 'Basic', title: 'Core Screen Flow (3 Screens)', description: '3 primary app screens with click-through navigation.',
        price: 250, deliveryTime: 4, revisions: 2,
        features: [{ label: 'App Screens', value: '3' }, { label: 'Clickable Prototype', included: true }]
      },
      standard: {
        name: 'Standard', title: 'Full App Flow (8 Screens)', description: '8 interactive screens with micro-animations and component system.',
        price: 450, deliveryTime: 7, revisions: 4,
        features: [{ label: 'App Screens', value: '8' }, { label: 'Clickable Prototype', included: true }]
      },
      premium: {
        name: 'Premium', title: 'Complete Mobile App System (15 Screens)', description: '15 screens with Dark/Light themes and developer specs.',
        price: 850, deliveryTime: 12, revisions: 6,
        features: [{ label: 'App Screens', value: '15' }, { label: 'Clickable Prototype', included: true }]
      }
    },
    deliverables: {
      included: ['Figma source file', 'Interactive prototype link', 'Asset exports @2x/@3x'],
      excluded: ['Native Swift/Kotlin code']
    },
    extras: [],
    requirementsSchema: [
      { id: 'req_1', question: 'Core feature list of your app?', type: 'long_text', required: true, options: [] }
    ]
  },
  {
    id: 'srv_4',
    title: 'Custom React Frontend Development using Vite & JavaScript',
    slug: 'custom-react-frontend-development',
    sellerId: 'usr_2',
    categoryId: 'cat_2',
    categorySlug: 'programming-tech',
    subcategoryId: 'sub_4',
    subcategorySlug: 'frontend-development',
    tagIds: ['tag_1', 'tag_35', 'tag_36'],
    status: 'published',
    isFeatured: true,
    isTrending: true,

    coverImage: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=800&q=80',
    galleryImages: [
      'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=800&q=80',
      'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&q=80'
    ],
    description: 'High-quality React component development based on your Figma mockups. Fully modular, responsive, clean code written with Vite and modern JavaScript/TypeScript.',
    tags: ['React', 'Vite', 'Frontend', 'CSS Grid', 'JavaScript'],

    startingPrice: 200,
    currency: 'USD',
    deliveryDays: 3,
    rating: 4.8,
    reviewCount: 22,
    orderCount: 65,
    createdAt: '2026-01-10T09:15:00Z',

    packages: {
      basic: {
        name: 'Basic', title: 'Single React Page', description: '1 responsive React page component coded from Figma.',
        price: 200, deliveryTime: 3, revisions: 2,
        features: [{ label: 'Pages', value: '1' }, { label: 'Responsive Layout', included: true }]
      },
      standard: {
        name: 'Standard', title: 'Multi-Page Frontend', description: 'Up to 5 pages + React Router navigation and local state.',
        price: 450, deliveryTime: 6, revisions: 4,
        features: [{ label: 'Pages', value: '5' }, { label: 'Responsive Layout', included: true }]
      },
      premium: {
        name: 'Premium', title: 'Complete Web App Frontend', description: '10+ pages, dashboard layout, authentication UI, mock data.',
        price: 850, deliveryTime: 10, revisions: 6,
        features: [{ label: 'Pages', value: '10+' }, { label: 'Responsive Layout', included: true }]
      }
    },
    deliverables: {
      included: ['Clean React source code GitHub repo', 'Vite build scripts'],
      excluded: ['Database hosting']
    },
    extras: [],
    requirementsSchema: []
  },
  {
    id: 'srv_5',
    title: 'Node.js Express REST API Backend with PostgreSQL',
    slug: 'nodejs-express-rest-api-backend',
    sellerId: 'usr_2',
    categoryId: 'cat_2',
    categorySlug: 'programming-tech',
    subcategoryId: 'sub_5',
    subcategorySlug: 'backend-apis',
    tagIds: ['tag_9', 'tag_10', 'tag_11', 'tag_37', 'tag_38'],
    status: 'published',
    isFeatured: false,
    isTrending: false,

    coverImage: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&q=80',
    galleryImages: ['https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&q=80'],
    description: 'Develop a secure, scalable RESTful API with Node.js Express. Includes database migrations, JWT authentication, request validation, and Swagger documentation.',
    tags: ['Node.js', 'Express', 'API Development', 'PostgreSQL', 'JWT'],

    startingPrice: 200,
    currency: 'USD',
    deliveryDays: 4,
    rating: 4.9,
    reviewCount: 14,
    orderCount: 38,
    createdAt: '2026-01-12T11:00:00Z',

    packages: {
      basic: {
        name: 'Basic', title: 'Core Endpoints (3 Endpoints)', description: '3 CRUD API endpoints with Express and PostgreSQL.',
        price: 200, deliveryTime: 4, revisions: 2,
        features: [{ label: 'Endpoints', value: '3' }, { label: 'Swagger Docs', included: true }]
      },
      standard: {
        name: 'Standard', title: 'Full Backend (8 Endpoints)', description: '8 CRUD endpoints + JWT Auth, role permissions, request validation.',
        price: 450, deliveryTime: 7, revisions: 3,
        features: [{ label: 'Endpoints', value: '8' }, { label: 'JWT Auth', included: true }]
      },
      premium: {
        name: 'Premium', title: 'Enterprise Backend Infrastructure', description: '15+ endpoints, file upload handling, email notifications, Docker setup.',
        price: 800, deliveryTime: 12, revisions: 5,
        features: [{ label: 'Endpoints', value: '15+' }, { label: 'JWT Auth', included: true }]
      }
    },
    deliverables: { included: ['Node.js Express project code', 'Swagger docs'], excluded: ['Cloud hosting server fees'] },
    extras: [],
    requirementsSchema: []
  },
  {
    id: 'srv_6',
    title: 'SEO Article & Blog Writing for Tech & SaaS Companies',
    slug: 'seo-article-blog-writing-for-tech-saas',
    sellerId: 'usr_3',
    categoryId: 'cat_4',
    categorySlug: 'writing-translation',
    subcategoryId: 'sub_23',
    subcategorySlug: 'seo-blogs',
    tagIds: ['tag_16', 'tag_39'],
    status: 'published',
    isFeatured: true,
    isTrending: false,

    coverImage: 'https://images.unsplash.com/photo-1455390582262-044cdead277a?w=800&q=80',
    galleryImages: ['https://images.unsplash.com/photo-1455390582262-044cdead277a?w=800&q=80'],
    description: 'High-quality SEO articles on technical/SaaS topics. Keyword research, engaging copywriting, and readability optimized for Google search rankings.',
    tags: ['SEO Blog', 'SaaS Copywriting', 'Tech Writer', 'Article Writing'],

    startingPrice: 75,
    currency: 'USD',
    deliveryDays: 2,
    rating: 4.9,
    reviewCount: 15,
    orderCount: 52,
    createdAt: '2026-01-05T08:00:00Z',

    packages: {
      basic: {
        name: 'Basic', title: 'Short Blog Post (800 Words)', description: '800-word SEO blog post with targeted focus keyword research.',
        price: 75, deliveryTime: 2, revisions: 2,
        features: [{ label: 'Word Count', value: '800 words' }]
      },
      standard: {
        name: 'Standard', title: 'Comprehensive Guide (1,500 Words)', description: '1,500-word deep-dive article with subheadings and meta tags.',
        price: 140, deliveryTime: 3, revisions: 3,
        features: [{ label: 'Word Count', value: '1,500 words' }]
      },
      premium: {
        name: 'Premium', title: 'Authority Whitepaper (3,000 Words)', description: '3,000-word technical pillar page with executive summary.',
        price: 280, deliveryTime: 5, revisions: 4,
        features: [{ label: 'Word Count', value: '3,000 words' }]
      }
    },
    deliverables: { included: ['Markdown / Google Doc document', 'SEO meta title & description'], excluded: [] },
    extras: [],
    requirementsSchema: []
  },
  {
    id: 'srv_8',
    title: 'Comprehensive SEO Audit and Competitor Keyword Mapping',
    slug: 'comprehensive-seo-audit-and-keyword-mapping',
    sellerId: 'usr_4',
    categoryId: 'cat_3',
    categorySlug: 'digital-marketing',
    subcategoryId: 'sub_18',
    subcategorySlug: 'seo',
    tagIds: ['tag_14', 'tag_48'],
    status: 'published',
    isFeatured: true,
    isTrending: true,

    coverImage: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80',
    galleryImages: ['https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80'],
    description: 'Full technical SEO report auditing site speed, indexing errors, and core Web Vitals. Includes 20 high-value competitor keyword targets.',
    tags: ['SEO Audit', 'Keyword Research', 'Google Analytics', 'Search Console'],

    startingPrice: 120,
    currency: 'USD',
    deliveryDays: 3,
    rating: 4.7,
    reviewCount: 11,
    orderCount: 30,
    createdAt: '2026-01-18T16:00:00Z',

    packages: {
      basic: {
        name: 'Basic', title: 'Technical Site Audit', description: 'PDF report highlighting crawl errors and speed bottlenecks.',
        price: 120, deliveryTime: 3, revisions: 1,
        features: [{ label: 'Crawl Audit', included: true }]
      },
      standard: {
        name: 'Standard', title: 'Full Audit + Keyword Strategy', description: 'Technical audit + 20 competitor keywords + consultation call.',
        price: 250, deliveryTime: 5, revisions: 2,
        features: [{ label: 'Crawl Audit', included: true }]
      },
      premium: {
        name: 'Premium', title: 'Complete SEO Roadmap', description: 'Technical audit, 50-keyword mapping, backlink gap analysis.',
        price: 500, deliveryTime: 8, revisions: 3,
        features: [{ label: 'Crawl Audit', included: true }]
      }
    },
    deliverables: { included: ['PDF Audit Report', 'Excel keyword spreadsheet'], excluded: [] },
    extras: [],
    requirementsSchema: []
  },
  {
    id: 'srv_9',
    title: 'High-Converting Google Search Ads Campaign Setup',
    slug: 'high-converting-google-search-ads-campaign',
    sellerId: 'usr_4',
    categoryId: 'cat_3',
    categorySlug: 'digital-marketing',
    subcategoryId: 'sub_19',
    subcategorySlug: 'ppc-ads',
    tagIds: ['tag_15', 'tag_49'],
    status: 'published',
    isFeatured: false,
    isTrending: false,

    coverImage: 'https://images.unsplash.com/photo-1542744094-3a31f103e35f?w=800&q=80',
    galleryImages: ['https://images.unsplash.com/photo-1542744094-3a31f103e35f?w=800&q=80'],
    description: 'Build and launch high-performing Google Search Ads. Includes match type configuration, ad copywriting (3 variants per ad group), and negative keywords.',
    tags: ['Google Ads', 'PPC Campaign', 'Ad Copywriting', 'Lead Generation'],

    startingPrice: 200,
    currency: 'USD',
    deliveryDays: 5,
    rating: 4.8,
    reviewCount: 8,
    orderCount: 20,
    createdAt: '2026-01-19T10:00:00Z',

    packages: {
      basic: {
        name: 'Basic', title: '1 Ad Group Setup', description: 'Setup 1 targeted Google Search ad group.',
        price: 200, deliveryTime: 5, revisions: 2,
        features: [{ label: 'Ad Groups', value: '1' }]
      },
      standard: {
        name: 'Standard', title: 'Full PPC Campaign (3 Ad Groups)', description: '3 ad groups with conversion tracking setup.',
        price: 400, deliveryTime: 7, revisions: 3,
        features: [{ label: 'Ad Groups', value: '3' }]
      },
      premium: {
        name: 'Premium', title: 'Scale Search Ads System', description: '5 ad groups, negative keywords list, 1-month bidding management.',
        price: 750, deliveryTime: 10, revisions: 4,
        features: [{ label: 'Ad Groups', value: '5' }]
      }
    },
    deliverables: { included: ['Google Ads setup export', 'Ad copy text'], excluded: [] },
    extras: [],
    requirementsSchema: []
  },
  {
    id: 'srv_10',
    title: 'Data Extraction & Web Scraping Python Script',
    slug: 'data-extraction-web-scraping-python-script',
    sellerId: 'usr_5',
    categoryId: 'cat_7',
    categorySlug: 'data',
    subcategoryId: 'sub_36',
    subcategorySlug: 'web-scraping',
    tagIds: ['tag_8', 'tag_20', 'tag_21'],
    status: 'published',
    isFeatured: true,
    isTrending: true,

    coverImage: 'https://images.unsplash.com/photo-1515879218367-8466d910aaa4?w=800&q=80',
    galleryImages: ['https://images.unsplash.com/photo-1515879218367-8466d910aaa4?w=800&q=80'],
    description: 'Custom Python script using Scrapy, BeautifulSoup, or Selenium to extract public data from target websites. Outputs data to CSV, JSON, or SQL format.',
    tags: ['Python Scraping', 'Data Extraction', 'Selenium', 'Web Crawler'],

    startingPrice: 100,
    currency: 'USD',
    deliveryDays: 2,
    rating: 4.8,
    reviewCount: 10,
    orderCount: 35,
    createdAt: '2026-01-22T10:00:00Z',

    packages: {
      basic: {
        name: 'Basic', title: 'Single Site Scraper (Up to 1k Rows)', description: 'Scrape 1 website without CAPTCHAs and export to CSV.',
        price: 100, deliveryTime: 2, revisions: 2,
        features: [{ label: 'Target Sites', value: '1' }]
      },
      standard: {
        name: 'Standard', title: 'Advanced Scraper (With Proxies)', description: 'Scrape complex JS sites using Selenium/Playwright with pagination.',
        price: 220, deliveryTime: 4, revisions: 3,
        features: [{ label: 'Target Sites', value: 'Up to 3' }]
      },
      premium: {
        name: 'Premium', title: 'Automated Scraping Bot + Database Sync', description: 'Full recurring scraper bot with scheduled cron execution.',
        price: 450, deliveryTime: 7, revisions: 4,
        features: [{ label: 'Target Sites', value: 'Up to 5' }]
      }
    },
    deliverables: { included: ['Python scraper script (.py)', 'Extracted dataset (CSV/JSON)'], excluded: [] },
    extras: [],
    requirementsSchema: []
  },
  {
    id: 'srv_11',
    title: 'Interactive Python Pandas & Streamlit Data Dashboard',
    slug: 'interactive-python-streamlit-data-dashboard',
    sellerId: 'usr_5',
    categoryId: 'cat_7',
    categorySlug: 'data',
    subcategoryId: 'sub_37',
    subcategorySlug: 'data-analytics',
    tagIds: ['tag_8', 'tag_22'],
    status: 'published',
    isFeatured: false,
    isTrending: false,

    coverImage: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&q=80',
    galleryImages: ['https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&q=80'],
    description: 'Custom analytical dashboard web app built with Streamlit and Pandas. Includes custom charting (Plotly), data aggregation controls, and file uploads.',
    tags: ['Streamlit', 'Python', 'Data Analytics', 'Dashboards', 'Pandas'],

    startingPrice: 250,
    currency: 'USD',
    deliveryDays: 5,
    rating: 5.0,
    reviewCount: 4,
    orderCount: 15,
    createdAt: '2026-01-24T11:00:00Z',

    packages: {
      basic: {
        name: 'Basic', title: 'Single Tab Dashboard', description: 'Single tab Streamlit dashboard with 3 interactive charts.',
        price: 250, deliveryTime: 5, revisions: 2,
        features: [{ label: 'Charts', value: '3' }]
      },
      standard: {
        name: 'Standard', title: 'Multi-Tab Analytics Dashboard', description: 'Multi-page Streamlit dashboard with SQL database connection.',
        price: 480, deliveryTime: 8, revisions: 3,
        features: [{ label: 'Charts', value: '8' }]
      },
      premium: {
        name: 'Premium', title: 'Production BI Web App', description: 'Full Streamlit app with user authentication and automated data sync.',
        price: 900, deliveryTime: 14, revisions: 5,
        features: [{ label: 'Charts', value: '15+' }]
      }
    },
    deliverables: { included: ['Python Streamlit source code', 'Deployment guide'], excluded: [] },
    extras: [],
    requirementsSchema: []
  },
  {
    id: 'srv_12',
    title: 'Custom Brand Identity Pack & Modern Logo Design',
    slug: 'custom-brand-identity-pack-modern-logo-design',
    sellerId: 'usr_11',
    categoryId: 'cat_1',
    categorySlug: 'graphics-design',
    subcategoryId: 'sub_11',
    subcategorySlug: 'logo-brand-identity',
    tagIds: ['tag_23', 'tag_24', 'tag_46'],
    status: 'published',
    isFeatured: true,
    isTrending: true,

    coverImage: 'https://images.unsplash.com/photo-1626785774573-4b799315345d?w=800&q=80',
    galleryImages: ['https://images.unsplash.com/photo-1626785774573-4b799315345d?w=800&q=80'],
    description: 'Modern brand identity package. Contains 3 custom vector logo concepts, brand typography selections, color palette guide, and assets formatted for web and print.',
    tags: ['Logo Design', 'Vector Branding', 'Identity Style', 'Adobe Illustrator'],

    startingPrice: 100,
    currency: 'USD',
    deliveryDays: 3,
    rating: 4.7,
    reviewCount: 9,
    orderCount: 22,
    createdAt: '2026-01-25T12:00:00Z',

    packages: {
      basic: {
        name: 'Basic', title: 'Essential Logo Concept', description: '2 vector logo concepts + PNG/SVG exports.',
        price: 100, deliveryTime: 3, revisions: 2,
        features: [{ label: 'Concepts', value: '2' }]
      },
      standard: {
        name: 'Standard', title: 'Full Brand Identity Kit', description: '3 logo concepts + brand typography, color palette, social banners.',
        price: 220, deliveryTime: 5, revisions: 4,
        features: [{ label: 'Concepts', value: '3' }]
      },
      premium: {
        name: 'Premium', title: 'Corporate Branding Package', description: '5 logo concepts + 15-page brand style guide and stationery mockups.',
        price: 450, deliveryTime: 8, revisions: 6,
        features: [{ label: 'Concepts', value: '5' }]
      }
    },
    deliverables: { included: ['Vector source files (AI, EPS, SVG)', 'Brand palette codes'], excluded: [] },
    extras: [],
    requirementsSchema: []
  },
  {
    id: 'srv_13',
    title: 'Custom Vector Illustrations for Websites & Blogs',
    slug: 'custom-vector-illustrations-for-websites',
    sellerId: 'usr_11',
    categoryId: 'cat_1',
    categorySlug: 'graphics-design',
    subcategoryId: 'sub_15',
    subcategorySlug: 'vector-illustrations',
    tagIds: ['tag_24', 'tag_47'],
    status: 'published',
    isFeatured: false,
    isTrending: false,

    coverImage: 'https://images.unsplash.com/photo-1557683316-973673baf926?w=800&q=80',
    galleryImages: ['https://images.unsplash.com/photo-1557683316-973673baf926?w=800&q=80'],
    description: 'Flat-style vector illustrations for your landing page or digital product. Up to 3 scenes matching your brand colors and style guide.',
    tags: ['Flat Illustration', 'Vector Illustration', 'Landing Page Art', 'SVG'],

    startingPrice: 90,
    currency: 'USD',
    deliveryDays: 3,
    rating: 4.6,
    reviewCount: 6,
    orderCount: 14,
    createdAt: '2026-01-26T09:00:00Z',

    packages: {
      basic: {
        name: 'Basic', title: '1 Vector Scene', description: '1 custom vector illustration scene.',
        price: 90, deliveryTime: 3, revisions: 2,
        features: [{ label: 'Scenes', value: '1' }]
      },
      standard: {
        name: 'Standard', title: '3 Vector Scenes', description: '3 illustrations matching your website brand style.',
        price: 240, deliveryTime: 5, revisions: 3,
        features: [{ label: 'Scenes', value: '3' }]
      },
      premium: {
        name: 'Premium', title: 'Full Illustration Suite (6 Scenes)', description: '6 high-res vector scenes + SVG source files.',
        price: 450, deliveryTime: 8, revisions: 5,
        features: [{ label: 'Scenes', value: '6' }]
      }
    },
    deliverables: { included: ['SVG and PNG exports', 'Illustrator source file'], excluded: [] },
    extras: [],
    requirementsSchema: []
  },
  {
    id: 'srv_14',
    title: 'Market Research Report & Competitor Analysis',
    slug: 'market-research-report-competitor-analysis',
    sellerId: 'usr_4',
    categoryId: 'cat_8',
    categorySlug: 'business',
    subcategoryId: 'sub_40',
    subcategorySlug: 'market-research',
    tagIds: ['tag_40', 'tag_41'],
    status: 'published',
    isFeatured: false,
    isTrending: false,

    coverImage: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800&q=80',
    galleryImages: ['https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800&q=80'],
    description: 'Thorough industry market analysis report. Includes TAM/SAM sizing, trends forecasts, SWOT analysis of top 3 players, and executive PDF summary.',
    tags: ['Market Research', 'SWOT Analysis', 'Business Strategy', 'PDF Report'],

    startingPrice: 280,
    currency: 'USD',
    deliveryDays: 6,
    rating: 4.8,
    reviewCount: 5,
    orderCount: 12,
    createdAt: '2026-01-27T14:00:00Z',

    packages: {
      basic: {
        name: 'Basic', title: 'Competitor SWOT Summary', description: 'SWOT analysis of top 3 industry competitors.',
        price: 280, deliveryTime: 6, revisions: 2,
        features: [{ label: 'Competitors Analyzed', value: '3' }]
      },
      standard: {
        name: 'Standard', title: 'Full Market Opportunity Report', description: 'TAM/SAM market sizing + competitor analysis of 5 players.',
        price: 550, deliveryTime: 9, revisions: 3,
        features: [{ label: 'Competitors Analyzed', value: '5' }]
      },
      premium: {
        name: 'Premium', title: 'Enterprise Business Strategy Report', description: 'Comprehensive 30-page market research report with raw data tables.',
        price: 950, deliveryTime: 14, revisions: 4,
        features: [{ label: 'Competitors Analyzed', value: '10' }]
      }
    },
    deliverables: { included: ['Executive PDF Market Report', 'Excel data table'], excluded: [] },
    extras: [],
    requirementsSchema: []
  },
  {
    id: 'srv_15',
    title: 'Pitch Deck & Business Plan Presentation Design',
    slug: 'pitch-deck-business-plan-presentation-design',
    sellerId: 'usr_1',
    categoryId: 'cat_8',
    categorySlug: 'business',
    subcategoryId: 'sub_39',
    subcategorySlug: 'pitch-decks',
    tagIds: ['tag_25', 'tag_26'],
    status: 'published',
    isFeatured: true,
    isTrending: true,

    coverImage: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800&q=80',
    galleryImages: ['https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800&q=80'],
    description: 'Professional pitch deck layout for startup founders seeking funding. Up to 12 slides designed in Google Slides or PowerPoint with high-quality tables.',
    tags: ['Pitch Deck', 'PowerPoint Design', 'Investor Presentation', 'SaaS Business'],

    startingPrice: 180,
    currency: 'USD',
    deliveryDays: 3,
    rating: 4.9,
    reviewCount: 7,
    orderCount: 19,
    createdAt: '2026-01-28T09:00:00Z',

    packages: {
      basic: {
        name: 'Basic', title: 'Standard Pitch Deck (5 Slides)', description: 'Redesign 5 essential pitch deck slides.',
        price: 180, deliveryTime: 3, revisions: 2,
        features: [{ label: 'Slides', value: '5' }]
      },
      standard: {
        name: 'Standard', title: 'Full Investor Deck (12 Slides)', description: 'Complete 12-slide investor deck with custom charts.',
        price: 350, deliveryTime: 5, revisions: 4,
        features: [{ label: 'Slides', value: '12' }]
      },
      premium: {
        name: 'Premium', title: 'Comprehensive Founder Deck (20 Slides)', description: '20 slides + financial model charts and PDF export.',
        price: 600, deliveryTime: 8, revisions: 6,
        features: [{ label: 'Slides', value: '20' }]
      }
    },
    deliverables: { included: ['Editable .pptx or Google Slides link', 'PDF export'], excluded: [] },
    extras: [],
    requirementsSchema: []
  },
  {
    id: 'srv_16',
    title: 'Full-Stack Next.js 14 Web App with Supabase Integration',
    slug: 'full-stack-nextjs-14-web-app-with-supabase',
    sellerId: 'usr_2',
    categoryId: 'cat_2',
    categorySlug: 'programming-tech',
    subcategoryId: 'sub_6',
    subcategorySlug: 'full-stack',
    tagIds: ['tag_1', 'tag_2', 'tag_12', 'tag_13', 'tag_35'],
    status: 'published',
    isFeatured: true,
    isTrending: true,

    coverImage: 'https://images.unsplash.com/photo-1547082299-de196ea013d6?w=800&q=80',
    galleryImages: ['https://images.unsplash.com/photo-1547082299-de196ea013d6?w=800&q=80'],
    description: 'SaaS web application built with Next.js App Router, Tailwind CSS, Supabase database, and Stripe payment gateway. Ideal for launching your SaaS MVP fast.',
    tags: ['Next.js', 'Supabase', 'Stripe', 'React', 'TailwindCSS'],

    startingPrice: 450,
    currency: 'USD',
    deliveryDays: 5,
    rating: 4.9,
    reviewCount: 16,
    orderCount: 40,
    createdAt: '2026-02-01T10:00:00Z',

    packages: {
      basic: {
        name: 'Basic', title: 'MVP Starter (2 Pages + Auth)', description: 'Next.js App Router with Supabase Auth setup.',
        price: 450, deliveryTime: 5, revisions: 2,
        features: [{ label: 'Pages', value: '2' }, { label: 'Auth', included: true }]
      },
      standard: {
        name: 'Standard', title: 'Complete SaaS MVP (5 Pages + Stripe)', description: 'Full SaaS app with authentication, Stripe subscriptions, dashboard.',
        price: 850, deliveryTime: 9, revisions: 4,
        features: [{ label: 'Pages', value: '5' }, { label: 'Stripe', included: true }]
      },
      premium: {
        name: 'Premium', title: 'Production Ready SaaS Platform', description: '10+ pages, team roles permissions, Stripe webhooks, Vercel deployment.',
        price: 1500, deliveryTime: 14, revisions: 6,
        features: [{ label: 'Pages', value: '10+' }, { label: 'Stripe Webhooks', included: true }]
      }
    },
    deliverables: { included: ['Next.js GitHub repo', 'Supabase SQL migrations'], excluded: [] },
    extras: [],
    requirementsSchema: []
  },
  {
    id: 'srv_17',
    title: 'Professional Explainer Video & 2D Motion Graphics Animation',
    slug: 'professional-explainer-video-2d-motion-graphics',
    sellerId: 'usr_11',
    categoryId: 'cat_5',
    categorySlug: 'video-animation',
    subcategoryId: 'sub_29',
    subcategorySlug: 'animated-explainers',
    tagIds: ['tag_29', 'tag_30'],
    status: 'published',
    isFeatured: true,
    isTrending: true,

    coverImage: 'https://images.unsplash.com/photo-1536240478700-b869070f9279?w=800&q=80',
    galleryImages: ['https://images.unsplash.com/photo-1536240478700-b869070f9279?w=800&q=80'],
    description: '30-second premium 2D animated explainer video. Includes custom graphics, voiceover sync, background music licensing, and sound mixing.',
    tags: ['Explainer Video', '2D Animation', 'Motion Graphics', 'Adobe AfterEffects'],

    startingPrice: 400,
    currency: 'USD',
    deliveryDays: 7,
    rating: 4.7,
    reviewCount: 3,
    orderCount: 10,
    createdAt: '2026-02-03T11:00:00Z',

    packages: {
      basic: {
        name: 'Basic', title: '30-Second Explainer', description: '30s 2D animated video + voiceover sync.',
        price: 400, deliveryTime: 7, revisions: 4,
        features: [{ label: 'Duration', value: '30s' }]
      },
      standard: {
        name: 'Standard', title: '60-Second Explainer', description: '60s animation with custom storyboard and background music.',
        price: 700, deliveryTime: 10, revisions: 5,
        features: [{ label: 'Duration', value: '60s' }]
      },
      premium: {
        name: 'Premium', title: '90-Second Full Commercial Video', description: '90s full 2D motion graphics video with 4K resolution render.',
        price: 1100, deliveryTime: 14, revisions: 6,
        features: [{ label: 'Duration', value: '90s' }]
      }
    },
    deliverables: { included: ['1080p / 4K MP4 video export', 'Licensed background audio'], excluded: [] },
    extras: [],
    requirementsSchema: []
  },
  {
    id: 'srv_18',
    title: 'YouTube Video Editing & Color Grading Service',
    slug: 'youtube-video-editing-color-grading',
    sellerId: 'usr_11',
    categoryId: 'cat_5',
    categorySlug: 'video-animation',
    subcategoryId: 'sub_28',
    subcategorySlug: 'video-editing',
    tagIds: ['tag_27', 'tag_28'],
    status: 'published',
    isFeatured: false,
    isTrending: false,

    coverImage: 'https://images.unsplash.com/photo-1622737133809-d95047b9e673?w=800&q=80',
    galleryImages: ['https://images.unsplash.com/photo-1622737133809-d95047b9e673?w=800&q=80'],
    description: 'Professional editing for your raw footage (up to 15 mins). Includes dynamic cuts, text overlays, color correction, noise reduction, and transitions.',
    tags: ['Video Editing', 'Premiere Pro', 'YouTube Editor', 'Color Grading'],

    startingPrice: 80,
    currency: 'USD',
    deliveryDays: 4,
    rating: 4.5,
    reviewCount: 6,
    orderCount: 18,
    createdAt: '2026-02-04T12:00:00Z',

    packages: {
      basic: {
        name: 'Basic', title: 'Basic Edit (Up to 10 mins)', description: 'Trim cuts and audio leveling for 10-minute video.',
        price: 80, deliveryTime: 4, revisions: 2,
        features: [{ label: 'Footage Length', value: '10m' }]
      },
      standard: {
        name: 'Standard', title: 'Pro YouTube Edit (Up to 20 mins)', description: 'Dynamic jump cuts, sound effects, subtitles, color grading.',
        price: 160, deliveryTime: 6, revisions: 3,
        features: [{ label: 'Footage Length', value: '20m' }]
      },
      premium: {
        name: 'Premium', title: 'Cinematic Edit (Up to 45 mins)', description: 'Full documentary/vlog editing with motion graphics and custom thumbnails.',
        price: 320, deliveryTime: 9, revisions: 4,
        features: [{ label: 'Footage Length', value: '45m' }]
      }
    },
    deliverables: { included: ['1080p MP4 render file'], excluded: [] },
    extras: [],
    requirementsSchema: []
  },
  {
    id: 'srv_19',
    title: 'Machine Learning Model Development & Training Pipeline',
    slug: 'machine-learning-model-development-training',
    sellerId: 'usr_5',
    categoryId: 'cat_7',
    categorySlug: 'data',
    subcategoryId: 'sub_38',
    subcategorySlug: 'machine-learning',
    tagIds: ['tag_8', 'tag_42', 'tag_43'],
    status: 'published',
    isFeatured: true,
    isTrending: true,

    coverImage: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800&q=80',
    galleryImages: ['https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800&q=80'],
    description: 'Train a custom ML model for classification, regression, or NLP task. Includes data cleaning, feature engineering, model optimization, and deployment files.',
    tags: ['Machine Learning', 'TensorFlow', 'Scikit Learn', 'Python AI', 'NLP'],

    startingPrice: 380,
    currency: 'USD',
    deliveryDays: 9,
    rating: 4.9,
    reviewCount: 5,
    orderCount: 11,
    createdAt: '2026-02-05T08:00:00Z',

    packages: {
      basic: {
        name: 'Basic', title: 'Baseline ML Model', description: 'Train 1 Scikit-learn classification/regression model.',
        price: 380, deliveryTime: 9, revisions: 3,
        features: [{ label: 'Models', value: '1' }]
      },
      standard: {
        name: 'Standard', title: 'Deep Learning Pipeline', description: 'TensorFlow/PyTorch model with hyperparameter tuning & evaluation metrics.',
        price: 750, deliveryTime: 12, revisions: 4,
        features: [{ label: 'Models', value: '2' }]
      },
      premium: {
        name: 'Premium', title: 'Production AI Model API', description: 'Complete ML training pipeline + FastAPI Docker deployment container.',
        price: 1400, deliveryTime: 18, revisions: 5,
        features: [{ label: 'Deployment API', included: true }]
      }
    },
    deliverables: { included: ['Python Jupyter Notebook', 'Trained model file (.pkl/.onnx)'], excluded: [] },
    extras: [],
    requirementsSchema: []
  },
  {
    id: 'srv_20',
    title: 'WordPress E-Commerce Website & Custom WooCommerce Build',
    slug: 'wordpress-ecommerce-website-woocommerce',
    sellerId: 'usr_2',
    categoryId: 'cat_2',
    categorySlug: 'programming-tech',
    subcategoryId: 'sub_7',
    subcategorySlug: 'wordpress-cms',
    tagIds: ['tag_3', 'tag_44', 'tag_45'],
    status: 'published',
    isFeatured: false,
    isTrending: false,

    coverImage: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80',
    galleryImages: ['https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80'],
    description: 'E-commerce store built on WordPress and WooCommerce. Includes product checkout integrations, inventory controls, payment gateways (Stripe/PayPal), and security plugins.',
    tags: ['WordPress', 'WooCommerce', 'E-Commerce', 'PHP', 'Plugin Setup'],

    startingPrice: 400,
    currency: 'USD',
    deliveryDays: 8,
    rating: 4.7,
    reviewCount: 18,
    orderCount: 45,
    createdAt: '2026-02-06T15:00:00Z',

    packages: {
      basic: {
        name: 'Basic', title: 'Starter Store (Up to 5 Products)', description: 'WordPress WooCommerce setup with Stripe payment.',
        price: 400, deliveryTime: 8, revisions: 3,
        features: [{ label: 'Products', value: '5' }]
      },
      standard: {
        name: 'Standard', title: 'Pro E-Commerce Store (Up to 20 Products)', description: 'Custom WooCommerce theme styling, shipping calculator, coupons.',
        price: 750, deliveryTime: 12, revisions: 4,
        features: [{ label: 'Products', value: '20' }]
      },
      premium: {
        name: 'Premium', title: 'Enterprise WooCommerce Portal', description: 'Unlimited products setup, multi-currency support, speed optimization.',
        price: 1200, deliveryTime: 16, revisions: 6,
        features: [{ label: 'Products', value: 'Unlimited' }]
      }
    },
    deliverables: { included: ['WordPress admin credentials', 'Database backup export'], excluded: [] },
    extras: [],
    requirementsSchema: []
  }
];
