import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { authService } from '../../services/authService';
import { marketplaceService } from '../../services/marketplaceService';
import { adminApi } from '../../services/api/adminApi';
import Avatar from '../../components/ui/Avatar';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Modal from '../../components/ui/Modal';
import DashboardSidebar from '../../components/dashboard/DashboardSidebar';
import {
  LayoutDashboard, Users, ShieldAlert, FolderTree, Briefcase,
  Flag, ScrollText, ShoppingCart, Activity, Search, ChevronLeft,
  ChevronRight, AlertTriangle, CheckCircle, XCircle, Eye, Ban,
  UserCheck, FileText, Clock, TrendingUp, DollarSign, Gavel
} from 'lucide-react';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'dashboard';

  const [currentUser, setCurrentUser] = useState(authService.getCurrentUser());

  useEffect(() => {
    const handleAuth = () => setCurrentUser(authService.getCurrentUser());
    window.addEventListener('authChange', handleAuth);
    return () => window.removeEventListener('authChange', handleAuth);
  }, []);

  // ─── Server-driven state ────────────────────────────────────────────────
  const [analytics, setAnalytics] = useState(null);
  const [users, setUsers] = useState({ users: [], total: 0, page: 1, limit: 20 });
  const [services, setServices] = useState({ services: [], total: 0, page: 1, limit: 20 });
  const [projects, setProjects] = useState({ projects: [], total: 0, page: 1, limit: 20 });
  const [reports, setReports] = useState({ reports: [], total: 0, page: 1, limit: 20 });
  const [auditLogs, setAuditLogs] = useState({ logs: [], total: 0, page: 1, limit: 20 });

  // Categories — keep existing Phase 1 localStorage category management
  const [categories, setCategories] = useState([]);
  const [newCategory, setNewCategory] = useState({ name: '', description: '', iconName: 'Sparkles' });

  // Filters
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('');
  const [userStatusFilter, setUserStatusFilter] = useState('');
  const [serviceSearch, setServiceSearch] = useState('');
  const [serviceStatusFilter, setServiceStatusFilter] = useState('');
  const [projectSearch, setProjectSearch] = useState('');
  const [projectStatusFilter, setProjectStatusFilter] = useState('');
  const [reportStatusFilter, setReportStatusFilter] = useState('');

  // Modal state
  const [modal, setModal] = useState({ open: false, type: '', target: null });
  const [modalReason, setModalReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = useCallback((msg, variant = 'success') => {
    setToast({ msg, variant });
    setTimeout(() => setToast(null), 3500);
  }, []);

  // ─── Data Loaders ───────────────────────────────────────────────────────
  const loadAnalytics = useCallback(async () => {
    try { const data = await adminApi.getAnalytics(); setAnalytics(data); } catch (e) { console.error('[Admin] Analytics error:', e); }
  }, []);

  const loadUsers = useCallback(async (page = 1) => {
    try {
      const data = await adminApi.listUsers({ page, search: userSearch, role: userRoleFilter, status: userStatusFilter });
      setUsers(data || { users: [], total: 0, page, limit: 20 });
    } catch (e) { console.error('[Admin] Users error:', e); }
  }, [userSearch, userRoleFilter, userStatusFilter]);

  const loadServices = useCallback(async (page = 1) => {
    try {
      const data = await adminApi.listServices({ page, search: serviceSearch, status: serviceStatusFilter });
      setServices(data || { services: [], total: 0, page, limit: 20 });
    } catch (e) { console.error('[Admin] Services error:', e); }
  }, [serviceSearch, serviceStatusFilter]);

  const loadProjects = useCallback(async (page = 1) => {
    try {
      const data = await adminApi.listProjects({ page, search: projectSearch, status: projectStatusFilter });
      setProjects(data || { projects: [], total: 0, page, limit: 20 });
    } catch (e) { console.error('[Admin] Projects error:', e); }
  }, [projectSearch, projectStatusFilter]);

  const loadReports = useCallback(async (page = 1) => {
    try {
      const data = await adminApi.listReports({ page, status: reportStatusFilter });
      setReports(data || { reports: [], total: 0, page, limit: 20 });
    } catch (e) { console.error('[Admin] Reports error:', e); }
  }, [reportStatusFilter]);

  const loadAuditLogs = useCallback(async (page = 1) => {
    try {
      const data = await adminApi.listAuditLogs({ page });
      setAuditLogs(data || { logs: [], total: 0, page, limit: 20 });
    } catch (e) { console.error('[Admin] Audit error:', e); }
  }, []);

  useEffect(() => {
    if (!currentUser || currentUser.role !== 'admin') { navigate('/login'); return; }
    loadAnalytics();
    // Load categories from existing Phase 1 service
    (async () => {
      try { const cats = await marketplaceService.getCategories(); setCategories(cats || []); } catch (e) { console.error(e); }
    })();
  }, [currentUser, navigate, loadAnalytics]);

  useEffect(() => {
    if (activeTab === 'users') loadUsers();
    else if (activeTab === 'services') loadServices();
    else if (activeTab === 'projects') loadProjects();
    else if (activeTab === 'reports') loadReports();
    else if (activeTab === 'audit') loadAuditLogs();
  }, [activeTab, loadUsers, loadServices, loadProjects, loadReports, loadAuditLogs]);

  const handleTabChange = (t) => setSearchParams({ tab: t });

  // ─── Admin Actions ──────────────────────────────────────────────────────
  const openModal = (type, target) => { setModal({ open: true, type, target }); setModalReason(''); };
  const closeModal = () => { setModal({ open: false, type: '', target: null }); setModalReason(''); };

  const executeAction = async () => {
    setLoading(true);
    try {
      const { type, target } = modal;
      switch (type) {
        case 'suspend_user':
          await adminApi.suspendUser(target.id, modalReason || 'Account suspended by administration.');
          showToast(`User ${target.name} has been suspended.`);
          await loadUsers(users.page); await loadAnalytics();
          break;
        case 'reactivate_user':
          await adminApi.reactivateUser(target.id);
          showToast(`User ${target.name} has been reactivated.`);
          await loadUsers(users.page); await loadAnalytics();
          break;
        case 'approve_service':
          await adminApi.approveService(target.id);
          showToast(`Service "${target.title}" approved and published.`);
          await loadServices(services.page); await loadAnalytics();
          break;
        case 'reject_service':
          await adminApi.rejectService(target.id, modalReason);
          showToast(`Service "${target.title}" rejected.`);
          await loadServices(services.page); await loadAnalytics();
          break;
        case 'suspend_service':
          await adminApi.suspendService(target.id, modalReason);
          showToast(`Service "${target.title}" suspended.`);
          await loadServices(services.page); await loadAnalytics();
          break;
        case 'suspend_project':
          await adminApi.suspendProject(target.id, modalReason || 'Project suspended by administration.');
          showToast(`Project "${target.title}" suspended.`);
          await loadProjects(projects.page); await loadAnalytics();
          break;
        case 'review_report':
          await adminApi.reviewReport(target.id);
          showToast(`Report marked under review.`);
          await loadReports(reports.page); await loadAnalytics();
          break;
        case 'resolve_report':
          await adminApi.resolveReport(target.id, modalReason || 'Resolved by moderator.');
          showToast(`Report resolved.`);
          await loadReports(reports.page); await loadAnalytics();
          break;
        case 'dismiss_report':
          await adminApi.dismissReport(target.id, modalReason || 'Dismissed after review.');
          showToast(`Report dismissed.`);
          await loadReports(reports.page); await loadAnalytics();
          break;
        default: break;
      }
    } catch (e) {
      showToast(e.message || 'Action failed.', 'error');
    } finally {
      setLoading(false);
      closeModal();
    }
  };

  // Category management (preserving Phase 1 localStorage logic)
  const handleCreateCategory = async (e) => {
    e.preventDefault();
    if (!newCategory.name) return;
    marketplaceService.addCategory(newCategory);
    setNewCategory({ name: '', description: '', iconName: 'Sparkles' });
    const cats = await marketplaceService.getCategories();
    setCategories(cats || []);
  };

  const handleDeleteCategory = async (catId) => {
    openModal('delete_category', { id: catId });
  };

  const executeDeleteCategory = async () => {
    marketplaceService.deleteCategory(modal.target.id);
    const cats = await marketplaceService.getCategories();
    setCategories(cats || []);
    closeModal();
    showToast('Category deleted.');
  };

  // ─── Status badge helper ────────────────────────────────────────────────
  const statusVariant = (s) => {
    const map = {
      active: 'success', published: 'success', open: 'success', resolved: 'success',
      suspended: 'error', rejected: 'error', dismissed: 'error', cancelled: 'error',
      pending_review: 'warning', under_review: 'warning', draft: 'warning', in_progress: 'info',
      completed: 'info', closed: 'info',
    };
    return map[s] || 'default';
  };

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

  // ─── Pagination Helper ──────────────────────────────────────────────────
  const Pagination = ({ data, loadFn }) => {
    const totalPages = Math.ceil((data.total || 0) / (data.limit || 20));
    if (totalPages <= 1) return null;
    return (
      <div className="flex items-center justify-between" style={{ marginTop: 'var(--space-md)', padding: 'var(--space-sm) 0' }}>
        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
          Page {data.page} of {totalPages} &middot; {data.total} total
        </span>
        <div className="flex gap-xs">
          <Button variant="outline" size="sm" disabled={data.page <= 1} onClick={() => loadFn(data.page - 1)}>
            <ChevronLeft size={14} />
          </Button>
          <Button variant="outline" size="sm" disabled={data.page >= totalPages} onClick={() => loadFn(data.page + 1)}>
            <ChevronRight size={14} />
          </Button>
        </div>
      </div>
    );
  };

  // ─── Modal Title & Confirmation ─────────────────────────────────────────
  const modalTitles = {
    suspend_user: 'Suspend User Account',
    reactivate_user: 'Reactivate User Account',
    approve_service: 'Approve Service Listing',
    reject_service: 'Reject Service Listing',
    suspend_service: 'Suspend Service Listing',
    suspend_project: 'Suspend Project',
    review_report: 'Mark Report Under Review',
    resolve_report: 'Resolve Report',
    dismiss_report: 'Dismiss Report',
    delete_category: 'Delete Category',
  };

  const needsReason = ['suspend_user', 'reject_service', 'suspend_service', 'suspend_project', 'resolve_report', 'dismiss_report'];

  // ─── Sidebar Configuration ─────────────────────────────────────────────
  const sidebarSections = [
    {
      items: [
        { id: 'dashboard', icon: LayoutDashboard, label: 'Overview' },
        { id: 'users', icon: Users, label: 'Users', badge: analytics?.users?.total || undefined },
        { id: 'services', icon: ShieldAlert, label: 'Services', badge: analytics?.marketplace?.totalServices || undefined },
        { id: 'projects', icon: Briefcase, label: 'Projects', badge: analytics?.marketplace?.totalProjects || undefined },
        { id: 'categories', icon: FolderTree, label: 'Categories', badge: categories.length > 0 ? categories.length : undefined },
      ]
    },
    {
      title: 'Governance',
      items: [
        { id: 'reports', icon: Flag, label: 'Reports', badge: analytics?.governance?.openReports || undefined, badgeType: 'accent' },
        { id: 'audit', icon: ScrollText, label: 'Audit Log' },
      ]
    }
  ];

  return (
    <div className="dashboard-container">
      <DashboardSidebar
        user={currentUser}
        role="admin"
        roleBadge="System Administrator"
        activeTab={activeTab}
        onTabChange={handleTabChange}
        sections={sidebarSections}
        footerWidget={
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '2px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
              <span className="sidebar-live-dot" />
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#10b981' }}>Systems Normal</span>
            </div>
            <span style={{ fontSize: '0.74rem', color: 'var(--sidebar-text-sub)' }}>99.98% SLA</span>
          </div>
        }
        extraBottomActions={[
          { icon: ShoppingCart, label: 'Marketplace Front', onClick: () => navigate('/marketplace') }
        ]}
      />

      <main className="dashboard-content">
        {/* Toast */}
        {toast && (
          <div className={`admin-toast admin-toast-${toast.variant}`} style={{
            position: 'fixed', top: '20px', right: '20px', zIndex: 9999,
            padding: '12px 20px', borderRadius: 'var(--radius-lg)',
            background: toast.variant === 'error' ? 'linear-gradient(135deg, rgba(239,68,68,0.95), rgba(220,38,38,0.95))' : 'linear-gradient(135deg, rgba(16,185,129,0.95), rgba(5,150,105,0.95))',
            color: '#fff', fontWeight: 600, fontSize: 'var(--text-sm)',
            backdropFilter: 'blur(12px)', boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
            animation: 'admin-toast-in 0.3s ease-out',
          }}>
            {toast.variant === 'error' ? <XCircle size={16} style={{ marginRight: 8, verticalAlign: 'middle' }} /> : <CheckCircle size={16} style={{ marginRight: 8, verticalAlign: 'middle' }} />}
            {toast.msg}
          </div>
        )}

        {/* ════════ OVERVIEW ════════ */}
        {activeTab === 'dashboard' && (
          <div>
            <h2 style={{ marginBottom: 'var(--space-xs)' }}>Admin Control Panel</h2>
            <p style={{ marginBottom: 'var(--space-xl)', color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>Real-time platform analytics &amp; governance overview</p>

            {analytics ? (
              <>
                <div className="stats-grid">
                  {[
                    { icon: Users, label: 'Total Users', value: analytics.users?.total ?? 0, sub: `${analytics.users?.active ?? 0} active`, color: '#6366f1' },
                    { icon: ShieldAlert, label: 'Services', value: analytics.marketplace?.totalServices ?? 0, sub: `${analytics.marketplace?.publishedServices ?? 0} published`, color: '#8b5cf6' },
                    { icon: Briefcase, label: 'Projects', value: analytics.marketplace?.totalProjects ?? 0, sub: `${analytics.marketplace?.activeProjects ?? 0} active`, color: '#06b6d4' },
                    { icon: Gavel, label: 'Contracts', value: analytics.contracts?.totalContracts ?? 0, sub: `${analytics.contracts?.activeContracts ?? 0} active`, color: '#f59e0b' },
                    { icon: DollarSign, label: 'Released', value: `$${(analytics.financial?.releasedPayments ?? 0).toLocaleString()}`, sub: `$${(analytics.financial?.platformRevenue ?? 0).toLocaleString()} rev`, color: '#10b981' },
                    { icon: Flag, label: 'Open Reports', value: analytics.governance?.openReports ?? 0, sub: `${analytics.governance?.underReviewReports ?? 0} reviewing`, color: '#ef4444' },
                  ].map(({ icon: Icon, label, value, sub, color }) => (
                    <div key={label} className="stat-card" style={{ position: 'relative', overflow: 'hidden' }}>
                      <div style={{ position: 'absolute', top: 12, right: 14, opacity: 0.15 }}><Icon size={40} color={color} /></div>
                      <div className="stat-label">{label}</div>
                      <div className="stat-value" style={{ color }}>{value}</div>
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: 4 }}>{sub}</div>
                    </div>
                  ))}
                </div>

                {/* Quick status breakdown */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 'var(--space-md)', marginTop: 'var(--space-xl)' }}>
                  <div className="stat-card">
                    <h4 style={{ margin: '0 0 var(--space-sm) 0', display: 'flex', alignItems: 'center', gap: 8 }}><Users size={16} /> User Breakdown</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 'var(--text-sm)' }}>
                      <div className="flex items-center justify-between"><span>Buyers</span><Badge variant="info">{analytics.users?.buyers ?? 0}</Badge></div>
                      <div className="flex items-center justify-between"><span>Sellers</span><Badge variant="info">{analytics.users?.sellers ?? 0}</Badge></div>
                      <div className="flex items-center justify-between"><span>Admins</span><Badge variant="default">{analytics.users?.admins ?? 0}</Badge></div>
                      <div className="flex items-center justify-between"><span style={{ color: '#ef4444' }}>Suspended</span><Badge variant="error">{analytics.users?.suspended ?? 0}</Badge></div>
                    </div>
                  </div>
                  <div className="stat-card">
                    <h4 style={{ margin: '0 0 var(--space-sm) 0', display: 'flex', alignItems: 'center', gap: 8 }}><ShieldAlert size={16} /> Moderation Queue</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 'var(--text-sm)' }}>
                      <div className="flex items-center justify-between"><span>Pending Review</span><Badge variant="warning">{analytics.marketplace?.pendingReview ?? 0}</Badge></div>
                      <div className="flex items-center justify-between"><span>Rejected</span><Badge variant="error">{analytics.marketplace?.rejectedServices ?? 0}</Badge></div>
                      <div className="flex items-center justify-between"><span>Suspended Services</span><Badge variant="error">{analytics.marketplace?.suspendedServices ?? 0}</Badge></div>
                      <div className="flex items-center justify-between"><span>Suspended Projects</span><Badge variant="error">{analytics.marketplace?.suspendedProjects ?? 0}</Badge></div>
                    </div>
                  </div>
                  <div className="stat-card">
                    <h4 style={{ margin: '0 0 var(--space-sm) 0', display: 'flex', alignItems: 'center', gap: 8 }}><ScrollText size={16} /> Governance</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 'var(--text-sm)' }}>
                      <div className="flex items-center justify-between"><span>Resolved Reports</span><Badge variant="success">{analytics.governance?.resolvedReports ?? 0}</Badge></div>
                      <div className="flex items-center justify-between"><span>Dismissed</span><Badge variant="default">{analytics.governance?.dismissedReports ?? 0}</Badge></div>
                      <div className="flex items-center justify-between"><span>Audit Entries</span><Badge variant="info">{analytics.governance?.totalAuditLogs ?? 0}</Badge></div>
                      <div className="flex items-center justify-between"><span>Disputed Contracts</span><Badge variant="warning">{analytics.contracts?.disputedContracts ?? 0}</Badge></div>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="stats-grid">{[1, 2, 3, 4].map(i => <div key={i} className="stat-card" style={{ minHeight: 80 }}><div className="stat-label" style={{ color: 'var(--color-text-muted)' }}>Loading...</div></div>)}</div>
            )}
          </div>
        )}

        {/* ════════ USERS ════════ */}
        {activeTab === 'users' && (
          <div>
            <h2 style={{ marginBottom: 'var(--space-sm)' }}>User Account Management</h2>
            <div className="flex gap-sm" style={{ marginBottom: 'var(--space-md)', flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 200px', maxWidth: 300 }}>
                <Input placeholder="Search users..." value={userSearch} onChange={e => setUserSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && loadUsers(1)} />
              </div>
              <Select value={userRoleFilter} onChange={e => { setUserRoleFilter(e.target.value); }} options={[{ value: '', label: 'All Roles' }, { value: 'buyer', label: 'Buyer' }, { value: 'seller', label: 'Seller' }, { value: 'admin', label: 'Admin' }]} />
              <Select value={userStatusFilter} onChange={e => { setUserStatusFilter(e.target.value); }} options={[{ value: '', label: 'All Status' }, { value: 'active', label: 'Active' }, { value: 'suspended', label: 'Suspended' }]} />
              <Button variant="primary" size="sm" onClick={() => loadUsers(1)}><Search size={14} /> Search</Button>
            </div>
            <div className="data-table-wrapper">
              <table className="data-table">
                <thead><tr><th>User</th><th>Email</th><th>Role</th><th>Joined</th><th>Status</th><th>Activity</th><th>Actions</th></tr></thead>
                <tbody>
                  {(users.users || []).map(u => (
                    <tr key={u.id}>
                      <td>
                        <div className="flex items-center gap-xs">
                          <Avatar src={u.avatar} name={u.name} size={28} />
                          <strong>{u.name}</strong>
                        </div>
                      </td>
                      <td style={{ color: 'var(--color-text-muted)' }}>{u.email}</td>
                      <td><Badge variant="default">{(u.role || '').toUpperCase()}</Badge></td>
                      <td style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-xs)' }}>{formatDate(u.createdAt)}</td>
                      <td><Badge variant={statusVariant(u.status)}>{(u.status || '').toUpperCase()}</Badge></td>
                      <td style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                        {u.serviceCount ?? 0}S &middot; {u.projectCount ?? 0}P &middot; {u.contractCount ?? 0}C
                      </td>
                      <td>
                        {u.role !== 'admin' && (
                          <div className="flex gap-xs">
                            {u.status === 'active' ? (
                              <Button variant="danger" size="sm" onClick={() => openModal('suspend_user', u)} style={{ fontSize: '11px' }}>
                                <Ban size={12} /> Suspend
                              </Button>
                            ) : (
                              <Button variant="primary" size="sm" onClick={() => openModal('reactivate_user', u)} style={{ fontSize: '11px' }}>
                                <UserCheck size={12} /> Activate
                              </Button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                  {(!users.users || users.users.length === 0) && <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: 'var(--space-xl)' }}>No users found.</td></tr>}
                </tbody>
              </table>
            </div>
            <Pagination data={users} loadFn={loadUsers} />
          </div>
        )}

        {/* ════════ SERVICES ════════ */}
        {activeTab === 'services' && (
          <div>
            <h2 style={{ marginBottom: 'var(--space-sm)' }}>Service Listings Moderation</h2>
            <div className="flex gap-sm" style={{ marginBottom: 'var(--space-md)', flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 200px', maxWidth: 300 }}>
                <Input placeholder="Search services..." value={serviceSearch} onChange={e => setServiceSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && loadServices(1)} />
              </div>
              <Select value={serviceStatusFilter} onChange={e => setServiceStatusFilter(e.target.value)} options={[{ value: '', label: 'All Status' }, { value: 'published', label: 'Published' }, { value: 'pending_review', label: 'Pending Review' }, { value: 'draft', label: 'Draft' }, { value: 'rejected', label: 'Rejected' }, { value: 'suspended', label: 'Suspended' }]} />
              <Button variant="primary" size="sm" onClick={() => loadServices(1)}><Search size={14} /> Search</Button>
            </div>
            <div className="data-table-wrapper">
              <table className="data-table">
                <thead><tr><th>Service</th><th>Seller</th><th>Price</th><th>Rating</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                  {(services.services || []).map(s => (
                    <tr key={s.id}>
                      <td>
                        <div className="flex items-center gap-xs">
                          {s.coverImage && <img src={s.coverImage} alt="" style={{ width: 36, height: 36, borderRadius: 'var(--radius-sm)', objectFit: 'cover', border: '1px solid rgba(255,255,255,0.08)' }} />}
                          <div>
                            <strong style={{ fontSize: 'var(--text-sm)' }}>{s.title}</strong>
                            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>{s.categorySlug}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ fontSize: 'var(--text-sm)' }}>{s.seller?.name || s.sellerId}</td>
                      <td style={{ color: 'var(--color-accent)', fontWeight: 'var(--weight-semibold)' }}>${s.startingPrice}</td>
                      <td style={{ color: '#fbbf24' }}>★ {(s.rating || 0).toFixed(1)}</td>
                      <td><Badge variant={statusVariant(s.status)}>{(s.status || '').toUpperCase().replace('_', ' ')}</Badge></td>
                      <td>
                        <div className="flex gap-xs" style={{ flexWrap: 'wrap' }}>
                          {(s.status === 'pending_review' || s.status === 'draft') && (
                            <>
                              <Button variant="primary" size="sm" onClick={() => openModal('approve_service', s)} style={{ fontSize: '11px' }}><CheckCircle size={12} /> Approve</Button>
                              <Button variant="danger" size="sm" onClick={() => openModal('reject_service', s)} style={{ fontSize: '11px' }}><XCircle size={12} /> Reject</Button>
                            </>
                          )}
                          {s.status === 'published' && (
                            <Button variant="danger" size="sm" onClick={() => openModal('suspend_service', s)} style={{ fontSize: '11px' }}><Ban size={12} /> Suspend</Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {(!services.services || services.services.length === 0) && <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: 'var(--space-xl)' }}>No services found.</td></tr>}
                </tbody>
              </table>
            </div>
            <Pagination data={services} loadFn={loadServices} />
          </div>
        )}

        {/* ════════ PROJECTS ════════ */}
        {activeTab === 'projects' && (
          <div>
            <h2 style={{ marginBottom: 'var(--space-sm)' }}>Project Administration</h2>
            <div className="flex gap-sm" style={{ marginBottom: 'var(--space-md)', flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 200px', maxWidth: 300 }}>
                <Input placeholder="Search projects..." value={projectSearch} onChange={e => setProjectSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && loadProjects(1)} />
              </div>
              <Select value={projectStatusFilter} onChange={e => setProjectStatusFilter(e.target.value)} options={[{ value: '', label: 'All Status' }, { value: 'open', label: 'Open' }, { value: 'in_progress', label: 'In Progress' }, { value: 'completed', label: 'Completed' }, { value: 'suspended', label: 'Suspended' }, { value: 'cancelled', label: 'Cancelled' }]} />
              <Button variant="primary" size="sm" onClick={() => loadProjects(1)}><Search size={14} /> Search</Button>
            </div>
            <div className="data-table-wrapper">
              <table className="data-table">
                <thead><tr><th>Project</th><th>Client</th><th>Budget</th><th>Proposals</th><th>Status</th><th>Created</th><th>Actions</th></tr></thead>
                <tbody>
                  {(projects.projects || []).map(p => (
                    <tr key={p.id}>
                      <td><strong style={{ fontSize: 'var(--text-sm)' }}>{p.title}</strong></td>
                      <td style={{ fontSize: 'var(--text-sm)' }}>{p.buyer?.name || p.buyerId}</td>
                      <td style={{ color: 'var(--color-accent)', fontWeight: 'var(--weight-semibold)' }}>
                        {p.fixedBudget ? `$${p.fixedBudget}` : p.budgetMin && p.budgetMax ? `$${p.budgetMin} – $${p.budgetMax}` : '—'}
                      </td>
                      <td><Badge variant="default">{p.proposalCount ?? 0}</Badge></td>
                      <td><Badge variant={statusVariant(p.status)}>{(p.status || '').toUpperCase().replace('_', ' ')}</Badge></td>
                      <td style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>{formatDate(p.createdAt)}</td>
                      <td>
                        {p.status !== 'suspended' && p.status !== 'completed' && p.status !== 'cancelled' && (
                          <Button variant="danger" size="sm" onClick={() => openModal('suspend_project', p)} style={{ fontSize: '11px' }}><Ban size={12} /> Suspend</Button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {(!projects.projects || projects.projects.length === 0) && <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: 'var(--space-xl)' }}>No projects found.</td></tr>}
                </tbody>
              </table>
            </div>
            <Pagination data={projects} loadFn={loadProjects} />
          </div>
        )}

        {/* ════════ CATEGORIES (preserved from Phase 1) ════════ */}
        {activeTab === 'categories' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 'var(--space-xl)' }} className="categories-layout-grid">
            <div>
              <h2 style={{ marginBottom: 'var(--space-lg)' }}>Add Category</h2>
              <div style={{ background: 'var(--glass-bg-secondary)', backdropFilter: 'blur(var(--glass-blur-secondary))', WebkitBackdropFilter: 'blur(var(--glass-blur-secondary))', border: '1px solid var(--glass-border-secondary)', borderRadius: 'var(--radius-xl)', padding: 'var(--space-xl)' }}>
                <form onSubmit={handleCreateCategory}>
                  <Input label="Category Name" placeholder="Mobile App Dev" value={newCategory.name} onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })} required />
                  <div className="form-group">
                    <label className="form-label">Description</label>
                    <textarea className="form-control" rows="3" placeholder="Describe what services fall under this category..." value={newCategory.description} onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })} required style={{ resize: 'vertical' }} />
                  </div>
                  <Select label="Lucide Icon" value={newCategory.iconName} onChange={(e) => setNewCategory({ ...newCategory, iconName: e.target.value })} options={['Sparkles', 'Code', 'Layout', 'PenTool', 'TrendingUp', 'Cpu', 'Image', 'Video', 'Briefcase', 'Music', 'Globe', 'BarChart2', 'BookOpen', 'Heart', 'Megaphone'].map(v => ({ value: v, label: v }))} />
                  <Button type="submit" variant="primary" fullWidth style={{ height: '44px', marginTop: 'var(--space-xs)' }}>Add Category</Button>
                </form>
              </div>
            </div>
            <div>
              <h3 style={{ marginBottom: 'var(--space-md)' }}>Taxonomy ({categories.length} Categories)</h3>
              <div className="data-table-wrapper">
                <table className="data-table">
                  <thead><tr><th>Icon</th><th>Name</th><th>ID</th><th>Slug</th><th>Subcategories</th><th>Actions</th></tr></thead>
                  <tbody>
                    {categories.map(c => {
                      const subCount = marketplaceService.getSubcategories ? marketplaceService.getSubcategories(c.id).length : 0;
                      return (
                        <tr key={c.id}>
                          <td><code style={{ color: 'var(--color-text-light)', fontSize: '11px' }}>{c.iconName}</code></td>
                          <td><strong>{c.name}</strong></td>
                          <td><code style={{ color: 'var(--color-text-muted)', fontSize: '11px' }}>{c.id}</code></td>
                          <td><code style={{ color: 'var(--color-text-light)', fontSize: '11px' }}>{c.slug}</code></td>
                          <td><Badge variant="default">{subCount} sub</Badge></td>
                          <td style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                            <Link to={`/categories/${c.slug}`} style={{ fontSize: '11px', color: 'var(--color-accent)' }}>Browse</Link>
                            <Button variant="danger" size="sm" onClick={() => handleDeleteCategory(c.id)} style={{ fontSize: '11px' }}>Delete</Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ════════ REPORTS ════════ */}
        {activeTab === 'reports' && (
          <div>
            <h2 style={{ marginBottom: 'var(--space-sm)' }}>Moderation Reports</h2>
            <div className="flex gap-sm" style={{ marginBottom: 'var(--space-md)', flexWrap: 'wrap' }}>
              <Select value={reportStatusFilter} onChange={e => { setReportStatusFilter(e.target.value); }} options={[{ value: '', label: 'All Reports' }, { value: 'open', label: 'Open' }, { value: 'under_review', label: 'Under Review' }, { value: 'resolved', label: 'Resolved' }, { value: 'dismissed', label: 'Dismissed' }]} />
              <Button variant="primary" size="sm" onClick={() => loadReports(1)}><Search size={14} /> Filter</Button>
            </div>
            <div className="data-table-wrapper">
              <table className="data-table">
                <thead><tr><th>Report</th><th>Target</th><th>Reporter</th><th>Reason</th><th>Status</th><th>Filed</th><th>Actions</th></tr></thead>
                <tbody>
                  {(reports.reports || []).map(r => (
                    <tr key={r.id}>
                      <td><code style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>{r.id}</code></td>
                      <td>
                        <Badge variant="default">{(r.targetType || '').toUpperCase()}</Badge>
                        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: 2 }}>{r.targetId}</div>
                      </td>
                      <td style={{ fontSize: 'var(--text-sm)' }}>{r.reporterName || r.reporterId}</td>
                      <td style={{ fontSize: 'var(--text-sm)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.reason}</td>
                      <td><Badge variant={statusVariant(r.status)}>{(r.status || '').toUpperCase().replace('_', ' ')}</Badge></td>
                      <td style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>{formatDate(r.createdAt)}</td>
                      <td>
                        <div className="flex gap-xs" style={{ flexWrap: 'wrap' }}>
                          {r.status === 'open' && (
                            <Button variant="outline" size="sm" onClick={() => openModal('review_report', r)} style={{ fontSize: '11px' }}><Eye size={12} /> Review</Button>
                          )}
                          {(r.status === 'open' || r.status === 'under_review') && (
                            <>
                              <Button variant="primary" size="sm" onClick={() => openModal('resolve_report', r)} style={{ fontSize: '11px' }}><CheckCircle size={12} /> Resolve</Button>
                              <Button variant="danger" size="sm" onClick={() => openModal('dismiss_report', r)} style={{ fontSize: '11px' }}><XCircle size={12} /> Dismiss</Button>
                            </>
                          )}
                          {(r.status === 'resolved' || r.status === 'dismissed') && (
                            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>Closed</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {(!reports.reports || reports.reports.length === 0) && <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: 'var(--space-xl)' }}>No reports found.</td></tr>}
                </tbody>
              </table>
            </div>
            <Pagination data={reports} loadFn={loadReports} />
          </div>
        )}

        {/* ════════ AUDIT LOG ════════ */}
        {activeTab === 'audit' && (
          <div>
            <h2 style={{ marginBottom: 'var(--space-sm)' }}>Audit Trail</h2>
            <p style={{ marginBottom: 'var(--space-md)', color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>Immutable record of all administrative actions</p>
            <div className="data-table-wrapper">
              <table className="data-table">
                <thead><tr><th>Timestamp</th><th>Administrator</th><th>Action</th><th>Entity</th><th>Details</th></tr></thead>
                <tbody>
                  {(auditLogs.logs || []).map(l => (
                    <tr key={l.id}>
                      <td style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
                        {new Date(l.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td style={{ fontSize: 'var(--text-sm)' }}>{l.adminName || l.adminId}</td>
                      <td><Badge variant={l.action?.includes('SUSPEND') || l.action?.includes('REJECT') || l.action?.includes('DISMISS') ? 'error' : l.action?.includes('APPROVE') || l.action?.includes('REACTIVATE') || l.action?.includes('RESOLVED') ? 'success' : 'warning'}>{l.action}</Badge></td>
                      <td>
                        <Badge variant="default">{(l.entityType || '').toUpperCase()}</Badge>
                        <code style={{ fontSize: '10px', color: 'var(--color-text-muted)', marginLeft: 6 }}>{l.entityId}</code>
                      </td>
                      <td style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {l.metadata?.reason || l.metadata?.resolution_note || l.metadata?.title || l.metadata?.target_user_name || '—'}
                      </td>
                    </tr>
                  ))}
                  {(!auditLogs.logs || auditLogs.logs.length === 0) && <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: 'var(--space-xl)' }}>No audit logs yet.</td></tr>}
                </tbody>
              </table>
            </div>
            <Pagination data={auditLogs} loadFn={loadAuditLogs} />
          </div>
        )}
      </main>

      {/* ═══════ CONFIRMATION MODAL ═══════ */}
      <Modal
        isOpen={modal.open}
        onClose={closeModal}
        title={modalTitles[modal.type] || 'Confirm Action'}
        maxWidth="480px"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={closeModal} disabled={loading}>Cancel</Button>
            {modal.type === 'delete_category' ? (
              <Button variant="danger" size="sm" onClick={executeDeleteCategory} disabled={loading}>{loading ? 'Deleting...' : 'Delete Category'}</Button>
            ) : (
              <Button
                variant={modal.type?.includes('suspend') || modal.type?.includes('reject') || modal.type?.includes('dismiss') ? 'danger' : 'primary'}
                size="sm"
                onClick={executeAction}
                disabled={loading || (needsReason.includes(modal.type) && modal.type?.includes('reject') && !modalReason)}
              >
                {loading ? 'Processing...' : 'Confirm'}
              </Button>
            )}
          </>
        }
      >
        {modal.type === 'reactivate_user' && <p>Are you sure you want to reactivate <strong>{modal.target?.name}</strong>&apos;s account?</p>}
        {modal.type === 'approve_service' && <p>Approve and publish <strong>&quot;{modal.target?.title}&quot;</strong> to the marketplace?</p>}
        {modal.type === 'review_report' && <p>Mark report <strong>{modal.target?.id}</strong> as under review?</p>}
        {modal.type === 'delete_category' && <p>Are you sure you want to permanently delete this category? This action cannot be undone.</p>}

        {needsReason.includes(modal.type) && (
          <div style={{ marginTop: 'var(--space-sm)' }}>
            {modal.type === 'suspend_user' && <p style={{ marginBottom: 'var(--space-sm)' }}>Suspend <strong>{modal.target?.name}</strong>&apos;s account? They will lose access.</p>}
            {modal.type === 'reject_service' && <p style={{ marginBottom: 'var(--space-sm)' }}>Reject <strong>&quot;{modal.target?.title}&quot;</strong>? A reason is required.</p>}
            {modal.type === 'suspend_service' && <p style={{ marginBottom: 'var(--space-sm)' }}>Suspend <strong>&quot;{modal.target?.title}&quot;</strong> from the marketplace?</p>}
            {modal.type === 'suspend_project' && <p style={{ marginBottom: 'var(--space-sm)' }}>Suspend project <strong>&quot;{modal.target?.title}&quot;</strong>?</p>}
            {modal.type === 'resolve_report' && <p style={{ marginBottom: 'var(--space-sm)' }}>Resolve report <strong>{modal.target?.id}</strong>? Optionally add a note.</p>}
            {modal.type === 'dismiss_report' && <p style={{ marginBottom: 'var(--space-sm)' }}>Dismiss report <strong>{modal.target?.id}</strong>? Optionally add a note.</p>}
            <textarea
              className="form-control"
              rows="3"
              placeholder={modal.type?.includes('reject') ? 'Reason is required...' : 'Reason or note (optional)...'}
              value={modalReason}
              onChange={e => setModalReason(e.target.value)}
              style={{ resize: 'vertical', width: '100%' }}
              required={modal.type?.includes('reject')}
            />
          </div>
        )}
      </Modal>

      <style>{`
        @media (min-width: 1024px) {
          .categories-layout-grid {
            grid-template-columns: 1fr 2fr;
          }
        }
        @keyframes admin-toast-in {
          from { opacity: 0; transform: translateY(-12px) scale(0.96); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
};

export default AdminDashboard;
