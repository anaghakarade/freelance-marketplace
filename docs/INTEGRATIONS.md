# WorkStream Integrations Guide

This document specifies the integration blueprints for third-party external services.

---

## 1. Supabase (Primary Backend Platform)
- **Auth**: Email/password, session persistence, role claim metadata (`buyer`, `seller`, `admin`).
- **PostgreSQL**: 22 relational tables with Row Level Security (RLS).
- **Storage**: Buckets `avatars`, `service-images`, `portfolio`, `order-deliveries`, `attachments`.
- **Realtime**: Active channels for instant messaging (`messages`) and system notifications (`notifications`).

---

## 2. Stripe (Escrow Payment Gateway)
- **Client SDK**: `@stripe/stripe-js`
- **Flow**:
  1. Buyer initiates checkout → Service calls backend function `create-payment-intent`.
  2. Backend returns client secret → Stripe Checkout / Elements handles card collection securely.
  3. Webhook listener updates `orders.status` to `active` upon payment confirmation.

---

## 3. Resend (Transactional Email)
- **Events**: Welcome email, password reset, order confirmation, delivery notification, review notification.
- **Security**: Dispatched via backend Edge Functions with `RESEND_API_KEY`.

---

## 4. AI Matching & LLM Integration
- **Functionality**: Extracts required skills, category, and timeline from buyer prompts.
- **Security**: Prompt processing executes on backend server functions to protect LLM API keys.

---

## 5. Unsplash API & Mapbox (Optional Content & Geo)
- **Unsplash**: Non-user-generated editorial category visual imagery.
- **Mapbox**: Country/city location filtering for remote talent.
