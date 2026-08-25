import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Sparkles, CheckCircle2, ArrowRight, Shield, Award, Clock, DollarSign } from 'lucide-react';
import { marketplaceService } from '../../services/marketplaceService';
import { authService } from '../../services/authService';
import ServiceCard from '../../components/ui/ServiceCard';

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
  
  const [formData, setFormData] = useState({
    outcomeGoal: 'Build Something',
    title: '',
    description: '',
    budget: '400',
    deadline: '7',
    skills: 'React, Figma',
    categoryId: 'cat_2'
  });

  const [submittedProject, setSubmittedProject] = useState(null);
  const [matchedResults, setMatchedResults] = useState([]);

  useEffect(() => {
    window.scrollTo(0, 0);
    setCategories(marketplaceService.getCategories());
  }, []);

  const handleOutcomeSelect = (opt) => {
    const matchedCat = categories.find(c => c.slug === opt.catSlug);
    setFormData(prev => ({
      ...prev,
      outcomeGoal: opt.label,
      categoryId: matchedCat ? matchedCat.id : prev.categoryId
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.description.trim()) {
      alert('Please enter a project title and description.');
      return;
    }

    const project = marketplaceService.createProjectPost({
      ...formData,
      buyerId: currentUser ? currentUser.id : 'usr_6'
    });

    setSubmittedProject(project);

    // Compute WorkStream Match across all marketplace services
    const services = marketplaceService.getServices();
    const scored = services.map(srv => {
      const match = marketplaceService.calculateWorkStreamMatch(project, srv);
      return {
        ...srv,
        matchScore: match.totalScore,
        matchBreakdown: match.breakdown,
        matchRationale: match.rationale
      };
    });

    // Sort by highest match score
    scored.sort((a, b) => b.matchScore - a.matchScore);
    setMatchedResults(scored.slice(0, 6));
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

            <button
              type="submit"
              className="btn btn-primary btn-md"
              style={{ width: '100%', padding: '16px', borderRadius: '12px', fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            >
              <span>Calculate WorkStream Match & Find Talent</span>
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
                  <span>Project Brief Submitted</span>
                </div>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff', margin: 0 }}>
                  {submittedProject.title}
                </h2>
                <div style={{ fontSize: '0.88rem', color: 'var(--color-text-light)', marginTop: '4px' }}>
                  Goal: {submittedProject.outcomeGoal} • Budget: ${submittedProject.budget} • Timeline: {submittedProject.deadlineDays} days
                </div>
              </div>

              <button
                onClick={() => setSubmittedProject(null)}
                className="btn btn-outline btn-md"
                style={{ borderRadius: '10px' }}
              >
                Post Another Project
              </button>
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
