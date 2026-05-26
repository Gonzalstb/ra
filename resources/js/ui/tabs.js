import { setUi } from '../state/plannerStore';
import { invalidateSize } from '../map/mapManager';
import { syncMobilePanelForTab, syncSidebarMobileState } from './mobilePanel';

const TAB_PANELS = {
    list: 'panel-list',
    route: 'panel-route',
    itinerary: 'panel-itinerary',
    add: 'panel-add',
    presets: 'panel-presets',
};

export function setActiveTab(tab) {
    setUi({ activeTab: tab });
    renderTabs(tab);
    syncMobilePanelForTab(tab);
}

function isDesktopTabActive(btnTab, activeTab) {
    if (btnTab === 'list') {
        return activeTab === 'list' || activeTab === 'map';
    }
    return btnTab === activeTab;
}

export function renderTabs(activeTab) {
    document.querySelectorAll('[data-tab-btn]').forEach((btn) => {
        const tab = btn.dataset.tabBtn;
        const isActive = tab === activeTab;
        const isDesktopListActive = isDesktopTabActive(tab, activeTab);

        btn.classList.toggle('text-amber-400', isActive);
        btn.classList.toggle('bg-slate-900/40', isActive && btn.closest('[data-mobile-nav]'));
        btn.classList.toggle('text-slate-400', !isActive);

        if (btn.getAttribute('role') === 'tab') {
            btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
        }

        if (btn.dataset.desktopTab) {
            const desktopActive = isDesktopListActive && tab === 'list' ? true : tab === activeTab;
            btn.classList.toggle('border-b-2', desktopActive);
            btn.classList.toggle('border-amber-500', desktopActive && tab !== 'itinerary' && tab !== 'route');
            btn.classList.toggle('border-emerald-500', desktopActive && tab === 'route');
            btn.classList.toggle('border-violet-500', desktopActive && tab === 'itinerary');
            btn.classList.toggle('bg-slate-900', desktopActive);
            btn.classList.toggle('text-white', desktopActive);
            btn.classList.toggle('text-emerald-400', desktopActive && tab === 'route');
            btn.classList.toggle('text-violet-400', desktopActive && tab === 'itinerary');
            btn.classList.toggle('text-slate-400', !desktopActive);
            btn.classList.toggle('hover:text-slate-200', !desktopActive);
        }
    });

    Object.entries(TAB_PANELS).forEach(([tab, panelId]) => {
        const panel = document.getElementById(panelId);
        if (!panel) return;
        const show = tab === activeTab || (tab === 'list' && activeTab === 'map');
        panel.classList.toggle('hidden', !show);
        if (panel.getAttribute('role') === 'tabpanel') {
            panel.hidden = !show;
        }
    });

    const sidebar = document.getElementById('sidebar');
    const mainMap = document.getElementById('main-map');

    if (sidebar && mainMap) {
        sidebar.className = [
            'flex flex-col bg-slate-950 border-slate-800 shadow-2xl shrink-0 z-50',
            'fixed lg:relative inset-x-0 bottom-16 lg:bottom-0',
            'w-full lg:w-[450px] lg:min-w-[450px]',
            'max-h-[min(88vh,calc(100dvh-5rem))] lg:max-h-none lg:h-full min-h-0',
            'rounded-t-2xl lg:rounded-none border-t lg:border-t-0 lg:border-r',
            'transition-transform duration-300 ease-out lg:translate-y-0',
        ].join(' ');

        mainMap.className = [
            'flex-1 min-w-0 h-full relative bg-slate-900 z-10',
            'absolute lg:relative inset-0 bottom-16 lg:bottom-0 block',
        ].join(' ');

        syncSidebarMobileState();
    }

    if (activeTab === 'map' || activeTab === 'list') {
        setTimeout(invalidateSize, 150);
    }
}

export function bindTabControls() {
    document.querySelectorAll('[data-tab-btn]').forEach((btn) => {
        btn.addEventListener('click', () => setActiveTab(btn.dataset.tabBtn));
    });
}
