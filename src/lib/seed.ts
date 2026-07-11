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
  { package_id: 'snack_buffet', item_name: 'Cheese Board', calc_method: 'guests_per_unit', qty_per_guest: null, yield_per_unit: 20, unit_name: 'Platter', sort_order: 1 },
  { package_id: 'snack_buffet', item_name: 'Hummus', calc_method: 'guests_per_unit', qty_per_guest: null, yield_per_unit: 20, unit_name: 'Large Bowl', sort_order: 2 },
  { package_id: 'snack_buffet', item_name: 'French Fries', calc_method: 'guests_per_unit', qty_per_guest: null, yield_per_unit: 20, unit_name: '1/2 Chafer', sort_order: 3 },
  { package_id: 'snack_buffet', item_name: 'Chips', calc_method: 'guests_per_unit', qty_per_guest: null, yield_per_unit: 20, unit_name: 'Large Bowl', sort_order: 4 },
  { package_id: 'snack_buffet', item_name: 'Salsa', calc_method: 'guests_per_unit', qty_per_guest: null, yield_per_unit: 20, unit_name: 'Large Bowl', sort_order: 5 },

  // Fried Chicken Buffet
  { package_id: 'fried_chicken', item_name: 'Thai Fried Chicken', calc_method: 'pieces_per_guest', qty_per_guest: 2, yield_per_unit: 50, unit_name: '200 Pan', sort_order: 1 },
  { package_id: 'fried_chicken', item_name: 'French Fries', calc_method: 'guests_per_unit', qty_per_guest: null, yield_per_unit: 20, unit_name: '1/2 Chafer', sort_order: 2 },
  { package_id: 'fried_chicken', item_name: 'Hummus', calc_method: 'guests_per_unit', qty_per_guest: null, yield_per_unit: 20, unit_name: 'Large Bowl', sort_order: 3 },
  { package_id: 'fried_chicken', item_name: 'Thai Slaw', calc_method: 'guests_per_unit', qty_per_guest: null, yield_per_unit: 25, unit_name: 'Large Bowl', sort_order: 4 },
  { package_id: 'fried_chicken', item_name: 'Veggie Plate', calc_method: 'guests_per_unit', qty_per_guest: null, yield_per_unit: 20, unit_name: 'Platter', sort_order: 5 },

  // Arepa Buffet
  { package_id: 'arepa_buffet', item_name: 'Braised Pork Arepa', calc_method: 'pieces_per_guest', qty_per_guest: 0.5, yield_per_unit: 20, unit_name: '200 Pan', sort_order: 1 },
  { package_id: 'arepa_buffet', item_name: 'Pickled Green Tomato Arepa', calc_method: 'pieces_per_guest', qty_per_guest: 0.5, yield_per_unit: 20, unit_name: '200 Pan', sort_order: 2 },
  { package_id: 'arepa_buffet', item_name: 'Black Bean Arepa', calc_method: 'pieces_per_guest', qty_per_guest: 0.5, yield_per_unit: 20, unit_name: '200 Pan', sort_order: 3 },
  { package_id: 'arepa_buffet', item_name: 'Jasmine Rice', calc_method: 'guests_per_unit', qty_per_guest: null, yield_per_unit: 20, unit_name: '1/2 Chafer', sort_order: 4 },
  { package_id: 'arepa_buffet', item_name: 'Chips', calc_method: 'guests_per_unit', qty_per_guest: null, yield_per_unit: 20, unit_name: 'Large Bowl', sort_order: 5 },
  { package_id: 'arepa_buffet', item_name: 'Salsa', calc_method: 'guests_per_unit', qty_per_guest: null, yield_per_unit: 20, unit_name: 'Large Bowl', sort_order: 6 },

  // Kabob Buffet
  { package_id: 'kabob_buffet', item_name: 'Shrimp Kabob', calc_method: 'pieces_per_guest', qty_per_guest: 1, yield_per_unit: 20, unit_name: '200 Pan', sort_order: 1 },
  { package_id: 'kabob_buffet', item_name: 'Thai Chicken Kabob', calc_method: 'pieces_per_guest', qty_per_guest: 1, yield_per_unit: 20, unit_name: '200 Pan', sort_order: 2 },
  { package_id: 'kabob_buffet', item_name: 'Jasmine Rice', calc_method: 'guests_per_unit', qty_per_guest: null, yield_per_unit: 20, unit_name: '1/2 Chafer', sort_order: 3 },
  { package_id: 'kabob_buffet', item_name: 'Thai Slaw', calc_method: 'guests_per_unit', qty_per_guest: null, yield_per_unit: 25, unit_name: 'Large Bowl', sort_order: 4 },

  // Sliders Buffet
  { package_id: 'sliders_buffet', item_name: 'Pulled Pork Slider', calc_method: 'pieces_per_guest', qty_per_guest: 0.6667, yield_per_unit: 20, unit_name: '200 Pan', sort_order: 1 },
  { package_id: 'sliders_buffet', item_name: 'Mini Burger Slider', calc_method: 'pieces_per_guest', qty_per_guest: 0.6667, yield_per_unit: 20, unit_name: '200 Pan', sort_order: 2 },
  { package_id: 'sliders_buffet', item_name: 'Fried Buffalo Chicken Slider', calc_method: 'pieces_per_guest', qty_per_guest: 0.6667, yield_per_unit: 20, unit_name: '200 Pan', sort_order: 3 },
  { package_id: 'sliders_buffet', item_name: 'French Fries', calc_method: 'guests_per_unit', qty_per_guest: null, yield_per_unit: 20, unit_name: '1/2 Chafer', sort_order: 4 },
  { package_id: 'sliders_buffet', item_name: 'Thai Slaw', calc_method: 'guests_per_unit', qty_per_guest: null, yield_per_unit: 25, unit_name: 'Large Bowl', sort_order: 5 },

  // A La Carte Buffet
  { package_id: 'a_la_carte', item_name: 'French Fries', calc_method: 'guests_per_unit', qty_per_guest: null, yield_per_unit: 20, unit_name: 'Large Bowl', sort_order: 1 },
  { package_id: 'a_la_carte', item_name: 'Chips', calc_method: 'guests_per_unit', qty_per_guest: null, yield_per_unit: 20, unit_name: 'Large Bowl', sort_order: 2 },
  { package_id: 'a_la_carte', item_name: 'Salsa', calc_method: 'guests_per_unit', qty_per_guest: null, yield_per_unit: 20, unit_name: 'Large Bowl', sort_order: 3 },
  { package_id: 'a_la_carte', item_name: 'Queso', calc_method: 'guests_per_unit', qty_per_guest: null, yield_per_unit: 20, unit_name: 'Round Chafer', sort_order: 4 },
]

