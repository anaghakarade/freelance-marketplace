import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { marketplaceService } from '../../services/marketplaceService';
import Breadcrumbs from '../../components/ui/Breadcrumbs';
import { Flame, ArrowRight, Sparkles, Star, Clock } from 'lucide-react';

const Trending = () => {
  const navigate = useNavigate();
  const [trendingGroups, setTrendingGroups] = useState([]);
  const [trendingServices, setTrendingServices] = useState([]);

  useEffect(() => {
    const groups = marketplaceService.getTrendingGroups();
    setTrendingGroups(groups);

    marketplaceService.getTrendingServices(8)
      .then(services => setTrendingServices(services || []))
      .catch(err => console.error('[Trending] Failed to load trending services:', err));
  }, []);

  return (
    <div style={{ padding: 'var(--space-xl) 0 var(--space-3xl)' }}>
      <div className="container">

        {/* Breadcrumb */}
        <Breadcrumbs items={[{ label: 'Categories', link: '/categories' }, { label: 'Trending' }]} />

        {/* Hero Section */}
        <div style={{
          position: 'relative',
          background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(15, 23, 42, 0.6) 100%)',
          border: '1px solid rgba(16, 185, 129, 0.25)',
          borderRadius: 'var(--radius-2xl)',
          padding: 'clamp(var(--space-xl), 5vw, var(--space-3xl))',
          marginBottom: 'var(--space-3xl)',
          overflow: 'hidden',
        }}>
          <div style={{ position: 'relative', zIndex: 1, maxWidth: '640px' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '4px 12px', background: 'rgba(16, 185, 129, 0.2)', borderRadius: 999, fontSize: 'var(--text-xs)', color: 'var(--color-accent)', fontWeight: 800, marginBottom: 'var(--space-sm)' }}>
              <Flame size={14} />
              <span>MARKETPLACE TRENDS</span>
            </div>

            <h1 style={{ fontSize: 'clamp(2.2rem, 5vw, 3.6rem)', fontWeight: 800, letterSpacing: '-0.03em', color: '#fff', lineHeight: 1.1, marginBottom: 'var(--space-sm)' }}>
              Discover what people are looking for right now.
            </h1>

            <p style={{ fontSize: 'var(--text-base)', color: 'var(--color-text-muted)', lineHeight: 1.6, marginBottom: 'var(--space-lg)' }}>
              Curated service collections matching high-demand client initiatives — from website builds to AI agents and brand transformations.
            </p>
          </div>

          <div style={{
            position: 'absolute',
            right: '-60px',
            bottom: '-60px',
            width: '320px',
            height: '320px',
            background: 'radial-gradient(circle, rgba(16,185,129,0.2) 0%, transparent 70%)',
            pointerEvents: 'none',
          }} />
        </div>

        {/* Trending Groups Grid */}
        <div style={{ marginBottom: 'var(--space-3xl)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 'var(--space-lg)' }}>
            <Sparkles size={18} style={{ color: 'var(--color-accent)' }} />
            <h2 style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, color: 'var(--color-text-main)', margin: 0 }}>
              Trending Service Groups
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 'var(--space-xl)' }}>
            {trendingGroups.map((group) => {
              const matchingCount = group.serviceIds ? group.serviceIds.length : 0;
              return (
                <div
                  key={group.id}
                  style={{
                    background: 'rgba(15, 23, 42, 0.6)',
                    backdropFilter: 'blur(16px)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: 'var(--radius-xl)',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    transition: 'transform 0.25s, border-color 0.25s, box-shadow 0.25s',
                    cursor: 'pointer',
                  }}
                  onClick={() => navigate(`/marketplace?trending=${group.slug}`)}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = 'rgba(16, 185, 129, 0.4)';
                    e.currentTarget.style.transform = 'translateY(-4px)';
                    e.currentTarget.style.boxShadow = '0 16px 36px rgba(0,0,0,0.5)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <div style={{ position: 'relative', height: '160px', overflow: 'hidden' }}>
                    <img
                      src={group.image}
                      alt={group.title}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transition: 'transform 0.4s' }}
                      onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
                      onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                    />
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(15, 23, 42, 0.9) 0%, transparent 70%)' }} />
                    <div style={{ position: 'absolute', top: 12, right: 12, background: 'rgba(16,185,129,0.9)', color: '#fff', fontSize: '11px', fontWeight: 800, padding: '3px 10px', borderRadius: 99 }}>
                      TRENDING
                    </div>
                  </div>

                  <div style={{ padding: 'var(--space-lg)', flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--color-text-main)', marginBottom: 'var(--space-xs)' }}>
                      {group.title}
                    </h3>
                    <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', lineHeight: 1.5, marginBottom: 'var(--space-md)' }}>
                      {group.description}
                    </p>

                    <div style={{ marginTop: 'auto', paddingTop: 'var(--space-sm)', borderTop: '1px solid rgba(255, 255, 255, 0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '11px', color: 'var(--color-text-light)' }}>
                        {matchingCount} featured services
                      </span>
                      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-accent)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                        Explore group <ArrowRight size={13} />
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top Trending Services */}
        {trendingServices.length > 0 && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg)' }}>
              <h2 style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, color: 'var(--color-text-main)', margin: 0 }}>
                Popular Trending Services
              </h2>
              <Link to="/marketplace?trending=true" style={{ fontSize: 'var(--text-xs)', color: 'var(--color-accent)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4, textDecoration: 'none' }}>
                View all trending gigs <ArrowRight size={13} />
              </Link>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 'var(--space-md)' }}>
              {trendingServices.map(srv => (
                <Link
                  key={srv.id}
                  to={`/service/${srv.id}`}
                  style={{ textDecoration: 'none', display: 'flex', flexDirection: 'column' }}
                >
                  <div style={{
                    background: 'rgba(15, 23, 42, 0.5)',
                    border: '1px solid rgba(255,255,255,0.07)',
                    borderRadius: 12,
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    height: '100%',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(16, 185, 129, 0.3)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'; e.currentTarget.style.transform = 'translateY(0)'; }}
                  >
                    <div style={{ position: 'relative', aspectRatio: '16/10', overflow: 'hidden' }}>
                      <img src={srv.coverImage || srv.image} alt={srv.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <span style={{ position: 'absolute', top: 8, left: 8, background: 'rgba(16,185,129,0.9)', color: '#fff', fontSize: '10px', fontWeight: 800, padding: '2px 8px', borderRadius: 99 }}>TRENDING</span>
                    </div>
                    <div style={{ padding: 14, flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>{srv.sellerName}</span>
                      <p style={{ fontSize: '13px', fontWeight: 600, color: '#fff', margin: 0, lineHeight: 1.35, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {srv.title}
                      </p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 'auto' }}>
                        <Star size={12} fill="#f59e0b" stroke="#f59e0b" />
                        <span style={{ fontSize: '12px', fontWeight: 700, color: '#f59e0b' }}>{(srv.rating || 5).toFixed(1)}</span>
                        <span style={{ fontSize: '11px', color: 'var(--color-text-light)' }}>({srv.reviewCount || 0})</span>
                        <span style={{ marginLeft: 'auto', fontSize: '13px', fontWeight: 700, color: 'var(--color-accent)' }}>${srv.startingPrice || srv.price}</span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default Trending;
