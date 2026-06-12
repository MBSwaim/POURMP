import type Database from 'better-sqlite3'

const PACKAGES = [
  { id: 'snack_buffet', name: 'Snack Buffet', price_per_guest: 16.0, description: '', active: 1 },
  { id: 'a_la_carte', name: 'A La Carte Buffet', price_per_guest: 12.0, description: '', active: 1 },
  { id: 'arepa_buffet', name: 'Arepa Buffet', price_per_guest: 17.0, description: '', active: 1 },
  { id: 'sliders_buffet', name: 'Sliders Buffet', price_per_guest: 17.0, description: '', active: 1 },
  { id: 'fried_chicken', name: 'Fried Chicken Buffet', price_per_guest: 18.0, description: '', active: 1 },
  { id: 'kabob_buffet', name: 'Kabob Buffet', price_per_guest: 22.0, description: '', active: 1 },
]

const MENU_ITEMS: Array<{
  package_id: string
  item_name: string
  calc_method: string
  qty_per_guest: number | null
  yield_per_unit: number | null
  unit_name: string
  sort_order: number
}> = [
  // Snack Buffet
  { package_id: 'snack_buffet', item_name: 'Cheese Platter', calc_method: 'guests_per_unit', qty_per_guest: null, yield_per_unit: 20, unit_name: 'Platter', sort_order: 1 },
  { package_id: 'snack_buffet', item_name: 'Hummus', calc_method: 'guests_per_unit', qty_per_guest: null, yield_per_unit: 20, unit_name: 'Large Bowl', sort_order: 2 },
  { package_id: 'snack_buffet', item_name: 'French Fries', calc_method: 'guests_per_unit', qty_per_guest: null, yield_per_unit: 20, unit_name: '1/2 Chafer', sort_order: 3 },
  { package_id: 'snack_buffet', item_name: 'Chips', calc_method: 'guests_per_unit', qty_per_guest: null, yield_per_unit: 20, unit_name: 'Large Bowl', sort_order: 4 },
  { package_id: 'snack_buffet', item_name: 'Salsa', calc_method: 'guests_per_unit', qty_per_guest: null, yield_per_unit: 20, unit_name: 'Large Bowl', sort_order: 5 },

  // Fried Chicken Buffet
  { package_id: 'fried_chicken', item_name: 'Thai Fried Chicken', calc_method: 'pieces_per_guest', qty_per_guest: 2, yield_per_unit: 50, unit_name: '200 Pan', sort_order: 1 },
  { package_id: 'fried_chicken', item_name: 'French Fries', calc_method: 'guests_per_unit', qty_per_guest: null, yield_per_unit: 20, unit_name: '1/2 Chafer', sort_order: 2 },
  { package_id: 'fried_chicken', item_name: 'Hummus', calc_method: 'guests_per_unit', qty_per_guest: null, yield_per_unit: 20, unit_name: 'Large Bowl', sort_order: 3 },
  { package_id: 'fried_chicken', item_name: 'Thai Slaw', calc_method: 'guests_per_unit', qty_per_guest: null, yield_per_unit: 25, unit_name: 'Large Bowl', sort_order: 4 },
  { package_id: 'fried_chicken', item_name: 'Asian Chopped Salad', calc_method: 'guests_per_unit', qty_per_guest: null, yield_per_unit: 25, unit_name: 'Large Bowl', sort_order: 5 },

  // Arepa Buffet
  { package_id: 'arepa_buffet', item_name: 'Braised Pork Arepa', calc_method: 'pieces_per_guest', qty_per_guest: 1.5, yield_per_unit: 20, unit_name: '200 Pan', sort_order: 1 },
  { package_id: 'arepa_buffet', item_name: 'Pickled Green Tomato Arepa', calc_method: 'pieces_per_guest', qty_per_guest: 1.5, yield_per_unit: 20, unit_name: '200 Pan', sort_order: 2 },
  { package_id: 'arepa_buffet', item_name: 'Black Bean Arepa', calc_method: 'pieces_per_guest', qty_per_guest: 1.5, yield_per_unit: 20, unit_name: '200 Pan', sort_order: 3 },
  { package_id: 'arepa_buffet', item_name: 'Jasmine Rice', calc_method: 'guests_per_unit', qty_per_guest: null, yield_per_unit: 20, unit_name: '1/2 Chafer', sort_order: 4 },
  { package_id: 'arepa_buffet', item_name: 'Chips', calc_method: 'guests_per_unit', qty_per_guest: null, yield_per_unit: 20, unit_name: 'Large Bowl', sort_order: 5 },
  { package_id: 'arepa_buffet', item_name: 'Salsa', calc_method: 'guests_per_unit', qty_per_guest: null, yield_per_unit: 20, unit_name: 'Large Bowl', sort_order: 6 },

  // Kabob Buffet
  { package_id: 'kabob_buffet', item_name: 'Shrimp Kabob', calc_method: 'pieces_per_guest', qty_per_guest: 2, yield_per_unit: 20, unit_name: '200 Pan', sort_order: 1 },
  { package_id: 'kabob_buffet', item_name: 'Thai Chicken Kabob', calc_method: 'pieces_per_guest', qty_per_guest: 2, yield_per_unit: 20, unit_name: '200 Pan', sort_order: 2 },
  { package_id: 'kabob_buffet', item_name: 'Jasmine Rice', calc_method: 'guests_per_unit', qty_per_guest: null, yield_per_unit: 20, unit_name: '1/2 Chafer', sort_order: 3 },
  { package_id: 'kabob_buffet', item_name: 'Thai Slaw', calc_method: 'guests_per_unit', qty_per_guest: null, yield_per_unit: 25, unit_name: 'Large Bowl', sort_order: 4 },

  // Sliders Buffet
  { package_id: 'sliders_buffet', item_name: 'Pulled Pork Slider', calc_method: 'pieces_per_guest', qty_per_guest: 2, yield_per_unit: 20, unit_name: '200 Pan', sort_order: 1 },
  { package_id: 'sliders_buffet', item_name: 'Mini Burger Slider', calc_method: 'pieces_per_guest', qty_per_guest: 2, yield_per_unit: 20, unit_name: '200 Pan', sort_order: 2 },
  { package_id: 'sliders_buffet', item_name: 'Fried Buffalo Chicken Slider', calc_method: 'pieces_per_guest', qty_per_guest: 2, yield_per_unit: 20, unit_name: '200 Pan', sort_order: 3 },
  { package_id: 'sliders_buffet', item_name: 'French Fries', calc_method: 'guests_per_unit', qty_per_guest: null, yield_per_unit: 20, unit_name: '1/2 Chafer', sort_order: 4 },
  { package_id: 'sliders_buffet', item_name: 'Cole Slaw', calc_method: 'guests_per_unit', qty_per_guest: null, yield_per_unit: 25, unit_name: 'Large Bowl', sort_order: 5 },

  // A La Carte Buffet
  { package_id: 'a_la_carte', item_name: 'French Fries', calc_method: 'guests_per_unit', qty_per_guest: null, yield_per_unit: 20, unit_name: 'Large Bowl', sort_order: 1 },
  { package_id: 'a_la_carte', item_name: 'Chips', calc_method: 'guests_per_unit', qty_per_guest: null, yield_per_unit: 20, unit_name: 'Large Bowl', sort_order: 2 },
  { package_id: 'a_la_carte', item_name: 'Salsa', calc_method: 'guests_per_unit', qty_per_guest: null, yield_per_unit: 20, unit_name: 'Large Bowl', sort_order: 3 },
  { package_id: 'a_la_carte', item_name: 'Queso', calc_method: 'guests_per_unit', qty_per_guest: null, yield_per_unit: 20, unit_name: 'Round Chafer', sort_order: 4 },
]

export function seedDatabase(db: Database.Database) {
  const pkgCount = (db.prepare('SELECT COUNT(*) as c FROM packages').get() as { c: number }).c
  const itemCount = (db.prepare('SELECT COUNT(*) as c FROM menu_items').get() as { c: number }).c
  if (pkgCount > 0 && itemCount > 0) return

  const insertPkg = db.prepare(
    'INSERT OR IGNORE INTO packages (id, name, price_per_guest, description, active) VALUES (?, ?, ?, ?, ?)'
  )
  const insertItem = db.prepare(
    `INSERT OR IGNORE INTO menu_items (package_id, item_name, calc_method, qty_per_guest, yield_per_unit, unit_name, sort_order)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  )

  const seedAll = db.transaction(() => {
    for (const pkg of PACKAGES) {
      insertPkg.run(pkg.id, pkg.name, pkg.price_per_guest, pkg.description, pkg.active)
    }
    for (const item of MENU_ITEMS) {
      insertItem.run(
        item.package_id, item.item_name, item.calc_method,
        item.qty_per_guest, item.yield_per_unit, item.unit_name, item.sort_order
      )
    }
  })

  seedAll()
}
