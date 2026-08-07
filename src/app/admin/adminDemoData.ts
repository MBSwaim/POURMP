// Static prototype Admin identity for /admin.
//
// No authentication/current-user model exists yet anywhere in POURMP (see
// docs/ROADMAP.md — "no route currently checks who's making the request").
// DEMO_ADMIN is a deliberately isolated stand-in for the Manhattan Project
// company-email identity a real Admin will eventually authenticate with — it is
// NOT read from staff_members, and it must never be mistaken for a real login,
// session, or account. The email below is a placeholder, not a real address —
// replace it only if the real admin address is explicitly provided. When real
// authentication lands, this identity is replaced, not extended.
export const DEMO_ADMIN = {
  name: 'Admin User',
  role: 'Admin',
  email: 'admin@manhattanproject.beer',
}
