# WorkStream Database Schema Documentation

The WorkStream database schema is built on Supabase PostgreSQL with 22 normalized relational tables, foreign key constraints, and Row Level Security (RLS) policies.

---

## Entity Relationship Summary

```
profiles (users, role, rating)
  ├── services (seller_id)
  │    ├── service_packages (basic, standard, premium)
  │    ├── service_addons
  │    └── service_skills ── skills
  ├── orders (buyer_id, seller_id, service_id)
  │    ├── order_requirements
  │    ├── order_deliveries
  │    ├── reviews
  │    └── payments
  ├── conversations (buyer_id, seller_id)
  │    └── messages (sender_id)
  ├── favorites (user_id, service_id)
  ├── notifications (user_id)
  └── portfolio_items (user_id)
```

---

## Key Tables

| Table | Description | Primary Key | Key Foreign Keys |
|-------|-------------|-------------|------------------|
| `profiles` | Extended user profile data | `id` (UUID) | `id → auth.users.id` |
| `categories` | Main marketplace disciplines | `id` (UUID) | - |
| `subcategories` | Specialized sub-disciplines | `id` (UUID) | `category_id → categories.id` |
| `services` | Marketplace service listings | `id` (UUID) | `seller_id → profiles.id`, `category_id → categories.id` |
| `service_packages` | Pricing tiers (basic/standard/premium) | `id` (UUID) | `service_id → services.id` |
| `orders` | Transactional project orders | `id` (UUID) | `buyer_id`, `seller_id`, `service_id` |
| `order_deliveries` | Submitted project deliverables | `id` (UUID) | `order_id → orders.id` |
| `reviews` | Verified order feedback | `id` (UUID) | `order_id → orders.id`, `buyer_id`, `seller_id` |
| `conversations` | Realtime chat threads | `id` (UUID) | `buyer_id`, `seller_id`, `order_id` |
| `messages` | Realtime thread messages | `id` (UUID) | `conversation_id → conversations.id`, `sender_id` |
| `notifications` | System & order notifications | `id` (UUID) | `user_id → profiles.id` |
| `payments` | Escrow payment intents | `id` (UUID) | `order_id → orders.id` |
| `search_logs` | Query tracking & zero-result analysis | `id` (UUID) | `user_id → profiles.id` |

---

## Row Level Security (RLS) Policy Overview

- **`profiles`**: Public `SELECT` allowed. Updates restricted to `auth.uid() = id`.
- **`services`**: Public `SELECT` for active services. Insert/Update restricted to `auth.uid() = seller_id`.
- **`orders`**: Select/Update restricted to buyer (`buyer_id = auth.uid()`) or seller (`seller_id = auth.uid()`).
- **`messages`**: Restricted to conversation participants.
- **`favorites` & `notifications`**: Restricted to the owner user (`user_id = auth.uid()`).
