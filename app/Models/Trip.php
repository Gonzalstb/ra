<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Trip extends Model
{
    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'user_id',
        'name',
        'starting_point_name',
        'starting_point_lat',
        'starting_point_lng',
        'is_active',
        'return_to_start',
        'ending_point_name',
        'ending_point_lat',
        'ending_point_lng',
        'route_segments',
    ];

    protected function casts(): array
    {
        return [
            'starting_point_lat' => 'float',
            'starting_point_lng' => 'float',
            'is_active' => 'boolean',
            'return_to_start' => 'boolean',
            'ending_point_lat' => 'float',
            'ending_point_lng' => 'float',
            'route_segments' => 'array',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function destinations(): HasMany
    {
        return $this->hasMany(Destination::class)->orderBy('sort_order');
    }

    public function itineraryDays(): HasMany
    {
        return $this->hasMany(ItineraryDay::class)->orderBy('sort_order');
    }
}
