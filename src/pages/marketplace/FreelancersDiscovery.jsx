import React, { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Award, Search, Star, X } from 'lucide-react';
import { searchFreelancers } from '../../services/api/freelancerApi';

const tiers = ['New', 'Rising', 'Established', 'Trusted', 'Top Performer'];

export default function FreelancersDiscovery() {
  const [params, setParams] = useSearchParams();
  const [data, setData] = useState({ freelancers: [], total: 0, page: 1, limit: 20 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const q = params.get('q') || '';
  const page = Number(params.get('page') || 1);
  const category = params.get('category') || '';
  const skill = params.get('skill') || '';
  const tier = params.get('tier') || '';
  const minRating = params.get('min_rating') || '';
  const sort = params.get('sort') || 'match';
  const filters = {
    q,
    category,
    skill,
    tier,
    minRating,
    sort,
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await searchFreelancers({ q, category, skill, tier, minRating, sort, page, limit: 20 });
      setData(previous => ({
        ...response,
        freelancers: page === 1
          ? response.freelancers
          : [...previous.freelancers, ...response.freelancers.filter(item => !previous.freelancers.some(existing => existing.user.id === item.user.id))],
      }));
    } catch {
      setError('Unable to load freelancers. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [category, minRating, page, q, skill, sort, tier]);

  useEffect(() => {
    load();
  }, [load]);

  const apply = values => {
    const next = new URLSearchParams(params);
    Object.entries(values).forEach(([key, value]) => {
      if (value) next.set(key, value);
      else next.delete(key);
    });
    next.delete('page');
    setParams(next);
  };

  const hasFilters = Object.entries(filters).some(([key, value]) => key !== 'sort' && Boolean(value));

  return (
    <main className="container" style={{ padding: 'var(--space-xl) 0 var(--space-3xl)' }}>
      <h1>Find freelancers</h1>
      <p style={{ color: 'var(--color-text-secondary)' }}>Search marketplace profiles using their real review and contract history.</p>

      <form
        onSubmit={event => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          apply({
            q: String(form.get('q') || '').trim(),
            category: String(form.get('category') || '').trim(),
            skill: String(form.get('skill') || '').trim(),
            tier: String(form.get('tier') || ''),
            min_rating: String(form.get('min_rating') || ''),
            sort: String(form.get('sort') || 'match'),
          });
        }}
        style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 10, margin: '20px 0' }}
      >
        <input name="q" defaultValue={filters.q} placeholder="Name or specialty" aria-label="Search freelancers" />
        <input name="category" defaultValue={filters.category} placeholder="Category slug" aria-label="Filter by category" />
        <input name="skill" defaultValue={filters.skill} placeholder="Skill" aria-label="Filter by skill" />
        <select name="tier" defaultValue={filters.tier} aria-label="Growth tier">
          <option value="">All tiers</option>
          {tiers.map(tier => <option key={tier} value={tier}>{tier}</option>)}
        </select>
        <select name="min_rating" defaultValue={filters.minRating} aria-label="Minimum rating">
          <option value="">Any rating</option>
          {[4.5, 4, 3, 2].map(rating => <option key={rating} value={rating}>{rating}+ stars</option>)}
        </select>
        <select name="sort" defaultValue={filters.sort} aria-label="Sort freelancers">
          <option value="match">Best match</option>
          <option value="rating">Highest rated</option>
          <option value="completed">Most completed contracts</option>
          <option value="newest">Newest profiles</option>
        </select>
        <button className="btn btn-primary" type="submit"><Search size={16} /> Search</button>
        {hasFilters && <button className="btn btn-outline" type="button" onClick={() => setParams(new URLSearchParams({ sort: filters.sort }))}><X size={16} /> Clear</button>}
      </form>

      {loading && page === 1 && <p>Loading freelancers…</p>}
      {error && <p role="alert">{error} <button className="btn btn-outline" onClick={load}>Retry</button></p>}
      {!loading && !error && data.freelancers.length === 0 && <p>No freelancers found. Try adjusting your filters.</p>}
      {!error && data.freelancers.length > 0 && (
        <>
          <p>{data.total} freelancer{data.total === 1 ? '' : 's'} found</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
            {data.freelancers.map(result => (
              <Link
                key={result.user.id}
                to={`/seller/${result.user.id}`}
                style={{
                  textDecoration: 'none',
                  color: 'inherit',
                  padding: 20,
                  borderRadius: 16,
                  background: 'rgba(15, 23, 42, 0.65)',
                  backdropFilter: 'blur(12px)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                  transition: 'transform 0.2s, border-color 0.2s',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#fff' }}>{result.user.name}</h3>
                    <p style={{ margin: '4px 0 0', fontSize: '0.84rem', color: 'var(--color-text-muted)' }}>{result.user.title || 'Freelance Specialist'}</p>
                  </div>
                  {result.growthTier && (
                    <span style={{ fontSize: '0.72rem', background: 'rgba(139, 92, 246, 0.15)', color: '#a78bfa', border: '1px solid rgba(139, 92, 246, 0.3)', padding: '3px 8px', borderRadius: 99, fontWeight: 700 }}>
                      {result.growthTier}
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: '0.82rem' }}>
                  <span style={{ display: 'flex', gap: 4, alignItems: 'center', color: '#f59e0b', fontWeight: 700 }}>
                    <Star size={14} fill="#f59e0b" color="#f59e0b" />
                    {result.averageRating ? result.averageRating.toFixed(1) : '5.0'} ({result.ratingCount || 0})
                  </span>
                  <span style={{ color: 'var(--color-text-light)' }}>
                    • {result.completedContracts || 0} completed
                  </span>
                </div>

                {result.user.skills && result.user.skills.length > 0 && (
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', margin: '4px 0' }}>
                    {result.user.skills.slice(0, 4).map((s, sIdx) => (
                      <span key={sIdx} style={{ fontSize: '0.72rem', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', padding: '2px 8px', borderRadius: 6, color: 'var(--color-text-light)' }}>
                        {s}
                      </span>
                    ))}
                  </div>
                )}

                {result.matchReasons && result.matchReasons.length > 0 && (
                  <div style={{ marginTop: 'auto', paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.06)', fontSize: '0.76rem', color: 'var(--color-accent)' }}>
                    ✓ {result.matchReasons.join(' · ')}
                  </div>
                )}
              </Link>
            ))}
          </div>
          {data.freelancers.length < data.total && (
            <button className="btn btn-outline" style={{ marginTop: 20 }} disabled={loading} onClick={() => setParams(new URLSearchParams({ ...Object.fromEntries(params), page: String(page + 1) }))}>
              {loading ? 'Loading…' : 'Load more'}
            </button>
          )}
        </>
      )}
    </main>
  );
}
