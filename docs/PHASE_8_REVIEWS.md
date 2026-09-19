# Phase 8 reviews and trust

## Review API

All endpoints require a JWT unless stated otherwise. The server derives the reviewer from the JWT and derives the reviewee and project from the completed contract; clients cannot submit either identity or choose verified status.

- `POST /api/reviews` accepts `contract_id`, `rating` (1–5), and an optional comment (10–2,000 characters when present). Only a completed-contract participant can review the other participant once. A successful review is verified.
- `GET /api/reviews/:id` returns a non-deleted review.
- `PATCH /api/reviews/:id` accepts only `rating` and `comment`; only its reviewer may update it.
- `DELETE /api/reviews/:id` is reviewer-only and soft-deletes the review. The audit row remains, and a deleted review cannot be recreated for the same contract/reviewer direction because the database uniqueness rule remains in force.
- `GET /api/users/:id/reviews?page=&limit=` returns non-deleted received reviews, newest first.
- `GET /api/users/:id/trust` returns evidence-based public metrics.
- `GET /api/contracts/:id/review-eligibility` is authenticated and only reveals eligibility to a contract participant.

## Transactional side effects

Review insertion, the reviewee's `new_review` notification, and a `review_created` contract activity event run in one PostgreSQL transaction. Any failure rolls all three writes back. The activity event records the reviewer as actor and only safe review, contract, project, rating, and verification metadata.

## Trust metrics

- Average rating, review count, distribution, and verified count use only non-deleted received reviews.
- Completed-project count is the number of completed contracts in which the user is buyer or freelancer.
- Completion rate is completed contracts divided by terminal contracts (`completed`, `cancelled`, or `disputed`); it is `null` if no terminal contract exists.
- On-time delivery is available only for freelancers: approved milestones with both a due date and completion timestamp, where completion is on or before the due date, divided by all such eligible milestones. It is `null` when there is no eligible milestone.
- Repeat-client rate is completed counterparties with two or more completed contracts divided by all completed counterparties. For a buyer, counterparties are freelancers; for a freelancer, counterparties are buyers.
- Response time is the average minutes from an incoming message to the user's immediately following reply in the same conversation. It is `null` where no such pair exists.
- Dispute history is intentionally unavailable until Phase 11 supplies authoritative dispute records.

## Growth tiers

The highest qualifying tier wins: New (0 completed contracts), Rising (1+), Established (5+ completed, 3+ reviews, ≥4.0 average), Trusted (10+ completed, 8+ reviews, ≥4.5 average), and Top Performer (20+ completed, 15+ reviews, ≥4.8 average).
