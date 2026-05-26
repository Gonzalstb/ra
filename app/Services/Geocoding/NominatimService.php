<?php

namespace App\Services\Geocoding;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;

class NominatimService
{
    public function search(string $rawQuery, bool $includeLocalita = true): ?array
    {
        $attempts = $this->buildSearchAttempts($rawQuery, $includeLocalita);

        foreach ($attempts as $attempt) {
            $result = $this->performAttempt($attempt);
            if ($result) {
                return $result;
            }
        }

        return null;
    }

    private function performAttempt(array $attempt): ?array
    {
        $cacheKey = 'geocode:'.md5(json_encode($attempt));

        return Cache::remember($cacheKey, now()->addDay(), function () use ($attempt) {
            $params = [
                'format' => 'json',
                'limit' => 1,
                'addressdetails' => 1,
            ];

            if (! empty($attempt['structured'])) {
                $params = array_merge($params, $attempt['structured']);
            } elseif (! empty($attempt['query'])) {
                $params['q'] = $attempt['query'];
            } else {
                return null;
            }

            if (! empty($attempt['countrycodes'])) {
                $params['countrycodes'] = $attempt['countrycodes'];
            }

            $response = Http::withHeaders([
                'User-Agent' => config('app.name', 'RutasDeViaje').'/1.0',
                'Accept-Language' => 'es,it,en',
            ])->timeout(10)->get('https://nominatim.openstreetmap.org/search', $params);

            if (! $response->successful()) {
                return null;
            }

            $data = $response->json();
            if (empty($data[0])) {
                return null;
            }

            $place = $data[0];

            return [
                'lat' => (float) $place['lat'],
                'lng' => (float) $place['lon'],
                'name' => explode(',', $place['display_name'])[0] ?? 'Lugar encontrado',
                'matchedLabel' => $attempt['label'],
            ];
        });
    }

    /** @return list<array{query?: string, structured?: array<string, string>, label: string, countrycodes?: string}> */
    private function buildSearchAttempts(string $query, bool $includeLocalita): array
    {
        $normalized = $this->normalizeQuery($query);
        if ($normalized === '') {
            return [];
        }

        $countryCodes = $this->detectCountryCodes($normalized);
        $attempts = [];
        $seen = [];

        $add = function (array $attempt) use (&$attempts, &$seen): void {
            $key = json_encode([
                'q' => $attempt['query'] ?? null,
                's' => $attempt['structured'] ?? null,
                'c' => $attempt['countrycodes'] ?? null,
            ]);
            if (isset($seen[$key])) {
                return;
            }
            $seen[$key] = true;
            $attempts[] = $attempt;
        };

        $add([
            'query' => $normalized,
            'label' => 'Dirección completa',
            'countrycodes' => $countryCodes,
        ]);

        $withoutLocalita = trim(preg_replace('/Località\s+/iu', '', $normalized) ?? $normalized);
        if ($includeLocalita && $withoutLocalita !== '' && $withoutLocalita !== $normalized) {
            $add([
                'query' => $withoutLocalita,
                'label' => 'Sin prefijo Località',
                'countrycodes' => $countryCodes ?: 'it',
            ]);
        }

        $structured = $this->parseStructuredAddress($normalized);
        if ($structured) {
            $add([
                'structured' => $structured,
                'label' => 'Búsqueda estructurada',
                'countrycodes' => $countryCodes,
            ]);

            if (! empty($structured['postalcode']) && ! empty($structured['city'])) {
                $add([
                    'query' => trim($structured['postalcode'].' '.$structured['city']),
                    'label' => 'Por código postal y ciudad',
                    'countrycodes' => $countryCodes ?: 'it',
                ]);
            }

            if (! empty($structured['street']) && ! empty($structured['city'])) {
                $add([
                    'query' => trim($structured['street'].' '.$structured['city']),
                    'label' => 'Por calle y ciudad',
                    'countrycodes' => $countryCodes ?: 'it',
                ]);
            }
        }

        $withoutPostal = trim(preg_replace('/\b\d{5}\b/', '', $normalized) ?? $normalized);
        $withoutPostal = trim(preg_replace('/\s+/', ' ', $withoutPostal) ?? $withoutPostal);
        if ($withoutPostal !== '' && $withoutPostal !== $normalized) {
            $add([
                'query' => $withoutPostal,
                'label' => 'Sin código postal',
                'countrycodes' => $countryCodes,
            ]);
        }

        if ($withoutLocalita !== '' && $withoutLocalita !== $normalized) {
            $withoutNumbers = trim(preg_replace('/\b\d+\b/', '', $withoutLocalita) ?? $withoutLocalita);
            $withoutNumbers = trim(preg_replace('/\s+/', ' ', $withoutNumbers) ?? $withoutNumbers);
            if ($withoutNumbers !== '' && $withoutNumbers !== $withoutLocalita) {
                $add([
                    'query' => $withoutNumbers,
                    'label' => 'Por zona y ciudad',
                    'countrycodes' => $countryCodes ?: 'it',
                ]);
            }
        }

        return $attempts;
    }