type HistRow = {
  date: string; event_name: string; first_name: string; last_name: string
  company: string; invoice: number; collected: number; status: 'Paid' | 'Past Due' | 'Open'
}

const HISTORICAL: HistRow[] = [
  { date:'2025-01-08', event_name:'Steve Farabaugh',         first_name:'Steve',      last_name:'Farabaugh',   company:'',                    invoice:675.66,  collected:657.66,  status:'Paid' },
  { date:'2025-01-15', event_name:'Mohammad Danial',          first_name:'Mohammad',   last_name:'Danial',      company:'',                    invoice:187,     collected:187,     status:'Paid' },
  { date:'2025-02-08', event_name:'Rob Youel',                first_name:'Rob',        last_name:'Youel',       company:'',                    invoice:920.8,   collected:920.8,   status:'Paid' },
  { date:'2025-02-15', event_name:'The Grove',                first_name:'',           last_name:'',            company:'The Grove',           invoice:96.19,   collected:96.19,   status:'Paid' },
  { date:'2025-02-19', event_name:'Jay Rubottom',             first_name:'Jay',        last_name:'Rubottom',    company:'',                    invoice:3847.5,  collected:3847.5,  status:'Paid' },
  { date:'2025-02-23', event_name:'Michele Foley',            first_name:'Michele',    last_name:'Foley',       company:'',                    invoice:1102.95, collected:1102.95, status:'Paid' },
  { date:'2025-02-27', event_name:'Robert Schwab',            first_name:'Robert',     last_name:'Schwab',      company:'',                    invoice:2870.12, collected:2870.12, status:'Paid' },
  { date:'2025-02-28', event_name:'Tera Patterson',           first_name:'Tera',       last_name:'Patterson',   company:'',                    invoice:2090.31, collected:2090.31, status:'Paid' },
  { date:'2025-03-08', event_name:'Lina Reid',                first_name:'Lina',       last_name:'Reid',        company:'',                    invoice:1412.58, collected:1412.58, status:'Paid' },
  { date:'2025-03-08', event_name:'Michelle Pham',            first_name:'Michelle',   last_name:'Pham',        company:'',                    invoice:985.05,  collected:985.05,  status:'Paid' },
  { date:'2025-03-12', event_name:'Dawn Hinkle',              first_name:'Dawn',       last_name:'Hinkle',      company:'',                    invoice:1154.9,  collected:1154.9,  status:'Paid' },
  { date:'2025-03-15', event_name:'Tina Balega',              first_name:'Tina',       last_name:'Balega',      company:'',                    invoice:1610.18, collected:1610.18, status:'Paid' },
  { date:'2025-03-22', event_name:'Judith Ackerman',          first_name:'Judith',     last_name:'Ackerman',    company:'',                    invoice:368.05,  collected:368.05,  status:'Paid' },
  { date:'2025-04-12', event_name:'Malcalm Snell',            first_name:'Malcalm',    last_name:'Snell',       company:'',                    invoice:454.5,   collected:454.5,   status:'Paid' },
  { date:'2025-05-01', event_name:'Christina Bass',           first_name:'Christina',  last_name:'Bass',        company:'',                    invoice:702.32,  collected:702.32,  status:'Paid' },
  { date:'2025-05-02', event_name:'Miriam Dillow',            first_name:'Miriam',     last_name:'Dillow',      company:'',                    invoice:1480.94, collected:1480.94, status:'Paid' },
  { date:'2025-05-03', event_name:'Clayton Floyd',            first_name:'Clayton',    last_name:'Floyd',       company:'',                    invoice:1027.22, collected:1027.22, status:'Paid' },
  { date:'2025-05-10', event_name:'Diana Sotelo',             first_name:'Diana',      last_name:'Sotelo',      company:'',                    invoice:557.49,  collected:557.49,  status:'Paid' },
  { date:'2025-05-13', event_name:"Chili's VIP Dinner",       first_name:'',           last_name:'',            company:"Chili's VIP Dinner",  invoice:1732.05, collected:1732.05, status:'Paid' },
  { date:'2025-05-15', event_name:'Sarah Heid',               first_name:'Sarah',      last_name:'Heid',        company:'',                    invoice:205.2,   collected:41.04,   status:'Past Due' },
  { date:'2025-05-25', event_name:'Connor Nelson',            first_name:'Connor',     last_name:'Nelson',      company:'',                    invoice:916.99,  collected:916.99,  status:'Paid' },
  { date:'2025-05-31', event_name:'Jenny Perry',              first_name:'Jenny',      last_name:'Perry',       company:'',                    invoice:851.2,   collected:851.2,   status:'Paid' },
  { date:'2025-06-03', event_name:'Mohammad Danial',          first_name:'Mohammad',   last_name:'Danial',      company:'',                    invoice:550,     collected:550,     status:'Paid' },
  { date:'2025-06-06', event_name:'Kassidy Petty',            first_name:'Kassidy',    last_name:'Petty',       company:'',                    invoice:852.75,  collected:852.75,  status:'Paid' },
  { date:'2025-06-24', event_name:'Idora',                    first_name:'',           last_name:'',            company:'Idora',               invoice:961.88,  collected:961.88,  status:'Paid' },
  { date:'2025-06-25', event_name:'Plains Capital HH',        first_name:'',           last_name:'',            company:'Plains Capital HH',   invoice:1648.16, collected:1648.16, status:'Paid' },
  { date:'2025-06-27', event_name:'Mohammad Danial',          first_name:'Mohammad',   last_name:'Danial',      company:'',                    invoice:765,     collected:765,     status:'Paid' },
  { date:'2025-06-29', event_name:'Christine Muldoon',        first_name:'Christine',  last_name:'Muldoon',     company:'',                    invoice:206.94,  collected:206.94,  status:'Paid' },
  { date:'2025-07-03', event_name:'J Flores',                 first_name:'J',          last_name:'Flores',      company:'',                    invoice:333.44,  collected:333.44,  status:'Paid' },
  { date:'2025-07-12', event_name:'Mohammad Danial',          first_name:'Mohammad',   last_name:'Danial',      company:'',                    invoice:605,     collected:605,     status:'Paid' },
  { date:'2025-07-18', event_name:'Ben Gray',                 first_name:'Ben',        last_name:'Gray',        company:'',                    invoice:610.46,  collected:610.46,  status:'Paid' },
  { date:'2025-07-19', event_name:'Michelle Macias',          first_name:'Michelle',   last_name:'Macias',      company:'',                    invoice:1757.64, collected:1757.64, status:'Paid' },
  { date:'2025-07-21', event_name:'Mohammad Danial',          first_name:'Mohammad',   last_name:'Danial',      company:'',                    invoice:380,     collected:380,     status:'Paid' },
  { date:'2025-07-30', event_name:'Matt Hultberg',            first_name:'Matt',       last_name:'Hultberg',    company:'',                    invoice:443.74,  collected:443.74,  status:'Paid' },
  { date:'2025-08-09', event_name:'Celeste Snyder',           first_name:'Celeste',    last_name:'Snyder',      company:'',                    invoice:305.2,   collected:305.2,   status:'Paid' },
  { date:'2025-08-14', event_name:'David Higbee',             first_name:'David',      last_name:'Higbee',      company:'',                    invoice:861.19,  collected:861.19,  status:'Paid' },
  { date:'2025-08-15', event_name:'Kyle French',              first_name:'Kyle',       last_name:'French',      company:'',                    invoice:1328.05, collected:1328.05, status:'Paid' },
  { date:'2025-08-22', event_name:'Sarah Hantak',             first_name:'Sarah',      last_name:'Hantak',      company:'',                    invoice:544.62,  collected:544.62,  status:'Paid' },
  { date:'2025-08-23', event_name:'Chelsea Clayson',          first_name:'Chelsea',    last_name:'Clayson',     company:'',                    invoice:1764.3,  collected:1764.6,  status:'Paid' },
  { date:'2025-08-24', event_name:'Celina Quevedo',           first_name:'Celina',     last_name:'Quevedo',     company:'',                    invoice:496.4,   collected:496.4,   status:'Paid' },
  { date:'2025-08-30', event_name:'Angela Franklin',          first_name:'Angela',     last_name:'Franklin',    company:'',                    invoice:783.2,   collected:783.2,   status:'Paid' },
  { date:'2025-09-11', event_name:'Devin Crear',              first_name:'Devin',      last_name:'Crear',       company:'',                    invoice:870.98,  collected:870.98,  status:'Paid' },
  { date:'2025-09-13', event_name:'Efrain Carbajal',          first_name:'Efrain',     last_name:'Carbajal',    company:'',                    invoice:481.68,  collected:481.68,  status:'Paid' },
  { date:'2025-09-16', event_name:'Brandon Hammons',          first_name:'Brandon',    last_name:'Hammons',     company:'',                    invoice:1286.67, collected:1286.67, status:'Paid' },
  { date:'2025-10-02', event_name:'Cydney Sutherland',        first_name:'Cydney',     last_name:'Sutherland',  company:'',                    invoice:2195.8,  collected:2195.8,  status:'Paid' },
  { date:'2025-10-04', event_name:'Sadia Shah',               first_name:'Sadia',      last_name:'Shah',        company:'',                    invoice:1462.84, collected:1462.84, status:'Paid' },
  { date:'2025-10-10', event_name:'Kelsey Stanley',           first_name:'Kelsey',     last_name:'Stanley',     company:'',                    invoice:976.24,  collected:976.24,  status:'Paid' },
  { date:'2025-10-11', event_name:'Beverly Jarvis',           first_name:'Beverly',    last_name:'Jarvis',      company:'',                    invoice:1211.25, collected:1211.25, status:'Paid' },
  { date:'2025-10-30', event_name:'Judith Smith',             first_name:'Judith',     last_name:'Smith',       company:'',                    invoice:1350.44, collected:1350.44, status:'Paid' },
  { date:'2025-11-14', event_name:'Alexandra Diduck',         first_name:'Alexandra',  last_name:'Diduck',      company:'',                    invoice:1627.77, collected:1627.77, status:'Paid' },
  { date:'2025-11-15', event_name:'Arthur Depoian',           first_name:'Arthur',     last_name:'Depoian',     company:'',                    invoice:2310.8,  collected:2310.8,  status:'Paid' },
  { date:'2025-11-15', event_name:'Dorothy Huoth',            first_name:'Dorothy',    last_name:'Huoth',       company:'',                    invoice:1331.2,  collected:1331.2,  status:'Paid' },
  { date:'2025-12-03', event_name:'Alyssa Wolfe',             first_name:'Alyssa',     last_name:'Wolfe',       company:'',                    invoice:3476,    collected:3476,    status:'Paid' },
  { date:'2025-12-06', event_name:'Payton Pels',              first_name:'Payton',     last_name:'Pels',        company:'',                    invoice:1664.65, collected:1664.65, status:'Paid' },
  { date:'2025-12-07', event_name:'Payton Pels',              first_name:'Payton',     last_name:'Pels',        company:'',                    invoice:1273.27, collected:1273.27, status:'Paid' },
  { date:'2025-12-10', event_name:'Andy Crady',               first_name:'Andy',       last_name:'Crady',       company:'',                    invoice:3206.25, collected:3206.25, status:'Paid' },
  { date:'2025-12-11', event_name:'Jonathan Thompson',        first_name:'Jonathan',   last_name:'Thompson',    company:'',                    invoice:2664.96, collected:2664.96, status:'Paid' },
  { date:'2025-12-14', event_name:'Laura Pruett',             first_name:'Laura',      last_name:'Pruett',      company:'',                    invoice:1017.01, collected:1017.01, status:'Paid' },
  { date:'2025-12-20', event_name:'Zachary Goodman',          first_name:'Zachary',    last_name:'Goodman',     company:'',                    invoice:1356.85, collected:1356.85, status:'Paid' },
  { date:'2025-12-27', event_name:'Catherine McMillan',       first_name:'Catherine',  last_name:'McMillan',    company:'',                    invoice:1265.77, collected:1265.77, status:'Paid' },
  // 2026
  { date:'2026-01-17', event_name:'Kelsea & Brandon Babayans',first_name:'',           last_name:'',            company:'Kelsea & Brandon Babayans', invoice:731.03,  collected:731.03,  status:'Paid' },
  { date:'2026-01-17', event_name:'Amanda Monsisvais',        first_name:'Amanda',     last_name:'Monsisvais',  company:'',                    invoice:2877.52, collected:2877.52, status:'Paid' },
  { date:'2026-01-30', event_name:'Jay Rubottom',             first_name:'Jay',        last_name:'Rubottom',    company:'',                    invoice:3910.9,  collected:3910.9,  status:'Paid' },
  { date:'2026-02-11', event_name:'Gisella Pina',             first_name:'Gisella',    last_name:'Pina',        company:'',                    invoice:2482.8,  collected:2482.8,  status:'Paid' },
  { date:'2026-02-21', event_name:'Megan Ewing',              first_name:'Megan',      last_name:'Ewing',       company:'',                    invoice:532.15,  collected:532.15,  status:'Paid' },
  { date:'2026-02-28', event_name:'Bryan Howard',             first_name:'Bryan',      last_name:'Howard',      company:'',                    invoice:2409.12, collected:2409.12, status:'Paid' },
  { date:'2026-03-04', event_name:'Carlos Nunez',             first_name:'Carlos',     last_name:'Nunez',       company:'',                    invoice:920.8,   collected:920.8,   status:'Paid' },
  { date:'2026-03-20', event_name:'Alexa Kay',                first_name:'Alexa',      last_name:'Kay',         company:'',                    invoice:1299.09, collected:1299.09, status:'Paid' },
  { date:'2026-04-08', event_name:'Angela Song',              first_name:'Angela',     last_name:'Song',        company:'',                    invoice:243.56,  collected:243.56,  status:'Paid' },
  { date:'2026-04-09', event_name:'Neil Krafsur',             first_name:'Neil',       last_name:'Krafsur',     company:'',                    invoice:471.25,  collected:471.25,  status:'Paid' },
  { date:'2026-04-11', event_name:'Matthew Abernathy',        first_name:'Matthew',    last_name:'Abernathy',   company:'',                    invoice:814.33,  collected:814.33,  status:'Paid' },
  { date:'2026-04-14', event_name:'Jenni Stolarski',          first_name:'Jenni',      last_name:'Stolarski',   company:'',                    invoice:1910.87, collected:1910.87, status:'Paid' },
  { date:'2026-04-18', event_name:'Madison Ryan',             first_name:'Madison',    last_name:'Ryan',        company:'',                    invoice:1898.99, collected:1898.99, status:'Paid' },
  { date:'2026-04-24', event_name:'Gwendy Hays',              first_name:'Gwendy',     last_name:'Hays',        company:'',                    invoice:1306.5,  collected:1306.5,  status:'Paid' },
  { date:'2026-04-25', event_name:'Nathalie Abenoza',         first_name:'Nathalie',   last_name:'Abenoza',     company:'',                    invoice:1446.55, collected:1446.55, status:'Paid' },
  { date:'2026-04-30', event_name:'Brianna Bloemker',         first_name:'Brianna',    last_name:'Bloemker',    company:'',                    invoice:683.54,  collected:683.54,  status:'Paid' },
  { date:'2026-05-03', event_name:'Tom Nicol',                first_name:'Tom',        last_name:'Nicol',       company:'',                    invoice:1698.62, collected:1698.62, status:'Paid' },
  { date:'2026-05-08', event_name:'Hannah Larson',            first_name:'Hannah',     last_name:'Larson',      company:'',                    invoice:2504.69, collected:2504.69, status:'Paid' },
  { date:'2026-05-09', event_name:'Anne Smead',               first_name:'Anne',       last_name:'Smead',       company:'',                    invoice:1181.08, collected:1181.08, status:'Paid' },
  { date:'2026-05-09', event_name:'John Clayton',             first_name:'John',       last_name:'Clayton',     company:'',                    invoice:1010.54, collected:1010.54, status:'Paid' },
  { date:'2026-05-12', event_name:'Davidson Sutherland',      first_name:'Davidson',   last_name:'Sutherland',  company:'',                    invoice:1369,    collected:1369,    status:'Paid' },
  { date:'2026-05-16', event_name:'Jess Grajewski',           first_name:'Jess',       last_name:'Grajewski',   company:'',                    invoice:2816.35, collected:2816.35, status:'Paid' },
  { date:'2026-05-16', event_name:'Bryan Batchelder',         first_name:'Bryan',      last_name:'Batchelder',  company:'',                    invoice:1958.82, collected:1958.82, status:'Paid' },
  { date:'2026-06-18', event_name:'Andrew Alfaro',            first_name:'Andrew',     last_name:'Alfaro',      company:'',                    invoice:746.38,  collected:0,       status:'Open' },
  { date:'2026-06-20', event_name:'Rachel Parkes',            first_name:'Rachel',     last_name:'Parkes',      company:'',                    invoice:677.12,  collected:0,       status:'Open' },
  { date:'2026-07-07', event_name:'Brenda Freeman',           first_name:'Brenda',     last_name:'Freeman',     company:'',                    invoice:2293.08, collected:0,       status:'Open' },
  { date:'2026-08-08', event_name:'Tracy Lindvall',           first_name:'Tracy',      last_name:'Lindvall',    company:'',                    invoice:895.15,  collected:0,       status:'Open' },
  { date:'2026-08-14', event_name:'Al & Tracey Fox',          first_name:'',           last_name:'',            company:'Al & Tracey Fox',     invoice:3113.88, collected:0,       status:'Open' },
  { date:'2026-08-28', event_name:'Charles Ward',             first_name:'Charles',    last_name:'Ward',        company:'',                    invoice:1536.4,  collected:0,       status:'Open' },
  { date:'2026-09-05', event_name:'Julia Olson',              first_name:'Julia',      last_name:'Olson',       company:'',                    invoice:1087.53, collected:0,       status:'Open' },
]

