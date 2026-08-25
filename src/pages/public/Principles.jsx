import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, HeartHandshake, Sparkles, MessageCircle, Compass, Users, TrendingUp, Eye, ArrowRight } from 'lucide-react';

const PRINCIPLES = [
  {
    num: '01',
    title: 'Right Livelihood',
    icon: ShieldCheck,
    tagline: 'Work that creates genuine value without harm',
    description: 'We believe work should contribute positively to the world. WorkStream encourages freelancers and buyers to engage in projects that create real utility, respect human dignity, and avoid deceptive practices.'
  },
  {
    num: '02',
    title: 'Right Speech',
    icon: MessageCircle,
    tagline: 'Truthful, constructive, and respectful communication',
    description: 'Clear expectations and respectful feedback lead to better outcomes. Our platform provides gentle communication assistance to encourage constructive phrasing rather than reactive hostility.'
  },
  {
    num: '03',
    title: 'Compassion & Fairness',
    icon: HeartHandshake,
    tagline: 'Balanced protection for both buyers and freelancers',
    description: 'Fair work requires respecting both sides. Buyers need quality and reliability; freelancers need fair compensation, realistic timelines, and protection from scope creep.'
  },
  {
    num: '04',
    title: 'Mindful Work',
    icon: Compass,
    tagline: 'One task, one intention, full attention',
    description: 'Multitasking and chaotic urgency reduce work quality. WorkStream provides a quiet Focus Mode to help freelancers execute active projects with presence and intention without invasive surveillance.'
  },
  {
    num: '05',
    title: 'Generosity & Knowledge Sharing',
    icon: Sparkles,
    tagline: 'Creating value beyond monetary transactions',
    description: 'Skills gain meaning when shared. We encourage freelancers to share open tutorials and support optional contributions toward verified social impact initiatives.'
  },
  {
    num: '06',
    title: 'Community & Collaboration',
    icon: Users,
    tagline: 'Collaborative growth across disciplines',
    description: 'Complex problems require diverse perspectives. We support collaborative project teams where designers, developers, and writers work together seamlessly.'
  },
  {
    num: '07',
    title: 'Continuous Growth',
    icon: TrendingUp,
    tagline: 'Recognizing evolution and impermanence',
    description: 'People and skills evolve. We evaluate performance dynamically, giving freelancers the space to improve their craft and reputation over time.'
  },
  {
    num: '08',
    title: 'Absolute Transparency',
    icon: Eye,
    tagline: 'No dark patterns, artificial urgency, or hidden fees',
    description: 'We strictly reject fake scarcity timers, misleading ratings, hidden platform markups, or manipulative popups. You will always know what you are agreeing to.'
  }
];

export default function Principles() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div style={{ background: 'var(--color-bg-dark)', color: 'var(--color-text-main)', minHeight: '100vh', padding: '60px 0 100px' }}>
      <div className="container" style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 24px' }}>
        
        {/* HERO SECTION */}
        <div style={{ textAlign: 'center', marginBottom: '80px', maxWidth: '800px', margin: '0 auto 80px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 16px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.25)', borderRadius: '999px', color: 'var(--color-accent)', fontSize: '12px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '24px' }}>
            <Sparkles size={14} />
            <span>Product Philosophy</span>
          </div>

          <h1 style={{ fontSize: 'clamp(2.4rem, 5vw, 4rem)', fontWeight: 800, lineHeight: 1.1, marginBottom: '24px', letterSpacing: '-0.02em' }}>
            Work Driven by Purpose,<br />
            <span style={{ color: 'var(--color-accent)' }}>Guided by Integrity.</span>
          </h1>

          <p style={{ fontSize: '1.2rem', color: 'var(--color-text-light)', lineHeight: 1.6, margin: '0 auto 36px', maxWidth: '680px' }}>
            WorkStream is built on the belief that modern digital technology can foster honest collaboration without manipulative metrics, frantic surveillance, or exploitative pressures.
          </p>

          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
            <Link to="/marketplace" className="btn btn-primary btn-md" style={{ borderRadius: '10px' }}>
              Explore Marketplace
            </Link>
            <Link to="/post-project" className="btn btn-outline btn-md" style={{ borderRadius: '10px' }}>
              Post a Project
            </Link>
          </div>
        </div>

        {/* PHILOSOPHY INTRO CARD */}
        <div style={{ background: 'rgba(15, 23, 42, 0.7)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '20px', padding: '40px', marginBottom: '80px', backdropFilter: 'blur(12px)' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#fff', marginBottom: '16px' }}>
            A Product Philosophy Built on Timeless Values
          </h2>
          <p style={{ color: 'var(--color-text-light)', lineHeight: 1.7, fontSize: '1.05rem', margin: 0 }}>
            These principles aren't decorative. They are operational. They shape how WorkStream software actually behaves — from transparent pricing and respectful communication tools to outcome-first discovery and distraction-free workspaces. No dark patterns. No fake urgency. No surveillance.
          </p>
        </div>

        {/* PRINCIPLES GRID */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px', marginBottom: '80px' }}>
          {PRINCIPLES.map((p) => {
            const IconComponent = p.icon;
            return (
              <div
                key={p.num}
                style={{
                  background: 'rgba(15, 23, 42, 0.5)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '16px',
                  padding: '32px',
                  transition: 'all 0.3s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between'
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-accent)' }}>
                      <IconComponent size={22} />
                    </div>
                    <span style={{ fontFamily: 'monospace', fontSize: '14px', fontWeight: 700, color: 'rgba(255, 255, 255, 0.3)' }}>
                      {p.num}
                    </span>
                  </div>

                  <h3 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#fff', marginBottom: '8px' }}>
                    {p.title}
                  </h3>

                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-accent)', marginBottom: '14px' }}>
                    {p.tagline}
                  </div>

                  <p style={{ color: 'var(--color-text-light)', fontSize: '0.95rem', lineHeight: 1.6, margin: 0 }}>
                    {p.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* BOTTOM CTA */}
        <div style={{ textAlign: 'center', background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(15, 23, 42, 0.8) 100%)', border: '1px solid rgba(16, 185, 129, 0.25)', borderRadius: '24px', padding: '50px 30px' }}>
          <h2 style={{ fontSize: '2rem', fontWeight: 700, color: '#fff', marginBottom: '12px' }}>
            Ready to experience meaningful work?
          </h2>
          <p style={{ color: 'var(--color-text-light)', fontSize: '1.1rem', marginBottom: '32px', maxWidth: '550px', margin: '0 auto 32px' }}>
            Find skilled professionals or offer your services on a platform built for integrity and trust.
          </p>
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/marketplace" className="btn btn-primary btn-md" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              <span>Find Talent</span>
              <ArrowRight size={16} />
            </Link>
            <Link to="/post-project" className="btn btn-outline btn-md">
              Post Your Outcome Goal
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
