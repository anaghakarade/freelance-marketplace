# WorkStream API Architecture

## Target Architecture Model

```
React UI Components
        │
React Hooks / Context
        │
WorkStream Service Layer (src/services/*)
   ┌────┴───────────────────────────────┐
   │                                    │
Supabase Client (src/lib/supabase.js)  LocalStorage Fallback Adapter
   │
 ┌─┴─────────────┬─────────────────┐
Auth         PostgreSQL         Storage / Realtime
```

---

## Service Layer Abstraction Principles

1. **Component Independence**: UI components never call `fetch()` directly or interact with Supabase SDK objects. They consume service contracts (e.g. `marketplaceService.getServices()`, `authService.login()`).
2. **Dual-Mode Operation**: If Supabase configuration (`VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`) is present, services query Supabase. If unconfigured, services automatically fall back to LocalStorage mock adapters.
3. **Standard Response Contracts**:
   ```javascript
   // All async service methods return:
   { data: T | null, error: Error | null }
   ```
4. **Security Boundaries**: Frontend uses `VITE_SUPABASE_ANON_KEY`. Administrative, AI key, Stripe secret, and email actions execute behind Edge Functions or backend API routes.
