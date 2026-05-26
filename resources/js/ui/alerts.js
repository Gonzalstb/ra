const ALERT_CLASSES = {
    error: 'bg-rose-950/95 border-rose-500 text-rose-200',
    info: 'bg-slate-900/95 border-sky-500 text-sky-200',
    success: 'bg-emerald-950/95 border-emerald-500 text-emerald-200',
};

let hideTimer = null;

export function showAlert(message, type = 'success') {
    const container = document.getElementById('alert-container');
    const textEl = document.getElementById('alert-text');

    if (!container || !textEl) return;

    container.className = `fixed top-4 left-4 right-4 md:left-auto md:right-4 z-[9999] max-w-sm p-4 rounded-xl shadow-2xl border transition-all duration-300 flex items-center gap-3 ${ALERT_CLASSES[type] ?? ALERT_CLASSES.success}`;
    textEl.textContent = message;
    container.classList.remove('hidden');

    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => hideAlert(), 4000);
}

export function hideAlert() {
    document.getElementById('alert-container')?.classList.add('hidden');
}

export function bindAlertClose() {
    document.getElementById('alert-close')?.addEventListener('click', hideAlert);
}
