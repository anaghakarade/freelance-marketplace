import { orders as initialOrders } from '../data/orders';
import { services as initialServices } from '../data/services';
import { authService } from './authService';
import { marketplaceService } from './marketplaceService';

const ORDERS_KEY = 'workstream_orders';

if (!localStorage.getItem(ORDERS_KEY)) {
  localStorage.setItem(ORDERS_KEY, JSON.stringify(initialOrders));
}

export const orderService = {
  getOrders: () => {
    return JSON.parse(localStorage.getItem(ORDERS_KEY)) || [];
  },

  getOrdersForUser: (userId, role) => {
    const orders = orderService.getOrders();
    const rawServices = marketplaceService.getServices();
    const services = Array.isArray(rawServices) ? rawServices : initialServices;
    const users = authService.getUsers();

    const filtered = orders.filter(ord => {
      if (role === 'buyer') return ord.buyerId === userId;
      if (role === 'freelancer') return ord.sellerId === userId;
      return ord.buyerId === userId || ord.sellerId === userId; // fallback
    });

    // Hydrate each order with service and party details
    return filtered.map(ord => {
      const srv = services.find(s => s.id === ord.serviceId) || initialServices.find(s => s.id === ord.serviceId);
      const buyer = users.find(u => u.id === ord.buyerId);
      const seller = users.find(u => u.id === ord.sellerId);

      return {
        ...ord,
        serviceTitle: srv ? srv.title : 'Service Listing',
        serviceImage: srv ? (srv.coverImage || srv.image) : '',
        buyerName: buyer ? buyer.name : 'Client',
        buyerAvatar: buyer ? buyer.avatar : '',
        sellerName: seller ? seller.name : 'Freelancer',
        sellerAvatar: seller ? seller.avatar : ''
      };
    });
  },

  getOrderById: (id) => {
    const orders = orderService.getOrders();
    const ord = orders.find(o => o.id === id);
    if (!ord) return null;

    const rawServices = marketplaceService.getServices();
    const services = Array.isArray(rawServices) ? rawServices : initialServices;
    const users = authService.getUsers();

    const srv = services.find(s => s.id === ord.serviceId) || initialServices.find(s => s.id === ord.serviceId);
    const buyer = users.find(u => u.id === ord.buyerId);
    const seller = users.find(u => u.id === ord.sellerId);

    return {
      ...ord,
      serviceTitle: srv ? srv.title : 'Service Listing',
      serviceImage: srv ? (srv.coverImage || srv.image) : '',
      serviceDescription: srv ? srv.description : '',
      buyerName: buyer ? buyer.name : 'Client',
      buyerEmail: buyer ? buyer.email : '',
      buyerAvatar: buyer ? buyer.avatar : '',
      sellerName: seller ? seller.name : 'Freelancer',
      sellerAvatar: seller ? seller.avatar : '',
      sellerTitle: seller ? seller.title : ''
    };
  },

  createOrderRequest: (serviceId, packageKey = 'standard', selectedExtras = [], serviceObj = null) => {
    const srv = serviceObj || initialServices.find(s => s.id === serviceId) || { id: serviceId, startingPrice: 50, deliveryDays: 3 };
    if (!srv) throw new Error('Service not found.');

    const currentUser = authService.getCurrentUser();
    if (!currentUser || currentUser.role !== 'buyer') {
      throw new Error('Only Buyers can request services.');
    }

    const orders = orderService.getOrders();

    // Resolve package and extras pricing
    const pkg = srv.packages?.[packageKey] || null;
    const basePrice = pkg ? pkg.price : (srv.startingPrice || srv.price || 50);
    const deliveryTime = pkg ? pkg.deliveryTime : (srv.deliveryDays || srv.deliveryTime || 3);
    const extras = (srv.extras || []).filter(e => selectedExtras.includes(e.id));
    const extrasTotal = extras.reduce((s, e) => s + e.price, 0);
    const extrasSaved = extras.reduce((s, e) => s + (e.deliveryTimeSavings || 0), 0);
    const totalPrice = basePrice + extrasTotal;
    const totalDelivery = Math.max(1, deliveryTime - extrasSaved);

    const newOrder = {
      id: `ord_${Date.now()}`,
      serviceId: srv.id,
      buyerId: currentUser.id,
      sellerId: srv.sellerId,
      status: 'pending',
      packageKey,
      packageTitle: pkg ? pkg.title : 'Standard Package',
      selectedExtras: extras.map(e => ({ id: e.id, title: e.title, price: e.price })),
      price: totalPrice,
      basePrice,
      extrasTotal,
      deliveryTimeDays: totalDelivery,
      startedDate: new Date().toISOString().split('T')[0],
      dueDate: '',
      requirementsSubmitted: null,
      requirementsSchema: srv.requirementsSchema || [],
      messages: []
    };

    orders.push(newOrder);
    localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
    return newOrder;
  },

  submitRequirements: (orderId, requirements) => {
    const orders = orderService.getOrders();
    const idx = orders.findIndex(o => o.id === orderId);
    if (idx === -1) throw new Error('Order not found.');

    const startedDate = new Date();
    const due = new Date();
    due.setDate(startedDate.getDate() + orders[idx].deliveryTimeDays);

    orders[idx].status = 'requirements_submitted'; // pending approval by freelancer
    orders[idx].requirementsSubmitted = requirements;
    orders[idx].startedDate = startedDate.toISOString().split('T')[0];
    orders[idx].dueDate = due.toISOString().split('T')[0];

    localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
    return orders[idx];
  },

  acceptOrder: (orderId) => {
    const orders = orderService.getOrders();
    const idx = orders.findIndex(o => o.id === orderId);
    if (idx === -1) throw new Error('Order not found.');

    orders[idx].status = 'active'; // In progress
    localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
    return orders[idx];
  },

  rejectOrder: (orderId, reason = 'Scope alignment issue') => {
    const orders = orderService.getOrders();
    const idx = orders.findIndex(o => o.id === orderId);
    if (idx === -1) throw new Error('Order not found.');

    orders[idx].status = 'cancelled';
    orders[idx].cancelReason = `Seller declined requirements: ${reason}`;
    localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
    return orders[idx];
  },

  deliverWork: (orderId, deliveryDetails) => {
    const orders = orderService.getOrders();
    const idx = orders.findIndex(o => o.id === orderId);
    if (idx === -1) throw new Error('Order not found.');

    orders[idx].status = 'delivered'; // Awaiting client review
    orders[idx].deliveredWork = {
      text: deliveryDetails.text,
      fileUrl: deliveryDetails.fileUrl || '',
      deliveredAt: new Date().toISOString()
    };

    localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
    return orders[idx];
  },

  completeOrder: (orderId) => {
    const orders = orderService.getOrders();
    const idx = orders.findIndex(o => o.id === orderId);
    if (idx === -1) throw new Error('Order not found.');

    orders[idx].status = 'completed';
    orders[idx].completedDate = new Date().toISOString().split('T')[0];
    localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
    return orders[idx];
  },

  sendMessage: (orderId, messageText) => {
    const orders = orderService.getOrders();
    const idx = orders.findIndex(o => o.id === orderId);
    if (idx === -1) throw new Error('Order not found.');

    const currentUser = authService.getCurrentUser();
    if (!currentUser) throw new Error('Must be logged in to send messages.');

    const newMessage = {
      id: `msg_${Date.now()}`,
      senderId: currentUser.id,
      text: messageText,
      timestamp: new Date().toISOString()
    };

    if (!orders[idx].messages) {
      orders[idx].messages = [];
    }

    orders[idx].messages.push(newMessage);
    localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
    return newMessage;
  }
};
