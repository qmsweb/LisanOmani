/* الخريطة — مناطق اللهجات */
(function () {
  'use strict';

  const { fetchJSON, escapeHtml } = window.Lisan;

  const list = document.getElementById('region-list');
  const detail = document.getElementById('region-detail');
  const mapEl = document.getElementById('map');

  let regions = [];
  let map = null;
  let markers = {};
  let activeId = null;

  function detailHtml(region) {
    if (!region) {
      return '<p class="muted">اختر منطقة من القائمة أو من الخريطة لعرض توصيفها.</p>';
    }
    return `
      <h2 class="region-name">${escapeHtml(region.name)}</h2>
      <p class="region-capital">المركز: ${escapeHtml(region.capital)}</p>
      <p class="region-note">${escapeHtml(region.note)}</p>`;
  }

  function select(id) {
    activeId = id;
    const region = regions.find(function (item) { return item.id === id; });
    detail.innerHTML = detailHtml(region);

    list.querySelectorAll('.region-btn').forEach(function (btn) {
      btn.classList.toggle('active', btn.dataset.id === id);
    });

    Object.keys(markers).forEach(function (key) {
      const isActive = key === id;
      markers[key].setStyle({
        radius: isActive ? 11 : 8,
        fillColor: isActive ? '#33482f' : '#44603f',
        color: isActive ? '#33482f' : '#ffffff',
        weight: isActive ? 3 : 2
      });
    });

    if (map && region) map.flyTo([region.lat, region.lng], 7, { duration: .6 });
    if (region && window.innerWidth < 900) mapEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function renderList() {
    list.innerHTML = regions.map(function (region) {
      const capital = region.capital && region.capital !== region.name
        ? `<span class="region-btn-capital">${escapeHtml(region.capital)}</span>`
        : '';
      return `<button type="button" class="region-btn" data-id="${region.id}">
        <span class="region-btn-name">${escapeHtml(region.name)}</span>
        ${capital}
      </button>`;
    }).join('');

    list.querySelectorAll('.region-btn').forEach(function (btn) {
      btn.addEventListener('click', function () { select(btn.dataset.id); });
    });
  }

  function initMap() {
    if (typeof window.L === 'undefined') {
      mapEl.innerHTML = '<div class="map-fallback">تعذر تحميل الخريطة التفاعلية. يمكنك اختيار المنطقة من القائمة.</div>';
      return;
    }

    const OMAN_BOUNDS = [[15.0, 51.0], [27.4, 60.9]];

    map = L.map(mapEl, {
      scrollWheelZoom: false,
      zoomControl: true,
      minZoom: 6,
      maxZoom: 11,
      maxBounds: OMAN_BOUNDS,
      maxBoundsViscosity: 1.0
    }).setView([20.8, 56.4], 6);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 11,
      noWrap: true,
      bounds: [[14.5, 50.5], [28.0, 61.5]],
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(map);

    const bounds = [];

    regions.forEach(function (region) {
      bounds.push([region.lat, region.lng]);
      const marker = L.circleMarker([region.lat, region.lng], {
        radius: 8,
        color: '#ffffff',
        weight: 2,
        fillColor: '#44603f',
        fillOpacity: .92
      }).addTo(map);

      marker.bindTooltip(region.name, { direction: 'top', offset: [0, -6] });
      marker.on('click', function () { select(region.id); });
      markers[region.id] = marker;
    });

    if (bounds.length) {
      map.fitBounds(bounds, { padding: [30, 30] });
    }

    setTimeout(function () { map.invalidateSize(); }, 250);
  }

  function init() {
    fetchJSON('data/regions.json').then(function (data) {
      regions = data.regions || [];
      const noteEl = document.getElementById('map-note');
      if (noteEl && data.note) noteEl.textContent = data.note;
      renderList();
      detail.innerHTML = detailHtml(null);
      initMap();
    }).catch(function (error) {
      detail.innerHTML = '<div class="error-state">' + escapeHtml(error.message) + '</div>';
    });
  }

  init();
})();
