import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { authService } from '../../services/authService';
import { marketplaceService } from '../../services/marketplaceService';
import { orderService } from '../../services/orderService';
import Avatar from '../../components/ui/Avatar';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import { LayoutDashboard, ShoppingBag, PlusCircle, FileText, Mail, TrendingUp, CheckCircle, Clock, ChevronDown, ChevronUp, FileCheck, ShieldCheck, HeartHandshake, Compass, Sparkles, MessageCircle, AlertTriangle, Eye, X } from 'lucide-react';

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
  const [services, setServices] = useState([]);
  const [orders, setOrders] = useState([]);
  const [categories, setCategories] = useState([]);

  // Right Livelihood Service Creation State
  const [newService, setNewService] = useState({
    title: '', categoryId: '', category: '', subcategoryId: '', subcategory: '',
    description: '', price: '150', deliveryTime: '5', revisions: '3',
    requirements: '', image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600', tags: '',
    problemSolved: '', whoItHelps: '', valueCreated: ''
  });

  const [ethicalConfirmed, setEthicalConfirmed] = useState(false);

  // Focus Mode State
  const [focusOrder, setFocusOrder] = useState(null);
  const [focusTimer, setFocusTimer] = useState(1500); // 25 mins
  const [focusActive, setFocusActive] = useState(false);

  // Chat & Right Speech State
  const [selectedOrderChat, setSelectedOrderChat] = useState(null);
  const [chatMessage, setChatMessage] = useState('');
  const [speechSuggestion, setSpeechSuggestion] = useState(null);
  const [expandedOrderId, setExpandedOrderId] = useState(null);

  useEffect(() => {
    if (!currentUser || currentUser.role !== 'freelancer') { navigate('/login'); return; }
    setServices(marketplaceService.getServices().filter(s => s.sellerId === currentUser.id));
    setOrders(orderService.getOrdersForUser(currentUser.id, 'freelancer'));
    const cats = marketplaceService.getCategories();
    setCategories(cats);
    if (cats.length > 0) {
      const firstCat = cats[0];
      const firstSubs = marketplaceService.getSubcategories(firstCat.id);
      setNewService(prev => prev.categoryId ? prev : ({
        ...prev,
        categoryId: firstCat.id,
        category: firstCat.id,
        subcategoryId: firstSubs[0]?.id || '',
        subcategory: firstSubs[0]?.slug || ''
      }));
    }
  }, [currentUser, activeTab]);

  // Focus Timer Effect
  useEffect(() => {
    let timer;
    if (focusActive && focusTimer > 0) {
      timer = setInterval(() => setFocusTimer(prev => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [focusActive, focusTimer]);

  const handleTabChange = (t) => setSearchParams({ tab: t });

  const handleCreateService = (e) => {
    e.preventDefault();
    try {
      const tagsArray = newService.tags.split(',').map(t => t.trim()).filter(Boolean);
      const cats = marketplaceService.getCategories();
      const catObj = cats.find(c => c.id === newService.categoryId);
      const subObj = marketplaceService.getSubcategories(newService.categoryId)
                       .find(s => s.id === newService.subcategoryId);
      marketplaceService.createService({
        ...newService,
        tags: tagsArray,
        categorySlug: catObj?.slug || '',
        subcategorySlug: subObj?.slug || ''
      });
      alert('Service published successfully!');
      const firstCat = cats[0] || {};
      const firstSubs = cats[0] ? marketplaceService.getSubcategories(cats[0].id) : [];
      setNewService({
        title: '', categoryId: firstCat.id || '', category: firstCat.id || '',
        subcategoryId: firstSubs[0]?.id || '', subcategory: firstSubs[0]?.slug || '',
        description: '', price: '150', deliveryTime: '5', revisions: '3',
        requirements: '', image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600', tags: '',
        problemSolved: '', whoItHelps: '', valueCreated: ''
      });
      setEthicalConfirmed(false);
      handleTabChange('services');
    } catch (err) { alert(err.message); }
  };

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

  const subcategoriesForCategory = useMemo(() => {
    return marketplaceService.getSubcategories(newService.categoryId || newService.category);
  }, [newService.categoryId, newService.category, categories]);

  const handleCategoryChangeInForm = (catId) => {
    const subs = marketplaceService.getSubcategories(catId);
    setNewService(prev => ({
      ...prev,
      categoryId: catId,
      category: catId,
      subcategoryId: subs[0] ? subs[0].id : '',
      subcategory: subs[0] ? subs[0].slug : ''
    }));
  };

  const formatTimer = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const navItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Overview' },
    { id: 'services', icon: ShoppingBag, label: 'My Services' },
    { id: 'create-service', icon: PlusCircle, label: 'Create Service' },
    { id: 'orders', icon: FileText, label: 'Orders' },
    { id: 'messages', icon: Mail, label: 'Messages' },
  ];

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
      <aside className="dashboard-sidebar">
        <div className="sidebar-user">
          <Avatar src={currentUser.avatar} name={currentUser.name} size={38} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 'var(--weight-semibold)', fontSize: 'var(--text-sm)', color: 'var(--color-text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {currentUser.name}
            </div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-accent)', fontWeight: 'var(--weight-medium)' }}>
              {trustProfile?.growthTier || 'Freelancer'}
            </div>
          </div>
        </div>
        {navItems.map(({ id, icon: Icon, label }) => (
          <button key={id} className={`sidebar-link ${activeTab === id ? 'sidebar-link-active' : ''}`} onClick={() => handleTabChange(id)}>
            <Icon size={16} /> {label}
          </button>
        ))}
      </aside>

      <main className="dashboard-content">

        {/* ======== OVERVIEW ======== */}
        {activeTab === 'dashboard' && (
          <div>
            <h2 style={{ marginBottom: 'var(--space-xs)' }}>Freelancer Dashboard</h2>
            <p style={{ marginBottom: 'var(--space-xl)', color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>
              Welcome back, {currentUser.name.split(' ')[0]}
            </p>

            <div className="stats-grid" style={{ marginBottom: '32px' }}>
              <div className="stat-card">
                <div className="stat-label">Total Earnings</div>
                <div className="stat-value" style={{ color: 'var(--color-accent)' }}>${totalEarnings}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Active Orders</div>
                <div className="stat-value">{orders.filter(o => o.status === 'active' || o.status === 'requirements_submitted').length}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Growth Tier</div>
                <div className="stat-value" style={{ fontSize: '1.2rem', color: 'var(--color-accent)' }}>{trustProfile?.growthTier}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">On-Time Rate</div>
                <div className="stat-value">{trustProfile?.onTimeDeliveryRate}%</div>
              </div>
            </div>

            {/* TRUST PROFILE SUMMARY BOX */}
            <div style={{ background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '16px', padding: '24px', marginBottom: '32px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-accent)', fontWeight: 700, fontSize: '0.9rem', marginBottom: '12px' }}>
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

        {/* ======== SERVICES ======== */}
        {activeTab === 'services' && (
          <div>
            <div className="flex justify-between items-center" style={{ marginBottom: 'var(--space-lg)' }}>
              <h2>My Service Listings</h2>
              <Button variant="primary" onClick={() => handleTabChange('create-service')}>Add New Gig</Button>
            </div>
            {services.length > 0 ? (
              <div className="data-table-wrapper">
                <table className="data-table">
                  <thead><tr><th>Thumbnail</th><th>Title</th><th>Category</th><th>Price</th><th>Delivery</th></tr></thead>
                  <tbody>
                    {services.map(s => (
                      <tr key={s.id}>
                        <td><img src={s.image} alt={s.title} style={{ width: '44px', height: '44px', borderRadius: 'var(--radius-sm)', objectFit: 'cover', border: '1px solid rgba(255,255,255,0.08)' }} /></td>
                        <td><Link to={`/service/${s.id}`} style={{ fontWeight: 'var(--weight-semibold)', color: 'var(--color-text-main)' }}>{s.title}</Link></td>
                        <td><Badge variant="default">{s.category.toUpperCase()}</Badge></td>
                        <td style={{ color: 'var(--color-accent)', fontWeight: 'var(--weight-semibold)' }}>${s.price}</td>
                        <td>{s.deliveryTime}d</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: 'var(--space-2xl)', border: '1px dashed rgba(255,255,255,0.08)', borderRadius: 'var(--radius-lg)' }}>
                <h3 style={{ marginBottom: 'var(--space-xs)' }}>No gigs yet</h3>
                <p style={{ marginBottom: 'var(--space-md)' }}>Launch your first service offering to attract buyers.</p>
                <Button variant="primary" onClick={() => handleTabChange('create-service')}>Create First Gig</Button>
              </div>
            )}
          </div>
        )}

        {/* ======== CREATE SERVICE (RIGHT LIVELIHOOD) ======== */}
        {activeTab === 'create-service' && (
          <div style={{ maxWidth: '680px' }}>
            <h2 style={{ marginBottom: 'var(--space-xs)' }}>Create a New Service</h2>
            <p style={{ marginBottom: 'var(--space-xl)', color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>
              Publish a clear, honest service offering grounded in utility and value created.
            </p>

            <div style={{ background: 'var(--glass-bg-secondary)', backdropFilter: 'blur(var(--glass-blur-secondary))', border: '1px solid var(--glass-border-secondary)', borderRadius: 'var(--radius-xl)', padding: 'var(--space-xl)' }}>
              <form onSubmit={handleCreateService}>
                <Input label="Service Title" placeholder="I will design a modern Figma landing page..." value={newService.title} onChange={(e) => setNewService({ ...newService, title: e.target.value })} required />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-sm)' }}>
                  <Select label="Category" value={newService.categoryId || newService.category} onChange={(e) => handleCategoryChangeInForm(e.target.value)} options={categories.map(c => ({ value: c.id, label: c.name }))} />
                  <Select label="Subcategory" value={newService.subcategoryId || newService.subcategory} onChange={(e) => setNewService({ ...newService, subcategoryId: e.target.value, subcategory: e.target.value })} options={subcategoriesForCategory.map(s => ({ value: s.id, label: s.name }))} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-sm)' }}>
                  <Input label="Starting Price ($)" type="number" value={newService.price} onChange={(e) => setNewService({ ...newService, price: e.target.value })} required />
                  <Input label="Delivery (Days)" type="number" value={newService.deliveryTime} onChange={(e) => setNewService({ ...newService, deliveryTime: e.target.value })} required />
                </div>

                <div className="form-group">
                  <label className="form-label">Service Description</label>
                  <textarea className="form-control" rows="3" placeholder="Describe exactly what this service includes..." value={newService.description} onChange={(e) => setNewService({ ...newService, description: e.target.value })} required style={{ resize: 'vertical' }} />
                </div>

                {/* RIGHT LIVELIHOOD — VALUE CREATED SECTION */}
                <div style={{ background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-accent)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <ShieldCheck size={16} />
                    <span>WORK WITH PURPOSE — VALUE CREATED</span>
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '0.8rem' }}>What problem does this service solve?</label>
                    <input type="text" className="form-control" placeholder="e.g. Businesses struggle to communicate their value proposition clearly." value={newService.problemSolved} onChange={(e) => setNewService({ ...newService, problemSolved: e.target.value })} />
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '0.8rem' }}>Who does it help?</label>
                    <input type="text" className="form-control" placeholder="e.g. Early-stage startups and small business founders." value={newService.whoItHelps} onChange={(e) => setNewService({ ...newService, whoItHelps: e.target.value })} />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.8rem' }}>What lasting value does it create?</label>
                    <input type="text" className="form-control" placeholder="e.g. Builds customer trust and conversion without dark patterns." value={newService.valueCreated} onChange={(e) => setNewService({ ...newService, valueCreated: e.target.value })} />
                  </div>
                </div>

                {/* ETHICAL WORK GUIDANCE CHECKBOX */}
                <div style={{ marginBottom: '20px', fontSize: '0.82rem', color: 'var(--color-text-light)' }}>
                  <label style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', cursor: 'pointer' }}>
                    <input type="checkbox" checked={ethicalConfirmed} onChange={(e) => setEthicalConfirmed(e.target.checked)} required style={{ marginTop: '2px' }} />
                    <span>I confirm this service has a clear scope, fair pricing, realistic deadline, and respects intellectual property.</span>
                  </label>
                </div>

                <Input label="Tags (comma separated)" placeholder="Figma, UI Design, React" value={newService.tags} onChange={(e) => setNewService({ ...newService, tags: e.target.value })} />
                <Input label="Cover Image URL" value={newService.image} onChange={(e) => setNewService({ ...newService, image: e.target.value })} />
                <Button type="submit" variant="primary" fullWidth style={{ marginTop: 'var(--space-xs)', height: '44px' }}>Publish Service</Button>
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

      </main>
    </div>
  );
}
