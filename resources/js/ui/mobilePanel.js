import { getState, setUi } from '../state/plannerStore';
import { invalidateSize } from '../map/mapManager';

const LG_BREAKPOINT = 1024;

function isMobileViewport() {
    return window.innerWidth < LG_BREAKPOINT;
}

/** Aplica translate/visibilidad del drawer según estado (móvil). */
export function syncSidebarMobileState() {
    const sidebar = document.getElementById('sidebar');
    if (!sidebar) return;

    if (!isMobileViewport()) {
        sidebar.classList.remove('mobile-panel-closed', 'pointer-events-none');
        sidebar.style.transform = '';
        sidebar.style.visibility = '';
        return;
    }

    const closed = !getState().ui.mobilePanelOpen;
    sidebar.classList.toggle('mobile-panel-closed', closed);
    sidebar.classList.toggle('pointer-events-none', closed);
    sidebar.classList.toggle('translate-y-full', false);
}

export function openMobilePanel() {
    if (!isMobileViewport()) return;

    setUi({ mobilePanelOpen: true });
    document.getElementById('mobile-panel-backdrop')?.classList.remove('hidden');
    syncSidebarMobileState();
    document.body.classList.add('overflow-hidden');
    setTimeout(invalidateSize, 200);
}

export function closeMobilePanel() {
    setUi({ mobilePanelOpen: false });
    document.getElementById('mobile-panel-backdrop')?.classList.add('hidden');
    syncSidebarMobileState();
    document.body.classList.remove('overflow-hidden');
    setTimeout(invalidateSize, 200);
}

export function toggleMobilePanel() {
    if (getState().ui.mobilePanelOpen) {
        closeMobilePanel();
    } else {
        openMobilePanel();
    }
}

export function bindMobilePanel() {
    document.getElementById('mobile-panel-toggle')?.addEventListener('click', toggleMobilePanel);
    document.getElementById('mobile-panel-close')?.addEventListener('click', closeMobilePanel);
    document.getElementById('mobile-panel-backdrop')?.addEventListener('click', closeMobilePanel);

    window.addEventListener('resize', () => {
        if (!isMobileViewport()) {
            document.getElementById('mobile-panel-backdrop')?.classList.add('hidden');
            document.body.classList.remove('overflow-hidden');
            syncSidebarMobileState();
            return;
        }
        if (!getState().ui.mobilePanelOpen) {
            closeMobilePanel();
        } else {
            syncSidebarMobileState();
        }
    });

    syncSidebarMobileState();
}

export function syncMobilePanelForTab(tab) {
    if (!isMobileViewport()) return;

    if (tab === 'map') {
        closeMobilePanel();
        return;
    }
    openMobilePanel();
}
