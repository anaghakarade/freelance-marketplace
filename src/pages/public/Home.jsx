import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Star,
  Flame,
  Sparkles,
  ShieldCheck,
  HeartHandshake,
  Compass,
  Users,
  CheckCircle2,
  Lock,
  FileText,
  TrendingUp,
  Search,
  MessageSquare,
  BadgeCheck,
  ChevronRight,
  Clock,
  Briefcase
} from 'lucide-react';
import { marketplaceService } from '../../services/marketplaceService';
import { userService } from '../../services/userService';
import Avatar from '../../components/ui/Avatar';
import ServiceCard from '../../components/ui/ServiceCard';
import HeroScene from '../../components/3d/HeroScene';
import { useTranslation } from '../../i18n/i18n';
import '../../styles/Home.css';

/* Utility: Intersection Observer Reveal */
function useReveal() {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!ref.current) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.1 }
    );
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return [ref, visible];
}

const SectionLabel = ({ index, label }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: 'var(--space-md)' }}>
    <span style={{ fontFamily: 'monospace', fontSize: '11px', color: 'var(--color-accent)', fontWeight: 700, letterSpacing: '0.1em' }}>
      {index}
    </span>
    <div style={{ height: '1px', width: '36px', background: 'var(--border-strong, rgba(255,255,255,0.15))' }} />
    <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 700, color: 'var(--color-text-muted)' }}>
      {label}
    </span>
  </div>
);

const OUTCOME_CARDS = [
  { id: 'build', label: 'Build Something', desc: 'Websites, mobile apps, SaaS products, custom code', query: 'programming-tech' },
  { id: 'grow', label: 'Grow Something', desc: 'SEO, performance marketing, audience growth', query: 'digital-marketing' },
  { id: 'create', label: 'Create Something', desc: 'Branding, Figma UI, illustrations, logo systems', query: 'graphics-design' },
  { id: 'solve', label: 'Solve Something', desc: 'Technical consulting, code reviews, architecture', query: 'consulting' },
  { id: 'learn', label: 'Learn Something', desc: '1-on-1 coaching, career guidance, skill sessions', query: 'personal-growth-hobbies' },
  { id: 'automate', label: 'Automate Something', desc: 'AI agents, Python scripts, workflow integrations', query: 'ai-services' },
];

const LIFECYCLE_STEPS = [
  { step: '01', title: 'DISCOVER', icon: Search, desc: 'Browse services or outcome goals with zero hidden fees' },
  { step: '02', title: 'MATCH', icon: Sparkles, desc: 'Get transparent WorkStream Match scores based on real skills' },
  { step: '03', title: 'COLLABORATE', icon: MessageSquare, desc: 'Define clear scope, fair milestones, and escrow terms' },
  { step: '04', title: 'DELIVER', icon: CheckCircle2, desc: 'Execute in quiet, focused workspaces with complete clarity' },
  { step: '05', title: 'REVIEW', icon: Star, desc: 'Approve work, release payment, and build verified reputation' },
];

const TRUST_POINTS = [
  { icon: ShieldCheck, title: 'Verified Identity', desc: 'Every freelancer profile undergoes identity and background validation.' },
  { icon: CheckCircle2, title: 'Verified Skills', desc: 'Portfolios and completed deliverables are independently vetted.' },
  { icon: Lock, title: 'Protected Payments', desc: 'Milestone funds are held securely in escrow until you approve final work.' },
  { icon: Star, title: 'Authentic Reviews', desc: '100% genuine feedback from real buyers on completed orders.' },
  { icon: FileText, title: 'Clear Requirements', desc: 'Structured project scope builder prevents scope creep and misunderstandings.' },
  { icon: TrendingUp, title: 'Real-Time Order Tracking', desc: 'Clear timeline visualization for every active order milestone.' },
];

