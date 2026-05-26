<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ItineraryDay extends Model
{
    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'trip_id',
        'title',
        'date',
        'date_end',
        'notes',
        'sort_order',
    ];

    protected function casts(): array
    {
        return [
            'date' => 'date',
            'date_end' => 'date',
            'sort_order' => 'integer',
        ];
    }

    public function trip(): BelongsTo
    {
        return $this->belongsTo(Trip::class);
    }

    public function destinations(): HasMany
    {
        return $this->hasMany(Destination::class, 'day_id');
    }
}
