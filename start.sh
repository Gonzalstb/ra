#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

export WWWUSER="${WWWUSER:-$(id -u)}"
export WWWGROUP="${WWWGROUP:-$(id -g)}"

echo "Arrancando Laravel Sail (PHP 8.3 + MySQL)..."
./vendor/bin/sail up -d

echo "Ajustando permisos de storage (evita errores si antes se usó docker como root)..."
./vendor/bin/sail root-shell -c "chown -R sail:sail /var/www/html/storage /var/www/html/bootstrap/cache && chmod -R ug+rwx /var/www/html/storage /var/www/html/bootstrap/cache"

echo "Migraciones y datos de demo..."
./vendor/bin/sail artisan migrate --force
./vendor/bin/sail artisan db:seed --force

echo "Compilando assets..."
./vendor/bin/sail npm run build

echo ""
echo "Aplicación: http://localhost:${APP_PORT:-8000}"
echo "Login demo: gbr@test.com / Test1111"
echo ""
echo "Comandos útiles:"
echo "  ./vendor/bin/sail artisan migrate"
echo "  ./vendor/bin/sail npm run dev"
echo "  ./vendor/bin/sail down"