export function seedHistoricalEvents(db: Database.Database) {
  const already = db.prepare(`SELECT COUNT(*) as c FROM events WHERE event_name = 'Steve Farabaugh' AND event_date = '2025-01-08'`).get() as { c: number }
  if (already.c > 0) return

  const insertClient = db.prepare(
    `INSERT INTO clients (first_name, last_name, email, phone, company, notes, referral_source) VALUES (?, ?, '', '', ?, '', 'Historical')`
  )
  const insertEvent = db.prepare(
    `INSERT INTO events (event_name, event_date, event_time, setup_time, teardown_time, status, space, client_id, created_at, updated_at) VALUES (?, ?, '', '', ?, ?, '', ?, ?, ?)`
  )

  const clientMap = new Map<string, number>()
  const now = new Date().toISOString()

  const importAll = db.transaction(() => {
    for (const row of HISTORICAL) {
      const clientKey = row.company || `${row.first_name} ${row.last_name}`
      let clientId = clientMap.get(clientKey)
      if (!clientId) {
        const res = insertClient.run(row.first_name, row.last_name, row.company)
        clientId = res.lastInsertRowid as number
        clientMap.set(clientKey, clientId)
      }

      const eventStatus = row.status === 'Paid' ? 'Closed' : 'Confirmed'
      insertEvent.run(row.event_name, row.date, '', eventStatus, clientId, now, now)
    }
  })

  importAll()
}

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
