<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;

class BuildAirportCatalogCommand extends Command
{
    protected $signature = 'airports:build-catalog';

    protected $description = 'Descarga aeropuertos de OurAirports y genera database/data/airports_catalog.json';

    public function handle(): int
    {
        $this->info('Descargando datos de OurAirports...');

        $countriesResponse = Http::timeout(60)->get('https://davidmegginson.github.io/ourairports-data/countries.csv');
        $airportsResponse = Http::timeout(120)->get('https://davidmegginson.github.io/ourairports-data/airports.csv');

        if (! $countriesResponse->successful() || ! $airportsResponse->successful()) {
            $this->error('No se pudieron descargar los CSV de OurAirports.');

            return self::FAILURE;
        }

        $countryNames = [];
        foreach ($this->parseCsv($countriesResponse->body()) as $row) {
            if (! empty($row['code'])) {
                $countryNames[$row['code']] = $row['name'] ?? $row['code'];
            }
        }

        $allowedTypes = ['large_airport', 'medium_airport'];
        $byCountry = [];

        foreach ($this->parseCsv($airportsResponse->body()) as $row) {
            $iata = trim($row['iata_code'] ?? '');
            $iso = strtoupper(trim($row['iso_country'] ?? ''));

            if ($iata === '' || $iso === '' || ! in_array($row['type'] ?? '', $allowedTypes, true)) {
                continue;
            }

            $byCountry[$iso][] = [
                'iata' => $iata,
                'name' => $row['name'] ?? $iata,
                'city' => $row['municipality'] ?? '',
                'lat' => (float) ($row['latitude_deg'] ?? 0),
                'lng' => (float) ($row['longitude_deg'] ?? 0),
            ];
        }

        foreach ($byCountry as $code => $airports) {
            usort($byCountry[$code], fn ($a, $b) => strcmp($a['name'], $b['name']));
        }

        $countries = [];
        foreach (array_keys($byCountry) as $code) {
            $countries[] = [
                'code' => $code,
                'name' => $countryNames[$code] ?? $code,
            ];
        }

        usort($countries, fn ($a, $b) => strcmp($a['name'], $b['name']));

        $output = [
            'countries' => $countries,
            'byCountry' => $byCountry,
        ];

        $dir = database_path('data');
        if (! is_dir($dir)) {
            mkdir($dir, 0755, true);
        }

        $path = $dir.'/airports_catalog.json';
        file_put_contents($path, json_encode($output, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));

        $totalAirports = array_sum(array_map('count', $byCountry));
        $this->info("Catálogo generado: {$path}");
        $this->info(count($countries).' países, '.$totalAirports.' aeropuertos.');

        return self::SUCCESS;
    }

  /**
     * @return iterable<array<string, string>>
     */
    private function parseCsv(string $content): iterable
    {
        $lines = preg_split('/\r\n|\r|\n/', trim($content));
        if (! $lines) {
            return;
        }

        $headers = str_getcsv(array_shift($lines));

        foreach ($lines as $line) {
            if ($line === '') {
                continue;
            }
            $values = str_getcsv($line);
            if (count($values) !== count($headers)) {
                continue;
            }
            yield array_combine($headers, $values);
        }
    }
}
