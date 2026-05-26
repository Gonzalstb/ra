# Planificador de Rutas por la Toscana (Laravel + JavaScript)

Aplicación Laravel 12 con **JavaScript modular vanilla** (sin React), Tailwind CSS 4 y Leaflet.

## Base de datos `ra_master`

| Parámetro | Valor (con Sail) |
|-----------|------------------|
| Base de datos | `ra_master` |
| Usuario | `root` |
| Contraseña | `admin` |
| Host | `mysql` (dentro de Docker) / `127.0.0.1:3306` (desde el host) |

## Arranque con [Laravel Sail](https://laravel.com/docs/sail)

Requisitos: Docker y Docker Compose.

```bash
./start.sh
```

O manualmente:

```bash
export WWWUSER=$(id -u) WWWGROUP=$(id -g)
./vendor/bin/sail up -d
./vendor/bin/sail artisan migrate --force
./vendor/bin/sail artisan db:seed --force
./vendor/bin/sail npm run build
```

URL: **http://localhost:8000**

Comandos habituales (equivalente a `docker compose exec ...`):

```bash
./vendor/bin/sail artisan migrate
./vendor/bin/sail npm run dev
./vendor/bin/sail shell
./vendor/bin/sail down
```

Alias corto: `composer sail -- artisan migrate`

## Estructura modular

### Backend (PHP)

- `app/Http/Controllers/Api/TripController.php` — controlador fino
- `app/Http/Requests/SyncTripsRequest.php` — validación
- `app/Services/Trip/TripFormatter.php` — formato API
- `app/Services/Trip/TripQueryService.php` — consultas
- `app/Services/Trip/TripSyncService.php` — persistencia

### Frontend (JS)

- `resources/js/constants/presets.js` — datos estáticos
- `resources/js/api/tripsApi.js` — HTTP
- `resources/js/state/plannerStore.js` — estado reactivo
- `resources/js/services/geocoding.js` — Nominatim
- `resources/js/services/syncScheduler.js` — guardado automático
- `resources/js/map/` — mapa Leaflet
- `resources/js/ui/` — alertas, pestañas, modales, listas, formularios, galería
- `resources/js/app/initPlanner.js` — orquestación

### Vistas (Blade)

- `resources/views/planner/index.blade.php`
- `resources/views/planner/partials/*`

## QueryException

Si aparece error de tabla `sessions`, asegúrate de tener en `.env`:

```
SESSION_DRIVER=file
CACHE_STORE=file
```

No uses `database` para sesiones si no has ejecutado todas las migraciones de Laravel.

## API

- `GET /trips` (requiere sesión autenticada)
- `PUT /trips/sync` (requiere sesión autenticada)

### Acceso

- **Login:** `/login`
- **Registro:** `/register`
- Usuario demo (tras `php artisan db:seed`): `demo@toscana.local` / `password`
