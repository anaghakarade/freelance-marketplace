import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { authService } from '../../services/authService';
import { orderService } from '../../services/orderService';
import { projectApi } from '../../services/api/projectApi';
import { contractApi } from '../../services/api/contractApi';
import Avatar from '../../components/ui/Avatar';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import DashboardSidebar from '../../components/dashboard/DashboardSidebar';
import { LayoutDashboard, FileText, Mail, ShoppingCart, CheckCircle, Clock, ChevronDown, ChevronUp, Sparkles, HeartHandshake, ShieldCheck, PlusCircle, Briefcase, ThumbsUp, X, Check, ExternalLink, Layers, Users, Trash2 } from 'lucide-react';

const ORDER_STEPS = [
  { status: 'pending', label: 'Order Placed' },
  { status: 'requirements_submitted', label: 'Brief Submitted' },
  { status: 'active', label: 'In Progress' },
  { status: 'delivered', label: 'Delivered' },
  { status: 'completed', label: 'Completed' },
];

const STATUS_ORDER = ['pending', 'requirements_submitted', 'active', 'delivered', 'completed'];

const OrderStatusTimeline = ({ order }) => {
  const currentIdx = STATUS_ORDER.indexOf(order.status);
  return (
    <div style={{ display: 'flex', gap: 0, overflowX: 'auto', paddingBottom: 4 }}>
      {ORDER_STEPS.map((step, i) => {
        const done = i < currentIdx;
        const active = i === currentIdx;
        const cancelled = order.status === 'cancelled';
        return (
          <div key={step.status} style={{ flex: 1, minWidth: 80, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
            {i > 0 && (
              <div style={{ position: 'absolute', left: 0, top: 13, width: '50%', height: 2, background: done || active ? 'var(--color-accent)' : 'rgba(255,255,255,0.08)' }} />
            )}
            {i < ORDER_STEPS.length - 1 && (
              <div style={{ position: 'absolute', right: 0, top: 13, width: '50%', height: 2, background: done ? 'var(--color-accent)' : 'rgba(255,255,255,0.08)' }} />
            )}
            <div style={{ width: 26, height: 26, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: cancelled ? 'rgba(239,68,68,0.15)' : done ? 'var(--color-accent)' : active ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.06)', border: `2px solid ${cancelled ? 'rgba(239,68,68,0.4)' : done ? 'var(--color-accent)' : active ? 'var(--color-accent)' : 'rgba(255,255,255,0.1)'}`, zIndex: 1, flexShrink: 0, marginBottom: 6 }}>
              {done ? <CheckCircle size={12} color='#fff' fill='var(--color-accent)' /> : <div style={{ width: 6, height: 6, borderRadius: '50%', background: active && !cancelled ? 'var(--color-accent)' : 'rgba(255,255,255,0.2)' }} />}
            </div>
            <div style={{ fontSize: '0.68rem', fontWeight: 700, color: active && !cancelled ? 'var(--color-accent)' : done ? 'var(--color-text-main)' : 'var(--color-text-light)', whiteSpace: 'nowrap' }}>
              {step.label}
            </div>
          </div>
        );
      })}
    </div>
  );
};

const HARSH_TERMS = ['terrible', 'horrible', 'useless', 'garbage', 'fix this right now', 'stupid', 'worst', 'unacceptable'];

export default function BuyerDashboard() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'dashboard';
  const urlOrderId = searchParams.get('orderId');
  const urlStep = searchParams.get('step');

  const [currentUser, setCurrentUser] = useState(authService.getCurrentUser());

  useEffect(() => {
    const handleAuth = () => setCurrentUser(authService.getCurrentUser());
    window.addEventListener('authChange', handleAuth);
    return () => window.removeEventListener('authChange', handleAuth);
  }, []);
  const [orders, setOrders] = useState([]);
  const [selectedOrderForRequirements, setSelectedOrderForRequirements] = useState(null);
  const [requirementsData, setRequirementsData] = useState({});
  const [selectedOrderChat, setSelectedOrderChat] = useState(null);
  const [chatMessage, setChatMessage] = useState('');
  const [speechSuggestion, setSpeechSuggestion] = useState(null);
  const [expandedOrderId, setExpandedOrderId] = useState(null);

  // Dana / Give Back State
  const [giveBackModalOrder, setGiveBackModalOrder] = useState(null);
  const [giveBackPercent, setGiveBackPercent] = useState('1');

  // Buyer Projects & Proposals State (Phase 5)
  const [myProjects, setMyProjects] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [selectedProjectForProposals, setSelectedProjectForProposals] = useState(null);
  const [projectProposals, setProjectProposals] = useState([]);
  const [loadingProposals, setLoadingProposals] = useState(false);
  const [decisionFeedback, setDecisionFeedback] = useState(null);
  const [projectFeedback, setProjectFeedback] = useState(null);

  const handleDeleteProject = async (projectId, projectTitle) => {
    if (!window.confirm(`Are you sure you want to delete "${projectTitle}"? This will permanently remove the project from the marketplace.`)) {
      return;
    }
    try {
      await projectApi.deleteProject(projectId);
      setProjectFeedback({ type: 'success', text: `Project "${projectTitle}" was successfully deleted.` });
      fetchMyProjects();
    } catch (err) {
      setProjectFeedback({ type: 'error', text: err.message || 'Failed to delete project.' });
    }
  };

  // Contracts State (Phase 6A)
  const [myContracts, setMyContracts] = useState([]);
  const [loadingContracts, setLoadingContracts] = useState(false);

  const fetchMyContracts = async () => {
    setLoadingContracts(true);
    try {
      const contracts = await contractApi.getMyContracts();
      setMyContracts(contracts || []);
    } catch (err) {
      console.error('[BuyerDashboard] Failed to load contracts:', err);
    } finally {
      setLoadingContracts(false);
    }
  };

  const fetchMyProjects = async () => {
    setLoadingProjects(true);
    try {
      const projs = await projectApi.getMyProjects();
      setMyProjects(projs || []);
      if (projs && projs.length > 0) {
        try {
          localStorage.setItem('workstream_cached_my_projects', JSON.stringify(projs));
        } catch {
          // ignore
        }
      }
    } catch (err) {
      console.error('[BuyerDashboard] Failed to load projects:', err);
    } finally {
      setLoadingProjects(false);
    }
  };

  const handleOpenProposals = async (proj) => {
    setSelectedProjectForProposals(proj);
    setLoadingProposals(true);
    setDecisionFeedback(null);
    try {
      const props = await projectApi.getProjectProposals(proj.id);
      setProjectProposals(props || []);
    } catch (err) {
      console.error('[BuyerDashboard] Failed to load proposals:', err);
      setProjectProposals([]);
    } finally {
      setLoadingProposals(false);
    }
  };

  const handleProposalDecision = async (proposalId, action) => {
    try {
      if (action === 'shortlist') {
        await projectApi.shortlistProposal(proposalId);
        setDecisionFeedback({ type: 'success', text: 'Proposal marked as shortlisted.' });
      } else if (action === 'reject') {
        await projectApi.rejectProposal(proposalId);
        setDecisionFeedback({ type: 'info', text: 'Proposal rejected.' });
      } else if (action === 'accept') {
        const result = await projectApi.acceptProposal(proposalId);
        const contractId = result?.data?.contractId || result?.contractId;
        if (contractId) {
          setDecisionFeedback({ type: 'success', text: `Proposal accepted! Contract created. Opening workspace...` });
          fetchMyProjects();
          fetchMyContracts();
          setTimeout(() => navigate(`/contracts/${contractId}`), 800);
        } else {
          setDecisionFeedback({ type: 'success', text: 'Proposal accepted! Project is now in progress.' });
          fetchMyProjects();
          fetchMyContracts();
        }
      }

      // Refresh proposal list
      if (selectedProjectForProposals) {
        const updated = await projectApi.getProjectProposals(selectedProjectForProposals.id);
        setProjectProposals(updated || []);
      }
    } catch (err) {
      setDecisionFeedback({ type: 'error', text: err.message || 'Action failed.' });
    }
  };

  useEffect(() => {
    if (!currentUser || currentUser.role !== 'buyer') { navigate('/login'); return; }
    const ordList = orderService.getOrdersForUser(currentUser.id, 'buyer');
    setOrders(ordList);
    fetchMyProjects();
    fetchMyContracts();

    if (urlOrderId) {
      const order = orderService.getOrderById(urlOrderId);
      if (order && urlStep === 'requirements') {
        setSelectedOrderForRequirements(order);
        handleTabChange('requirements');
      }
    }
  }, [currentUser, activeTab, urlOrderId, urlStep]);

  const handleTabChange = (t) => setSearchParams({ tab: t });

  const handleRequirementsSubmit = (e) => {
    e.preventDefault();
    try {
      const schema = selectedOrderForRequirements.requirementsSchema || [];
      const missing = schema.filter(q => q.required && !requirementsData[q.id]?.trim());
      if (missing.length > 0) { alert(`Please answer: ${missing[0].question}`); return; }
      orderService.submitRequirements(selectedOrderForRequirements.id, requirementsData);
      setSelectedOrderForRequirements(null);
      setRequirementsData({});
      handleTabChange('orders');
    } catch (err) { alert(err.message); }
  };

  const updateReqField = (qId, val) => setRequirementsData(prev => ({ ...prev, [qId]: val }));

  const handleCompleteOrderPrompt = (order) => {
    setGiveBackModalOrder(order);
  };

  const confirmCompleteWithGiveBack = () => {
    if (giveBackModalOrder) {
      orderService.completeOrder(giveBackModalOrder.id);
      setOrders(orderService.getOrdersForUser(currentUser.id, 'buyer'));
      setGiveBackModalOrder(null);
    }
  };

  const handleChatMessageChange = (val) => {
    setChatMessage(val);
    const lower = val.toLowerCase();
    const hasHarsh = HARSH_TERMS.some(term => lower.includes(term));
    if (hasHarsh) {
      setSpeechSuggestion('Constructive Suggestion: "The current version doesn\'t match our discussed requirements. Could we adjust the design and typography?"');
    } else {
      setSpeechSuggestion(null);
    }
  };

  const applySpeechSuggestion = () => {
    if (speechSuggestion) {
      setChatMessage("The current version doesn't match our discussed requirements. Could we adjust the design and typography?");
      setSpeechSuggestion(null);
    }
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!chatMessage.trim()) return;
    orderService.sendMessage(selectedOrderChat.id, chatMessage);
    setChatMessage('');
    setSpeechSuggestion(null);
    setSelectedOrderChat(orderService.getOrderById(selectedOrderChat.id));
  };

  const activeOrdersCount = orders.filter(o => ['active', 'requirements_submitted', 'delivered', 'pending'].includes(o.status)).length;
  const activeContractsCount = myContracts.filter(c => c.status === 'active' || c.status === 'in_progress').length;

  const sidebarSections = [
    {
      items: [
        { id: 'dashboard', icon: LayoutDashboard, label: 'Overview' },
        { id: 'projects', icon: Briefcase, label: 'My Projects', badge: myProjects.length > 0 ? myProjects.length : undefined },
        { id: 'contracts', icon: Layers, label: 'Contracts', badge: activeContractsCount || (myContracts.length > 0 ? myContracts.length : undefined) },
        { id: 'orders', icon: FileText, label: 'My Orders', badge: activeOrdersCount > 0 ? activeOrdersCount : undefined, badgeType: 'accent' },
        { id: 'messages', icon: Mail, label: 'Messages' },
      ]
    },
    {
      items: [
        {
          id: 'post-project-action',
          icon: PlusCircle,
          label: '+ Post Outcome Goal',
          isAction: true,
          onClick: () => navigate('/post-project')
        }
      ]
    }
  ];

  return (
    <div className="dashboard-container">

      {/* DANA / GIVE BACK MODAL */}
      {giveBackModalOrder && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(9, 13, 22, 0.85)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: 'rgba(15, 23, 42, 0.95)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '20px', padding: '32px', maxWidth: '500px', width: '100%', color: '#fff' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-accent)', fontWeight: 700, fontSize: '0.9rem', marginBottom: '12px' }}>
              <HeartHandshake size={20} />
              <span>GIVE BACK — Optional Social Initiative</span>
            </div>

            <h3 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '8px' }}>
              Approve Order & Support Social Impact
            </h3>

            <p style={{ color: 'var(--color-text-light)', fontSize: '0.92rem', lineHeight: 1.5, marginBottom: '20px' }}>
              You are completing order <strong>{giveBackModalOrder.serviceTitle}</strong> (${giveBackModalOrder.price}). You may optionally allocate a portion toward verified social & education initiatives.
            </p>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '10px' }}>
                Optional Contribution Percentage
              </label>
              <div style={{ display: 'flex', gap: '10px' }}>
                {['0', '1', '5', '10'].map(pct => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => setGiveBackPercent(pct)}
                    style={{
                      flex: 1,
                      padding: '10px',
                      borderRadius: '8px',
                      background: giveBackPercent === pct ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255,255,255,0.05)',
                      border: giveBackPercent === pct ? '1px solid var(--color-accent)' : '1px solid rgba(255,255,255,0.1)',
                      color: giveBackPercent === pct ? 'var(--color-accent)' : '#fff',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    {pct}% {pct === '0' ? '(None)' : ''}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <Button variant="primary" fullWidth onClick={confirmCompleteWithGiveBack}>
                Approve Delivery & Release Funds
              </Button>
              <Button variant="outline" onClick={() => setGiveBackModalOrder(null)}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* DASHBOARD SIDEBAR */}
      <DashboardSidebar
        user={currentUser}
        role="buyer"
        roleBadge={currentUser?.accountType === 'corporate' ? 'Corporate Buyer' : 'Verified Buyer'}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        sections={sidebarSections}
        footerWidget={
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '2px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
              <span className="sidebar-live-dot" />
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#38bdf8' }}>Verified Buyer</span>
            </div>
            <span style={{ fontSize: '0.74rem', color: 'var(--sidebar-text-sub)' }}>
              {orders.length} orders
            </span>
          </div>
        }
        extraBottomActions={[
          {
            icon: ShoppingCart,
            label: 'Marketplace',
            onClick: () => navigate('/marketplace')
          }
        ]}
      />

      <main className="dashboard-content">

        {/* ======== OVERVIEW ======== */}
        {activeTab === 'dashboard' && (
          <div>
            <h2 style={{ marginBottom: 'var(--space-xs)' }}>Buyer Dashboard</h2>
            <p style={{ marginBottom: 'var(--space-xl)', color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>
              Welcome back, {currentUser.name.split(' ')[0]}
            </p>
            <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', marginBottom: '32px' }}>
              {[
                { label: 'Posted Projects', value: myProjects.length, onClick: () => handleTabChange('projects') },
                { label: 'Active Contracts', value: activeContractsCount, onClick: () => handleTabChange('contracts') },
                { label: 'Active Orders', value: orders.filter(o => ['active', 'requirements_submitted', 'delivered'].includes(o.status)).length, onClick: () => handleTabChange('orders') },
                { label: 'Completed Gigs', value: orders.filter(o => o.status === 'completed').length, onClick: () => handleTabChange('orders') },
              ].map(({ label, value, onClick }) => (
                <div key={label} className="stat-card" onClick={onClick} style={{ cursor: 'pointer' }}>
                  <div className="stat-label">{label}</div>
                  <div className="stat-value">{value}</div>
                </div>
              ))}
            </div>

            {/* Recent Posted Projects (Overview) */}
            {myProjects.length > 0 && (
              <div style={{ marginBottom: '32px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)' }}>
                  <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Briefcase size={18} color="var(--color-accent)" />
                    <span>Recent Posted Projects</span>
                  </h3>
                  <Button variant="ghost" size="sm" onClick={() => handleTabChange('projects')}>
                    View All Projects ({myProjects.length}) →
                  </Button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {myProjects.slice(0, 3).map((p) => {
                    const isFixed = (p.budgetType || p.budget_type) === 'fixed';
                    const fixedVal = p.fixedBudget ?? p.fixed_budget ?? p.budget;
                    const minVal = p.budgetMin ?? p.budget_min;
                    const maxVal = p.budgetMax ?? p.budget_max;
                    const budgetStr = isFixed
                      ? fixedVal ? `$${fixedVal}` : minVal && maxVal ? `$${minVal}–$${maxVal}` : 'Fixed'
                      : `$${minVal || 0}–$${maxVal || 0}/hr`;
                    return (
                      <div
                        key={p.id}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '16px 20px',
                          background: 'rgba(15, 23, 42, 0.45)',
                          border: '1px solid rgba(255,255,255,0.06)',
                          borderRadius: '12px',
                          flexWrap: 'wrap',
                          gap: '12px',
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 700, color: '#fff', fontSize: '1rem', marginBottom: '4px' }}>
                            {p.title}
                          </div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                            {p.categoryName || p.category_name || 'Project'} • {p.proposalCount ?? p.proposal_count ?? 0} proposals • Status: <span style={{ color: 'var(--color-accent)', textTransform: 'capitalize' }}>{p.status || 'open'}</span>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span style={{ fontWeight: 700, color: 'var(--color-accent)' }}>
                            {budgetStr}
                          </span>
                          <Button variant="outline" size="sm" onClick={() => handleTabChange('projects')}>
                            Manage
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <h3 style={{ marginBottom: 'var(--space-md)' }}>Recent Orders</h3>
            {orders.length > 0 ? (
              <div className="data-table-wrapper">
                <table className="data-table">
                  <thead><tr><th>Service</th><th>Freelancer</th><th>Cost</th><th>Status</th><th>Due</th></tr></thead>
                  <tbody>
                    {orders.slice(0, 5).map(o => (
                      <tr key={o.id}>
                        <td><strong>{o.serviceTitle}</strong></td>
                        <td>{o.sellerName}</td>
                        <td style={{ color: 'var(--color-accent)', fontWeight: 'var(--weight-semibold)' }}>${o.price}</td>
                        <td><Badge variant={o.status === 'completed' ? 'success' : o.status === 'active' ? 'info' : o.status === 'delivered' ? 'success' : 'warning'}>{o.status.toUpperCase()}</Badge></td>
                        <td>{o.dueDate || 'Awaiting Brief'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: 'var(--space-2xl)', border: '1px dashed rgba(255,255,255,0.08)', borderRadius: 'var(--radius-lg)', color: 'var(--color-text-light)' }}>
                <p style={{ marginBottom: 'var(--space-md)' }}>You haven't placed any orders yet.</p>
                <Button variant="primary" onClick={() => navigate('/marketplace')}>Browse Services</Button>
              </div>
            )}
          </div>
        )}

        {/* ======== MY PROJECTS (PHASE 5) ======== */}
        {activeTab === 'projects' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg)', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <h2 style={{ margin: 0 }}>My Posted Projects</h2>
                <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)', marginTop: '4px' }}>
                  Manage project briefs, review candidate proposals, and track delivery progress.
                </p>
              </div>
              <Button variant="primary" onClick={() => navigate('/post-project')} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <PlusCircle size={16} />
                <span>Post New Project</span>
              </Button>
            </div>

            {projectFeedback && (
              <div
                style={{
                  marginBottom: '20px',
                  padding: '12px 18px',
                  borderRadius: '10px',
                  fontSize: '0.9rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: projectFeedback.type === 'success' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                  border: `1px solid ${projectFeedback.type === 'success' ? 'var(--color-accent)' : '#ef4444'}`,
                  color: projectFeedback.type === 'success' ? 'var(--color-accent)' : '#fca5a5',
                }}
              >
                <span>{projectFeedback.text}</span>
                <button
                  type="button"
                  onClick={() => setProjectFeedback(null)}
                  style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: 2 }}
                >
                  <X size={15} />
                </button>
              </div>
            )}

            {loadingProjects ? (
              <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--color-text-light)' }}>
                <div className="spinner" style={{ margin: '0 auto 16px' }} />
                <p>Loading your projects...</p>
              </div>
            ) : myProjects.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 'var(--space-2xl)', border: '1px dashed rgba(255,255,255,0.08)', borderRadius: 'var(--radius-lg)', color: 'var(--color-text-light)', background: 'rgba(15,23,42,0.3)' }}>
                <Briefcase size={36} color="var(--color-accent)" style={{ margin: '0 auto 16px' }} />
                <h3 style={{ fontSize: '1.2rem', color: '#fff', marginBottom: '8px' }}>No projects posted yet</h3>
                <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)', maxWidth: '420px', margin: '0 auto 20px' }}>
                  Define your goals, budget, and skills to receive tailored bids from verified top-tier freelancers.
                </p>
                <Button variant="primary" onClick={() => navigate('/post-project')}>
                  Post Your First Project
                </Button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {myProjects.map((p) => {
                  const statusColors = {
                    open: 'var(--color-accent)',
                    in_progress: '#3b82f6',
                    completed: '#a78bfa',
                    cancelled: '#ef4444',
                    closed: 'var(--color-text-muted)',
                  };
                  const color = statusColors[p.status] || 'var(--color-accent)';

                  const isFixed = (p.budgetType || p.budget_type) === 'fixed';
                  const fixedVal = p.fixedBudget ?? p.fixed_budget ?? p.budget;
                  const minVal = p.budgetMin ?? p.budget_min;
                  const maxVal = p.budgetMax ?? p.budget_max;
                  const formattedBudget =
                    isFixed
                      ? fixedVal
                        ? `$${fixedVal}`
                        : minVal && maxVal
                        ? `$${minVal} – $${maxVal}`
                        : `$${minVal || maxVal || 'Negotiable'}`
                      : `$${minVal || 0} – $${maxVal || 0}/hr`;

                  return (
                    <div
                      key={p.id}
                      style={{
                        background: 'rgba(15, 23, 42, 0.55)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: 14,
                        padding: '22px 24px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 14,
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                            <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-accent)' }}>
                              {p.categoryName || 'Project'}
                            </span>
                            <span style={{ padding: '2px 8px', borderRadius: 99, background: `${color}18`, border: `1px solid ${color}40`, fontSize: '0.72rem', fontWeight: 700, color: color, textTransform: 'uppercase' }}>
                              {p.status === 'in_progress' ? 'In Progress' : p.status}
                            </span>
                          </div>
                          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#fff', margin: 0 }}>
                            {p.title}
                          </h3>
                        </div>

                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--color-accent)' }}>
                            {formattedBudget}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'capitalize' }}>
                            {p.budgetType} Budget
                          </div>
                        </div>
                      </div>

                      {/* Skills */}
                      {p.skills && p.skills.length > 0 && (
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {p.skills.map((s, idx) => (
                            <span key={idx} style={{ fontSize: '0.75rem', padding: '3px 8px', background: 'rgba(255,255,255,0.04)', borderRadius: 6, color: 'var(--color-text-light)' }}>
                              {s}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Footer Actions */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                        <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', display: 'flex', gap: 16 }}>
                          <span><strong>{p.proposalCount ?? p.proposal_count ?? 0}</strong> Proposals Received</span>
                          <span>Timeline: <strong>{p.estimatedDuration || p.estimated_duration || 'Flexible'}</strong></span>
                        </div>

                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleOpenProposals(p)}
                            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                          >
                            <Users size={14} />
                            <span>Review Proposals ({p.proposalCount ?? p.proposal_count ?? 0})</span>
                          </Button>
                          <Link
                            to={`/projects/${p.id}`}
                            state={{ project: p }}
                            className="btn btn-outline btn-sm"
                            style={{ display: 'flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}
                          >
                            <Sparkles size={13} style={{ color: 'var(--color-accent)' }} />
                            <span>Matched Talent & Brief</span>
                          </Link>
                          {(p.status === 'open' || p.status === 'closed') && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteProject(p.id, p.title)}
                              style={{ display: 'flex', alignItems: 'center', gap: 6, borderColor: 'rgba(239,68,68,0.35)', color: '#f87171' }}
                            >
                              <Trash2 size={13} />
                              <span>Delete</span>
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* PROPOSALS REVIEW MODAL (BUYER) */}
        {selectedProjectForProposals && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 9999,
              background: 'rgba(9, 13, 22, 0.88)',
              backdropFilter: 'blur(12px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 20,
            }}
          >
            <div
              style={{
                background: 'rgba(15, 23, 42, 0.98)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                borderRadius: 20,
                padding: 28,
                maxWidth: 820,
                width: '100%',
                color: '#fff',
                maxHeight: '90vh',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--color-accent)', fontWeight: 700, fontSize: '0.85rem', marginBottom: 4 }}>
                    <Sparkles size={16} />
                    <span>Candidate Proposals & Match Scoring</span>
                  </div>
                  <h2 style={{ fontSize: '1.35rem', fontWeight: 800, margin: 0 }}>
                    {selectedProjectForProposals.title}
                  </h2>
                </div>
                <button
                  onClick={() => setSelectedProjectForProposals(null)}
                  style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', fontSize: '1.5rem', cursor: 'pointer' }}
                >
                  ×
                </button>
              </div>

              {decisionFeedback && (
                <div
                  style={{
                    padding: '10px 16px',
                    borderRadius: 8,
                    marginBottom: 16,
                    fontSize: '0.88rem',
                    background: decisionFeedback.type === 'success' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                    border: `1px solid ${decisionFeedback.type === 'success' ? 'var(--color-accent)' : '#ef4444'}`,
                    color: decisionFeedback.type === 'success' ? 'var(--color-accent)' : '#fca5a5',
                  }}
                >
                  {decisionFeedback.text}
                </div>
              )}

              {/* Proposals List Scrollable */}
              <div style={{ flex: 1, overflowY: 'auto', paddingRight: 6, display: 'flex', flexDirection: 'column', gap: 14 }}>
                {loadingProposals ? (
                  <div style={{ textAlign: 'center', padding: '40px 0' }}>
                    <div className="spinner" style={{ margin: '0 auto 12px' }} />
                    <p>Evaluating candidate proposals...</p>
                  </div>
                ) : projectProposals.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--color-text-muted)' }}>
                    No proposals submitted yet for this project.
                  </div>
                ) : (
                  projectProposals.map((prop) => {
                    const statusBg = {
                      accepted: 'rgba(16, 185, 129, 0.2)',
                      shortlisted: 'rgba(59, 130, 246, 0.2)',
                      pending: 'rgba(245, 158, 11, 0.2)',
                      rejected: 'rgba(239, 68, 68, 0.2)',
                      withdrawn: 'rgba(255, 255, 255, 0.08)',
                    }[prop.status] || 'rgba(255, 255, 255, 0.08)';

                    const statusColor = {
                      accepted: 'var(--color-accent)',
                      shortlisted: '#60a5fa',
                      pending: '#fbbf24',
                      rejected: '#f87171',
                      withdrawn: 'var(--color-text-muted)',
                    }[prop.status] || '#fff';

                    return (
                      <div
                        key={prop.id}
                        style={{
                          background: 'rgba(255, 255, 255, 0.03)',
                          border: prop.status === 'accepted' ? '2px solid var(--color-accent)' : '1px solid rgba(255, 255, 255, 0.08)',
                          borderRadius: 14,
                          padding: 20,
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 12,
                        }}
                      >
                        {/* Freelancer Profile & Match Score */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <Avatar src={prop.freelancer?.avatar} name={prop.freelancer?.name || 'Freelancer'} size={46} />
                            <div>
                              <div style={{ fontWeight: 700, fontSize: '1rem', color: '#fff' }}>
                                {prop.freelancer?.name || 'Candidate'}
                              </div>
                              <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                                {prop.freelancer?.title || 'Freelancer'} • {prop.freelancer?.location || 'Global'}
                              </div>
                              {prop.freelancer?.rating > 0 && (
                                <div style={{ fontSize: '0.78rem', color: '#f59e0b', marginTop: 2 }}>
                                  ★ {prop.freelancer.rating.toFixed(1)} ({prop.freelancer.reviewsCount} reviews)
                                </div>
                              )}
                            </div>
                          </div>

                          {/* WorkStream Match Score Badge */}
                          <div style={{ textAlign: 'right' }}>
                            {prop.matchScore > 0 && (
                              <div
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 6,
                                  padding: '4px 12px',
                                  borderRadius: 999,
                                  background: 'rgba(16, 185, 129, 0.15)',
                                  border: '1px solid var(--color-accent)',
                                  color: 'var(--color-accent)',
                                  fontSize: '0.82rem',
                                  fontWeight: 800,
                                  marginBottom: 4,
                                }}
                              >
                                <Sparkles size={13} />
                                <span>{prop.matchScore}% Match</span>
                              </div>
                            )}
                            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', maxWidth: 220 }}>
                              {prop.matchRationale}
                            </div>
                          </div>
                        </div>

                        {/* Bid details */}
                        <div style={{ display: 'flex', gap: 20, padding: '10px 14px', background: 'rgba(0,0,0,0.2)', borderRadius: 8, fontSize: '0.88rem' }}>
                          <div>
                            <span style={{ color: 'var(--color-text-muted)' }}>Proposed Bid: </span>
                            <strong style={{ color: 'var(--color-accent)' }}>${prop.bidAmount}</strong>
                          </div>
                          <div>
                            <span style={{ color: 'var(--color-text-muted)' }}>Delivery Timeline: </span>
                            <strong>{prop.deliveryDays} days ({prop.estimatedDuration})</strong>
                          </div>
                          <div style={{ marginLeft: 'auto' }}>
                            <span style={{ padding: '2px 8px', borderRadius: 99, background: statusBg, color: statusColor, fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>
                              {prop.status}
                            </span>
                          </div>
                        </div>

                        {/* Cover Letter */}
                        <div style={{ fontSize: '0.9rem', color: 'var(--color-text-light)', lineHeight: 1.6, background: 'rgba(255,255,255,0.02)', padding: '12px 14px', borderRadius: 8 }}>
                          {prop.coverLetter}
                        </div>

                        {/* Actions */}
                        {selectedProjectForProposals.status === 'open' && prop.status !== 'accepted' && prop.status !== 'rejected' && prop.status !== 'withdrawn' && (
                          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', paddingTop: 6 }}>
                            {prop.status !== 'shortlisted' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleProposalDecision(prop.id, 'shortlist')}
                                style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                              >
                                <ThumbsUp size={13} />
                                <span>Shortlist</span>
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleProposalDecision(prop.id, 'reject')}
                              style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#f87171' }}
                            >
                              <X size={13} />
                              <span>Reject</span>
                            </Button>
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => {
                                if (window.confirm(`Accept proposal from ${prop.freelancer?.name || 'this freelancer'} for $${prop.bidAmount}? This will award the contract and close competing proposals.`)) {
                                  handleProposalDecision(prop.id, 'accept');
                                }
                              }}
                              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                            >
                              <Check size={13} />
                              <span>Accept & Award Contract</span>
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {/* ======== MY ORDERS ======== */}
        {activeTab === 'orders' && (
          <div>
            <h2 style={{ marginBottom: 'var(--space-lg)' }}>My Purchase Orders</h2>
            {orders.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {orders.map(o => {
                  const isExpanded = expandedOrderId === o.id;
                  const statusColor = {
                    pending: 'var(--color-warning)',
                    requirements_submitted: '#3b82f6',
                    active: 'var(--color-accent)',
                    delivered: '#a78bfa',
                    completed: 'var(--color-accent)',
                    cancelled: 'var(--color-error)',
                  }[o.status] || 'var(--color-text-muted)';
                  const statusLabel = {
                    pending: 'Awaiting Brief',
                    requirements_submitted: 'Under Review',
                    active: 'In Progress',
                    delivered: 'Delivered',
                    completed: 'Completed',
                    cancelled: 'Cancelled',
                  }[o.status] || o.status;

                  return (
                    <div key={o.id} style={{ border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, overflow: 'hidden', background: 'rgba(15,23,42,0.5)', transition: 'border-color 0.2s' }}>
                      <div
                        onClick={() => setExpandedOrderId(isExpanded ? null : o.id)}
                        style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16, cursor: 'pointer', flexWrap: 'wrap' }}>
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: statusColor, flexShrink: 0, boxShadow: `0 0 8px ${statusColor}` }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 'var(--weight-semibold)', fontSize: 'var(--text-sm)', color: 'var(--color-text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 3 }}>
                            {o.serviceTitle}
                          </div>
                          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                            {o.sellerName} · {o.packageTitle || 'Standard Package'}
                          </div>
                        </div>
                        <div style={{ fontWeight: 'var(--weight-bold)', color: 'var(--color-accent)', fontSize: 'var(--text-base)', flexShrink: 0 }}>${o.price}</div>
                        <div style={{ padding: '3px 10px', borderRadius: 99, background: `${statusColor}18`, border: `1px solid ${statusColor}40`, fontSize: 'var(--text-xs)', fontWeight: 'var(--weight-semibold)', color: statusColor, flexShrink: 0 }}>
                          {statusLabel}
                        </div>
                        {isExpanded ? <ChevronUp size={16} color='var(--color-text-light)' style={{ flexShrink: 0 }} /> : <ChevronDown size={16} color='var(--color-text-light)' style={{ flexShrink: 0 }} />}
                      </div>

                      {isExpanded && (
                        <div style={{ padding: '0 20px 20px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                          
                          {/* PROJECT HEALTH WIDGET */}
                          <div style={{ marginTop: 16, marginBottom: 16, padding: '12px 16px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 'var(--text-xs)' }}>
                            <div><strong>Project Health:</strong></div>
                            <div style={{ color: 'var(--color-accent)' }}>Scope: Clear ✓</div>
                            <div style={{ color: 'var(--color-accent)' }}>Budget: Defined ✓</div>
                            <div style={{ color: o.deliveryTimeDays < 3 ? 'var(--color-warning)' : 'var(--color-accent)' }}>
                              Deadline: {o.deliveryTimeDays < 3 ? 'Potentially Aggressive ⚠' : 'Realistic ✓'}
                            </div>
                            <div style={{ color: 'var(--color-accent)' }}>Requirements: Complete ✓</div>
                          </div>

                          <div style={{ paddingTop: 8, marginBottom: 20 }}>
                            <div style={{ fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--color-text-muted)', fontWeight: 'var(--weight-semibold)', marginBottom: 14 }}>Order Status</div>
                            <OrderStatusTimeline order={o} />
                          </div>

                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            {o.status === 'pending' && (
                              <Button variant="primary" size="sm" onClick={() => { setSelectedOrderForRequirements(o); handleTabChange('requirements'); }}>
                                Submit Brief
                              </Button>
                            )}
                            {o.status === 'delivered' && (
                              <Button variant="primary" size="sm" onClick={() => handleCompleteOrderPrompt(o)}>
                                Approve & Complete Order
                              </Button>
                            )}
                            <Button variant="outline" size="sm" onClick={() => { setSelectedOrderChat(orderService.getOrderById(o.id)); handleTabChange('messages'); }}>
                              Message Seller
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: 'var(--space-2xl)', border: '1px dashed rgba(255,255,255,0.08)', borderRadius: 'var(--radius-lg)', color: 'var(--color-text-light)' }}>
                No orders placed yet.
              </div>
            )}
          </div>
        )}

        {/* ======== REQUIREMENTS ======== */}
        {activeTab === 'requirements' && selectedOrderForRequirements && (
          <div style={{ maxWidth: '680px' }}>
            <h2 style={{ marginBottom: 'var(--space-xs)' }}>Submit Project Brief</h2>
            <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-lg)' }}>
              Answer these questions so the freelancer can start your order.
            </p>

            <div style={{ background: 'var(--glass-bg-secondary)', backdropFilter: 'blur(var(--glass-blur-secondary))', border: '1px solid var(--glass-border-secondary)', borderRadius: 'var(--radius-xl)', padding: 'var(--space-xl)' }}>
              <form onSubmit={handleRequirementsSubmit}>
                {(selectedOrderForRequirements.requirementsSchema || []).map((q, idx) => (
                  <div key={q.id} className="form-group" style={{ marginBottom: 'var(--space-lg)' }}>
                    <label className="form-label">{idx + 1}. {q.question}</label>
                    <textarea className="form-control" rows={4} placeholder="Your detailed answer..." value={requirementsData[q.id] || ''} onChange={e => updateReqField(q.id, e.target.value)} required={q.required} style={{ resize: 'vertical' }} />
                  </div>
                ))}
                <div className="flex gap-sm" style={{ marginTop: 'var(--space-md)' }}>
                  <Button type="submit" variant="primary" fullWidth style={{ height: '44px' }}>Submit Requirements</Button>
                  <Button variant="outline" onClick={() => handleTabChange('orders')} style={{ height: '44px' }}>Cancel</Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ======== MESSAGES ======== */}
        {activeTab === 'messages' && (
          <div>
            <h2 style={{ marginBottom: 'var(--space-lg)' }}>Freelancer Conversations</h2>
            <div className="messages-layout">
              <div className="conversations-sidebar">
                {orders.map(o => (
                  <div key={o.id} className={`conversation-item ${selectedOrderChat?.id === o.id ? 'conversation-item-active' : ''}`} onClick={() => setSelectedOrderChat(orderService.getOrderById(o.id))}>
                    <Avatar src={o.sellerAvatar} name={o.sellerName} size={36} />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-medium)', color: 'var(--color-text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.sellerName}</div>
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-light)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.serviceTitle}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="chat-area">
                {selectedOrderChat ? (
                  <>
                    <div className="chat-header flex items-center gap-sm">
                      <Avatar src={selectedOrderChat.sellerAvatar} name={selectedOrderChat.sellerName} size={32} />
                      <div>
                        <div style={{ fontWeight: 'var(--weight-semibold)', color: 'var(--color-text-main)' }}>{selectedOrderChat.sellerName}</div>
                        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-light)' }}>Order {selectedOrderChat.id}</div>
                      </div>
                    </div>
                    <div className="chat-history">
                      {selectedOrderChat.messages?.map((m, idx) => {
                        const isMe = m.senderId === currentUser.id;
                        return (
                          <div key={idx} className={`chat-bubble ${isMe ? 'chat-bubble-sent' : 'chat-bubble-received'}`}>
                            {m.text}
                          </div>
                        );
                      })}
                    </div>

                    {/* RIGHT SPEECH ASSISTANT */}
                    {speechSuggestion && (
                      <div style={{ padding: '10px 14px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '8px', marginBottom: '8px', fontSize: '12px', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>{speechSuggestion}</div>
                        <button type="button" onClick={applySpeechSuggestion} style={{ background: 'var(--color-accent)', color: '#000', border: 'none', padding: '4px 10px', borderRadius: '4px', fontWeight: 700, cursor: 'pointer', flexShrink: 0, marginLeft: '10px' }}>
                          Use Suggestion
                        </button>
                      </div>
                    )}

                    <form onSubmit={handleSendMessage} className="chat-input-wrapper flex gap-sm">
                      <input type="text" placeholder="Write your message..." className="form-control" value={chatMessage} onChange={(e) => handleChatMessageChange(e.target.value)} style={{ flexGrow: 1 }} />
                      <Button type="submit" variant="primary" style={{ flexShrink: 0 }}>Send</Button>
                    </form>
                  </>
                ) : (
                  <div style={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-light)' }}>
                    Select a conversation to begin
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ======== CONTRACTS (PHASE 6A) ======== */}
        {activeTab === 'contracts' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg)', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <h2 style={{ margin: 0 }}>Active Contracts</h2>
                <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)', marginTop: '4px' }}>
                  Track progress, review milestone submissions, and approve deliverables.
                </p>
              </div>
            </div>

            {loadingContracts ? (
              <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--color-text-light)' }}>
                <div className="spinner" style={{ margin: '0 auto 16px' }} />
                <p>Loading your contracts...</p>
              </div>
            ) : myContracts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 'var(--space-2xl)', border: '1px dashed rgba(255,255,255,0.08)', borderRadius: 'var(--radius-lg)', color: 'var(--color-text-light)', background: 'rgba(15,23,42,0.3)' }}>
                <Layers size={36} color="var(--color-accent)" style={{ margin: '0 auto 16px' }} />
                <h3 style={{ fontSize: '1.2rem', color: '#fff', marginBottom: '8px' }}>No active contracts yet</h3>
                <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)', maxWidth: '420px', margin: '0 auto 20px' }}>
                  Contracts are created automatically when you accept a freelancer's proposal on one of your projects.
                </p>
                <Button variant="primary" onClick={() => handleTabChange('projects')}>View My Projects</Button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {myContracts.map((c) => {
                  const statusColors = {
                    active: { bg: 'rgba(59, 130, 246, 0.15)', border: 'rgba(59, 130, 246, 0.3)', color: '#60a5fa' },
                    completed: { bg: 'rgba(16, 185, 129, 0.15)', border: 'rgba(16, 185, 129, 0.3)', color: 'var(--color-accent)' },
                    cancelled: { bg: 'rgba(239, 68, 68, 0.12)', border: 'rgba(239, 68, 68, 0.3)', color: '#f87171' },
                    disputed: { bg: 'rgba(245, 158, 11, 0.12)', border: 'rgba(245, 158, 11, 0.3)', color: '#fbbf24' },
                  };
                  const sc = statusColors[c.status] || statusColors.active;
                  const progressPct = c.progress?.progressPercentage ?? 0;

                  return (
                    <div
                      key={c.id}
                      style={{
                        background: 'rgba(15, 23, 42, 0.55)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        borderRadius: 16,
                        padding: 24,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 16,
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                            <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-accent)' }}>Contract</span>
                            <span style={{
                              padding: '2px 8px',
                              borderRadius: 999,
                              background: sc.bg,
                              border: `1px solid ${sc.border}`,
                              color: sc.color,
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              textTransform: 'uppercase',
                            }}>{c.status}</span>
                          </div>
                          <div style={{ fontWeight: 700, fontSize: '1.05rem', color: '#fff', marginBottom: 4 }}>{c.title}</div>
                          <div style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>
                            Freelancer: <strong style={{ color: '#fff' }}>{c.freelancer?.name || 'Freelancer'}</strong>
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--color-accent)' }}>${c.agreedBudget}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{c.currency || 'USD'}</div>
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: '0.8rem' }}>
                          <span style={{ color: 'var(--color-text-muted)' }}>Milestone Progress</span>
                          <span style={{ color: 'var(--color-accent)', fontWeight: 700 }}>{progressPct}%</span>
                        </div>
                        <div style={{ height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 999, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${progressPct}%`, background: 'linear-gradient(90deg,#10b981,#34d399)', borderRadius: 999, transition: 'width 0.3s ease' }} />
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: 4 }}>
                          {c.progress?.approvedMilestones ?? 0} / {c.progress?.totalMilestones ?? 0} milestones approved
                        </div>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/contracts/${c.id}`)}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                        >
                          <ExternalLink size={13} />
                          <span>Open Workspace</span>
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

      </main>
    </div>
  );
}
