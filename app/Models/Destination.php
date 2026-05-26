<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Destination extends Model
{
    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'trip_id',
        'day_id',
        'name',
        'description',
        'photo_url',
        'duration',
        'is_round_trip',
        'in_route',
        'is_text_only',
        'is_reserved',
        'price',
        'lat',
        'lng',
        'sort_order',
    ];

    protected function casts(): array
    {
        return [
            'is_round_trip' => 'boolean',
            'in_route' => 'boolean',
            'is_text_only' => 'boolean',
            'is_reserved' => 'boolean',
            'price' => 'float',
            'lat' => 'float',
            'lng' => 'float',
            'sort_order' => 'integer',
        ];
    }

    public function trip(): BelongsTo
    {
        return $this->belongsTo(Trip::class);
    }

    public function itineraryDay(): BelongsTo
    {
        return $this->belongsTo(ItineraryDay::class, 'day_id');
    }
}
