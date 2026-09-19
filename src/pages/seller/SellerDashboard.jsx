import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { authService } from '../../services/authService';
import { marketplaceService } from '../../services/marketplaceService';
import { orderService } from '../../services/orderService';
import { projectApi } from '../../services/api/projectApi';
import { contractApi } from '../../services/api/contractApi';
import Avatar from '../../components/ui/Avatar';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import DashboardSidebar from '../../components/dashboard/DashboardSidebar';
import {
  LayoutDashboard, ShoppingBag, PlusCircle, FileText, Mail,
  CheckCircle, Clock, ChevronDown, ChevronUp, ShieldCheck,
  Compass, AlertTriangle, Eye, X, Edit3, Archive, Trash2, Send,
  Layers, Check, RefreshCw, Briefcase, Sparkles, ShoppingCart
} from 'lucide-react';

// Order Status Timeline
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

// Harsh message detection for Right Speech Assistant
const HARSH_TERMS = ['terrible', 'horrible', 'useless', 'garbage', 'fix this right now', 'stupid', 'worst', 'unacceptable'];

export default function SellerDashboard() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'dashboard';

  const [currentUser, setCurrentUser] = useState(authService.getCurrentUser());

  useEffect(() => {
    const handleAuth = () => setCurrentUser(authService.getCurrentUser());
    window.addEventListener('authChange', handleAuth);
    return () => window.removeEventListener('authChange', handleAuth);
  }, []);
  const [services, setServices] = useState([]);
  const [servicesLoading, setServicesLoading] = useState(false);
  const [serviceStatusFilter, setServiceStatusFilter] = useState('all');
  const [orders, setOrders] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);

  // Service Form State (supports both create and edit)
  const initialFormState = {
    title: '',
    categoryId: '',
    subcategoryId: '',
    description: '',
    price: '100',
    deliveryTime: '3',
    revisions: '2',
    image: 'https://images.unsplash.com/photo-1547082299-de196ea013d6?w=800&q=80',
    tags: '',
    problemSolved: '',
    whoItHelps: '',
    valueCreated: '',
    packages: [
      {
        tier: 'basic',
        name: 'Basic',
        title: 'Basic Starter',
        description: 'Core deliverables and standard quality.',
        price: '100',
        deliveryDays: '3',
        revisions: '2',
        features: 'Core features, Responsive layout',
      },
      {
        tier: 'standard',
        name: 'Standard',
        title: 'Standard Growth',
        description: 'Complete deliverables with enhanced options.',
        price: '200',
        deliveryDays: '5',
        revisions: '5',
        features: 'All basic features, Source code, Priority review',
      },
      {
        tier: 'premium',
        name: 'Premium',
        title: 'Full Turnkey Suite',
        description: 'Full-featured package with premium priority.',
        price: '350',
        deliveryDays: '7',
        revisions: '10',
        features: 'Complete solution, Source files, 30-day support, Deployment',
      },
    ],
  };

  const [serviceForm, setServiceForm] = useState(initialFormState);
  const [editingServiceId, setEditingServiceId] = useState(null);
  const [ethicalConfirmed, setEthicalConfirmed] = useState(false);
  const [activePackageTab, setActivePackageTab] = useState('basic');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [actionFeedback, setActionFeedback] = useState(null);

  // Focus Mode State
  const [focusOrder, setFocusOrder] = useState(null);
  const [focusTimer, setFocusTimer] = useState(1500); // 25 mins
  const [focusActive, setFocusActive] = useState(false);

  // Chat & Right Speech State
  const [selectedOrderChat, setSelectedOrderChat] = useState(null);
  const [chatMessage, setChatMessage] = useState('');
  const [speechSuggestion, setSpeechSuggestion] = useState(null);
  const [expandedOrderId, setExpandedOrderId] = useState(null);

  // My Proposals State (Phase 5)
  const [myProposals, setMyProposals] = useState([]);
  const [loadingProposals, setLoadingProposals] = useState(false);
  const [withdrawFeedback, setWithdrawFeedback] = useState(null);

  // My Contracts State (Phase 6A)
  const [myContracts, setMyContracts] = useState([]);
  const [loadingContracts, setLoadingContracts] = useState(false);

  const fetchMyContracts = async () => {
    setLoadingContracts(true);
    try {
      const contracts = await contractApi.getMyContracts();
      setMyContracts(contracts || []);
    } catch (err) {
      console.error('[SellerDashboard] Failed to load contracts:', err);
    } finally {
      setLoadingContracts(false);
    }
  };

  const fetchMyProposals = async () => {
    setLoadingProposals(true);
    try {
      const props = await projectApi.getMyProposals();
      setMyProposals(props || []);
    } catch (err) {
      console.error('[SellerDashboard] Failed to load proposals:', err);
    } finally {
      setLoadingProposals(false);
    }
  };

  const handleWithdrawProposal = async (proposalId) => {
    if (!window.confirm('Withdraw this proposal? This action cannot be undone.')) return;
    try {
      await projectApi.withdrawProposal(proposalId);
      setWithdrawFeedback({ type: 'success', text: 'Proposal withdrawn successfully.' });
      fetchMyProposals();
    } catch (err) {
      setWithdrawFeedback({ type: 'error', text: err.message || 'Failed to withdraw.' });
    }
  };

  // Load Seller Data
  const loadSellerServices = async (status = serviceStatusFilter) => {
    setServicesLoading(true);
    try {
      const res = await marketplaceService.getMyServices({
        status: status !== 'all' ? status : undefined,
      });
      const list = res?.services || (Array.isArray(res) ? res : []);
      setServices(list);
    } catch (err) {
      console.error('[SellerDashboard] Error fetching seller services:', err);
    } finally {
      setServicesLoading(false);
    }
  };

  useEffect(() => {
    if (!currentUser || (currentUser.role !== 'freelancer' && currentUser.role !== 'seller')) {
      navigate('/login');
      return;
    }
    setOrders(orderService.getOrdersForUser(currentUser.id, 'freelancer'));

    let isMounted = true;
    async function loadTaxonomy() {
      try {
        const cats = await marketplaceService.getCategories();
        if (!isMounted) return;
        setCategories(cats || []);

        if (cats && cats.length > 0) {
          const firstCat = cats[0];
          const firstSubs = await marketplaceService.getSubcategories(firstCat.slug || firstCat.id);
          if (!isMounted) return;
          setSubcategories(firstSubs || []);
          setServiceForm(prev => prev.categoryId ? prev : ({
            ...prev,
            categoryId: firstCat.id,
            subcategoryId: firstSubs[0]?.id || '',
          }));
        }
      } catch (err) {
        console.error('[SellerDashboard] Error loading taxonomy:', err);
      }
    }

    loadTaxonomy();
    loadSellerServices();
    fetchMyProposals();
    fetchMyContracts();

    return () => { isMounted = false; };
  }, [currentUser, navigate]);

  // Reload services when activeTab or filter changes
  useEffect(() => {
    if (activeTab === 'services') {
      loadSellerServices(serviceStatusFilter);
    }
  }, [activeTab, serviceStatusFilter]);

  // Focus Timer Effect
  useEffect(() => {
    let timer;
    if (focusActive && focusTimer > 0) {
      timer = setInterval(() => setFocusTimer(prev => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [focusActive, focusTimer]);

  const handleTabChange = (t) => {
    if (t !== 'create-service' && editingServiceId) {
      setEditingServiceId(null);
      setServiceForm(initialFormState);
      setFormErrors({});
    }
    setSearchParams({ tab: t });
  };

  // Switch Category & load subcategories
  const handleCategoryChangeInForm = async (catId) => {
    const catObj = categories.find(c => c.id === catId || c.slug === catId);
    try {
      const subs = await marketplaceService.getSubcategories(catObj?.slug || catId);
      setSubcategories(subs || []);
      setServiceForm(prev => ({
        ...prev,
        categoryId: catId,
        subcategoryId: subs[0] ? subs[0].id : '',
      }));
    } catch (err) {
      console.error('[SellerDashboard] Error fetching subcategories:', err);
      setSubcategories([]);
    }
  };

  // Package field updater
  const handlePackageChange = (tier, field, value) => {
    setServiceForm(prev => ({
      ...prev,
      packages: prev.packages.map(p => (p.tier === tier ? { ...p, [field]: value } : p)),
    }));
  };

  // Populate Form for Editing an Existing Service
  const handleStartEdit = async (service) => {
    setEditingServiceId(service.id);
    setFormErrors({});

    // Load category subcategories if different
    const catObj = categories.find(c => c.id === service.categoryId || c.slug === service.categorySlug);
    if (catObj) {
      const subs = await marketplaceService.getSubcategories(catObj.slug || catObj.id);
      setSubcategories(subs || []);
    }

    // Build packages list from service.packages map or fallback
    let pkgList = initialFormState.packages;
    if (service.packages && Object.keys(service.packages).length > 0) {
      pkgList = ['basic', 'standard', 'premium'].map(tier => {
        const existingPkg = service.packages[tier];
        if (existingPkg) {
          const feats = Array.isArray(existingPkg.features)
            ? existingPkg.features.join(', ')
            : existingPkg.features || '';
          return {
            tier,
            name: existingPkg.name || tier.toUpperCase(),
            title: existingPkg.title || `${tier.toUpperCase()} Package`,
            description: existingPkg.description || '',
            price: String(existingPkg.price || 50),
            deliveryDays: String(existingPkg.deliveryTime || 3),
            revisions: String(existingPkg.revisions || 2),
            features: feats,
          };
        }
        return initialFormState.packages.find(p => p.tier === tier);
      });
    }

    setServiceForm({
      title: service.title || '',
      categoryId: service.categoryId || '',
      subcategoryId: service.subcategoryId || '',
      description: service.description || '',
      price: String(service.startingPrice || 50),
      deliveryTime: String(service.deliveryDays || 3),
      revisions: '2',
      image: service.coverImage || service.imageUrl || '',
      tags: Array.isArray(service.tags) ? service.tags.join(', ') : service.tags || '',
      problemSolved: service.problemSolved || '',
      whoItHelps: service.whoItHelps || '',
      valueCreated: service.valueCreated || '',
      packages: pkgList,
    });

    setEthicalConfirmed(true);
    setSearchParams({ tab: 'create-service' });
  };

  // Submit Handler: Save Draft or Publish
  const handleSaveService = async (targetStatus) => {
    setFormErrors({});
    setIsSubmitting(true);

    try {
      const tagsArray = serviceForm.tags
        ? serviceForm.tags.split(',').map(t => t.trim()).filter(Boolean)
        : [];

      // Format packages payload
      const formattedPackages = serviceForm.packages.map(p => ({
        tier: p.tier,
        name: p.name || p.tier,
        title: p.title || `${p.name} Package`,
        description: p.description || '',
        price: Number(p.price) || 50,
        delivery_days: Number(p.deliveryDays) || 3,
        revisions: Number(p.revisions) || 0,
        features: typeof p.features === 'string'
          ? p.features.split(',').map(f => f.trim()).filter(Boolean)
          : p.features || [],
      }));

      const payload = {
        title: serviceForm.title,
        description: serviceForm.description,
        category_id: serviceForm.categoryId,
        subcategory_id: serviceForm.subcategoryId,
        image_url: serviceForm.image,
        cover_image: serviceForm.image,
        status: targetStatus,
        starting_price: Number(formattedPackages[0]?.price) || Number(serviceForm.price) || 50,
        delivery_days: Number(formattedPackages[0]?.delivery_days) || Number(serviceForm.deliveryTime) || 3,
        tags: tagsArray,
        packages: formattedPackages,
        problem_solved: serviceForm.problemSolved,
        who_it_helps: serviceForm.whoItHelps,
        value_created: serviceForm.valueCreated,
      };

      let result;
      if (editingServiceId) {
        result = await marketplaceService.updateService(editingServiceId, payload);
        if (targetStatus === 'published' && result?.status !== 'published') {
          await marketplaceService.publishService(editingServiceId);
        }
        setActionFeedback({
          type: 'success',
          message: targetStatus === 'published' ? 'Service updated and published successfully!' : 'Service draft updated successfully!',
        });
      } else {
        result = await marketplaceService.createService(payload);
        if (targetStatus === 'published' && result?.id && result?.status !== 'published') {
          await marketplaceService.publishService(result.id);
        }
        setActionFeedback({
          type: 'success',
          message: targetStatus === 'published' ? 'Service created and published live!' : 'Service saved as draft successfully!',
        });
      }

      // Reset form & redirect to services tab
      setEditingServiceId(null);
      setServiceForm(initialFormState);
      setEthicalConfirmed(false);
      await loadSellerServices('all');
      setServiceStatusFilter('all');
      handleTabChange('services');
    } catch (err) {
      console.error('[SellerDashboard] Save error:', err);
      if (err.errors) {
        setFormErrors(err.errors);
      } else {
        setFormErrors({ general: err.message || 'Failed to save service' });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Publish from Dashboard
  const handlePublishService = async (serviceId) => {
    try {
      await marketplaceService.publishService(serviceId);
      setActionFeedback({ type: 'success', message: 'Service published live to marketplace!' });
      await loadSellerServices(serviceStatusFilter);
    } catch (err) {
      const msg = err.errors ? Object.values(err.errors).join(', ') : err.message;
      alert(`Cannot publish service: ${msg}`);
    }
  };

  // Archive from Dashboard
  const handleArchiveService = async (serviceId) => {
    if (!window.confirm('Are you sure you want to archive this service? It will be hidden from the public marketplace.')) {
      return;
    }
    try {
      await marketplaceService.archiveService(serviceId);
      setActionFeedback({ type: 'info', message: 'Service archived.' });
      await loadSellerServices(serviceStatusFilter);
    } catch (err) {
      alert(`Failed to archive service: ${err.message}`);
    }
  };

  // Delete from Dashboard (Drafts only)
  const handleDeleteService = async (serviceId) => {
    if (!window.confirm('Are you sure you want to permanently delete this draft service?')) {
      return;
    }
    try {
      await marketplaceService.deleteService(serviceId);
      setActionFeedback({ type: 'info', message: 'Draft service deleted.' });
      await loadSellerServices(serviceStatusFilter);
    } catch (err) {
      alert(`Cannot delete service: ${err.message}`);
    }
  };

  // Order Handlers
  const handleAcceptOrder = (orderId) => {
    orderService.acceptOrder(orderId);
    setOrders(orderService.getOrdersForUser(currentUser.id, 'freelancer'));
  };

  const handleRejectOrder = (orderId) => {
    orderService.rejectOrder(orderId);
    setOrders(orderService.getOrdersForUser(currentUser.id, 'freelancer'));
  };

  const handleDeliverOrder = (orderId) => {
    const text = prompt('Enter delivery notes / submission details for client review:');
    if (text) {
      orderService.deliverWork(orderId, { text, fileUrl: 'https://workstream.io/mock/delivered_file.zip' });
      setOrders(orderService.getOrdersForUser(currentUser.id, 'freelancer'));
    }
  };

  // Right Speech Check
  const handleChatMessageChange = (val) => {
    setChatMessage(val);
    const lower = val.toLowerCase();
    const hasHarsh = HARSH_TERMS.some(term => lower.includes(term));
    if (hasHarsh) {
      setSpeechSuggestion('Constructive Alternative: "The current version does not fully align with our discussed requirements. Could we revise the layout and component structure?"');
    } else {
      setSpeechSuggestion(null);
    }
  };

  const applySpeechSuggestion = () => {
    if (speechSuggestion) {
      setChatMessage('The current version does not fully align with our discussed requirements. Could we revise the layout and component structure?');
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

  const totalEarnings = orders.filter(o => o.status === 'completed').reduce((a, c) => a + c.price, 0);
  const trustProfile = marketplaceService.getTrustProfile(currentUser);

  const formatTimer = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const pendingOrdersCount = orders.filter(o => o.status !== 'completed' && o.status !== 'cancelled').length;
  const activeContractsCount = myContracts.filter(c => c.status === 'active' || c.status === 'in_progress').length;

  const sidebarSections = [
    {
      items: [
        { id: 'dashboard', icon: LayoutDashboard, label: 'Overview' },
        { id: 'proposals', icon: Briefcase, label: 'Proposals', badge: myProposals.length > 0 ? myProposals.length : undefined },
        { id: 'contracts', icon: Layers, label: 'Contracts', badge: activeContractsCount || (myContracts.length > 0 ? myContracts.length : undefined) },
        { id: 'services', icon: ShoppingBag, label: 'My Services', badge: services.length > 0 ? services.length : undefined },
        { id: 'orders', icon: FileText, label: 'Orders', badge: pendingOrdersCount > 0 ? pendingOrdersCount : undefined, badgeType: 'accent' },
        { id: 'messages', icon: Mail, label: 'Messages' },
      ]
    },
    {
      items: [
        { id: 'create-service', icon: PlusCircle, label: editingServiceId ? 'Edit Service' : '+ Create Service', isAction: true },
      ]
    }
  ];

  // Load proposals when the proposals tab becomes active
  useEffect(() => {
    if (activeTab === 'proposals') fetchMyProposals();
    if (activeTab === 'contracts') fetchMyContracts();
  }, [activeTab]);

  return (
    <div className="dashboard-container">

      {/* FOCUS MODE OVERLAY */}
      {focusOrder && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: '#090d16', color: '#fff', display: 'flex', flexDirection: 'column', padding: '40px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--color-accent)', fontWeight: 700 }}>
              <Compass size={20} />
              <span>FOCUS MODE — Mindful Execution</span>
            </div>
            <button onClick={() => setFocusOrder(null)} style={{ background: 'none', border: 'none', color: 'var(--color-text-light)', cursor: 'pointer' }}>
              <X size={24} />
            </button>
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', maxWidth: '700px', margin: '0 auto' }}>
            <div style={{ fontSize: '0.9rem', color: 'var(--color-accent)', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 700, marginBottom: '12px' }}>
              Single Intention Focus
            </div>

            <h1 style={{ fontSize: '2.2rem', fontWeight: 800, marginBottom: '16px' }}>
              {focusOrder.serviceTitle}
            </h1>

            <p style={{ color: 'var(--color-text-light)', fontSize: '1.1rem', marginBottom: '40px' }}>
              Client: {focusOrder.buyerName} • Target Delivery: {focusOrder.dueDate || 'In Progress'}
            </p>

            {/* TIMER */}
            <div style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.25)', borderRadius: '24px', padding: '30px 60px', marginBottom: '40px' }}>
              <div style={{ fontSize: '4rem', fontWeight: 800, fontFamily: 'monospace', color: 'var(--color-accent)', letterSpacing: '0.05em' }}>
                {formatTimer(focusTimer)}
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--color-text-light)', marginTop: '8px' }}>
                One task. One intention. Full attention.
              </div>
            </div>

            <div style={{ display: 'flex', gap: '16px' }}>
              <Button variant="primary" onClick={() => setFocusActive(!focusActive)}>
                {focusActive ? 'Pause Focus Session' : 'Start Focus Session'}
              </Button>
              <Button variant="outline" onClick={() => handleDeliverOrder(focusOrder.id)}>
                Deliver Finished Work
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* DASHBOARD SIDEBAR */}
      <DashboardSidebar
        user={currentUser}
        role="freelancer"
        roleBadge="Verified Freelancer"
        activeTab={activeTab}
        onTabChange={handleTabChange}
        sections={sidebarSections}
        footerWidget={
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '2px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
              <span className="sidebar-live-dot" />
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-accent)' }}>Ready for Orders</span>
            </div>
            <span style={{ fontSize: '0.74rem', color: 'var(--sidebar-text-sub)' }}>
              {orders.filter(o => o.status === 'completed').length} completed
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

      {/* MAIN CONTENT AREA */}
      <main className="dashboard-content">

        {/* Action Feedback Banner */}
        {actionFeedback && (
          <div style={{
            padding: '12px 18px',
            marginBottom: '20px',
            borderRadius: '10px',
            background: actionFeedback.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(59, 130, 246, 0.15)',
            border: `1px solid ${actionFeedback.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(59, 130, 246, 0.3)'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.9rem',
            color: '#fff'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle size={18} color="var(--color-accent)" />
              <span>{actionFeedback.message}</span>
            </div>
            <button onClick={() => setActionFeedback(null)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>
              <X size={16} />
            </button>
          </div>
        )}

        {/* ======== MY PROPOSALS (PHASE 5) ======== */}
        {activeTab === 'proposals' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg)', flexWrap: 'wrap', gap: 16 }}>
              <div>
                <h2 style={{ margin: 0 }}>My Submitted Proposals</h2>
                <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)', marginTop: 4 }}>
                  Track bids, proposal statuses, and client decisions for projects you have applied to.
                </p>
              </div>
              <Button variant="outline" onClick={fetchMyProposals} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <RefreshCw size={15} />
                <span>Refresh</span>
              </Button>
            </div>

            {withdrawFeedback && (
              <div
                style={{
                  padding: '10px 16px',
                  borderRadius: 8,
                  marginBottom: 16,
                  fontSize: '0.88rem',
                  background: withdrawFeedback.type === 'success' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                  border: `1px solid ${withdrawFeedback.type === 'success' ? 'rgba(16,185,129,0.4)' : '#ef4444'}`,
                  color: withdrawFeedback.type === 'success' ? 'var(--color-accent)' : '#fca5a5',
                }}
              >
                {withdrawFeedback.text}
              </div>
            )}

            {loadingProposals ? (
              <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--color-text-light)' }}>
                <div className="spinner" style={{ margin: '0 auto 16px' }} />
                <p>Loading your proposals...</p>
              </div>
            ) : myProposals.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 'var(--space-2xl)', border: '1px dashed rgba(255,255,255,0.08)', borderRadius: 'var(--radius-lg)', background: 'rgba(15,23,42,0.3)' }}>
                <Briefcase size={36} color="var(--color-accent)" style={{ margin: '0 auto 16px' }} />
                <h3 style={{ fontSize: '1.2rem', color: '#fff', marginBottom: 8 }}>No proposals submitted yet</h3>
                <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)', maxWidth: 400, margin: '0 auto 20px' }}>
                  Browse the open project marketplace and submit proposals to client briefs that match your skills.
                </p>
                <Button variant="primary" onClick={() => navigate('/projects')}>
                  Browse Open Projects
                </Button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {myProposals.map((prop) => {
                  const statusConfig = {
                    pending:   { bg: 'rgba(245,158,11,0.15)',  border: 'rgba(245,158,11,0.35)',  color: '#fbbf24', label: 'Pending Review' },
                    shortlisted: { bg: 'rgba(59,130,246,0.15)', border: 'rgba(59,130,246,0.35)', color: '#60a5fa', label: 'Shortlisted ⭐' },
                    accepted:  { bg: 'rgba(16,185,129,0.15)',  border: 'rgba(16,185,129,0.35)',  color: 'var(--color-accent)', label: 'Accepted ✓' },
                    rejected:  { bg: 'rgba(239,68,68,0.1)',    border: 'rgba(239,68,68,0.25)',    color: '#f87171', label: 'Not Selected' },
                    withdrawn: { bg: 'rgba(255,255,255,0.05)', border: 'rgba(255,255,255,0.1)',   color: 'var(--color-text-muted)', label: 'Withdrawn' },
                  };
                  const sc = statusConfig[prop.status] || statusConfig.pending;

                  return (
                    <div
                      key={prop.id}
                      style={{
                        background: 'rgba(15, 23, 42, 0.55)',
                        border: prop.status === 'accepted' ? '2px solid var(--color-accent)' : '1px solid rgba(255, 255, 255, 0.08)',
                        borderRadius: 14,
                        padding: '22px 24px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 14,
                      }}
                    >
                      {/* Status badge & project title */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                            <span
                              style={{
                                padding: '3px 10px',
                                borderRadius: 999,
                                background: sc.bg,
                                border: `1px solid ${sc.border}`,
                                color: sc.color,
                                fontSize: '0.78rem',
                                fontWeight: 700,
                              }}
                            >
                              {sc.label}
                            </span>
                            {prop.matchScore > 0 && (
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 4,
                                  padding: '2px 8px',
                                  borderRadius: 999,
                                  background: 'rgba(16,185,129,0.12)',
                                  border: '1px solid rgba(16,185,129,0.3)',
                                  color: 'var(--color-accent)',
                                  fontSize: '0.75rem',
                                  fontWeight: 700,
                                }}
                              >
                                <Sparkles size={11} />
                                {prop.matchScore}% Match
                              </span>
                            )}
                          </div>
                          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff', margin: '0 0 4px' }}>
                            {prop.projectTitle || 'Project Brief'}
                          </h3>
                          {prop.projectCategory && (
                            <div style={{ fontSize: '0.8rem', color: 'var(--color-accent)' }}>
                              {prop.projectCategory}
                            </div>
                          )}
                        </div>

                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--color-accent)' }}>
                            ${prop.bidAmount}
                          </div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
                            Your bid
                          </div>
                        </div>
                      </div>

                      {/* Bid meta */}
                      <div style={{ display: 'flex', gap: 24, padding: '10px 14px', background: 'rgba(0,0,0,0.15)', borderRadius: 8, fontSize: '0.85rem', flexWrap: 'wrap' }}>
                        <div>
                          <span style={{ color: 'var(--color-text-muted)' }}>Delivery: </span>
                          <strong>{prop.deliveryDays} days</strong>
                          {prop.estimatedDuration && <span style={{ color: 'var(--color-text-muted)' }}> ({prop.estimatedDuration})</span>}
                        </div>
                        <div>
                          <span style={{ color: 'var(--color-text-muted)' }}>Submitted: </span>
                          <strong>{prop.createdAt ? new Date(prop.createdAt).toLocaleDateString() : 'Recently'}</strong>
                        </div>
                      </div>

                      {/* Cover letter snippet */}
                      <div
                        style={{
                          fontSize: '0.88rem',
                          color: 'var(--color-text-light)',
                          lineHeight: 1.6,
                          display: '-webkit-box',
                          WebkitLineClamp: 3,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                          background: 'rgba(255,255,255,0.02)',
                          padding: '10px 14px',
                          borderRadius: 8,
                        }}
                      >
                        {prop.coverLetter}
                      </div>

                      {/* Action row */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/projects/${prop.projectId}`)}
                          style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                        >
                          <Eye size={14} />
                          <span>View Project Brief</span>
                        </Button>

                        {(prop.status === 'pending' || prop.status === 'shortlisted') && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleWithdrawProposal(prop.id)}
                            style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#f87171' }}
                          >
                            <X size={14} />
                            <span>Withdraw Proposal</span>
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ======== DASHBOARD OVERVIEW ======== */}
        {activeTab === 'dashboard' && (
          <div>
            <h2 style={{ marginBottom: 'var(--space-lg)' }}>Freelancer Workspace</h2>

            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-value">${totalEarnings}</div>
                <div className="stat-label">Net Cleared Earnings</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{orders.filter(o => o.status === 'active' || o.status === 'requirements_submitted').length}</div>
                <div className="stat-label">Active Orders</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{services.length}</div>
                <div className="stat-label">Total Services</div>
              </div>
              <div className="stat-card">
                <div className="stat-value" style={{ color: 'var(--color-accent)' }}>{trustProfile?.rating || '5.0'} ★</div>
                <div className="stat-label">Trust Score ({trustProfile?.growthTier})</div>
              </div>
            </div>

            {/* TRUST PROFILE WIDGET */}
            <div style={{
              background: 'var(--glass-bg-secondary)',
              backdropFilter: 'blur(var(--glass-blur-secondary))',
              border: '1px solid var(--glass-border-secondary)',
              borderRadius: 'var(--radius-xl)',
              padding: 'var(--space-lg)',
              marginTop: 'var(--space-xl)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-accent)', fontWeight: 700, marginBottom: '14px' }}>
                <ShieldCheck size={18} />
                <span>Your Verified Trust Profile</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px', fontSize: '0.85rem' }}>
                <div>Verified Identity: <strong style={{ color: '#fff' }}>Yes ✓</strong></div>
                <div>Completed Projects: <strong style={{ color: '#fff' }}>{trustProfile?.completedProjects}</strong></div>
                <div>Overall Rating: <strong style={{ color: '#fff' }}>{trustProfile?.rating} / 5.0</strong></div>
                <div>Recent 6-Month Rating: <strong style={{ color: 'var(--color-accent)' }}>{trustProfile?.recentRating} / 5.0</strong></div>
                <div>Returning Clients: <strong style={{ color: '#fff' }}>{trustProfile?.returningClientsCount}</strong></div>
                <div>Avg Response: <strong style={{ color: '#fff' }}>~{trustProfile?.responseTimeHours} hour</strong></div>
              </div>
            </div>
          </div>
        )}

        {/* ======== SERVICES MANAGEMENT (PHASE 4B) ======== */}
        {activeTab === 'services' && (
          <div>
            <div className="flex justify-between items-center" style={{ marginBottom: 'var(--space-md)', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h2>My Service Listings</h2>
                <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>
                  Manage drafts, published marketplace offerings, and archived services.
                </p>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <Button variant="outline" size="sm" onClick={() => loadSellerServices(serviceStatusFilter)}>
                  <RefreshCw size={14} style={{ marginRight: '6px' }} /> Refresh
                </Button>
                <Button variant="primary" onClick={() => { setEditingServiceId(null); setServiceForm(initialFormState); handleTabChange('create-service'); }}>
                  <PlusCircle size={16} style={{ marginRight: '6px' }} /> Add New Gig
                </Button>
              </div>
            </div>

            {/* LIFECYCLE FILTER TABS */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: 'var(--space-lg)', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '10px' }}>
              {[
                { id: 'all', label: 'All Services' },
                { id: 'published', label: 'Published' },
                { id: 'draft', label: 'Drafts' },
                { id: 'archived', label: 'Archived' },
              ].map(f => {
                const count = f.id === 'all'
                  ? services.length
                  : services.filter(s => s.status === f.id).length;
                const isSelected = serviceStatusFilter === f.id;
                return (
                  <button
                    key={f.id}
                    onClick={() => setServiceStatusFilter(f.id)}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '8px',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      background: isSelected ? 'var(--color-accent)' : 'rgba(255,255,255,0.04)',
                      color: isSelected ? '#000' : 'var(--color-text-main)',
                      border: `1px solid ${isSelected ? 'var(--color-accent)' : 'rgba(255,255,255,0.08)'}`,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                  >
                    {f.label} ({count})
                  </button>
                );
              })}
            </div>

            {/* SERVICES TABLE / LISTING */}
            {servicesLoading ? (
              <div style={{ textAlign: 'center', padding: 'var(--space-2xl)', color: 'var(--color-text-muted)' }}>
                <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 12px' }} />
                Loading your services...
              </div>
            ) : services.length > 0 ? (
              <div className="data-table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Thumbnail</th>
                      <th>Title</th>
                      <th>Category</th>
                      <th>Status</th>
                      <th>Starting Price</th>
                      <th>Delivery</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {services
                      .filter(s => serviceStatusFilter === 'all' || s.status === serviceStatusFilter)
                      .map(s => {
                        const statusVariant = s.status === 'published' ? 'success' : s.status === 'draft' ? 'warning' : 'default';
                        return (
                          <tr key={s.id}>
                            <td>
                              <img
                                src={s.coverImage || s.imageUrl || 'https://images.unsplash.com/photo-1547082299-de196ea013d6?w=800&q=80'}
                                alt={s.title}
                                style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-sm)', objectFit: 'cover', border: '1px solid rgba(255,255,255,0.08)' }}
                              />
                            </td>
                            <td style={{ maxWidth: '240px' }}>
                              <div style={{ fontWeight: 'var(--weight-semibold)', color: 'var(--color-text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {s.title}
                              </div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                                ID: {s.id}
                              </div>
                            </td>
                            <td>
                              <Badge variant="default">{s.categorySlug || s.categoryId || 'GENERAL'}</Badge>
                            </td>
                            <td>
                              <Badge variant={statusVariant}>
                                {s.status?.toUpperCase() || 'DRAFT'}
                              </Badge>
                            </td>
                            <td style={{ color: 'var(--color-accent)', fontWeight: 'var(--weight-semibold)' }}>
                              ${s.startingPrice}
                            </td>
                            <td>{s.deliveryDays}d</td>
                            <td>
                              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                {s.status === 'draft' && (
                                  <button
                                    onClick={() => handlePublishService(s.id)}
                                    title="Publish Live"
                                    style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', color: 'var(--color-accent)', borderRadius: '6px', padding: '5px 8px', cursor: 'pointer', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                                  >
                                    <Send size={12} /> Publish
                                  </button>
                                )}

                                <button
                                  onClick={() => handleStartEdit(s)}
                                  title="Edit Service"
                                  style={{ background: 'rgba(255, 255, 255, 0.06)', border: '1px solid rgba(255, 255, 255, 0.12)', color: 'var(--color-text-main)', borderRadius: '6px', padding: '5px 8px', cursor: 'pointer', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                                >
                                  <Edit3 size={12} /> Edit
                                </button>

                                {s.status === 'published' && (
                                  <>
                                    <Link
                                      to={`/service/${s.id}`}
                                      title="View Public Listing"
                                      style={{ background: 'rgba(59, 130, 246, 0.15)', border: '1px solid rgba(59, 130, 246, 0.3)', color: '#60a5fa', borderRadius: '6px', padding: '5px 8px', textDecoration: 'none', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                                    >
                                      <Eye size={12} /> View
                                    </Link>
                                    <button
                                      onClick={() => handleArchiveService(s.id)}
                                      title="Archive Service"
                                      style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', color: 'var(--color-text-muted)', borderRadius: '6px', padding: '5px 8px', cursor: 'pointer', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                                    >
                                      <Archive size={12} /> Archive
                                    </button>
                                  </>
                                )}

                                {s.status === 'archived' && (
                                  <button
                                    onClick={() => handlePublishService(s.id)}
                                    title="Restore & Publish"
                                    style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', color: 'var(--color-accent)', borderRadius: '6px', padding: '5px 8px', cursor: 'pointer', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                                  >
                                    <RefreshCw size={12} /> Restore
                                  </button>
                                )}

                                {s.status === 'draft' && (
                                  <button
                                    onClick={() => handleDeleteService(s.id)}
                                    title="Delete Draft"
                                    style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#f87171', borderRadius: '6px', padding: '5px 8px', cursor: 'pointer', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                                  >
                                    <Trash2 size={12} /> Delete
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: 'var(--space-2xl)', border: '1px dashed rgba(255,255,255,0.08)', borderRadius: 'var(--radius-lg)' }}>
                <h3 style={{ marginBottom: 'var(--space-xs)' }}>No services found</h3>
                <p style={{ marginBottom: 'var(--space-md)', color: 'var(--color-text-muted)' }}>
                  {serviceStatusFilter === 'all'
                    ? 'Launch your first service offering to attract buyers across the marketplace.'
                    : `No ${serviceStatusFilter} services available.`}
                </p>
                <Button variant="primary" onClick={() => { setEditingServiceId(null); setServiceForm(initialFormState); handleTabChange('create-service'); }}>
                  Create First Gig
                </Button>
              </div>
            )}
          </div>
        )}

        {/* ======== CREATE / EDIT SERVICE FORM (RIGHT LIVELIHOOD & MULTI-PACKAGE) ======== */}
        {activeTab === 'create-service' && (
          <div style={{ maxWidth: '780px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)' }}>
              <div>
                <h2>{editingServiceId ? 'Edit Service Listing' : 'Create a New Service'}</h2>
                <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>
                  {editingServiceId
                    ? 'Update your service details, tier packages, and publish readiness.'
                    : 'Publish a clear, honest service offering grounded in utility and value created.'}
                </p>
              </div>
              {editingServiceId && (
                <Button variant="outline" size="sm" onClick={() => { setEditingServiceId(null); setServiceForm(initialFormState); }}>
                  Cancel Edit
                </Button>
              )}
            </div>

            {/* Validation Errors Alert Banner */}
            {Object.keys(formErrors).length > 0 && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '10px',
                padding: '14px 18px',
                marginBottom: '20px',
                color: '#fca5a5',
                fontSize: '0.85rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, marginBottom: '6px' }}>
                  <AlertTriangle size={16} />
                  <span>Please resolve the following errors:</span>
                </div>
                <ul style={{ paddingLeft: '20px', margin: 0 }}>
                  {Object.entries(formErrors).map(([key, msg]) => (
                    <li key={key}>{msg}</li>
                  ))}
                </ul>
              </div>
            )}

            <div style={{
              background: 'var(--glass-bg-secondary)',
              backdropFilter: 'blur(var(--glass-blur-secondary))',
              border: '1px solid var(--glass-border-secondary)',
              borderRadius: 'var(--radius-xl)',
              padding: 'var(--space-xl)'
            }}>
              <form onSubmit={(e) => { e.preventDefault(); handleSaveService('published'); }}>
                
                {/* Basic Information */}
                <Input
                  label="Service Title"
                  placeholder="I will design a modern Figma landing page..."
                  value={serviceForm.title}
                  onChange={(e) => setServiceForm({ ...serviceForm, title: e.target.value })}
                  required
                />

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-sm)' }}>
                  <Select
                    label="Category"
                    value={serviceForm.categoryId}
                    onChange={(e) => handleCategoryChangeInForm(e.target.value)}
                    options={categories.map(c => ({ value: c.id, label: c.name }))}
                  />
                  <Select
                    label="Subcategory"
                    value={serviceForm.subcategoryId}
                    onChange={(e) => setServiceForm({ ...serviceForm, subcategoryId: e.target.value })}
                    options={subcategories.map(s => ({ value: s.id, label: s.name }))}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Service Description</label>
                  <textarea
                    className="form-control"
                    rows="3"
                    placeholder="Describe exactly what this service includes..."
                    value={serviceForm.description}
                    onChange={(e) => setServiceForm({ ...serviceForm, description: e.target.value })}
                    required
                    style={{ resize: 'vertical' }}
                  />
                </div>

                {/* SERVICE PACKAGES BUILDER (BASIC, STANDARD, PREMIUM) */}
                <div style={{
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '12px',
                  padding: '16px',
                  marginBottom: '20px'
                }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-accent)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Layers size={16} />
                    <span>SERVICE PRICING PACKAGES</span>
                  </div>

                  {/* Package Selector Tabs */}
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                    {serviceForm.packages.map(p => (
                      <button
                        type="button"
                        key={p.tier}
                        onClick={() => setActivePackageTab(p.tier)}
                        style={{
                          flex: 1,
                          padding: '8px',
                          borderRadius: '8px',
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          background: activePackageTab === p.tier ? 'var(--color-accent)' : 'rgba(255,255,255,0.05)',
                          color: activePackageTab === p.tier ? '#000' : 'var(--color-text-main)',
                          border: 'none',
                          cursor: 'pointer',
                        }}
                      >
                        {p.name.toUpperCase()} (${p.price})
                      </button>
                    ))}
                  </div>

                  {/* Active Package Form Fields */}
                  {serviceForm.packages.map(pkg => {
                    if (pkg.tier !== activePackageTab) return null;
                    return (
                      <div key={pkg.tier}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-sm)' }}>
                          <Input
                            label="Package Title"
                            placeholder="e.g. Standard Website"
                            value={pkg.title}
                            onChange={(e) => handlePackageChange(pkg.tier, 'title', e.target.value)}
                          />
                          <Input
                            label="Price ($)"
                            type="number"
                            value={pkg.price}
                            onChange={(e) => handlePackageChange(pkg.tier, 'price', e.target.value)}
                            required
                          />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-sm)' }}>
                          <Input
                            label="Delivery Days"
                            type="number"
                            value={pkg.deliveryDays}
                            onChange={(e) => handlePackageChange(pkg.tier, 'deliveryDays', e.target.value)}
                            required
                          />
                          <Input
                            label="Included Revisions"
                            type="number"
                            value={pkg.revisions}
                            onChange={(e) => handlePackageChange(pkg.tier, 'revisions', e.target.value)}
                          />
                        </div>

                        <div className="form-group">
                          <label className="form-label" style={{ fontSize: '0.8rem' }}>Tier Description</label>
                          <input
                            type="text"
                            className="form-control"
                            placeholder="Deliverables included in this tier..."
                            value={pkg.description}
                            onChange={(e) => handlePackageChange(pkg.tier, 'description', e.target.value)}
                          />
                        </div>

                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label className="form-label" style={{ fontSize: '0.8rem' }}>Features (comma-separated)</label>
                          <input
                            type="text"
                            className="form-control"
                            placeholder="e.g. Responsive design, Source code, Deployment"
                            value={pkg.features}
                            onChange={(e) => handlePackageChange(pkg.tier, 'features', e.target.value)}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* RIGHT LIVELIHOOD — VALUE CREATED SECTION */}
                <div style={{ background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-accent)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <ShieldCheck size={16} />
                    <span>WORK WITH PURPOSE — VALUE CREATED</span>
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '0.8rem' }}>What problem does this service solve?</label>
                    <input type="text" className="form-control" placeholder="e.g. Businesses struggle to communicate their value proposition clearly." value={serviceForm.problemSolved} onChange={(e) => setServiceForm({ ...serviceForm, problemSolved: e.target.value })} />
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '0.8rem' }}>Who does it help?</label>
                    <input type="text" className="form-control" placeholder="e.g. Early-stage startups and small business founders." value={serviceForm.whoItHelps} onChange={(e) => setServiceForm({ ...serviceForm, whoItHelps: e.target.value })} />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.8rem' }}>What lasting value does it create?</label>
                    <input type="text" className="form-control" placeholder="e.g. Builds customer trust and conversion without dark patterns." value={serviceForm.valueCreated} onChange={(e) => setServiceForm({ ...serviceForm, valueCreated: e.target.value })} />
                  </div>
                </div>

                {/* ETHICAL WORK GUIDANCE CHECKBOX */}
                <div style={{ marginBottom: '20px', fontSize: '0.82rem', color: 'var(--color-text-light)' }}>
                  <label style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', cursor: 'pointer' }}>
                    <input type="checkbox" checked={ethicalConfirmed} onChange={(e) => setEthicalConfirmed(e.target.checked)} required style={{ marginTop: '2px' }} />
                    <span>I confirm this service has a clear scope, fair pricing, realistic deadline, and respects intellectual property.</span>
                  </label>
                </div>

                <Input label="Tags (comma separated)" placeholder="Figma, UI Design, React" value={serviceForm.tags} onChange={(e) => setServiceForm({ ...serviceForm, tags: e.target.value })} />
                <Input label="Cover Image URL" value={serviceForm.image} onChange={(e) => setServiceForm({ ...serviceForm, image: e.target.value })} />

                {/* DUAL SUBMISSION BUTTONS: SAVE AS DRAFT vs PUBLISH NOW */}
                <div style={{ display: 'flex', gap: '12px', marginTop: 'var(--space-md)' }}>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isSubmitting}
                    onClick={() => handleSaveService('draft')}
                    style={{ flex: 1, height: '46px' }}
                  >
                    Save as Draft
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={isSubmitting || !ethicalConfirmed}
                    style={{ flex: 1, height: '46px' }}
                  >
                    {isSubmitting ? 'Processing...' : editingServiceId ? 'Update & Publish' : 'Publish Live'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ======== ORDERS ======== */}
        {activeTab === 'orders' && (
          <div>
            <h2 style={{ marginBottom: 'var(--space-lg)' }}>Client Orders</h2>
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
                    requirements_submitted: 'Brief Submitted (Needs Action)',
                    active: 'In Progress',
                    delivered: 'Delivered',
                    completed: 'Completed',
                    cancelled: 'Cancelled',
                  }[o.status] || o.status;

                  return (
                    <div key={o.id} style={{ border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, overflow: 'hidden', background: 'rgba(15,23,42,0.5)', transition: 'border-color 0.2s' }}>
                      <div onClick={() => setExpandedOrderId(isExpanded ? null : o.id)}
                        style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16, cursor: 'pointer', flexWrap: 'wrap' }}>
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: statusColor, flexShrink: 0, boxShadow: `0 0 8px ${statusColor}` }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 'var(--weight-semibold)', fontSize: 'var(--text-sm)', color: 'var(--color-text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 3 }}>
                            {o.serviceTitle}
                          </div>
                          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                            Client: {o.buyerName} · {o.packageTitle || 'Standard Package'}
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
                            <div style={{ fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--color-text-muted)', fontWeight: 'var(--weight-semibold)', marginBottom: 14 }}>Order Status Timeline</div>
                            <OrderStatusTimeline order={o} />
                          </div>

                          {/* Actions */}
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            {o.status === 'requirements_submitted' && (
                              <>
                                <Button variant="primary" size="sm" onClick={() => handleAcceptOrder(o.id)}>Accept Brief & Start</Button>
                                <Button variant="danger" size="sm" onClick={() => handleRejectOrder(o.id)}>Decline</Button>
                              </>
                            )}
                            {o.status === 'active' && (
                              <>
                                <Button variant="primary" size="sm" onClick={() => setFocusOrder(o)}>
                                  <Compass size={14} style={{ marginRight: 4 }} /> Enter Focus Mode
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => handleDeliverOrder(o.id)}>Deliver Finished Work</Button>
                              </>
                            )}
                            <Button variant="text" size="sm" onClick={() => { setSelectedOrderChat(orderService.getOrderById(o.id)); handleTabChange('messages'); }}>Chat with Client</Button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: 'var(--space-2xl)', border: '1px dashed rgba(255,255,255,0.08)', borderRadius: 'var(--radius-lg)', color: 'var(--color-text-light)' }}>
                No orders received yet.
              </div>
            )}
          </div>
        )}

        {/* ======== MESSAGES (RIGHT SPEECH ASSISTANT) ======== */}
        {activeTab === 'messages' && (
          <div>
            <h2 style={{ marginBottom: 'var(--space-lg)' }}>Client Messages</h2>
            <div className="messages-layout">
              <div className="conversations-sidebar">
                {orders.length === 0 && (
                  <div style={{ padding: 'var(--space-md)', textAlign: 'center', color: 'var(--color-text-light)', fontSize: 'var(--text-sm)' }}>No conversations yet</div>
                )}
                {orders.map(o => (
                  <div key={o.id} className={`conversation-item ${selectedOrderChat?.id === o.id ? 'conversation-item-active' : ''}`} onClick={() => setSelectedOrderChat(orderService.getOrderById(o.id))}>
                    <Avatar src={o.buyerAvatar} name={o.buyerName} size={36} />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-medium)', color: 'var(--color-text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.buyerName}</div>
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-light)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.serviceTitle}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="chat-area">
                {selectedOrderChat ? (
                  <>
                    <div className="chat-header flex items-center gap-sm">
                      <Avatar src={selectedOrderChat.buyerAvatar} name={selectedOrderChat.buyerName} size={32} />
                      <div>
                        <div style={{ fontWeight: 'var(--weight-semibold)', color: 'var(--color-text-main)' }}>{selectedOrderChat.buyerName}</div>
                        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-light)' }}>Order {selectedOrderChat.id}</div>
                      </div>
                    </div>
                    <div className="chat-history">
                      {(!selectedOrderChat.messages || selectedOrderChat.messages.length === 0) && (
                        <div style={{ textAlign: 'center', color: 'var(--color-text-light)', padding: 'var(--space-xl) 0', fontSize: 'var(--text-sm)' }}>No messages yet. Say hello!</div>
                      )}
                      {selectedOrderChat.messages?.map((m, idx) => {
                        const isMe = m.senderId === currentUser.id;
                        return (
                          <div key={idx} className={`chat-bubble ${isMe ? 'chat-bubble-sent' : 'chat-bubble-received'}`}>
                            {m.text}
                            <div style={{ fontSize: '10px', marginTop: '3px', opacity: 0.65, textAlign: 'right' }}>
                              {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* RIGHT SPEECH ASSISTANT SUGGESTION BANNER */}
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
                  <div style={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 'var(--space-xs)', color: 'var(--color-text-light)' }}>
                    <Mail size={32} style={{ opacity: 0.3 }} />
                    <span style={{ fontSize: 'var(--text-sm)' }}>Select a conversation to begin</span>
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
                <h2 style={{ margin: 0 }}>My Active Contracts</h2>
                <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)', marginTop: '4px' }}>
                  View milestones, start work, and submit deliverables for client review.
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
                  Contracts are created when a buyer accepts your proposal. Submit high-quality proposals to get started.
                </p>
                <Button variant="primary" onClick={() => navigate('/projects')}>Browse Open Projects</Button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {myContracts.map((c) => {
                  const statusColors = {
                    active: { bg: 'rgba(59, 130, 246, 0.15)', border: 'rgba(59, 130, 246, 0.3)', color: '#60a5fa' },
                    completed: { bg: 'rgba(16, 185, 129, 0.15)', border: 'rgba(16, 185, 129, 0.3)', color: 'var(--color-accent)' },
                    cancelled: { bg: 'rgba(239, 68, 68, 0.12)', border: 'rgba(239, 68, 68, 0.3)', color: '#f87171' },
                  };
                  const sc = statusColors[c.status] || statusColors.active;
                  const progressPct = c.progress?.progressPercentage ?? 0;
                  const pendingMilestones = (c.progress?.totalMilestones ?? 0) - (c.progress?.approvedMilestones ?? 0);

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
                            {pendingMilestones > 0 && c.status === 'active' && (
                              <span style={{ padding: '2px 8px', borderRadius: 999, background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)', color: '#fbbf24', fontSize: '0.72rem', fontWeight: 700 }}>
                                {pendingMilestones} pending
                              </span>
                            )}
                          </div>
                          <div style={{ fontWeight: 700, fontSize: '1.05rem', color: '#fff', marginBottom: 4 }}>{c.title}</div>
                          <div style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>
                            Client: <strong style={{ color: '#fff' }}>{c.buyer?.name || 'Client'}</strong>
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
                          <span style={{ color: 'var(--color-text-muted)' }}>Deliverables Progress</span>
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
                          variant="primary"
                          size="sm"
                          onClick={() => navigate(`/contracts/${c.id}`)}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                        >
                          <CheckCircle size={13} />
                          <span>Open Workspace & Submit Work</span>
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
