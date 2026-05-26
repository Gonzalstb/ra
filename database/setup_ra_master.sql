CREATE TABLE IF NOT EXISTS migrations (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    migration VARCHAR(255) NOT NULL,
    batch INT NOT NULL
);

CREATE TABLE IF NOT EXISTS trips (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    starting_point_name VARCHAR(255) NOT NULL,
    starting_point_lat DECIMAL(10, 7) NOT NULL,
    starting_point_lng DECIMAL(10, 7) NOT NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 0,
    created_at TIMESTAMP NULL,
    updated_at TIMESTAMP NULL
);

CREATE TABLE IF NOT EXISTS destinations (
    id VARCHAR(255) PRIMARY KEY,
    trip_id VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT NULL,
    photo_url VARCHAR(255) NOT NULL,
    duration VARCHAR(255) NOT NULL DEFAULT '1h',
    is_round_trip TINYINT(1) NOT NULL DEFAULT 0,
    in_route TINYINT(1) NOT NULL DEFAULT 1,
    lat DECIMAL(10, 7) NOT NULL,
    lng DECIMAL(10, 7) NOT NULL,
    sort_order INT UNSIGNED NOT NULL DEFAULT 0,
    created_at TIMESTAMP NULL,
    updated_at TIMESTAMP NULL,
    CONSTRAINT destinations_trip_id_foreign FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE
);

INSERT IGNORE INTO migrations (migration, batch) VALUES
('2026_05_25_000001_create_trips_table', 1),
('2026_05_25_000002_create_destinations_table', 1);

INSERT INTO trips (id, name, starting_point_name, starting_point_lat, starting_point_lng, is_active, created_at, updated_at) VALUES
('trip-1', 'Valle de Orcia y Siena', 'Florencia Centro', 43.7696000, 11.2558000, 1, NOW(), NOW()),
('trip-2', 'Ruta de la Costa Etrusca', 'Pisa Aeropuerto', 43.6996000, 10.3984000, 0, NOW(), NOW())
ON DUPLICATE KEY UPDATE updated_at = NOW();

INSERT INTO destinations (id, trip_id, name, description, photo_url, duration, is_round_trip, in_route, lat, lng, sort_order, created_at, updated_at) VALUES
('1', 'trip-1', 'Siena', 'Preciosa ciudad medieval famosa por el Palio y su espectacular catedral gótica de mármol blanco y negro.', 'https://images.unsplash.com/photo-1599818449779-1c6ca1653ff9?w=800&auto=format&fit=crop&q=80', '1h 15m', 1, 1, 43.3188000, 11.3308000, 0, NOW(), NOW()),
('2', 'trip-1', 'San Gimignano', 'El Manhattan de la Edad Media. Conserva 14 torres de piedra señoriales que dominan el horizonte toscano.', 'https://images.unsplash.com/photo-1541370976299-4d24ebbc9037?w=800&auto=format&fit=crop&q=80', '55 min', 0, 0, 43.4674000, 11.0429000, 1, NOW(), NOW()),
('3', 'trip-1', 'Val d''Orcia', 'Paisaje icónico de colinas doradas, hileras de cipreses perfectas y viñedos de Brunello de Montalcino.', 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=800&auto=format&fit=crop&q=80', '1h 45m', 1, 1, 43.0761000, 11.6789000, 2, NOW(), NOW()),
('coast-1', 'trip-2', 'Lucca Casco Histórico', 'Famosa por sus murallas renacentistas intactas que rodean todo el centro de la ciudad y sus calles adoquinadas.', 'https://images.unsplash.com/photo-1528127269322-539801943592?w=800&auto=format&fit=crop&q=80', '35 min', 0, 1, 43.8429000, 10.5027000, 0, NOW(), NOW()),
('coast-2', 'trip-2', 'Castagneto Carducci', 'Precioso pueblo medieval situado en una colina de pinos y olivares con vistas increíbles del Mar Tirreno.', 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=800', '1h 10m', 1, 1, 43.1611000, 10.6111000, 1, NOW(), NOW())
ON DUPLICATE KEY UPDATE updated_at = NOW();
