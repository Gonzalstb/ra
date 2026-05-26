/** Etiqueta del badge de día: fecha, rango, o «Día N». */
export function formatDayDateBadge(day, dayIndex) {
    const start = day?.date || '';
    const end = day?.dateEnd || day?.date_end || '';

    if (!start) {
        return `Día ${dayIndex}`;
    }

    const startLabel = formatShortDate(start);
    if (!end || end === start) {
        return startLabel;
    }

    const endLabel = formatShortDate(end);
    const sameYear = start.slice(0, 4) === end.slice(0, 4);
    if (sameYear && start.slice(0, 7) === end.slice(0, 7)) {
        const endDay = formatShortDate(end, { dayOnly: true });
        return `${startLabel} – ${endDay}`;
    }

    return `${startLabel} – ${endLabel}`;
}

export function formatDayDateRangeLong(day) {
    const start = day?.date || '';
    const end = day?.dateEnd || day?.date_end || '';
    if (!start) return '';
    if (!end || end === start) {
        return formatLongDate(start);
    }
    return `${formatLongDate(start)} – ${formatLongDate(end)}`;
}

function formatShortDate(iso, { dayOnly = false } = {}) {
    const d = parseIsoDate(iso);
    if (!d) return iso;
    if (dayOnly) {
        return d.toLocaleDateString('es-ES', { day: 'numeric' });
    }
    return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatLongDate(iso) {
    const d = parseIsoDate(iso);
    if (!d) return iso;
    return d.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' });
}

function parseIsoDate(iso) {
    if (!iso) return null;
    const parts = iso.split('-').map(Number);
    if (parts.length < 3) return null;
    return new Date(parts[0], parts[1] - 1, parts[2]);
}

/** ¿La fecha ISO cae dentro del día (inicio–fin inclusive)? */
export function dayIncludesDate(day, isoDate) {
    const start = day?.date;
    if (!start || !isoDate) return false;
    const end = day?.dateEnd || day?.date_end || start;
    return isoDate >= start && isoDate <= end;
}
