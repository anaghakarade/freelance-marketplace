import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Sparkles, CheckCircle2, ArrowRight, Shield, Award, Clock, DollarSign } from 'lucide-react';
import { marketplaceService } from '../../services/marketplaceService';
import { authService } from '../../services/authService';
import ServiceCard from '../../components/ui/ServiceCard';

import { projectApi } from '../../services/api/projectApi';

const OUTCOME_OPTIONS = [
  { id: 'build', label: 'Build Something', desc: 'Websites, mobile apps, custom software, digital tools', catSlug: 'programming-tech' },
  { id: 'grow', label: 'Grow Something', desc: 'SEO, performance marketing, audience growth, conversion strategy', catSlug: 'digital-marketing' },
  { id: 'create', label: 'Create Something', desc: 'Branding, Figma UI, logos, illustrations, design systems', catSlug: 'graphics-design' },
  { id: 'solve', label: 'Solve Something', desc: 'Technical consulting, code debug, database architecture', catSlug: 'consulting' },
  { id: 'learn', label: 'Learn Something', desc: '1-on-1 coaching, code reviews, career guidance', catSlug: 'personal-growth-hobbies' },
  { id: 'automate', label: 'Automate Something', desc: 'AI agents, Python scripts, workflow integrations', catSlug: 'ai-services' },
];

