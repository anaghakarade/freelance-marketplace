import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  FileText,
  CheckCircle2,
  Clock,
  DollarSign,
  Send,
  AlertCircle,
  PlusCircle,
  ThumbsUp,
  RotateCcw,
  ArrowLeft,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Calendar,
  Layers,
  Sparkles,
  ShieldCheck,
  Check,
  X,
} from 'lucide-react';
import { contractApi } from '../../services/api/contractApi';
import { paymentApi } from '../../services/api/paymentApi';
import { authService } from '../../services/authService';
import { useTranslation } from '../../i18n/i18n';
import Button from '../../components/ui/Button';
import Avatar from '../../components/ui/Avatar';
import Badge from '../../components/ui/Badge';
import ReviewForm from '../../components/reviews/ReviewForm';
import { reviewApi } from '../../services/api/reviewApi';
import ActivityTimeline from '../../components/reviews/ActivityTimeline';

export default function ContractDetails() {
  const { contractId } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const currentUser = authService.getCurrentUser();

  const [contract, setContract] = useState(null);
  const [milestones, setMilestones] = useState([]);
  const [progress, setProgress] = useState(null);
  const [payments, setPayments] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionFeedback, setActionFeedback] = useState(null);

  // Modals state
  const [showAddMilestoneModal, setShowAddMilestoneModal] = useState(false);
  const [milestoneForm, setMilestoneForm] = useState({
    title: '',
    description: '',
    amount: '',
    dueDate: '',
  });

  const [submittingWorkForMilestone, setSubmittingWorkForMilestone] = useState(null);
  const [submissionForm, setSubmissionForm] = useState({
    message: '',
    attachmentUrl: '',
  });

  const [reviewingMilestone, setReviewingMilestone] = useState(null);
  const [revisionMessage, setRevisionMessage] = useState('');

  const [expandedSubmissions, setExpandedSubmissions] = useState({});
  const [actionLoading, setActionLoading] = useState(false);
  const [reviewEligibility, setReviewEligibility] = useState(null);

  const loadContractData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await contractApi.getContractById(contractId);
      setContract(data);

      const mData = await contractApi.getMilestones(contractId);
      setMilestones(mData.milestones || []);
      setProgress(mData.progress || data.progress);
      const paymentList = await paymentApi.getContractPayments(contractId);
      setPayments(Object.fromEntries(paymentList.map((payment) => [payment.milestoneId, payment])));
    } catch (err) {
      console.error('[ContractDetails] Error loading contract:', err);
      setError(err.message || 'Failed to load contract details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!currentUser) {
      navigate(`/login?redirect=/contracts/${contractId}`);
      return;
    }
    loadContractData();
  }, [contractId]);

  useEffect(() => {
    if (contract?.status !== 'completed') { setReviewEligibility(null); return; }
    reviewApi.eligibility(contractId).then(setReviewEligibility).catch(() => setReviewEligibility({ eligible: false }));
  }, [contract?.status, contractId]);

  const toggleSubmissions = (mId) => {
    setExpandedSubmissions((prev) => ({
      ...prev,
      [mId]: !prev[mId],
    }));
  };

  const handleCreateMilestone = async (e) => {
    e.preventDefault();
    if (!milestoneForm.title.trim() || !milestoneForm.amount) return;

    setActionLoading(true);
    try {
      await contractApi.createMilestone(contractId, {
        title: milestoneForm.title.trim(),
        description: milestoneForm.description.trim(),
        amount: parseFloat(milestoneForm.amount),
        currency: contract?.currency || 'USD',
        dueDate: milestoneForm.dueDate ? new Date(milestoneForm.dueDate).toISOString() : null,
      });

      setShowAddMilestoneModal(false);
      setMilestoneForm({ title: '', description: '', amount: '', dueDate: '' });
      setActionFeedback({ type: 'success', text: 'Milestone added successfully.' });
      loadContractData();
    } catch (err) {
      setActionFeedback({ type: 'error', text: err.message || 'Failed to add milestone.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleStartMilestone = async (milestoneId) => {
    setActionLoading(true);
    try {
      await contractApi.startMilestone(milestoneId);
      setActionFeedback({ type: 'success', text: 'Milestone started! Status changed to In Progress.' });
      loadContractData();
    } catch (err) {
      setActionFeedback({ type: 'error', text: err.message || 'Failed to start milestone.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleSubmitWork = async (e) => {
    e.preventDefault();
    if (!submissionForm.message.trim() && !submissionForm.attachmentUrl.trim()) {
      alert('Please provide a work summary or an attachment URL.');
      return;
    }

    setActionLoading(true);
    try {
      await contractApi.submitMilestone(submittingWorkForMilestone.id, {
        message: submissionForm.message.trim(),
        attachmentUrl: submissionForm.attachmentUrl.trim() || null,
      });

      setSubmittingWorkForMilestone(null);
      setSubmissionForm({ message: '', attachmentUrl: '' });
      setActionFeedback({ type: 'success', text: 'Work submitted for buyer review!' });
      loadContractData();
    } catch (err) {
      setActionFeedback({ type: 'error', text: err.message || 'Failed to submit milestone work.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleApproveMilestone = async (milestoneId) => {
    if (!window.confirm('Approve this milestone deliverable?')) return;

    setActionLoading(true);
    try {
      await contractApi.approveMilestone(milestoneId, 'Approved by client.');
      setActionFeedback({ type: 'success', text: 'Milestone approved successfully!' });
      loadContractData();
    } catch (err) {
      setActionFeedback({ type: 'error', text: err.message || 'Failed to approve milestone.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleFundMilestone = async (milestoneId) => {
    setActionLoading(true);
    try { await paymentApi.fundMilestone(milestoneId); setActionFeedback({ type: 'success', text: 'Funds are held in internal escrow.' }); loadContractData(); }
    catch (err) { setActionFeedback({ type: 'error', text: err.message || 'Unable to fund milestone.' }); }
    finally { setActionLoading(false); }
  };

  const handleReleasePayment = async (paymentId) => {
    setActionLoading(true);
    try { await paymentApi.releasePayment(paymentId); setActionFeedback({ type: 'success', text: 'Payment released to freelancer.' }); loadContractData(); }
    catch (err) { setActionFeedback({ type: 'error', text: err.message || 'Unable to release payment.' }); }
    finally { setActionLoading(false); }
  };

  const handleRequestRevision = async (e) => {
    e.preventDefault();
    if (!revisionMessage.trim() || revisionMessage.trim().length < 5) {
      alert('Please provide feedback notes (minimum 5 characters).');
      return;
    }

    setActionLoading(true);
    try {
      await contractApi.requestRevision(reviewingMilestone.id, revisionMessage.trim());
      setReviewingMilestone(null);
      setRevisionMessage('');
      setActionFeedback({ type: 'info', text: 'Revision requested. Freelancer notified.' });
      loadContractData();
    } catch (err) {
      setActionFeedback({ type: 'error', text: err.message || 'Failed to request revision.' });
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ background: 'var(--color-bg-dark)', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="spinner" style={{ margin: '0 auto 16px' }} />
          <p>Loading contract workspace...</p>
        </div>
      </div>
    );
  }

  if (error || !contract) {
    return (
      <div style={{ background: 'var(--color-bg-dark)', minHeight: '100vh', padding: '80px 20px', textAlign: 'center', color: '#fff' }}>
        <h2>Contract Not Found</h2>
        <p style={{ color: 'var(--color-text-muted)', margin: '16px 0 24px' }}>
          {error || 'You may not have permission to view this contract.'}
        </p>
        <Button variant="primary" onClick={() => navigate(-1)}>
          Go Back
        </Button>
      </div>
    );
  }

  const isBuyer = currentUser?.id === contract.buyerId;
  const isFreelancer = currentUser?.id === contract.freelancerId;
  const isCompleted = contract.status === 'completed';

  const statusColors = {
    pending: { bg: 'rgba(245, 158, 11, 0.12)', border: 'rgba(245, 158, 11, 0.3)', color: '#fbbf24', label: 'Pending' },
    in_progress: { bg: 'rgba(59, 130, 246, 0.12)', border: 'rgba(59, 130, 246, 0.3)', color: '#60a5fa', label: 'In Progress' },
    submitted: { bg: 'rgba(249, 115, 22, 0.12)', border: 'rgba(249, 115, 22, 0.3)', color: '#fb923c', label: 'Under Review' },
    approved: { bg: 'rgba(16, 185, 129, 0.12)', border: 'rgba(16, 185, 129, 0.3)', color: 'var(--color-accent)', label: 'Approved ✓' },
    revision_requested: { bg: 'rgba(239, 68, 68, 0.12)', border: 'rgba(239, 68, 68, 0.3)', color: '#f87171', label: 'Revision Requested' },
  };

  return (
    <div style={{ background: 'var(--color-bg-dark)', color: 'var(--color-text-main)', minHeight: '100vh', padding: '36px 0 80px' }}>
      <div className="container" style={{ maxWidth: '1120px', margin: '0 auto', padding: '0 20px' }}>

        {/* TOP BREADCRUMB */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
          <button
            onClick={() => navigate(isBuyer ? '/buyer?tab=projects' : '/seller?tab=proposals')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', fontSize: '0.9rem' }}
          >
            <ArrowLeft size={16} />
            <span>Back to Dashboard</span>
          </button>

          {contract.projectId && (
            <Link
              to={`/projects/${contract.projectId}`}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--color-accent)', fontSize: '0.85rem', textDecoration: 'none' }}
            >
              <span>View Original Project Brief</span>
              <ExternalLink size={14} />
            </Link>
          )}
        </div>

        {/* ACTION FEEDBACK TOAST */}
        {actionFeedback && (
          <div
            style={{
              padding: '12px 18px',
              borderRadius: '12px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: actionFeedback.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : actionFeedback.type === 'info' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(239, 68, 68, 0.15)',
              border: `1px solid ${actionFeedback.type === 'success' ? 'var(--color-accent)' : actionFeedback.type === 'info' ? '#60a5fa' : '#ef4444'}`,
              color: '#fff',
              fontSize: '0.9rem',
            }}
          >
            <span>{actionFeedback.text}</span>
            <button onClick={() => setActionFeedback(null)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>
              <X size={16} />
            </button>
          </div>
        )}

        {contract?.status === 'completed' && reviewEligibility === null && <p>Checking review eligibility…</p>}
        {contract?.status === 'completed' && reviewEligibility?.eligible && (
          <ReviewForm contractId={contractId} onComplete={() => { setReviewEligibility({ ...reviewEligibility, eligible: false, already_reviewed: true }); setActionFeedback({ type: 'success', text: 'Review submitted. Thank you for sharing your experience.' }); }} />
        )}
        {contract?.status === 'completed' && reviewEligibility?.already_reviewed && <p style={{color:'var(--color-accent)',fontWeight:700}}>Review submitted</p>}
        <ActivityTimeline contractId={contractId} />

        {/* CONTRACT HEADER CARD */}
        <div
          style={{
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '20px',
            padding: '32px',
            marginBottom: '24px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-accent)', letterSpacing: '0.06em' }}>
                  Contract Workspace
                </span>
                <span
                  style={{
                    padding: '3px 10px',
                    borderRadius: '999px',
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    background: isCompleted ? 'rgba(16, 185, 129, 0.2)' : 'rgba(59, 130, 246, 0.2)',
                    border: `1px solid ${isCompleted ? 'var(--color-accent)' : '#60a5fa'}`,
                    color: isCompleted ? 'var(--color-accent)' : '#93c5fd',
                  }}
                >
                  {contract.status}
                </span>
              </div>
              <h1 style={{ fontSize: 'clamp(1.6rem, 2.5vw, 2.1rem)', fontWeight: 800, color: '#fff', margin: '0 0 8px', lineHeight: 1.3 }}>
                {contract.title}
              </h1>
              <div style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
                Contract ID: <code>{contract.id}</code>
              </div>
            </div>

            {/* Agreed Budget & Completion */}
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--color-accent)' }}>
                ${contract.agreedBudget?.toLocaleString()} {contract.currency}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                Agreed Project Budget
              </div>
            </div>
          </div>

          {/* PARTIES CARDS */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '28px' }}>
            {/* Buyer */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 18px', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.06)', borderRadius: '12px' }}>
              <Avatar src={contract.buyer?.avatar} name={contract.buyer?.name || 'Buyer'} size={42} />
              <div>
                <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Client / Buyer</div>
                <div style={{ fontWeight: 700, color: '#fff', fontSize: '0.95rem' }}>{contract.buyer?.name || 'Client'}</div>
                {contract.buyer?.rating > 0 && (
                  <div style={{ fontSize: '0.75rem', color: '#f59e0b' }}>★ {contract.buyer.rating.toFixed(1)}</div>
                )}
              </div>
            </div>

            {/* Freelancer */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 18px', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.06)', borderRadius: '12px' }}>
              <Avatar src={contract.freelancer?.avatar} name={contract.freelancer?.name || 'Freelancer'} size={42} />
              <div>
                <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Hired Talent</div>
                <div style={{ fontWeight: 700, color: '#fff', fontSize: '0.95rem' }}>{contract.freelancer?.name || 'Freelancer'}</div>
                {contract.freelancer?.rating > 0 && (
                  <div style={{ fontSize: '0.75rem', color: '#f59e0b' }}>★ {contract.freelancer.rating.toFixed(1)}</div>
                )}
              </div>
            </div>
          </div>

          {/* OVERALL PROGRESS BAR */}
          <div style={{ padding: '20px', background: 'rgba(0, 0, 0, 0.25)', borderRadius: '14px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '0.92rem', color: '#fff' }}>
                <Sparkles size={16} color="var(--color-accent)" />
                <span>Contract Deliverables Progress</span>
              </div>
              <div style={{ fontWeight: 800, color: 'var(--color-accent)', fontSize: '1.05rem' }}>
                {progress?.progressPercentage || 0}%
              </div>
            </div>

            <div style={{ height: '10px', width: '100%', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '999px', overflow: 'hidden', marginBottom: '10px' }}>
              <div
                style={{
                  height: '100%',
                  width: `${progress?.progressPercentage || 0}%`,
                  background: 'linear-gradient(90deg, #10b981 0%, #34d399 100%)',
                  borderRadius: '999px',
                  transition: 'width 0.4s ease',
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--color-text-muted)', flexWrap: 'wrap', gap: '8px' }}>
              <span>
                <strong>{progress?.approvedMilestones || 0}</strong> of <strong>{progress?.totalMilestones || 0}</strong> milestones approved
              </span>
              <span>
                Approved: <strong>${progress?.approvedAmount || 0}</strong> / ${progress?.totalAmount || contract.agreedBudget}
              </span>
            </div>
          </div>
        </div>

        {/* MILESTONES SECTION */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '14px' }}>
          <div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff', margin: 0 }}>
              Milestones & Scope Deliverables
            </h2>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', margin: '4px 0 0' }}>
              Incremental delivery checkpoints. Funds move toward completion with every approved milestone.
            </p>
          </div>

          {!isCompleted && (
            <Button
              variant="outline"
              onClick={() => setShowAddMilestoneModal(true)}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <PlusCircle size={15} />
              <span>Add Milestone</span>
            </Button>
          )}
        </div>

        {/* MILESTONES LIST */}
        {milestones.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', background: 'rgba(15, 23, 42, 0.4)', borderRadius: '16px', border: '1px dashed rgba(255, 255, 255, 0.1)' }}>
            <Layers size={36} color="var(--color-text-muted)" style={{ margin: '0 auto 16px' }} />
            <h3 style={{ color: '#fff', marginBottom: '8px' }}>No milestones created yet</h3>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.88rem', maxWidth: '420px', margin: '0 auto 20px' }}>
              Structure this project into clear milestone deliverables with due dates and amounts.
            </p>
            <Button variant="primary" onClick={() => setShowAddMilestoneModal(true)}>
              Create First Milestone
            </Button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {milestones.map((m) => {
              const sc = statusColors[m.status] || statusColors.pending;
              const hasSubmissions = m.submissions && m.submissions.length > 0;
              const isExpanded = expandedSubmissions[m.id];

              return (
                <div
                  key={m.id}
                  style={{
                    background: 'rgba(15, 23, 42, 0.55)',
                    backdropFilter: 'blur(12px)',
                    border: m.status === 'approved' ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '16px',
                    padding: '24px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                      <div
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '10px',
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 800,
                          fontSize: '0.88rem',
                          color: 'var(--color-accent)',
                          flexShrink: 0,
                        }}
                      >
                        {String(m.sequenceNumber).padStart(2, '0')}
                      </div>

                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#fff', margin: 0 }}>
                            {m.title}
                          </h3>
                          <span
                            style={{
                              padding: '2px 8px',
                              borderRadius: '999px',
                              background: sc.bg,
                              border: `1px solid ${sc.border}`,
                              color: sc.color,
                              fontSize: '0.72rem',
                              fontWeight: 700,
                            }}
                          >
                            {sc.label}
                          </span>
                        </div>
                        {m.description && (
                          <p style={{ color: 'var(--color-text-light)', fontSize: '0.88rem', margin: 0, lineHeight: 1.5 }}>
                            {m.description}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Amount & Due Date */}
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--color-accent)' }}>
                        ${m.amount}
                      </div>
                      {m.dueDate && (
                        <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end', marginTop: '2px' }}>
                          <Clock size={12} />
                          <span>Due: {new Date(m.dueDate).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {payments[m.id] && (
                    <div style={{ margin: '14px 0', padding: '12px', borderRadius: '10px', background: 'var(--color-surface-alt, rgba(255,255,255,0.04))', color: 'var(--color-text-light)', fontSize: '0.82rem' }}>
                      <strong>Payment: {payments[m.id].status}</strong>{' · '}Gross ₹{(payments[m.id].amountMinor / 100).toFixed(2)}{' · '}Fee ₹{(payments[m.id].platformFeeMinor / 100).toFixed(2)}{' · '}Freelancer receives ₹{(payments[m.id].freelancerAmountMinor / 100).toFixed(2)}
                    </div>
                  )}

                  {/* ACTION TRIGGER BAR */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '12px',
                      paddingTop: '16px',
                      borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                    }}
                  >
                    {/* Submissions toggle button */}
                    {hasSubmissions ? (
                      <button
                        onClick={() => toggleSubmissions(m.id)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--color-text-muted)',
                          fontSize: '0.82rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <span>{m.submissions.length} Submission(s)</span>
                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>
                    ) : (
                      <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>No submissions yet</span>
                    )}

                    {/* Contextual Action Buttons */}
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {/* FREELANCER ACTIONS */}
                      {isFreelancer && (
                        <>
                          {(m.status === 'pending' || m.status === 'revision_requested') && (
                            <Button
                              variant="primary"
                              size="sm"
                              disabled={actionLoading}
                              onClick={() => handleStartMilestone(m.id)}
                            >
                              {m.status === 'revision_requested' ? 'Revise & Start Work' : 'Start Milestone'}
                            </Button>
                          )}

                          {m.status === 'in_progress' && (
                            <Button
                              variant="primary"
                              size="sm"
                              disabled={actionLoading}
                              onClick={() => {
                                setSubmittingWorkForMilestone(m);
                                setSubmissionForm({ message: '', attachmentUrl: '' });
                              }}
                              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                            >
                              <Send size={13} />
                              <span>Submit Work</span>
                            </Button>
                          )}

                          {m.status === 'submitted' && (
                            <span style={{ fontSize: '0.82rem', color: '#fb923c', padding: '4px 10px', background: 'rgba(249, 115, 22, 0.1)', borderRadius: '6px' }}>
                              Awaiting Client Review
                            </span>
                          )}
                        </>
                      )}

                      {/* BUYER ACTIONS */}
                      {isBuyer && (
                        <>
                          {m.status === 'pending' && !payments[m.id] && (
                            <Button variant="outline" size="sm" disabled={actionLoading} onClick={() => handleFundMilestone(m.id)}>Fund Milestone</Button>
                          )}
                          {m.status === 'submitted' && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={actionLoading}
                                onClick={() => {
                                  setReviewingMilestone(m);
                                  setRevisionMessage('');
                                }}
                                style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#f87171' }}
                              >
                                <RotateCcw size={13} />
                                <span>Request Revision</span>
                              </Button>

                              <Button
                                variant="primary"
                                size="sm"
                                disabled={actionLoading}
                                onClick={() => handleApproveMilestone(m.id)}
                                style={{ display: 'flex', alignItems: 'center', gap: '5px' }}
                              >
                                <Check size={13} />
                                <span>Approve Milestone</span>
                              </Button>
                            </>
                          )}
                          {m.status === 'approved' && payments[m.id]?.status === 'held' && (
                            <Button variant="primary" size="sm" disabled={actionLoading} onClick={() => handleReleasePayment(payments[m.id].id)}>Release Payment</Button>
                          )}

                          {m.status === 'in_progress' && (
                            <span style={{ fontSize: '0.82rem', color: '#60a5fa', padding: '4px 10px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '6px' }}>
                              Freelancer Working
                            </span>
                          )}
                        </>
                      )}

                      {m.status === 'approved' && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--color-accent)', fontSize: '0.85rem', fontWeight: 700 }}>
                          <CheckCircle2 size={16} />
                          <span>Approved & Released</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* EXPANDED SUBMISSION HISTORY AUDIT DRAWER */}
                  {isExpanded && hasSubmissions && (
                    <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px dashed rgba(255, 255, 255, 0.08)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
                        Submission & Review History
                      </div>

                      {m.submissions.map((sub) => (
                        <div
                          key={sub.id}
                          style={{
                            padding: '12px 14px',
                            background: 'rgba(0, 0, 0, 0.25)',
                            borderRadius: '10px',
                            border: '1px solid rgba(255, 255, 255, 0.05)',
                            fontSize: '0.85rem',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                            <span style={{ fontWeight: 700, color: '#fff' }}>
                              {sub.submitter?.name || 'Freelancer'}
                            </span>
                            <span style={{ color: 'var(--color-text-muted)', fontSize: '0.78rem' }}>
                              {new Date(sub.createdAt).toLocaleString()}
                            </span>
                          </div>

                          <div style={{ color: 'var(--color-text-light)', lineHeight: 1.5, marginBottom: sub.attachmentUrl || sub.reviewMessage ? '8px' : 0 }}>
                            {sub.message}
                          </div>

                          {sub.attachmentUrl && (
                            <div style={{ marginBottom: '6px' }}>
                              <a
                                href={sub.attachmentUrl}
                                target="_blank"
                                rel="noreferrer"
                                style={{ color: 'var(--color-accent)', fontSize: '0.8rem', textDecoration: 'underline' }}
                              >
                                View Deliverable Work ({sub.attachmentUrl})
                              </a>
                            </div>
                          )}

                          {sub.reviewMessage && (
                            <div style={{ padding: '8px 10px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '6px', marginTop: '6px', borderLeft: '3px solid var(--color-accent)' }}>
                              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-accent)' }}>
                                Client Feedback ({sub.status}):
                              </div>
                              <div style={{ fontSize: '0.82rem', color: 'var(--color-text-light)' }}>
                                {sub.reviewMessage}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

      </div>

      {/* MODAL: ADD MILESTONE */}
      {showAddMilestoneModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(9, 13, 22, 0.85)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: 'rgba(15, 23, 42, 0.98)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '20px', padding: '28px', maxWidth: '520px', width: '100%', color: '#fff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>Add Milestone Deliverable</h3>
              <button onClick={() => setShowAddMilestoneModal(false)} style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', fontSize: '1.4rem', cursor: 'pointer' }}>×</button>
            </div>

            <form onSubmit={handleCreateMilestone}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '6px' }}>Milestone Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Database Schema & Architecture Specs"
                  value={milestoneForm.title}
                  onChange={(e) => setMilestoneForm({ ...milestoneForm, title: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', color: '#fff', fontSize: '0.9rem' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '6px' }}>Amount ($ USD) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="e.g. 500"
                    value={milestoneForm.amount}
                    onChange={(e) => setMilestoneForm({ ...milestoneForm, amount: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', color: '#fff', fontSize: '0.9rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '6px' }}>Target Due Date</label>
                  <input
                    type="date"
                    value={milestoneForm.dueDate}
                    onChange={(e) => setMilestoneForm({ ...milestoneForm, dueDate: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', color: '#fff', fontSize: '0.9rem' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '6px' }}>Scope & Deliverables</label>
                <textarea
                  rows={3}
                  placeholder="Specific outputs expected for this milestone..."
                  value={milestoneForm.description}
                  onChange={(e) => setMilestoneForm({ ...milestoneForm, description: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', color: '#fff', fontSize: '0.88rem' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <Button type="submit" variant="primary" fullWidth disabled={actionLoading}>
                  {actionLoading ? 'Creating...' : 'Save Milestone'}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowAddMilestoneModal(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: SUBMIT MILESTONE WORK (FREELANCER) */}
      {submittingWorkForMilestone && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(9, 13, 22, 0.85)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: 'rgba(15, 23, 42, 0.98)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '20px', padding: '28px', maxWidth: '520px', width: '100%', color: '#fff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>
                Submit Work: {submittingWorkForMilestone.title}
              </h3>
              <button onClick={() => setSubmittingWorkForMilestone(null)} style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', fontSize: '1.4rem', cursor: 'pointer' }}>×</button>
            </div>

            <form onSubmit={handleSubmitWork}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '6px' }}>
                  Delivery Notes & Summary *
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Detail the completed deliverables, key accomplishments, testing results, or deployment notes..."
                  value={submissionForm.message}
                  onChange={(e) => setSubmissionForm({ ...submissionForm, message: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', color: '#fff', fontSize: '0.88rem' }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '6px' }}>
                  Attachment or Repository Link (Optional)
                </label>
                <input
                  type="url"
                  placeholder="https://github.com/... or https://figma.com/..."
                  value={submissionForm.attachmentUrl}
                  onChange={(e) => setSubmissionForm({ ...submissionForm, attachmentUrl: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', color: '#fff', fontSize: '0.88rem' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <Button type="submit" variant="primary" fullWidth disabled={actionLoading}>
                  {actionLoading ? 'Submitting...' : 'Send for Client Review'}
                </Button>
                <Button type="button" variant="outline" onClick={() => setSubmittingWorkForMilestone(null)}>
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: REQUEST REVISION (BUYER) */}
      {reviewingMilestone && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(9, 13, 22, 0.85)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: 'rgba(15, 23, 42, 0.98)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '20px', padding: '28px', maxWidth: '500px', width: '100%', color: '#fff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>
                Request Revision
              </h3>
              <button onClick={() => setReviewingMilestone(null)} style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', fontSize: '1.4rem', cursor: 'pointer' }}>×</button>
            </div>

            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginBottom: '16px' }}>
              For milestone: <strong>{reviewingMilestone.title}</strong>
            </p>

            <form onSubmit={handleRequestRevision}>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '6px' }}>
                  What changes are needed? *
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Explain clearly what needs to be adjusted, corrected, or refined..."
                  value={revisionMessage}
                  onChange={(e) => setRevisionMessage(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', color: '#fff', fontSize: '0.88rem' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <Button type="submit" variant="primary" fullWidth disabled={actionLoading} style={{ background: '#ef4444', borderColor: '#ef4444' }}>
                  {actionLoading ? 'Sending...' : 'Send Revision Request'}
                </Button>
                <Button type="button" variant="outline" onClick={() => setReviewingMilestone(null)}>
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
