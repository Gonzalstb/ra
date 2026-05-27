import { flagsFromPlaceType, placeTypeFromFlags } from '../utils/destinationHelpers';

const PLACE_TYPE_STYLES = {
    '': {
        active: 'bg-slate-800 text-slate-300 border-slate-600',
        idle: 'bg-slate-950 text-slate-500 border-slate-800 hover:border-slate-600',
    },
    winery: {
        active: 'bg-purple-500/25 text-purple-200 border-purple-500',
        idle: 'bg-slate-950 text-slate-400 border-slate-800 hover:border-purple-500/40',
    },
    hotel: {
        active: 'bg-teal-500/25 text-teal-200 border-teal-500',
        idle: 'bg-slate-950 text-slate-400 border-slate-800 hover:border-teal-500/40',
    },
    bar: {
        active: 'bg-orange-500/25 text-orange-200 border-orange-500',
        idle: 'bg-slate-950 text-slate-400 border-slate-800 hover:border-orange-500/40',
    },
};

function pickerRoot(prefix) {
    return document.querySelector(`[data-place-type-picker="${prefix}"]`);
}

export function getFormPlaceType(prefix = 'form') {
    const root = pickerRoot(prefix);
    const active = root?.querySelector('[data-place-type].ring-2');
    return active?.dataset.placeType ?? '';
}

export function setFormPlaceType(prefix, type) {
    const root = pickerRoot(prefix);
    if (!root) return;
    root.querySelectorAll('[data-place-type]').forEach((btn) => {
        const value = btn.dataset.placeType ?? '';
        const isActive = value === type;
        const styles = PLACE_TYPE_STYLES[value] ?? PLACE_TYPE_STYLES[''];
        btn.className = `place-type-btn py-2.5 px-2 text-[10px] font-bold rounded-xl border transition flex flex-col items-center justify-center gap-1 min-h-[52px] ${isActive ? styles.active : styles.idle}`;
        btn.classList.toggle('ring-2', isActive);
        btn.classList.toggle('ring-offset-1', isActive);
        btn.classList.toggle('ring-offset-slate-950', isActive);
        btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
        if (value === '') btn.classList.toggle('ring-slate-500', isActive);
        if (value === 'winery') btn.classList.toggle('ring-purple-400', isActive);
        if (value === 'hotel') btn.classList.toggle('ring-teal-400', isActive);
        if (value === 'bar') btn.classList.toggle('ring-orange-400', isActive);
    });
}

export function readPlaceTypeFlags(prefix = 'form') {
    return flagsFromPlaceType(getFormPlaceType(prefix));
}

export function initPlaceTypeFromDest(prefix, dest) {
    setFormPlaceType(prefix, placeTypeFromFlags(dest));
}

export function bindPlaceTypePicker(prefix = 'form') {
    const root = pickerRoot(prefix);
    if (!root || root.dataset.placeTypeBound === '1') return;
    root.dataset.placeTypeBound = '1';
    root.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-place-type]');
        if (!btn || !root.contains(btn)) return;
        setFormPlaceType(prefix, btn.dataset.placeType ?? '');
    });
}

export function resetFormPlaceType(prefix = 'form') {
    setFormPlaceType(prefix, '');
}