export default function PostProject() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(authService.getCurrentUser());
  const [categories, setCategories] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  
  const [formData, setFormData] = useState({
    outcomeGoal: 'Build Something',
    title: '',
    description: '',
    budget: '400',
    deadline: '14',
    skills: 'React, Figma',
    categoryId: 'cat_2'
  });

  const [submittedProject, setSubmittedProject] = useState(null);
  const [matchedResults, setMatchedResults] = useState([]);
  const [redirectCountdown, setRedirectCountdown] = useState(null);
  const submittingRef = useRef(false);

  useEffect(() => {
    window.scrollTo(0, 0);
    marketplaceService.getCategories()
      .then(cats => setCategories(cats || []))
      .catch(err => console.error('[PostProject] Failed to load categories:', err));
  }, []);

  const handleOutcomeSelect = (opt) => {
    const matchedCat = categories.find(c => c.slug === opt.catSlug);
    setFormData(prev => ({
      ...prev,
      outcomeGoal: opt.label,
      categoryId: matchedCat ? matchedCat.id : prev.categoryId
    }));
  };

  const handlePostAnother = () => {
    setSubmittedProject(null);
    setMatchedResults([]);
    setRedirectCountdown(null);
    submittingRef.current = false;
    setFormData({
      outcomeGoal: 'Build Something',
      title: '',
      description: '',
      budget: '400',
      deadline: '14',
      skills: 'React, Figma',
      categoryId: categories[0]?.id || 'cat_2',
    });
    setSubmitError(null);
  };

  // Auto-redirect countdown after successful project creation
  useEffect(() => {
    if (redirectCountdown === null) return;
    if (redirectCountdown <= 0) {
      navigate('/buyer?tab=projects');
      return;
    }
    const timer = setTimeout(() => setRedirectCountdown(prev => prev - 1), 1000);
    return () => clearTimeout(timer);
  }, [redirectCountdown, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError(null);

    // Prevent double-submit
    if (submittingRef.current) return;

    if (!currentUser) {
      navigate('/login?redirect=/post-project');
      return;
    }

    if (currentUser.role !== 'buyer' && currentUser.role !== 'client' && currentUser.role !== 'admin') {
      setSubmitError('Only buyer accounts can post projects. Please switch to a buyer profile or register a buyer account.');
      return;
    }

    if (!formData.title.trim() || formData.title.trim().length < 10) {
      setSubmitError('Project title must be at least 10 characters.');
      return;
    }

    if (!formData.description.trim() || formData.description.trim().length < 50) {
      setSubmitError('Project description must be at least 50 characters with detailed scope.');
      return;
    }

    setSubmitting(true);
    submittingRef.current = true;

    try {
      // Pre-check for duplicate project with same title for this buyer
      try {
        const existingProjects = await projectApi.getMyProjects();
        const dup = (existingProjects || []).find(
          p =>
            (p.status === 'open' || p.status === 'in_progress') &&
            p.title?.trim().toLowerCase() === formData.title.trim().toLowerCase()
        );
        if (dup) {
          setSubmitError(
            `You already have an active project titled "${dup.title}". To avoid creating duplicates, please edit your existing project in the Buyer Dashboard or enter a distinct title.`
          );
          setSubmitting(false);
          return;
        }
      } catch (checkErr) {
        console.warn('[PostProject] Could not pre-verify duplicates:', checkErr);
      }

      // 1. Post to PostgreSQL Backend API
      const newProj = await projectApi.createProject({
        title: formData.title.trim(),
        description: formData.description.trim(),
        category_id: formData.categoryId,
        budget_type: 'fixed',
        fixed_budget: parseFloat(formData.budget) || 400,
        skills_string: formData.skills,
        estimated_duration: `${formData.deadline} days`,
        experience_level: 'intermediate',
      });

      setSubmittedProject(newProj);
      try {
        const cached = JSON.parse(localStorage.getItem('workstream_cached_my_projects')) || [];
        localStorage.setItem(
          'workstream_cached_my_projects',
          JSON.stringify([newProj, ...cached.filter(p => p.id !== newProj.id)])
        );
      } catch (cErr) {
        // ignore
      }
      // Auto-redirect to dashboard in 8 seconds (user can cancel by clicking "Post Another")
      setRedirectCountdown(8);

      // 2. Also calculate WorkStream Match recommendations
      const services = await marketplaceService.getServices();
      const scored = (services || []).map(srv => {
        const match = marketplaceService.calculateWorkStreamMatch(newProj, srv);
        return {
          ...srv,
          matchScore: match.totalScore,
          matchBreakdown: match.breakdown,
          matchRationale: match.rationale
        };
      });

      scored.sort((a, b) => b.matchScore - a.matchScore);
      setMatchedResults(scored.slice(0, 6));
    } catch (err) {
      console.error('[PostProject] Creation error:', err);
      setSubmitError(err.message || 'Failed to post project. Please verify inputs.');
      submittingRef.current = false;
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ background: 'var(--color-bg-dark)', color: 'var(--color-text-main)', minHeight: '100vh', padding: '40px 0 80px' }}>
      <div className="container" style={{ maxWidth: '1000px', margin: '0 auto', padding: '0 20px' }}>
        
        {/* HEADER */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 14px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '999px', color: 'var(--color-accent)', fontSize: '12px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '16px' }}>
            <Sparkles size={13} />
            <span>Outcome-First Marketplace</span>
          </div>
          <h1 style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 800, color: '#fff', marginBottom: '12px', tracking: '-0.02em' }}>
            What are you trying to accomplish?
          </h1>
          <p style={{ color: 'var(--color-text-light)', fontSize: '1.1rem', maxWidth: '600px', margin: '0 auto' }}>
            Describe your project goal, budget, and timeline. Our WorkStream Match system will recommend verified talent.
          </p>
        </div>

        {!submittedProject ? (
          /* PROJECT SUBMISSION FORM */
          <form onSubmit={handleSubmit} style={{ background: 'rgba(15, 23, 42, 0.65)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px', padding: '36px', backdropFilter: 'blur(16px)' }}>
            
            {/* 1. OUTCOME CARDS */}
            <div style={{ marginBottom: '32px' }}>
              <label style={{ display: 'block', fontWeight: 700, fontSize: '0.95rem', color: '#fff', marginBottom: '14px' }}>
                1. Select Outcome Goal
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
                {OUTCOME_OPTIONS.map((opt) => {
                  const selected = formData.outcomeGoal === opt.label;
                  return (
                    <div
                      key={opt.id}
                      onClick={() => handleOutcomeSelect(opt)}
                      style={{
                        padding: '16px 20px',
                        borderRadius: '14px',
                        background: selected ? 'rgba(16, 185, 129, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                        border: selected ? '1px solid var(--color-accent)' : '1px solid rgba(255, 255, 255, 0.08)',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <div style={{ fontWeight: 700, color: selected ? 'var(--color-accent)' : '#fff', fontSize: '1rem' }}>
                          {opt.label}
                        </div>
                        {selected && <CheckCircle2 size={16} color="var(--color-accent)" />}
                      </div>
                      <div style={{ fontSize: '0.82rem', color: 'var(--color-text-light)', lineHeight: 1.4 }}>
                        {opt.desc}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 2. TITLE & DESCRIPTION */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontWeight: 700, fontSize: '0.9rem', color: '#fff', marginBottom: '8px' }}>
                2. Project Title
              </label>
              <input
                type="text"
                className="input"
                placeholder="e.g. Modern Landing Page Redesign for SaaS Launch"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
                style={{ width: '100%', padding: '14px 16px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '10px', color: '#fff' }}
              />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontWeight: 700, fontSize: '0.9rem', color: '#fff', marginBottom: '8px' }}>
                3. Describe What Success Looks Like
              </label>
              <textarea
                rows={4}
                placeholder="Describe your goals, desired features, target audience, or specific requirements..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                required
                style={{ width: '100%', padding: '14px 16px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '10px', color: '#fff', resize: 'vertical' }}
              />
            </div>

            {/* 3. BUDGET & DEADLINE & SKILLS */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '32px' }}>
              <div>
                <label style={{ display: 'block', fontWeight: 700, fontSize: '0.9rem', color: '#fff', marginBottom: '8px' }}>
                  Target Budget ($ USD)
                </label>
                <input
                  type="number"
                  placeholder="400"
                  value={formData.budget}
                  onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                  style={{ width: '100%', padding: '12px 16px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '10px', color: '#fff' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 700, fontSize: '0.9rem', color: '#fff', marginBottom: '8px' }}>
                  Target Timeline (Days)
                </label>
                <input
                  type="number"
                  placeholder="7"
                  value={formData.deadline}
                  onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                  style={{ width: '100%', padding: '12px 16px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '10px', color: '#fff' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 700, fontSize: '0.9rem', color: '#fff', marginBottom: '8px' }}>
                  Required Skills (comma separated)
                </label>
                <input
                  type="text"
                  placeholder="React, Figma, Node.js"
                  value={formData.skills}
                  onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
                  style={{ width: '100%', padding: '12px 16px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '10px', color: '#fff' }}
                />
              </div>
            </div>

            {submitError && (
              <div style={{ padding: '12px 16px', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '10px', color: '#fca5a5', fontSize: '0.9rem', marginBottom: '20px' }}>
                {submitError}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="btn btn-primary btn-md"
              style={{ width: '100%', padding: '16px', borderRadius: '12px', fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            >
              <span>{submitting ? 'Publishing Project...' : 'Publish Project & Find Talent'}</span>
              <ArrowRight size={18} />
            </button>

          </form>
        ) : (
          /* MATCHED RESULTS VIEW */
          <div>
            <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.25)', borderRadius: '16px', padding: '24px 30px', marginBottom: '40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-accent)', fontWeight: 700, fontSize: '0.9rem', marginBottom: '4px' }}>
                  <CheckCircle2 size={18} />
                  <span>Project Published to Live Marketplace!</span>
                </div>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff', margin: 0 }}>
                  {submittedProject.title}
                </h2>
                <div style={{ fontSize: '0.88rem', color: 'var(--color-text-light)', marginTop: '4px' }}>
                  Budget: ${submittedProject.fixedBudget || submittedProject.fixed_budget || submittedProject.budgetMin || submittedProject.budget_min || submittedProject.budget} • Status: <strong style={{ color: 'var(--color-accent)' }}>Live / Open</strong>
                </div>
                {redirectCountdown !== null && redirectCountdown > 0 && (
                  <div style={{ marginTop: '8px', fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>
                    Redirecting to your dashboard in <strong style={{ color: 'var(--color-accent)' }}>{redirectCountdown}s</strong>…
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <Link
                  to={`/projects/${submittedProject.id}`}
                  state={{ project: submittedProject }}
                  className="btn btn-primary btn-md"
                  style={{ borderRadius: '10px' }}
                >
                  View Live Brief
                </Link>
                <Link
                  to="/buyer?tab=projects"
                  className="btn btn-outline btn-md"
                  style={{ borderRadius: '10px' }}
                  onClick={() => setRedirectCountdown(null)}
                >
                  My Projects Dashboard
                </Link>
                <button
                  onClick={handlePostAnother}
                  className="btn btn-outline btn-md"
                  style={{ borderRadius: '10px' }}
                >
                  Post Another
                </button>
              </div>
            </div>

            <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#fff', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Award color="var(--color-accent)" size={20} />
              <span>Top Recommended WorkStream Matches</span>
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '24px', marginBottom: '40px' }}>
              {matchedResults.map((srv) => (
                <div key={srv.id} style={{ position: 'relative' }}>
                  {/* WORKSTREAM MATCH SCORE BADGE */}
                  <div style={{ position: 'absolute', top: '12px', right: '12px', zIndex: 10, background: 'rgba(15, 23, 42, 0.9)', border: '1px solid var(--color-accent)', borderRadius: '999px', padding: '4px 12px', display: 'flex', alignItems: 'center', gap: '6px', backdropFilter: 'blur(8px)', boxShadow: '0 4px 12px rgba(0,0,0,0.4)' }}>
                    <Sparkles size={13} color="var(--color-accent)" />
                    <span style={{ fontSize: '12px', fontWeight: 800, color: '#fff' }}>
                      {srv.matchScore}% Match
                    </span>
                  </div>

                  <ServiceCard service={srv} />

                  <div style={{ background: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(255,255,255,0.08)', borderTop: 'none', borderRadius: '0 0 14px 14px', padding: '12px 16px', marginTop: '-6px', fontSize: '0.8rem', color: 'var(--color-text-light)' }}>
                    <strong style={{ color: 'var(--color-accent)' }}>Match Rationale: </strong>
                    {srv.matchRationale}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
