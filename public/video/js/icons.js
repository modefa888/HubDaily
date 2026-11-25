/* 视频页面统一 SVG 图标 */
(function () {
    const line = (paths) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
    const solid = (paths) => `<svg viewBox="0 0 24 24" fill="currentColor" stroke="none" aria-hidden="true">${paths}</svg>`;

    const icons = {
        play: solid('<path d="M8 5.2a1 1 0 0 1 1.5-.87l10 6.8a1 1 0 0 1 0 1.74l-10 6.8A1 1 0 0 1 8 18.8Z"/>'),
        pause: solid('<rect x="6.5" y="5" width="4" height="14" rx="1.4"/><rect x="13.5" y="5" width="4" height="14" rx="1.4"/>'),
        prevEpisode: line('<path d="M19 20 9 12l10-8Z"/><path d="M5 19V5"/>'),
        nextEpisode: line('<path d="M5 4l10 8-10 8Z"/><path d="M19 5v14"/>'),
        rewind: line('<polyline points="11 19 4 12 11 5"/><polyline points="20 19 13 12 20 5"/>'),
        forward: line('<polyline points="13 19 20 12 13 5"/><polyline points="4 19 11 12 4 5"/>'),
        volume: line('<path d="M11 5 6 9H3v6h3l5 4Z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M18.5 5.5a9 9 0 0 1 0 13"/>'),
        volumeOff: line('<path d="M11 5 6 9H3v6h3l5 4Z"/><path d="m16 9 5 6"/><path d="m21 9-5 6"/>'),
        speed: line('<path d="M4 18a8 8 0 1 1 16 0"/><path d="m12 14 4-4"/><circle cx="12" cy="14" r="1.4" fill="currentColor" stroke="none"/>'),
        rotate: line('<path d="M20 11a8 8 0 1 0-2.3 5.7"/><polyline points="20 4 20 11 13 11"/>'),
        camera: line('<path d="M4 8h3l1.5-2h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z"/><circle cx="12" cy="13" r="3.2"/>'),
        pip: line('<rect x="3" y="4" width="18" height="14" rx="2"/><rect x="13" y="11" width="6" height="5" rx="1" fill="currentColor" stroke="none" opacity=".9"/>'),
        fullscreen: line('<path d="M8 3H3v5"/><path d="M16 3h5v5"/><path d="M21 16v5h-5"/><path d="M3 16v5h5"/>'),
        close: line('<path d="M6 6 18 18"/><path d="M18 6 6 18"/>'),
        share: line('<circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="m8.2 10.8 7.6-4.4"/><path d="m8.2 13.2 7.6 4.4"/>'),
        heart: line('<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78Z"/>'),
        heartFilled: solid('<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78Z"/>'),
        copy: line('<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>')
    };

    window.HubIcons = icons;

    const hydrate = () => {
        document.querySelectorAll('[data-icon]').forEach((el) => {
            const name = el.getAttribute('data-icon');
            if (icons[name]) el.innerHTML = icons[name];
        });
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', hydrate);
    } else {
        hydrate();
    }
})();
