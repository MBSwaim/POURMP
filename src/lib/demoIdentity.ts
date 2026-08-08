// Neutral, isolated prototype identity for POURMP's application front door.
//
// No authentication/current-user model exists yet anywhere in POURMP. This is a
// deliberately isolated stand-in for the identity a real user will eventually
// authenticate with via their Manhattan Project company email — it is NOT read
// from staff_members, and it must never be mistaken for a real login, session, or
// account. The email below is a placeholder, not a real address.
//
// Deliberately generic and not feature-owned, so the front door doesn't couple to
// any one feature's demo data. src/app/admin/adminDemoData.ts is a separate,
// Admin-local identity object with the same shape by coincidence, not by shared
// reference — left untouched by this file.
export const DEMO_IDENTITY = {
  name: 'Admin User',
  role: 'Administrator',
  email: 'admin@manhattanproject.beer',
  location: 'West Dallas',
}
