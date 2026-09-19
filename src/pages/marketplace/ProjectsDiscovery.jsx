import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import {
  Briefcase,
  Search,
  Filter,
  Clock,
  DollarSign,
  Award,
  Users,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Layers,
  ChevronRight,
} from 'lucide-react';
import { projectApi } from '../../services/api/projectApi';
import { marketplaceService } from '../../services/marketplaceService';
import { authService } from '../../services/authService';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Avatar from '../../components/ui/Avatar';

export default function ProjectsDiscovery() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentUser = authService.getCurrentUser();

  const [categories, setCategories] = useState([]);
  const [projects, setProjects] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter state synced with search params
  const categoryParam = searchParams.get('category') || '';
  const expParam = searchParams.get('experience_level') || 'all';
  const budgetTypeParam = searchParams.get('budget_type') || 'all';
  const searchParam = searchParams.get('search') || '';
  const sortParam = searchParams.get('sort') || 'newest';

  const [searchInput, setSearchInput] = useState(searchParam);

  // Load categories
  useEffect(() => {
    marketplaceService
      .getCategories()
      .then((cats) => setCategories(cats || []))
      .catch((err) => console.error('[ProjectsDiscovery] Failed to load categories:', err));
  }, []);

  // Fetch projects on filter change
  useEffect(() => {
    setLoading(true);
    setError(null);

    projectApi
      .getProjects({
        category: categoryParam,
        experienceLevel: expParam,
        budgetType: budgetTypeParam,
        search: searchParam,
        sort: sortParam,
        limit: 30,
      })
      .then((data) => {
        setProjects(data.projects || []);
        setTotal(data.total || 0);
      })
      .catch((err) => {
        console.error('[ProjectsDiscovery] Failed to load projects:', err);
        setError('Failed to load projects. Please ensure the backend is running.');
      })
      .finally(() => setLoading(false));
  }, [categoryParam, expParam, budgetTypeParam, searchParam, sortParam]);

  const updateFilters = (newParams) => {
    const updated = new URLSearchParams(searchParams);
    Object.entries(newParams).forEach(([key, val]) => {
      if (val === '' || val === 'all' || val === null || val === undefined) {
        updated.delete(key);
      } else {
        updated.set(key, val);
      }
    });
    setSearchParams(updated);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    updateFilters({ search: searchInput });
  };

  return (
    <div style={{ background: 'var(--color-bg-dark)', color: 'var(--color-text-main)', minHeight: '100vh', paddingBottom: '80px' }}>
      {/* HERO BANNER */}
      <div
        style={{
          background: 'linear-gradient(180deg, rgba(16, 185, 129, 0.08) 0%, rgba(9, 13, 22, 0) 100%)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
          padding: '48px 0 36px',
        }}
      >
        <div className="container" style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '20px' }}>
            <div>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 12px',
                  background: 'rgba(16, 185, 129, 0.12)',
                  border: '1px solid rgba(16, 185, 129, 0.25)',
                  borderRadius: '999px',
                  color: 'var(--color-accent)',
                  fontSize: '12px',
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  marginBottom: '12px',
                }}
              >
                <Briefcase size={13} />
                <span>Project Marketplace (Phase 5)</span>
              </div>
              <h1 style={{ fontSize: 'clamp(2rem, 3.5vw, 2.75rem)', fontWeight: 800, color: '#fff', margin: 0, letterSpacing: '-0.02em' }}>
                Explore Client Projects
              </h1>
              <p style={{ color: 'var(--color-text-light)', fontSize: '1.05rem', marginTop: '8px', maxWidth: '620px' }}>
                Browse verified outcome-based briefs from buyers. Submit competitive proposals with your custom bid, milestones, and delivery timeline.
              </p>
            </div>

            {currentUser?.role === 'buyer' && (
              <Button variant="primary" onClick={() => navigate('/post-project')} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>Post a New Project</span>
                <ArrowRight size={16} />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* FILTER & SEARCH BAR */}
      <div className="container" style={{ maxWidth: '1200px', margin: '30px auto 0', padding: '0 20px' }}>
        <div
          style={{
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '16px',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          {/* Top row: Search and Sort */}
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <form onSubmit={handleSearchSubmit} style={{ flex: 1, minWidth: '260px', display: 'flex', gap: '8px' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <Search size={18} color="var(--color-text-light)" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text"
                  placeholder="Search by keywords, tech stack, or skills (e.g. React, Three.js, Figma)..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 14px 12px 42px',
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '10px',
                    color: '#fff',
                    fontSize: '0.92rem',
                  }}
                />
              </div>
              <Button type="submit" variant="primary" style={{ padding: '0 20px' }}>
                Search
              </Button>
            </form>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--color-text-light)', whiteSpace: 'nowrap' }}>Sort:</span>
              <select
                value={sortParam}
                onChange={(e) => updateFilters({ sort: e.target.value })}
                style={{
                  padding: '10px 14px',
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '10px',
                  color: '#fff',
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                }}
              >
                <option value="newest" style={{ background: '#0f172a' }}>Newest First</option>
                <option value="budget_high" style={{ background: '#0f172a' }}>Budget: High to Low</option>
                <option value="budget_low" style={{ background: '#0f172a' }}>Budget: Low to High</option>
                <option value="proposals" style={{ background: '#0f172a' }}>Most Proposals</option>
              </select>
            </div>
          </div>

          {/* Bottom row: Category, Experience, Budget Type Pills */}
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center', paddingTop: '12px', borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: 'var(--color-text-light)' }}>
              <Filter size={14} />
              <span>Filters:</span>
            </div>

            {/* Category Dropdown */}
            <select
              value={categoryParam}
              onChange={(e) => updateFilters({ category: e.target.value })}
              style={{
                padding: '8px 12px',
                background: categoryParam ? 'rgba(16, 185, 129, 0.12)' : 'rgba(255, 255, 255, 0.04)',
                border: categoryParam ? '1px solid var(--color-accent)' : '1px solid rgba(255, 255, 255, 0.1)',
                color: categoryParam ? 'var(--color-accent)' : '#fff',
                borderRadius: '8px',
                fontSize: '0.85rem',
                cursor: 'pointer',
              }}
            >
              <option value="" style={{ background: '#0f172a' }}>All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.slug} style={{ background: '#0f172a' }}>
                  {c.name}
                </option>
              ))}
            </select>

            {/* Experience Level */}
            <select
              value={expParam}
              onChange={(e) => updateFilters({ experience_level: e.target.value })}
              style={{
                padding: '8px 12px',
                background: expParam !== 'all' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(255, 255, 255, 0.04)',
                border: expParam !== 'all' ? '1px solid var(--color-accent)' : '1px solid rgba(255, 255, 255, 0.1)',
                color: expParam !== 'all' ? 'var(--color-accent)' : '#fff',
                borderRadius: '8px',
                fontSize: '0.85rem',
                cursor: 'pointer',
              }}
            >
              <option value="all" style={{ background: '#0f172a' }}>All Experience Levels</option>
              <option value="entry" style={{ background: '#0f172a' }}>Entry Level</option>
              <option value="intermediate" style={{ background: '#0f172a' }}>Intermediate</option>
              <option value="expert" style={{ background: '#0f172a' }}>Expert</option>
            </select>

            {/* Budget Type */}
            <select
              value={budgetTypeParam}
              onChange={(e) => updateFilters({ budget_type: e.target.value })}
              style={{
                padding: '8px 12px',
                background: budgetTypeParam !== 'all' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(255, 255, 255, 0.04)',
                border: budgetTypeParam !== 'all' ? '1px solid var(--color-accent)' : '1px solid rgba(255, 255, 255, 0.1)',
                color: budgetTypeParam !== 'all' ? 'var(--color-accent)' : '#fff',
                borderRadius: '8px',
                fontSize: '0.85rem',
                cursor: 'pointer',
              }}
            >
              <option value="all" style={{ background: '#0f172a' }}>All Budget Types</option>
              <option value="fixed" style={{ background: '#0f172a' }}>Fixed Price</option>
              <option value="hourly" style={{ background: '#0f172a' }}>Hourly Rate</option>
            </select>

            {(categoryParam || expParam !== 'all' || budgetTypeParam !== 'all' || searchParam) && (
              <button
                onClick={() => {
                  setSearchInput('');
                  setSearchParams({});
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--color-text-muted)',
                  fontSize: '0.82rem',
                  textDecoration: 'underline',
                  cursor: 'pointer',
                  marginLeft: 'auto',
                }}
              >
                Reset Filters
              </button>
            )}
          </div>
        </div>
      </div>

      {/* PROJECTS LIST */}
      <div className="container" style={{ maxWidth: '1200px', margin: '36px auto 0', padding: '0 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ fontSize: '0.95rem', color: 'var(--color-text-light)' }}>
            Showing <strong>{projects.length}</strong> of <strong>{total}</strong> open projects
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--color-text-light)' }}>
            <div className="spinner" style={{ margin: '0 auto 16px' }} />
            <p>Loading open projects...</p>
          </div>
        ) : error ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '12px', color: '#fca5a5' }}>
            <p>{error}</p>
          </div>
        ) : projects.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 20px', border: '1px dashed rgba(255, 255, 255, 0.1)', borderRadius: '16px', background: 'rgba(15, 23, 42, 0.3)' }}>
            <Briefcase size={36} color="var(--color-text-muted)" style={{ margin: '0 auto 16px' }} />
            <h3 style={{ fontSize: '1.25rem', color: '#fff', marginBottom: '8px' }}>No matching projects found</h3>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', maxWidth: '400px', margin: '0 auto 20px' }}>
              Try adjusting your search terms or clearing active filters to see more project listings.
            </p>
            <Button
              variant="outline"
              onClick={() => {
                setSearchInput('');
                setSearchParams({});
              }}
            >
              Clear All Filters
            </Button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {projects.map((proj) => {
              const formattedBudget =
                proj.budgetType === 'fixed'
                  ? proj.fixedBudget
                    ? `$${proj.fixedBudget}`
                    : proj.budgetMin && proj.budgetMax
                    ? `$${proj.budgetMin} – $${proj.budgetMax}`
                    : `$${proj.budgetMin || proj.budgetMax || 'Negotiable'}`
                  : `$${proj.budgetMin || 0} – $${proj.budgetMax || 0}/hr`;

              const isBuyer = currentUser?.role === 'buyer' && currentUser?.id === proj.buyerId;

              return (
                <div
                  key={proj.id}
                  onClick={() => navigate(`/projects/${proj.id}`)}
                  style={{
                    background: 'rgba(15, 23, 42, 0.55)',
                    backdropFilter: 'blur(12px)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '16px',
                    padding: '24px 28px',
                    cursor: 'pointer',
                    transition: 'all 0.25s ease',
                    position: 'relative',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(16, 185, 129, 0.4)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 12px 30px rgba(0,0,0,0.3)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', flexWrap: 'wrap', marginBottom: '12px' }}>
                    <div style={{ flex: 1, minWidth: '280px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
                        {proj.categoryName && (
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-accent)' }}>
                            {proj.categoryName}
                          </span>
                        )}
                        {proj.subcategoryName && (
                          <>
                            <span style={{ color: 'rgba(255,255,255,0.2)' }}>•</span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                              {proj.subcategoryName}
                            </span>
                          </>
                        )}
                        {proj.hasApplied && (
                          <span style={{ padding: '2px 8px', borderRadius: '4px', background: 'rgba(16, 185, 129, 0.2)', border: '1px solid var(--color-accent)', color: 'var(--color-accent)', fontSize: '0.72rem', fontWeight: 700 }}>
                            Applied ✓
                          </span>
                        )}
                      </div>

                      <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff', margin: 0, lineHeight: 1.4 }}>
                        {proj.title}
                      </h3>
                    </div>

                    {/* Budget Badge */}
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-accent)' }}>
                        {formattedBudget}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'capitalize' }}>
                        {proj.budgetType} Price
                      </div>
                    </div>
                  </div>

                  {/* Project description snippet */}
                  <p
                    style={{
                      color: 'var(--color-text-light)',
                      fontSize: '0.92rem',
                      lineHeight: 1.6,
                      marginBottom: '16px',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {proj.description}
                  </p>

                  {/* Skills tags */}
                  {proj.skills && proj.skills.length > 0 && (
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '18px' }}>
                      {proj.skills.map((skill, idx) => (
                        <span
                          key={idx}
                          style={{
                            fontSize: '0.78rem',
                            padding: '4px 10px',
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                            borderRadius: '6px',
                            color: 'var(--color-text-light)',
                          }}
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Metadata footer */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '12px',
                      paddingTop: '14px',
                      borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                      fontSize: '0.82rem',
                      color: 'var(--color-text-muted)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <Award size={14} color="var(--color-accent)" />
                        <span style={{ textTransform: 'capitalize' }}>{proj.experienceLevel} Level</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <Clock size={14} />
                        <span>{proj.estimatedDuration}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <Users size={14} />
                        <span>{proj.proposalCount} Proposals</span>
                      </div>
                      {proj.buyer?.name && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span>Posted by:</span>
                          <span style={{ color: '#fff', fontWeight: 600 }}>{proj.buyer.name}</span>
                          {proj.buyer.rating > 0 && (
                            <span style={{ color: '#f59e0b', fontSize: '0.75rem' }}>★ {proj.buyer.rating.toFixed(1)}</span>
                          )}
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--color-accent)', fontWeight: 700 }}>
                      <span>{isBuyer ? 'Manage Project' : 'View Brief & Propose'}</span>
                      <ChevronRight size={16} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
