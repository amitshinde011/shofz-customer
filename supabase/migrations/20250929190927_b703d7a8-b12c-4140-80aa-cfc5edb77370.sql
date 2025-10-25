-- Update all shops to be in Pimpri Chinchwad area, Maharashtra
-- Using various locations across Pimpri Chinchwad (near Pune)

UPDATE shops
SET 
  location = ST_SetSRID(ST_MakePoint(73.8027, 18.6298), 4326)::geography,
  address = 'Shop 12, Pimpri Station Road, Pimpri, Pimpri-Chinchwad - 411018'
WHERE name = 'ElectroMart Delhi';

UPDATE shops
SET 
  location = ST_SetSRID(ST_MakePoint(73.7997, 18.6186), 4326)::geography,
  address = 'Chinchwad East, Chinchwad, Pimpri-Chinchwad - 411019'
WHERE name LIKE 'Fashion Hub%';

UPDATE shops
SET 
  location = ST_SetSRID(ST_MakePoint(73.8150, 18.6425), 4326)::geography,
  address = 'Akurdi Station Road, Akurdi, Pimpri-Chinchwad - 411035'
WHERE name LIKE 'Fresh Grocery%';

UPDATE shops
SET 
  location = ST_SetSRID(ST_MakePoint(73.7685, 18.6367), 4326)::geography,
  address = 'Nigdi, Near Pradhikaran, Pimpri-Chinchwad - 411044'
WHERE name LIKE 'Book World%';

UPDATE shops
SET 
  location = ST_SetSRID(ST_MakePoint(73.8098, 18.6540), 4326)::geography,
  address = 'Bhosari MIDC, Bhosari, Pimpri-Chinchwad - 411026'
WHERE name LIKE 'PharmaCare%';

UPDATE shops
SET 
  location = ST_SetSRID(ST_MakePoint(73.7890, 18.6089), 4326)::geography,
  address = 'Chinchwad Station, Chinchwad, Pimpri-Chinchwad - 411033'
WHERE name LIKE 'Coffee Corner%';

UPDATE shops
SET 
  location = ST_SetSRID(ST_MakePoint(73.7953, 18.6476), 4326)::geography,
  address = 'Thergaon, Near D-Mart, Pimpri-Chinchwad - 411033'
WHERE name LIKE 'Fitness Pro%';

UPDATE shops
SET 
  location = ST_SetSRID(ST_MakePoint(73.8245, 18.6123), 4326)::geography,
  address = 'Pimple Saudagar, Near Aundh, Pimpri-Chinchwad - 411027'
WHERE name LIKE 'Pet Paradise%';