export default function Home() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [popularServices, setPopularServices] = useState([]);
  const [trendingServices, setTrendingServices] = useState([]);
  const [trendingGroups, setTrendingGroups] = useState([]);
  const [verifiedTalent, setVerifiedTalent] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [heroVisible, setHeroVisible] = useState(false);

  const [popRef, popVisible] = useReveal();
  const [talRef, talVisible] = useReveal();
  const [howRef, howVisible] = useReveal();
  const [trgRef, trgVisible] = useReveal();
  const [outRef, outVisible] = useReveal();
  const [truRef, truVisible] = useReveal();
  const [ctaRef, ctaVisible] = useReveal();

  useEffect(() => {
    const timer = setTimeout(() => setHeroVisible(true), 80);

    marketplaceService.getFeaturedServices(4)
      .then(services => setPopularServices(services || []))
      .catch(err => console.error('[Home] Failed to load featured services:', err));

    marketplaceService.getTrendingServices(4)
      .then(services => setTrendingServices(services || []))
      .catch(err => console.error('[Home] Failed to load trending services:', err));

    setTrendingGroups(marketplaceService.getTrendingGroups().slice(0, 4));

    // Load talent demo data
    const freelancers = userService.getFreelancers().map((f, idx) => ({
      ...f,
      completedProjects: 18 + idx * 12,
      reviewsCount: 24 + idx * 8,
      startingPrice: 120 + idx * 30,
      verifiedIdentity: true,
      verifiedSkills: true,
    }));
    setVerifiedTalent(freelancers.slice(0, 4));

    return () => clearTimeout(timer);
  }, []);

  const handleSearch = useCallback((e) => {
    e.preventDefault();
    if (searchQuery.trim()) navigate(`/marketplace?search=${encodeURIComponent(searchQuery.trim())}`);
  }, [searchQuery, navigate]);

  return (
    <div style={{ overflowX: 'hidden' }}>

      {/* 1. HERO SECTION */}
      <section className="hero-editorial">
        <div className="container">
          <div className="hero-editorial-grid">

            <div
              className="hero-editorial-left"
              style={{
                opacity: heroVisible ? 1 : 0,
                transform: heroVisible ? 'none' : 'translateY(28px)',
                transition: 'opacity 0.9s cubic-bezier(.16,1,.3,1), transform 0.9s cubic-bezier(.16,1,.3,1)',
              }}
            >
              <div className="hero-eyebrow">
                <span className="hero-eyebrow-dot" />
                {t('hero.eyebrow')}
              </div>

              <h1 className="hero-title-editorial" style={{ fontSize: 'clamp(2.4rem, 5vw, 3.8rem)', lineHeight: 1.1, margin: '16px 0 24px' }}>
                <span>{t('hero.titleLine1')}</span><br />
                <span>{t('hero.titleLine2')}</span><br />
                <span className="highlight-accent">{t('hero.titleAccent')}</span>
              </h1>

              <p className="hero-subtitle-editorial" style={{ fontSize: '1.15rem', lineHeight: 1.6, marginBottom: '32px', color: 'var(--color-text-muted)', maxWidth: '580px' }}>
                {t('hero.subtitle')}
              </p>

              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '36px' }}>
                <Link to="/marketplace" className="btn btn-primary btn-md" style={{ borderRadius: '10px', padding: '14px 28px', fontSize: '1rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                  <span>{t('hero.findTalent')}</span>
                  <ArrowRight size={16} />
                </Link>
                <Link to="/post-project" className="btn btn-outline btn-md" style={{ borderRadius: '10px', padding: '14px 28px', fontSize: '1rem', fontWeight: 600 }}>
                  {t('hero.postProjectBtn')}
                </Link>
              </div>

              <form onSubmit={handleSearch} className="editorial-search-block" style={{ marginTop: '0' }}>
                <div className="editorial-search-input-wrapper" style={{ background: 'var(--surface-glass)', border: '1px solid var(--border)' }}>
                  <input
                    type="text"
                    className="editorial-search-input"
                    placeholder={t('hero.searchPlaceholder')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  <button type="submit" className="btn btn-primary btn-md" style={{ flexShrink: 0, borderRadius: '8px' }}>
                    {t('hero.searchBtn')}
                  </button>
                </div>
              </form>

            </div>

            <div
              className="hero-editorial-right"
              style={{
                opacity: heroVisible ? 1 : 0,
                transform: heroVisible ? 'none' : 'translateX(40px)',
                transition: 'opacity 1s cubic-bezier(.16,1,.3,1) 0.2s, transform 1s cubic-bezier(.16,1,.3,1) 0.2s',
              }}
            >
              <HeroScene />
            </div>

          </div>
        </div>
      </section>

      {/* 2. POPULAR SERVICES */}
      <section
        ref={popRef}
        style={{
          padding: 'var(--space-2xl) 0',
          opacity: popVisible ? 1 : 0,
          transform: popVisible ? 'none' : 'translateY(24px)',
          transition: 'opacity 0.8s ease, transform 0.8s ease',
        }}
      >
        <div className="container">
          <SectionLabel index="01" label="Featured Market Offerings" />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 'var(--space-xl)', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <h2 style={{ fontSize: 'clamp(1.6rem, 3.5vw, 2.6rem)', fontWeight: 800, color: 'var(--color-text-main)', margin: 0 }}>
                Popular Services
              </h2>
              <p style={{ color: 'var(--color-text-muted)', marginTop: '8px', fontSize: '1rem' }}>
                Top-rated freelance services vetted for accuracy and clear scope.
              </p>
            </div>
            <Link to="/marketplace" style={{ fontSize: '13px', color: 'var(--color-accent)', display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 700, textDecoration: 'none' }}>
              <span>View all services</span>
              <ArrowRight size={14} />
            </Link>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '24px' }}>
            {popularServices.map((service) => (
              <ServiceCard key={service.id} service={service} />
            ))}
          </div>
        </div>
      </section>

      {/* 3. VERIFIED TALENT */}
      <section
        ref={talRef}
        style={{
          padding: 'var(--space-2xl) 0',
          background: 'var(--bg-secondary)',
          borderTop: '1px solid var(--border-subtle)',
          borderBottom: '1px solid var(--border-subtle)',
          opacity: talVisible ? 1 : 0,
          transform: talVisible ? 'none' : 'translateY(24px)',
          transition: 'opacity 0.8s ease, transform 0.8s ease',
        }}
      >
        <div className="container">
          <SectionLabel index="02" label="Vetted Professionals" />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 'var(--space-xl)', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <h2 style={{ fontSize: 'clamp(1.6rem, 3.5vw, 2.6rem)', fontWeight: 800, color: 'var(--color-text-main)', margin: 0 }}>
                Verified Freelance Talent
              </h2>
              <p style={{ color: 'var(--color-text-muted)', marginTop: '8px', fontSize: '1rem' }}>
                Work with identity-verified professionals who consistently deliver high-impact results.
              </p>
            </div>
            <Link to="/marketplace" style={{ fontSize: '13px', color: 'var(--color-accent)', display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 700, textDecoration: 'none' }}>
              <span>Explore all talent</span>
              <ArrowRight size={14} />
            </Link>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))', gap: '24px' }}>
            {verifiedTalent.map((freelancer) => (
              <div
                key={freelancer.id}
                style={{
                  background: 'var(--surface-glass)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-xl)',
                  padding: '24px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                  boxShadow: 'var(--card-shadow)',
                  transition: 'transform 0.2s, border-color 0.2s',
                }}
              >
                {/* Header: Avatar + Info */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <Avatar src={freelancer.avatar} name={freelancer.name} size={48} />
                  <div>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--color-text-main)', margin: 0 }}>
                      {freelancer.name}
                    </h3>
                    <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', margin: '2px 0 0' }}>
                      {freelancer.title || freelancer.role || 'Freelance Specialist'}
                    </p>
                  </div>
                </div>

                {/* Rating & Completed Projects */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--border-subtle)', padding: '10px 14px', borderRadius: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Star size={14} fill="#f59e0b" stroke="#f59e0b" />
                    <span style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--color-text-main)' }}>
                      {(freelancer.rating || 4.9).toFixed(1)}
                    </span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                      ({freelancer.reviewsCount} reviews)
                    </span>
                  </div>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-text-muted)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <Briefcase size={12} /> {freelancer.completedProjects} done
                  </span>
                </div>

                {/* Verification Indicators */}
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-accent)', background: 'var(--color-accent-light)', border: '1px solid var(--role-switcher-border)', padding: '3px 9px', borderRadius: '99px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <BadgeCheck size={12} /> Identity
                  </span>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-accent)', background: 'var(--color-accent-light)', border: '1px solid var(--role-switcher-border)', padding: '3px 9px', borderRadius: '99px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <CheckCircle2 size={12} /> Vetted Skills
                  </span>
                </div>

                {/* Footer: Price & Action */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--border-subtle)', paddingTop: '14px', marginTop: 'auto' }}>
                  <div style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>
                    From <span style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--color-text-main)' }}>₹{(freelancer.startingPrice * 85).toLocaleString()}</span>
                  </div>
                  <Link
                    to={`/marketplace`}
                    style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-accent)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                  >
                    <span>View Profile</span>
                    <ChevronRight size={14} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. HOW WORKSTREAM WORKS */}
      <section
        ref={howRef}
        style={{
          padding: 'var(--space-2xl) 0',
          opacity: howVisible ? 1 : 0,
          transform: howVisible ? 'none' : 'translateY(24px)',
          transition: 'opacity 0.8s ease, transform 0.8s ease',
        }}
      >
        <div className="container">
          <SectionLabel index="03" label="Project Lifecycle" />
          <h2 style={{ fontSize: 'clamp(1.8rem, 3.5vw, 2.8rem)', fontWeight: 800, color: 'var(--color-text-main)', marginBottom: '12px', textAlign: 'center' }}>
            How WorkStream Works
          </h2>
          <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', maxWidth: '600px', margin: '0 auto 48px', fontSize: '1.05rem' }}>
            A transparent workflow designed for clarity, zero dark patterns, and guaranteed milestone escrow.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', position: 'relative' }}>
            {LIFECYCLE_STEPS.map((w) => {
              const IconComp = w.icon;
              return (
                <div
                  key={w.step}
                  style={{
                    background: 'var(--surface-glass)',
                    border: '1px solid var(--border)',
                    borderRadius: '16px',
                    padding: '28px 20px',
                    textAlign: 'center',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    boxShadow: 'var(--card-shadow)',
                  }}
                >
                  <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'var(--color-accent-light)', border: '1px solid var(--role-switcher-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-accent)', marginBottom: '16px' }}>
                    <IconComp size={20} />
                  </div>
                  <span style={{ fontFamily: 'monospace', fontSize: '11px', fontWeight: 800, color: 'var(--color-accent)', letterSpacing: '0.1em' }}>
                    STEP {w.step}
                  </span>
                  <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--color-text-main)', margin: '8px 0 6px' }}>
                    {w.title}
                  </h4>
                  <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', lineHeight: 1.5, margin: 0 }}>
                    {w.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 5. TRENDING SERVICES */}
      <section
        ref={trgRef}
        style={{
          padding: 'var(--space-2xl) 0',
          background: 'var(--bg-secondary)',
          borderTop: '1px solid var(--border-subtle)',
          borderBottom: '1px solid var(--border-subtle)',
          opacity: trgVisible ? 1 : 0,
          transform: trgVisible ? 'none' : 'translateY(24px)',
          transition: 'opacity 0.8s ease, transform 0.8s ease',
        }}
      >
        <div className="container">
          <SectionLabel index="04" label="Marketplace Trends" />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 'var(--space-xl)', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <h2 style={{ fontSize: 'clamp(1.6rem, 3.5vw, 2.6rem)', fontWeight: 800, color: 'var(--color-text-main)', margin: 0 }}>
                Trending Collections & Services
              </h2>
              <p style={{ color: 'var(--color-text-muted)', marginTop: '8px', fontSize: '1rem' }}>
                Explore high-demand project groups powered by live marketplace data.
              </p>
            </div>
            <Link to="/categories/trending" style={{ fontSize: '13px', color: 'var(--color-accent)', display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 700, textDecoration: 'none' }}>
              <span>All trending collections</span>
              <ArrowRight size={14} />
            </Link>
          </div>

          {/* Trending Group Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '32px' }}>
            {trendingGroups.map((group) => (
              <Link
                key={group.id}
                to={`/marketplace?trending=${group.slug}`}
                style={{
                  background: 'var(--surface-glass)',
                  border: '1px solid var(--border)',
                  borderRadius: '14px',
                  padding: '20px',
                  textDecoration: 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  transition: 'transform 0.2s, border-color 0.2s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-accent)' }}>
                  <Flame size={16} />
                  <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Trending</span>
                </div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--color-text-main)', margin: 0 }}>
                  {group.title}
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', margin: 0, lineHeight: 1.4 }}>
                  {group.description || 'Focused collection of top-performing services.'}
                </p>
                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--color-accent)', marginTop: '8px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <span>Explore group</span>
                  <ArrowRight size={12} />
                </div>
              </Link>
            ))}
          </div>

          {/* Trending Services Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '24px' }}>
            {trendingServices.map((service) => (
              <ServiceCard key={service.id} service={service} />
            ))}
          </div>
        </div>
      </section>

      {/* 6. OUTCOME DISCOVERY */}
      <section
        ref={outRef}
        style={{
          padding: 'var(--space-2xl) 0',
          opacity: outVisible ? 1 : 0,
          transform: outVisible ? 'none' : 'translateY(24px)',
          transition: 'opacity 0.8s ease, transform 0.8s ease',
        }}
      >
        <div className="container">
          <SectionLabel index="05" label="Outcome-First Discovery" />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 'var(--space-xl)', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <h2 style={{ fontSize: 'clamp(1.8rem, 3.5vw, 2.8rem)', fontWeight: 800, color: 'var(--color-text-main)', margin: 0 }}>
                What are you trying to accomplish?
              </h2>
              <p style={{ color: 'var(--color-text-muted)', marginTop: '8px', fontSize: '1.05rem' }}>
                Skip generic search terms and discover talent directly by project goal.
              </p>
            </div>
            <Link to="/post-project" style={{ fontSize: '14px', color: 'var(--color-accent)', display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 700, textDecoration: 'none' }}>
              <span>Describe your outcome</span>
              <ArrowRight size={15} />
            </Link>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
            {OUTCOME_CARDS.map((card) => (
              <Link
                key={card.id}
                to={`/marketplace?category=${card.query}`}
                style={{
                  background: 'var(--surface-glass)',
                  border: '1px solid var(--border)',
                  borderRadius: '16px',
                  padding: '28px',
                  textDecoration: 'none',
                  transition: 'all 0.25s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between'
                }}
              >
                <div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-text-main)', marginBottom: '8px' }}>
                    {card.label}
                  </h3>
                  <p style={{ color: 'var(--color-text-muted)', fontSize: '0.92rem', lineHeight: 1.5, margin: 0 }}>
                    {card.desc}
                  </p>
                </div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--color-accent)', fontWeight: 700, fontSize: '0.85rem', marginTop: '20px' }}>
                  <span>Explore talent</span>
                  <ArrowRight size={14} />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* 7. TRUST & SAFETY */}
      <section
        ref={truRef}
        style={{
          padding: 'var(--space-2xl) 0',
          background: 'var(--bg-secondary)',
          borderTop: '1px solid var(--border-subtle)',
          borderBottom: '1px solid var(--border-subtle)',
          opacity: truVisible ? 1 : 0,
          transform: truVisible ? 'none' : 'translateY(24px)',
          transition: 'opacity 0.8s ease, transform 0.8s ease',
        }}
      >
        <div className="container">
          <SectionLabel index="06" label="Trust & Protection" />
          <h2 style={{ fontSize: 'clamp(1.8rem, 3.5vw, 2.8rem)', fontWeight: 800, color: 'var(--color-text-main)', marginBottom: '12px', textAlign: 'center' }}>
            Built Around Integrity & Respect
          </h2>
          <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', maxWidth: '650px', margin: '0 auto 48px', fontSize: '1.05rem', lineHeight: 1.6 }}>
            Our marketplace enforces transparent pricing, milestone escrow, and verified reputation with absolute visual clarity.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
            {TRUST_POINTS.map((tp, idx) => {
              const IconComponent = tp.icon;
              return (
                <div
                  key={idx}
                  style={{
                    background: 'var(--surface-glass)',
                    border: '1px solid var(--border)',
                    borderRadius: '16px',
                    padding: '24px',
                    display: 'flex',
                    gap: '16px',
                    boxShadow: 'var(--card-shadow)',
                  }}
                >
                  <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'var(--color-accent-light)', border: '1px solid var(--role-switcher-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-accent)', flexShrink: 0 }}>
                    <IconComponent size={20} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--color-text-main)', margin: '0 0 6px' }}>
                      {tp.title}
                    </h3>
                    <p style={{ fontSize: '0.88rem', color: 'var(--color-text-muted)', lineHeight: 1.5, margin: 0 }}>
                      {tp.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 8. FINAL CTA */}
      <section
        ref={ctaRef}
        style={{
          padding: 'var(--space-3xl) 0',
          opacity: ctaVisible ? 1 : 0,
          transform: ctaVisible ? 'none' : 'translateY(24px)',
          transition: 'opacity 0.8s ease, transform 0.8s ease',
        }}
      >
        <div className="container" style={{ textAlign: 'center', maxWidth: '780px' }}>
          <h2 style={{ fontSize: 'clamp(2rem, 4vw, 3.2rem)', fontWeight: 800, color: 'var(--color-text-main)', marginBottom: '16px' }}>
            Have a clear project outcome in mind?
          </h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '1.15rem', marginBottom: '32px', lineHeight: 1.6 }}>
            Post your project goal, define your target budget, and collaborate with verified freelance professionals.
          </p>
          <Link to="/post-project" className="btn btn-primary btn-lg" style={{ borderRadius: '12px', padding: '16px 36px', fontSize: '1.1rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            <span>Post a Project Now</span>
            <ArrowRight size={18} />
          </Link>
        </div>
      </section>

    </div>
  );
}
