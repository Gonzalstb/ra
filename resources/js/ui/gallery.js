import { TRAVEL_PRESET_IMAGES } from '../constants/presets';
import { showAlert } from './alerts';

export function renderGallery(selectedUrl = '') {
    const grid = document.getElementById('gallery-grid');
    if (!grid) return;

    grid.innerHTML = TRAVEL_PRESET_IMAGES.map((preset) => `
    <div class="group cursor-pointer rounded-xl overflow-hidden border-2 bg-slate-900 relative aspect-video transition ${selectedUrl === preset.url ? 'border-amber-400' : 'border-slate-800 hover:border-slate-700'}" data-gallery-url="${preset.url}">
      <img src="${preset.url}" alt="${preset.name}" class="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
      <div class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-1.5 md:p-2 text-left">
        <p class="text-[9px] md:text-[10px] font-bold text-white truncate">${preset.name}</p>
      </div>
      ${selectedUrl === preset.url ? '<div class="absolute top-1.5 right-1.5 w-5 h-5 bg-amber-400 text-slate-950 rounded-full flex items-center justify-center text-xs font-bold shadow-lg">✓</div>' : ''}
    </div>`).join('');
}

export function bindGallery() {
    document.getElementById('gallery-grid')?.addEventListener('click', (e) => {
        const card = e.target.closest('[data-gallery-url]');
        if (!card) return;
        const url = card.dataset.galleryUrl;
        const photo = document.getElementById('form-photo');
        const alt = document.getElementById('form-photo-alt');
        if (photo) photo.value = url;
        if (alt) alt.value = url;
        renderGallery(url);
        showAlert('Foto de galería aplicada al destino.');
    });
}