    private function normalizeQuery(string $query): string
    {
        $query = str_replace(['‘', '’', '`'], "'", $query);
        $query = preg_replace('/\s*\([^)]*\)/', '', $query) ?? $query;
        $query = preg_replace('/\s+/', ' ', $query) ?? $query;

        return trim($query);
    }

    private function detectCountryCodes(string $query): ?string
    {
        if (preg_match('/\b(Italy|Italia)\b/i', $query) || preg_match('/\([A-Z]{2}\)/', $query)) {
            return 'it';
        }

        if (preg_match('/\b(Spain|España|Espana)\b/i', $query)) {
            return 'es';
        }

        if (preg_match('/\b(France|Francia)\b/i', $query)) {
            return 'fr';
        }

        if (preg_match('/\b(Portugal)\b/i', $query)) {
            return 'pt';
        }

        if (preg_match('/\b(Germany|Alemania|Deutschland)\b/i', $query)) {
            return 'de';
        }

        return null;
    }

    /** @return array<string, string>|null */
    private function parseStructuredAddress(string $query): ?array
    {
        if (! preg_match('/\b(\d{5})\b/', $query, $postalMatch)) {
            return null;
        }

        $postalcode = $postalMatch[1];
        $parts = explode($postalcode, $query, 2);
        if (count($parts) !== 2) {
            return null;
        }

        $beforePostal = trim($parts[0]);
        $afterPostal = trim($parts[1]);

        $street = trim(preg_replace('/^Località\s+/iu', '', $beforePostal) ?? $beforePostal);
        $city = trim(preg_replace('/\b(Italy|Italia|Spain|España|Espana|France|Francia|Portugal|Germany|Alemania)\b.*/iu', '', $afterPostal) ?? $afterPostal);
        $city = trim(preg_replace('/\s*,.*$/', '', $city) ?? $city);

        if ($street === '' || $city === '') {
            return null;
        }

        $country = null;
        if (preg_match('/\b(Italy|Italia)\b/i', $query) || preg_match('/\([A-Z]{2}\)/', $query)) {
            $country = 'Italy';
        } elseif (preg_match('/\b(Spain|España|Espana)\b/i', $query)) {
            $country = 'Spain';
        } elseif (preg_match('/\b(France|Francia)\b/i', $query)) {
            $country = 'France';
        } elseif (preg_match('/\b(Portugal)\b/i', $query)) {
            $country = 'Portugal';
        } elseif (preg_match('/\b(Germany|Alemania|Deutschland)\b/i', $query)) {
            $country = 'Germany';
        }

        $structured = array_filter([
            'street' => $street,
            'city' => $city,
            'postalcode' => $postalcode,
            'country' => $country,
        ], fn ($value) => $value !== null && $value !== '');

        return count($structured) >= 2 ? $structured : null;
    }
}
