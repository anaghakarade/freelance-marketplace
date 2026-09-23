import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Briefcase,
  DollarSign,
  Clock,
  Award,
  Users,
  Calendar,
  CheckCircle2,
  ShieldCheck,
  Send,
  AlertCircle,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { projectApi } from '../../services/api/projectApi';
import { matchingApi } from '../../services/api/matchingApi';
import { authService } from '../../services/authService';
import Button from '../../components/ui/Button';
import Avatar from '../../components/ui/Avatar';
import Badge from '../../components/ui/Badge';

export default function ProjectDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const currentUser = authService.getCurrentUser();

  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Proposal modal state
  const [showModal, setShowModal] = useState(false);
  const [proposalForm, setProposalForm] = useState({
    coverLetter: '',
    bidAmount: '',
    deliveryDays: '',
    estimatedDuration: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const [matches, setMatches] = useState([]);
  const [loadingMatches, setLoadingMatches] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
    setLoading(true);

    projectApi
      .getProjectById(id)
      .then((data) => {
        setProject(data);
        if (data) {
          const defaultBid = data.fixedBudget || data.budgetMin || 500;
          setProposalForm((prev) => ({
            ...prev,
            bidAmount: defaultBid,
            deliveryDays: 14,
          }));

          // If buyer owns the project, is buyer role, or is admin, fetch intelligent matches
          if (currentUser && (
            currentUser.id === data.buyerId ||
            currentUser.role === 'admin' ||
            currentUser.role === 'buyer'
          )) {
            setLoadingMatches(true);
            matchingApi
              .getProjectMatches(id, { limit: 10 }, data)
              .then((mRes) => {
                // apiClient already unwraps data.data — mRes is ProjectMatchesResponse directly
                const matchList = Array.isArray(mRes) ? mRes : (mRes?.matches || []);
                setMatches(matchList);
              })
              .catch((mErr) => {
                console.warn('[ProjectDetails] Failed to load matches:', mErr);
                setMatches(matchingApi.computeDeterministicMatches(data));
              })
              .finally(() => setLoadingMatches(false));
          }
        }
      })
      .catch((err) => {
        console.error('[ProjectDetails] Failed to load project:', err);
        setError('Project not found or failed to load.');
      })
      .finally(() => setLoading(false));
  }, [id, currentUser]);

  const handleOpenModal = () => {
    if (!currentUser) {
      navigate('/login?redirect=/projects/' + id);
      return;
    }
    if (currentUser.role === 'buyer') {
      alert('Only freelancers can submit project proposals.');
      return;
    }
    setShowModal(true);
  };

  const handleSubmitProposal = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError(null);

    try {
      await projectApi.submitProposal(id, {
        cover_letter: proposalForm.coverLetter,
        bid_amount: parseFloat(proposalForm.bidAmount),
        delivery_days: parseInt(proposalForm.deliveryDays, 10),
        estimated_duration: proposalForm.estimatedDuration || `${proposalForm.deliveryDays} days`,
      });

      setSubmitSuccess(true);
      setProject((prev) => ({
        ...prev,
        hasApplied: true,
        proposalCount: (prev.proposalCount || 0) + 1,
      }));
      setTimeout(() => {
        setShowModal(false);
        setSubmitSuccess(false);
      }, 2000);
    } catch (err) {
      console.error('[ProjectDetails] Failed to submit proposal:', err);
      setSubmitError(err.message || 'Failed to submit proposal. Please check requirements.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ background: 'var(--color-bg-dark)', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="spinner" style={{ margin: '0 auto 16px' }} />
          <p>Loading project brief...</p>
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div style={{ background: 'var(--color-bg-dark)', minHeight: '100vh', padding: '80px 20px', textAlign: 'center', color: '#fff' }}>
        <h2 style={{ marginBottom: '16px' }}>Project Not Found</h2>
        <p style={{ color: 'var(--color-text-muted)', marginBottom: '24px' }}>The project you are looking for may have been removed or closed.</p>
        <Button variant="primary" onClick={() => navigate('/projects')}>
          Browse All Projects
        </Button>
      </div>
    );
  }

  const isOwner = currentUser?.id === project.buyerId || 
    (currentUser?.role === 'buyer' && currentUser?.role !== 'freelancer' && currentUser?.role !== 'seller');
  const isAdmin = currentUser?.role === 'admin';
  const isFreelancer = currentUser?.role === 'freelancer' || currentUser?.role === 'seller';
  const canViewMatches = isOwner || isAdmin;

  const formattedBudget =
    project.budgetType === 'fixed'
      ? project.fixedBudget
        ? `$${project.fixedBudget}`
        : project.budgetMin && project.budgetMax
        ? `$${project.budgetMin} – $${project.budgetMax}`
        : `$${project.budgetMin || project.budgetMax || 'Negotiable'}`
      : `$${project.budgetMin || 0} – $${project.budgetMax || 0}/hr`;

  return (
    <div style={{ background: 'var(--color-bg-dark)', color: 'var(--color-text-main)', minHeight: '100vh', padding: '40px 0 80px' }}>
      <div className="container" style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 20px' }}>
        
        {/* BACK LINK */}
        <Link
          to="/projects"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            color: 'var(--color-text-muted)',
            fontSize: '0.9rem',
            textDecoration: 'none',
            marginBottom: '24px',
            transition: 'color 0.2s',
          }}
        >
          <ArrowLeft size={16} />
          <span>Back to Open Projects</span>
        </Link>

        {/* MAIN LAYOUT */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '32px', alignItems: 'start' }}>
          
          {/* LEFT: PROJECT BRIEF */}
          <div
            style={{
              background: 'rgba(15, 23, 42, 0.6)',
              backdropFilter: 'blur(16px)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '20px',
              padding: '36px',
            }}
          >
            {/* Header badges */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px', flexWrap: 'wrap' }}>
              <span
                style={{
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  color: 'var(--color-accent)',
                  padding: '4px 10px',
                  background: 'rgba(16, 185, 129, 0.1)',
                  border: '1px solid rgba(16, 185, 129, 0.2)',
                  borderRadius: '6px',
                }}
              >
                {project.categoryName || 'Project Brief'}
              </span>

              {project.subcategoryName && (
                <span style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>
                  {project.subcategoryName}
                </span>
              )}

              <span
                style={{
                  marginLeft: 'auto',
                  fontSize: '0.8rem',
                  padding: '3px 10px',
                  borderRadius: '999px',
                  background: project.status === 'open' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255,255,255,0.08)',
                  border: `1px solid ${project.status === 'open' ? 'var(--color-accent)' : 'rgba(255,255,255,0.1)'}`,
                  color: project.status === 'open' ? 'var(--color-accent)' : '#fff',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                }}
              >
                {project.status === 'in_progress' ? 'In Progress' : project.status}
              </span>
            </div>

            <h1 style={{ fontSize: 'clamp(1.75rem, 3vw, 2.25rem)', fontWeight: 800, color: '#fff', margin: '0 0 20px', lineHeight: 1.3 }}>
              {project.title}
            </h1>

            {/* Meta bar */}
            <div
              style={{
                display: 'flex',
                gap: '24px',
                flexWrap: 'wrap',
                padding: '16px 20px',
                background: 'rgba(255, 255, 255, 0.03)',
                borderRadius: '12px',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                marginBottom: '28px',
                fontSize: '0.9rem',
              }}
            >
              <div>
                <div style={{ color: 'var(--color-text-muted)', fontSize: '0.78rem', marginBottom: '2px' }}>Budget</div>
                <div style={{ fontWeight: 800, color: 'var(--color-accent)', fontSize: '1.1rem' }}>{formattedBudget}</div>
              </div>
              <div style={{ width: 1, background: 'rgba(255,255,255,0.08)' }} />
              <div>
                <div style={{ color: 'var(--color-text-muted)', fontSize: '0.78rem', marginBottom: '2px' }}>Experience</div>
                <div style={{ fontWeight: 700, color: '#fff', textTransform: 'capitalize' }}>{project.experienceLevel} Level</div>
              </div>
              <div style={{ width: 1, background: 'rgba(255,255,255,0.08)' }} />
              <div>
                <div style={{ color: 'var(--color-text-muted)', fontSize: '0.78rem', marginBottom: '2px' }}>Timeline</div>
                <div style={{ fontWeight: 700, color: '#fff' }}>{project.estimatedDuration}</div>
              </div>
              <div style={{ width: 1, background: 'rgba(255,255,255,0.08)' }} />
              <div>
                <div style={{ color: 'var(--color-text-muted)', fontSize: '0.78rem', marginBottom: '2px' }}>Proposals</div>
                <div style={{ fontWeight: 700, color: '#fff' }}>{project.proposalCount} Submitted</div>
              </div>
            </div>

            {/* Description Section */}
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#fff', marginBottom: '12px' }}>
              Project Requirements & Scope
            </h3>
            <div style={{ color: 'var(--color-text-light)', fontSize: '0.98rem', lineHeight: 1.8, whiteSpace: 'pre-line', marginBottom: '32px' }}>
              {project.description}
            </div>

            {/* Required Skills */}
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#fff', marginBottom: '14px' }}>
              Skills & Expertise Required
            </h3>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '36px' }}>
              {project.skills && project.skills.length > 0 ? (
                project.skills.map((skill, idx) => (
                  <span
                    key={idx}
                    style={{
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      padding: '6px 14px',
                      background: 'rgba(16, 185, 129, 0.08)',
                      border: '1px solid rgba(16, 185, 129, 0.25)',
                      borderRadius: '8px',
                      color: 'var(--color-text-main)',
                    }}
                  >
                    {skill}
                  </span>
                ))
              ) : (
                <span style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>General development skills</span>
              )}
            </div>

            {/* Activity info */}
            <div style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
              <span>Project ID: <code style={{ color: 'var(--color-text-light)' }}>{project.id}</code></span>
              <span>Posted: {new Date(project.createdAt).toLocaleDateString()}</span>
            </div>

            {/* RECOMMENDED FREELANCERS (Phase 10 Intelligent Matching) */}
            {canViewMatches && (
              <div style={{ marginTop: '36px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Sparkles size={20} style={{ color: 'var(--color-accent)' }} />
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', margin: 0 }}>
                      Intelligent Talent Recommendations
                    </h3>
                  </div>
                  <span style={{ fontSize: '0.78rem', background: 'rgba(16, 185, 129, 0.12)', color: 'var(--color-accent)', padding: '4px 10px', borderRadius: 99, fontWeight: 700 }}>
                    Deterministic 5-Factor Match
                  </span>
                </div>

                <p style={{ color: 'var(--color-text-light)', fontSize: '0.88rem', lineHeight: 1.5, marginBottom: '20px' }}>
                  WorkStream analyzed your project requirements, required skills, budget, and experience level to score candidate talent.
                </p>

                {loadingMatches ? (
                  <div style={{ padding: '24px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                    <div className="spinner" style={{ margin: '0 auto 12px' }} />
                    <p>Analyzing candidate pool against your requirements...</p>
                  </div>
                ) : matches.length === 0 ? (
                  <div style={{ padding: '24px', background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '14px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
                    <Sparkles size={24} color="rgba(255,255,255,0.2)" style={{ margin: '0 auto 12px' }} />
                    <p style={{ marginBottom: '6px', fontWeight: 600 }}>No active freelancers found yet</p>
                    <p style={{ fontSize: '0.82rem' }}>As freelancers register and become active on WorkStream, matched candidates will appear here ranked by compatibility score.</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {matches.map((item, idx) => {
                      const fl = item.freelancer || {};
                      const u = fl.user || {};
                      return (
                        <div
                          key={u.id || idx}
                          style={{
                            background: 'rgba(15, 23, 42, 0.65)',
                            backdropFilter: 'blur(12px)',
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                            borderRadius: '16px',
                            padding: '20px',
                            transition: 'border-color 0.2s',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '14px' }}>
                            <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                              <Avatar src={u.avatar} name={u.name} size={48} />
                              <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <Link to={`/seller/${u.id}`} style={{ color: '#fff', fontWeight: 700, fontSize: '1.05rem', textDecoration: 'none' }}>
                                    {u.name}
                                  </Link>
                                  {fl.growthTier && (
                                    <span style={{ fontSize: '0.72rem', background: 'rgba(139, 92, 246, 0.15)', color: '#a78bfa', border: '1px solid rgba(139, 92, 246, 0.3)', padding: '2px 8px', borderRadius: 99, fontWeight: 700 }}>
                                      {fl.growthTier}
                                    </span>
                                  )}
                                </div>
                                <div style={{ color: 'var(--color-text-muted)', fontSize: '0.84rem' }}>{u.title || 'Freelance Specialist'}</div>
                              </div>
                            </div>

                            {/* Match Score Badge */}
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.4)', color: 'var(--color-accent)', padding: '6px 14px', borderRadius: 99, fontWeight: 800, fontSize: '1rem' }}>
                                <Sparkles size={14} />
                                <span>{item.matchScore}% Match</span>
                              </div>
                              {fl.averageRating > 0 && (
                                <div style={{ fontSize: '0.8rem', color: '#f59e0b', marginTop: '4px', fontWeight: 600 }}>
                                  ★ {fl.averageRating.toFixed(1)} ({fl.ratingCount} reviews)
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Score Breakdown Pills */}
                          {item.breakdown && (
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '14px', fontSize: '0.75rem' }}>
                              <span style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', padding: '3px 10px', borderRadius: '6px', color: 'var(--color-text-muted)' }}>
                                Skill: <strong style={{ color: '#fff' }}>{item.breakdown.skillMatch}%</strong>
                              </span>
                              <span style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', padding: '3px 10px', borderRadius: '6px', color: 'var(--color-text-muted)' }}>
                                Trust: <strong style={{ color: '#fff' }}>{item.breakdown.trust}%</strong>
                              </span>
                              <span style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', padding: '3px 10px', borderRadius: '6px', color: 'var(--color-text-muted)' }}>
                                Rating: <strong style={{ color: '#fff' }}>{item.breakdown.rating}%</strong>
                              </span>
                              <span style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', padding: '3px 10px', borderRadius: '6px', color: 'var(--color-text-muted)' }}>
                                Experience: <strong style={{ color: '#fff' }}>{item.breakdown.experience}%</strong>
                              </span>
                              <span style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', padding: '3px 10px', borderRadius: '6px', color: 'var(--color-text-muted)' }}>
                                Budget: <strong style={{ color: '#fff' }}>{item.breakdown.budget}%</strong>
                              </span>
                            </div>
                          )}

                          {/* Reasons List */}
                          {item.reasons && item.reasons.length > 0 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px', background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '10px' }}>
                              {item.reasons.map((r, rIdx) => (
                                <div key={rIdx} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', color: 'var(--color-text-light)' }}>
                                  <CheckCircle2 size={13} style={{ color: 'var(--color-accent)', flexShrink: 0 }} />
                                  <span>{r}</span>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Action Buttons */}
                          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => navigate(`/seller/${u.id}`)}
                            >
                              View Profile
                            </Button>
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => navigate(`/messages?user=${u.id}`)}
                            >
                              Message / Invite
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* RIGHT SIDEBAR: ACTION & BUYER PROFILE */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* ACTION CARD */}
            <div
              style={{
                background: 'rgba(15, 23, 42, 0.7)',
                backdropFilter: 'blur(16px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '18px',
                padding: '24px',
              }}
            >
              {isOwner ? (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-accent)', fontWeight: 700, fontSize: '0.9rem', marginBottom: '8px' }}>
                    <ShieldCheck size={18} />
                    <span>Your Project</span>
                  </div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#fff', marginBottom: '10px' }}>
                    Manage Proposals
                  </h3>
                  <p style={{ color: 'var(--color-text-light)', fontSize: '0.85rem', lineHeight: 1.5, marginBottom: '18px' }}>
                    You have received <strong>{project.proposalCount} proposals</strong> for this project. Review bids, check candidate match scores, and shortlist talent.
                  </p>
                  <Button
                    variant="primary"
                    fullWidth
                    onClick={() => navigate('/buyer?tab=projects')}
                  >
                    Review Proposals in Dashboard
                  </Button>
                </div>
              ) : project.hasApplied ? (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-accent)', fontWeight: 700, fontSize: '0.9rem', marginBottom: '8px' }}>
                    <CheckCircle2 size={18} />
                    <span>Proposal Submitted</span>
                  </div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#fff', marginBottom: '10px' }}>
                    Application Active
                  </h3>
                  <p style={{ color: 'var(--color-text-light)', fontSize: '0.85rem', lineHeight: 1.5, marginBottom: '18px' }}>
                    You have already submitted a proposal for this project. Track status and feedback in your Freelancer Dashboard.
                  </p>
                  <Button
                    variant="outline"
                    fullWidth
                    onClick={() => navigate('/seller?tab=proposals')}
                  >
                    View in My Proposals
                  </Button>
                </div>
              ) : project.status !== 'open' ? (
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#fff', marginBottom: '8px' }}>
                    Project Closed
                  </h3>
                  <p style={{ color: 'var(--color-text-light)', fontSize: '0.85rem' }}>
                    This project is currently {project.status} and is no longer accepting proposals.
                  </p>
                </div>
              ) : (
                <div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', marginBottom: '8px' }}>
                    Ready to Apply?
                  </h3>
                  <p style={{ color: 'var(--color-text-light)', fontSize: '0.86rem', lineHeight: 1.5, marginBottom: '20px' }}>
                    Submit a proposal with your customized bid, estimated delivery timeframe, and qualification brief.
                  </p>
                  <Button
                    variant="primary"
                    fullWidth
                    onClick={handleOpenModal}
                    style={{ height: '48px', fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                  >
                    <Send size={16} />
                    <span>Submit a Proposal</span>
                  </Button>
                </div>
              )}
            </div>

            {/* BUYER INFO CARD */}
            {project.buyer && (
              <div
                style={{
                  background: 'rgba(15, 23, 42, 0.55)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '18px',
                  padding: '24px',
                }}
              >
                <div style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-muted)', marginBottom: '14px' }}>
                  About the Buyer
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                  <Avatar src={project.buyer.avatar} name={project.buyer.name} size={44} />
                  <div>
                    <div style={{ fontWeight: 700, color: '#fff', fontSize: '0.98rem' }}>{project.buyer.name}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-accent)', textTransform: 'capitalize' }}>
                      {project.buyer.accountType === 'corporate' ? 'Corporate Buyer' : 'Verified Buyer'}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.85rem', color: 'var(--color-text-light)' }}>
                  {project.buyer.location && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--color-text-muted)' }}>Location:</span>
                      <span style={{ color: '#fff' }}>{project.buyer.location}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--color-text-muted)' }}>Client Rating:</span>
                    <span style={{ color: '#f59e0b', fontWeight: 700 }}>
                      ★ {project.buyer.rating > 0 ? project.buyer.rating.toFixed(1) : '5.0'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--color-text-muted)' }}>Payment Verified:</span>
                    <span style={{ color: 'var(--color-accent)', fontWeight: 600 }}>Verified ✓</span>
                  </div>
                </div>
              </div>
            )}

            {/* WORKSTREAM GUARANTEE */}
            <div
              style={{
                background: 'rgba(16, 185, 129, 0.06)',
                border: '1px solid rgba(16, 185, 129, 0.2)',
                borderRadius: '16px',
                padding: '18px 20px',
                fontSize: '0.82rem',
                color: 'var(--color-text-light)',
                lineHeight: 1.5,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--color-accent)', fontWeight: 700, marginBottom: '6px' }}>
                <ShieldCheck size={16} />
                <span>WorkStream Protection</span>
              </div>
              Funds are securely held in project escrow upon contract acceptance and released upon delivery milestone approval.
            </div>

          </div>

        </div>

      </div>

      {/* PROPOSAL SUBMISSION MODAL */}
      {showModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(9, 13, 22, 0.85)',
            backdropFilter: 'blur(12px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
        >
          <div
            style={{
              background: 'rgba(15, 23, 42, 0.96)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: '20px',
              padding: '32px',
              maxWidth: '580px',
              width: '100%',
              color: '#fff',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-accent)', fontWeight: 700, fontSize: '0.9rem' }}>
                <Send size={18} />
                <span>Submit Proposal</span>
              </div>
              <button
                onClick={() => setShowModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', fontSize: '1.4rem', cursor: 'pointer' }}
              >
                ×
              </button>
            </div>

            <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#fff', marginBottom: '6px' }}>
              {project.title}
            </h2>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginBottom: '24px' }}>
              Target Budget: <strong>{formattedBudget}</strong> • Timeline: <strong>{project.estimatedDuration}</strong>
            </p>

            {submitSuccess ? (
              <div style={{ textAlign: 'center', padding: '36px 0' }}>
                <CheckCircle2 size={48} color="var(--color-accent)" style={{ margin: '0 auto 16px' }} />
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '8px' }}>Proposal Submitted!</h3>
                <p style={{ color: 'var(--color-text-light)', fontSize: '0.9rem' }}>
                  The client has received your bid and proposal. You can monitor progress in your Freelancer Dashboard.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmitProposal}>
                {submitError && (
                  <div style={{ padding: '12px 16px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', color: '#fca5a5', fontSize: '0.88rem', marginBottom: '20px' }}>
                    {submitError}
                  </div>
                )}

                {/* Bid Amount & Timeline */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '6px' }}>
                      Your Bid Amount ($ USD) *
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={proposalForm.bidAmount}
                      onChange={(e) => setProposalForm({ ...proposalForm, bidAmount: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '12px 14px',
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.12)',
                        borderRadius: '8px',
                        color: '#fff',
                        fontSize: '0.95rem',
                        fontWeight: 700,
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '6px' }}>
                      Delivery Timeline (Days) *
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={proposalForm.deliveryDays}
                      onChange={(e) => setProposalForm({ ...proposalForm, deliveryDays: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '12px 14px',
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.12)',
                        borderRadius: '8px',
                        color: '#fff',
                        fontSize: '0.95rem',
                        fontWeight: 700,
                      }}
                    />
                  </div>
                </div>

                {/* Cover Letter */}
                <div style={{ marginBottom: '24px' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '6px' }}>
                    Cover Letter & Approach (Min 30 characters) *
                  </label>
                  <textarea
                    rows={6}
                    required
                    placeholder="Introduce yourself, explain how you will execute this project, relevant past experience, and why you are the ideal fit..."
                    value={proposalForm.coverLetter}
                    onChange={(e) => setProposalForm({ ...proposalForm, coverLetter: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.12)',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '0.9rem',
                      lineHeight: 1.6,
                      resize: 'vertical',
                    }}
                  />
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '4px', textAlign: 'right' }}>
                    {proposalForm.coverLetter.length} / 30 min characters
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '12px' }}>
                  <Button
                    type="submit"
                    variant="primary"
                    fullWidth
                    disabled={submitting || proposalForm.coverLetter.trim().length < 30}
                    style={{ height: '44px', fontWeight: 700 }}
                  >
                    {submitting ? 'Submitting...' : 'Send Proposal'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowModal(false)}
                    style={{ height: '44px' }}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            )}

          </div>
        </div>
      )}

    </div>
  );
}
