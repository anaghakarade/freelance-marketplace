import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { marketplaceService } from '../../services/marketplaceService';
import Breadcrumbs from '../../components/ui/Breadcrumbs';
import { Search, ArrowRight, Layers, Grid } from 'lucide-react';
import { useTranslation } from '../../i18n/i18n';
import CategoryScene from '../../components/3d/CategoryScene';

const Categories = () => {
  const { t } = useTranslation();
  const [categories, setCategories] = useState([]);
  const [subcategoriesMap, setSubcategoriesMap] = useState({});
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const cats = marketplaceService.getCategories();
    setCategories(cats);

    const map = {};
    cats.forEach(c => {
      map[c.id] = marketplaceService.getSubcategories(c.slug || c.id);
    });
    setSubcategoriesMap(map);
  }, []);

  const filteredCategories = categories.filter(cat => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const catMatch = cat.name.toLowerCase().includes(q) || cat.description.toLowerCase().includes(q);
    const subs = subcategoriesMap[cat.id] || [];
    const subMatch = subs.some(s => s.name.toLowerCase().includes(q) || s.description.toLowerCase().includes(q));
    return catMatch || subMatch;
  });

  return (
    <div style={{ padding: 'var(--space-xl) 0 var(--space-3xl)' }}>
      <div className="container">
        
        {/* Breadcrumb */}
        <Breadcrumbs items={[{ label: t('navbar.categories') }]} />

        {/* Page Header */}
        <div style={{ marginBottom: 'var(--space-2xl)' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '4px 12px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.25)', borderRadius: '999px', fontSize: 'var(--text-xs)', color: 'var(--color-accent)', fontWeight: 700, marginBottom: 'var(--space-sm)' }}>
            <Grid size={13} />
            <span>{t('categories.tagline')}</span>
          </div>

          <h1 style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--color-text-main)', marginBottom: 'var(--space-xs)' }}>
            {t('categories.title')}
          </h1>

          <p style={{ fontSize: 'var(--text-base)', color: 'var(--color-text-muted)', maxWidth: '600px', lineHeight: 1.6 }}>
            {t('categories.subtitle')}
          </p>

          {/* Quick Search inside Categories */}
          <div style={{ marginTop: 'var(--space-lg)', maxWidth: '480px', position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-light)' }} />
            <input
              type="text"
              placeholder={t('categories.filterPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="form-control"
              style={{ paddingLeft: '38px', height: '44px', background: 'var(--input-bg)', border: '1px solid var(--input-border)' }}
            />
          </div>
        </div>

        {/* Categories Grid */}
        {filteredCategories.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 'var(--space-xl)' }}>
            {filteredCategories.map((cat, idx) => {
              const subs = subcategoriesMap[cat.id] || [];
              return (
                <div
                  key={cat.id}
                  style={{
                    background: 'rgba(15, 23, 42, 0.55)',
                    backdropFilter: 'blur(16px)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: 'var(--radius-xl)',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    transition: 'transform 0.2s, border-color 0.2s, box-shadow 0.2s',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = 'rgba(16, 185, 129, 0.3)';
                    e.currentTarget.style.transform = 'translateY(-3px)';
                    e.currentTarget.style.boxShadow = '0 16px 36px rgba(0,0,0,0.4)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  {/* Category 3D Scene Header */}
                  <div style={{ position: 'relative', height: '160px', overflow: 'hidden', background: 'var(--card-bg, #090d16)' }}>
                    <CategoryScene slug={cat.slug} height={160} />
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, var(--card-bg, rgba(15,23,42,0.98)) 0%, transparent 60%)' }} />
                    <div style={{ position: 'absolute', bottom: '12px', left: '16px', right: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                      <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--color-text-main)', margin: 0 }}>
                        {cat.name}
                      </h2>
                      <span style={{ fontSize: '11px', background: 'rgba(16, 185, 129, 0.2)', border: '1px solid rgba(16, 185, 129, 0.4)', color: 'var(--color-accent)', padding: '2px 8px', borderRadius: 99, fontWeight: 700 }}>
                        {subs.length} {t('categories.subcategoriesCount')}
                      </span>
                    </div>
                  </div>

                  {/* Body & Subcategories List */}
                  <div style={{ padding: 'var(--space-md) var(--space-lg)', flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', lineHeight: 1.5, marginBottom: 'var(--space-md)' }}>
                      {cat.description}
                    </p>

                    <div style={{ marginBottom: 'var(--space-md)' }}>
                      <p style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-accent)', fontWeight: 700, marginBottom: '8px' }}>
                        {t('categories.popularSubcategories')}
                      </p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {subs.slice(0, 6).map(sub => (
                          <Link
                            key={sub.id}
                            to={`/categories/${cat.slug}/${sub.slug}`}
                            style={{
                              padding: '4px 10px',
                              borderRadius: 'var(--radius-md)',
                              background: 'rgba(255, 255, 255, 0.04)',
                              border: '1px solid rgba(255, 255, 255, 0.08)',
                              color: 'var(--color-text-light)',
                              fontSize: 'var(--text-xs)',
                              textDecoration: 'none',
                              transition: 'all 0.15s',
                            }}
                            onMouseEnter={e => {
                              e.currentTarget.style.background = 'rgba(16, 185, 129, 0.15)';
                              e.currentTarget.style.color = 'var(--color-accent)';
                              e.currentTarget.style.borderColor = 'rgba(16, 185, 129, 0.3)';
                            }}
                            onMouseLeave={e => {
                              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                              e.currentTarget.style.color = 'var(--color-text-light)';
                              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                            }}
                          >
                            {sub.name}
                          </Link>
                        ))}
                      </div>
                    </div>

                    {/* Footer Action */}
                    <div style={{ marginTop: 'auto', paddingTop: 'var(--space-sm)', borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
                      <Link
                        to={`/categories/${cat.slug}`}
                        style={{
                          fontSize: 'var(--text-xs)',
                          color: 'var(--color-accent)',
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          textDecoration: 'none',
                        }}
                      >
                        {t('categories.exploreAllServices')} {cat.name} <ArrowRight size={13} />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: 'var(--space-3xl) 0', color: 'var(--color-text-muted)' }}>
            <Layers size={36} style={{ margin: '0 auto var(--space-md)', color: 'var(--color-text-light)' }} />
            <h3>{t('categories.noMatches')} "{searchQuery}"</h3>
            <button
              onClick={() => setSearchQuery('')}
              style={{ marginTop: 'var(--space-md)', background: 'none', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', padding: '8px 18px', borderRadius: 99, cursor: 'pointer' }}
            >
              {t('categories.clearSearch')}
            </button>
          </div>
        )}

      </div>
    </div>
  );
};

export default Categories;
