export const orders = [
  {
    id: 'ord_1',
    serviceId: 'srv_1',
    buyerId: 'usr_6', // Alice Cooper (Buyer)
    sellerId: 'usr_1', // Sarah Jenkins (Seller)
    status: 'active',
    price: 150,
    deliveryTimeDays: 5,
    startedDate: '2026-08-10',
    dueDate: '2026-08-15',
    requirementsSubmitted: {
      wireframes: 'https://workstream.io/mock/buyer_wireframes.pdf',
      competitorUrl: 'https://competitor-example.com',
      details: 'Please focus on modern typography and dark charcoal accents.'
    },
    messages: [
      {
        id: 'msg_1',
        senderId: 'usr_6',
        text: 'Hi Sarah, I submitted the design requirements. Let me know if you need anything else!',
        timestamp: '2026-08-10T14:32:00Z'
      },
      {
        id: 'msg_2',
        senderId: 'usr_1',
        text: 'Thanks Alice! Received everything. I am starting on the wireframes today and will send over the moodboard tomorrow.',
        timestamp: '2026-08-10T16:05:00Z'
      }
    ]
  },
  {
    id: 'ord_2',
    serviceId: 'srv_6',
    buyerId: 'usr_7', // James Peterson (Buyer)
    sellerId: 'usr_3', // Elena Rostova (Seller)
    status: 'completed',
    price: 90,
    deliveryTimeDays: 3,
    startedDate: '2026-08-05',
    dueDate: '2026-08-08',
    completedDate: '2026-08-07',
    requirementsSubmitted: {
      details: 'Write an article on React Server Components vs. Client Components. Highlighting performance differences.'
    },
    deliveredWork: {
      text: 'Here is the draft article: "Understanding React Server Components vs Client Components". It covers hydration, SEO advantages, and server-side rendering metrics. File format: Google Docs link.',
      fileUrl: 'https://docs.google.com/document/d/mock-rsc-vs-client'
    },
    messages: [
      {
        id: 'msg_3',
        senderId: 'usr_3',
        text: 'Hi James, the draft is completed and delivered for your review!',
        timestamp: '2026-08-07T10:15:00Z'
      },
      {
        id: 'msg_4',
        senderId: 'usr_7',
        text: 'This is exceptionally well written. No revisions needed, completing order now. Thanks!',
        timestamp: '2026-08-07T12:30:00Z'
      }
    ]
  },
  {
    id: 'ord_3',
    serviceId: 'srv_4',
    buyerId: 'usr_8', // Sofia Alvarez (Buyer)
    sellerId: 'usr_2', // David Chen (Seller)
    status: 'pending',
    price: 300,
    deliveryTimeDays: 6,
    startedDate: '2026-08-12',
    dueDate: '2026-08-18',
    requirementsSubmitted: null, // Awaiting buyer requirements input
    messages: []
  },
  {
    id: 'ord_4',
    serviceId: 'srv_12',
    buyerId: 'usr_9', // Nikhil Sharma (Buyer)
    sellerId: 'usr_11', // Thomas Mueller (Seller)
    status: 'cancelled',
    price: 140,
    deliveryTimeDays: 4,
    startedDate: '2026-08-01',
    dueDate: '2026-08-05',
    cancelReason: 'Buyer request: project scopes changed. Seller approved cancellation.',
    messages: [
      {
        id: 'msg_5',
        senderId: 'usr_9',
        text: 'Hey Thomas, our startup pivot occurred and we no longer need this style of logo. Can we cancel this order?',
        timestamp: '2026-08-02T09:12:00Z'
      },
      {
        id: 'msg_6',
        senderId: 'usr_11',
        text: 'Yes, no problem. I have not started design work yet so I will approve the cancellation request.',
        timestamp: '2026-08-02T10:00:00Z'
      }
    ]
  }
];
