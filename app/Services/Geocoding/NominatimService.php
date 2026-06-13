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

        $canonical = $this->buildCanonicalItalianQuery($normalized);
        if ($canonical !== null) {
            $add([
                'query' => $canonical,
                'label' => 'Lugar + código postal y ciudad',
                'countrycodes' => $countryCodes ?: 'it',
            ]);
        }

        $withoutLocalita = $this->stripLocalitaPrefix($normalized);
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

        foreach ($this->buildRuralPlaceAttempts($normalized, $countryCodes) as $attempt) {
            $add($attempt);
        }

        return $attempts;
    }

    private function normalizeQuery(string $query): string
    {
        $query = $this->trimBookingBoilerplate($query);
        $query = str_replace(['‘', '’', '`'], "'", $query);
        $query = preg_replace('/\s*\([^)]*\)/', '', $query) ?? $query;
        $query = preg_replace('/\s*-\s*/', ', ', $query) ?? $query;
        $query = preg_replace('/\s*,\s*/', ', ', $query) ?? $query;
        $query = preg_replace('/\s+/', ' ', $query) ?? $query;

        return trim($query, " ,");
    }

    private function trimBookingBoilerplate(string $query): string
    {
        $patterns = [
            '/\b(?:después de reservar|after booking|once you have booked|tras la reserva|after your booking)\b.*/iu',
            '/\b(?:encontrarás todos los datos|you will find all the details|you\'?ll find all)\b.*/iu',
            '/\b(?:confirmación de la reserva|booking confirmation|in your account|en tu cuenta)\b.*/iu',
        ];

        foreach ($patterns as $pattern) {
            $query = preg_replace($pattern, '', $query) ?? $query;
        }

        $query = preg_replace(
            '/(Italia|Italy|España|Espana|Spain|France|Francia|Portugal|Germany|Alemania)(?=[A-ZÁÉÍÓÚÀ-ÿ])/u',
            '$1',
            $query
        ) ?? $query;

        if (preg_match('/^(.+?\b\d{5}\b[^.!?]{0,80}?)(?:[.!?]|$)/u', $query, $match)) {
            $candidate = trim($match[1]);
            if (mb_strlen($candidate) >= 10) {
                $query = $candidate;
            }
        }

        return trim($query);
    }

    private function stripLocalitaPrefix(string $query): string
    {
        return trim(preg_replace("/\b(?:loc\.|localit[aà])['']?\s*/iu", '', $query) ?? $query);
    }

    /** Formato que Nominatim suele resolver: «Montenidoli, 53037 San Gimignano, Italy». */
    private function buildCanonicalItalianQuery(string $query): ?string
    {
        $city = $this->extractCityFromQuery($query);
        $place = $this->extractNamedPlaceFromQuery($query);

        if ($city === null || $place === null) {
            return null;
        }

        $country = $this->detectCountryName($query) ?? 'Italy';
        $postal = null;
        if (preg_match('/\b(\d{5})\b/', $query, $match)) {
            $postal = $match[1];
        }

        if ($postal !== null) {
            return trim($place.', '.$postal.' '.$city.', '.$country);
        }

        return trim($place.', '.$city.', '.$country);
    }

    private function extractNamedPlaceFromQuery(string $query): ?string
    {
        if (preg_match("/\b(?:loc\.|localit[aà])['']?\s*([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ'\\-]+)/iu", $query, $match)) {
            return trim($match[1]);
        }

        $withoutLocalita = $this->stripLocalitaPrefix($query);
        $firstPart = trim(explode(',', $withoutLocalita, 2)[0] ?? '');
        $firstPart = trim(preg_replace('/\b\d+\b/', '', $firstPart) ?? $firstPart);
        $firstPart = trim(preg_replace('/\s+/', ' ', $firstPart) ?? $firstPart);

        if (mb_strlen($firstPart) >= 4) {
            return $firstPart;
        }

        return null;
    }

    /**
     * Direcciones rurales italianas suelen mezclar varias localidades en una línea;
     * Nominatim no las reconoce juntas, pero sí por nombre de lugar + ciudad.
     *
     * @return list<array{query: string, label: string, countrycodes?: string}>
     */
    private function buildRuralPlaceAttempts(string $query, ?string $countryCodes): array
    {
        $city = $this->extractCityFromQuery($query);
        if ($city === null) {
            return [];
        }

        $country = $this->detectCountryName($query) ?? 'Italy';
        $codes = $countryCodes ?: 'it';
        $attempts = [];
        $seen = [];

        $add = function (string $placeQuery, string $label) use (&$attempts, &$seen, $codes): void {
            if ($placeQuery === '' || isset($seen[$placeQuery])) {
                return;
            }
            $seen[$placeQuery] = true;
            $attempts[] = [
                'query' => $placeQuery,
                'label' => $label,
                'countrycodes' => $codes,
            ];
        };

        $postal = $this->postalCodeForCity($city);
        if ($postal !== null) {
            $add(trim($postal.' '.$city.', '.$country), 'Por código postal y ciudad');
        }

        $add($city.', '.$country, 'Por ciudad');

        $beforeCity = trim(preg_replace('/\b'.preg_quote($city, '/').'\b.*$/iu', '', $query) ?? $query);
        $beforeCity = $this->stripLocalitaPrefix($beforeCity);
        $beforeCity = trim(preg_replace('/\b\d+\b/', ' ', $beforeCity) ?? $beforeCity);
        $beforeCity = trim(preg_replace('/\s+/', ' ', $beforeCity) ?? $beforeCity);

        if ($beforeCity !== '') {
            $tokens = array_values(array_filter(
                preg_split('/[\s,]+/', $beforeCity, -1, PREG_SPLIT_NO_EMPTY) ?: [],
                fn (string $token) => mb_strlen($token) >= 4 && ! preg_match('/^\d+$/', $token)
            ));

            if ($tokens !== []) {
                $last = $tokens[count($tokens) - 1];
                $add($last.', '.$city.', '.$country, 'Por última localidad');
            }

            foreach (array_reverse($tokens) as $token) {
                $add($token.', '.$city.', '.$country, 'Por lugar («'.$token.'»)');
            }
        }

        return $attempts;
    }

    private function extractCityFromQuery(string $query): ?string
    {
        foreach ($this->knownCityPatterns() as $pattern => $city) {
            if (preg_match($pattern, $query)) {
                return $city;
            }
        }

        $work = trim(preg_replace('/\b(Italy|Italia|Spain|España|Espana|France|Francia|Portugal|Germany|Alemania)\b.*/iu', '', $query) ?? $query);
        $work = trim($work, " ,");

        if ($work === '') {
            return null;
        }

        if (str_contains($work, ',')) {
            $parts = array_values(array_filter(array_map('trim', explode(',', $work))));
            foreach (array_reverse($parts) as $part) {
                $candidate = $this->cleanCityCandidate($part);
                if ($candidate !== null) {
                    return $candidate;
                }
            }
        }

        return $this->cleanCityCandidate($work);
    }

    /** @return array<string, string> */
    private function knownCityPatterns(): array
    {
        return [
            '/\bSan\s+Gimignano\b/iu' => 'San Gimignano',
            '/\bCastagneto\s+Carducci\b/iu' => 'Castagneto Carducci',
            '/\bMontalcino\b/iu' => 'Montalcino',
            '/\bVolterra\b/iu' => 'Volterra',
            '/\bSiena\b/iu' => 'Siena',
            '/\b(Firenze|Florence)\b/iu' => 'Firenze',
            '/\bPisa\b/iu' => 'Pisa',
            '/\bLucca\b/iu' => 'Lucca',
        ];
    }

    private function cleanCityCandidate(string $candidate): ?string
    {
        foreach ($this->knownCityPatterns() as $pattern => $city) {
            if (preg_match($pattern, $candidate)) {
                return $city;
            }
        }

        $candidate = trim(preg_replace('/\b\d{5}\b/', '', $candidate) ?? $candidate);
        $candidate = trim(preg_replace('/\b(SI|FI|PI|PT|LI|LU|GR|AR|PG|RM|NA|SA|BA|BT|BR|CE|CT|CZ|EN|FG|FC|FR|GE|GO|IM|IS|KR|LC|LE|LO|MC|ME|MI|MN|MO|MS|MT|NO|NU|OR|PA|PC|PD|PE|PO|PR|PV|PZ|RA|RC|RE|RG|RI|RN|RO|SO|SP|SR|SS|SV|TA|TE|TN|TO|TP|TR|TS|TV|UD|VA|VB|VC|VE|VI|VR|VT|VV)\b/iu', '', $candidate) ?? $candidate);
        $candidate = trim(preg_replace('/\bSi\b/iu', '', $candidate) ?? $candidate);
        $candidate = trim(preg_replace('/\s+/', ' ', $candidate) ?? $candidate);

        if ($candidate === '' || preg_match('/^\d+$/', $candidate)) {
            return null;
        }

        if (mb_strlen($candidate) < 3) {
            return null;
        }

        return $candidate;
    }

    private function detectCountryName(string $query): ?string
    {
        if (preg_match('/\b(Italy|Italia)\b/i', $query)) {
            return 'Italy';
        }
        if (preg_match('/\b(Spain|España|Espana)\b/i', $query)) {
            return 'Spain';
        }
        if (preg_match('/\b(France|Francia)\b/i', $query)) {
            return 'France';
        }
        if (preg_match('/\b(Portugal)\b/i', $query)) {
            return 'Portugal';
        }
        if (preg_match('/\b(Germany|Alemania|Deutschland)\b/i', $query)) {
            return 'Germany';
        }

        return null;
    }

    private function postalCodeForCity(string $city): ?string
    {
        $key = mb_strtolower(trim($city));

        return match ($key) {
            'san gimignano' => '53037',
            'siena' => '53100',
            'florencia', 'firenze', 'florence' => '50123',
            'pisa' => '56125',
            default => null,
        };
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

        $street = $this->stripLocalitaPrefix($beforePostal);
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
