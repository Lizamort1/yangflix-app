/**
 * ĐẢO PHIM & YangFlix Web Application Engine
 * Integrates live movie catalog, streaming player, and app download distribution
 */

let currentMovies = window.DAO_MOVIES || [];
let activeFilter = 'all';
let currentHls = null;
let currentMovieDetail = null;
let activeServerIndex = 0;
let activeTapIndex = 0;

document.addEventListener('DOMContentLoaded', () => {
  initNavigation();
  initSpotlight();
  renderCatalog(currentMovies);
  initSearch();
  initModalListeners();
});

/**
 * Tab Navigation (Trang Chủ vs Tải Ứng Dụng)
 */
function navigateTab(tabName) {
  const homeView = document.getElementById('view-home');
  const downloadView = document.getElementById('view-tai-ung-dung');
  const navItems = document.querySelectorAll('.nav-item');

  navItems.forEach(item => {
    if (item.dataset.tab === tabName) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });

  if (tabName === 'tai-ung-dung') {
    homeView.classList.remove('active');
    downloadView.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } else {
    downloadView.classList.remove('active');
    homeView.classList.add('active');
  }
}

function initNavigation() {
  if (window.location.hash === '#tai-ung-dung') {
    navigateTab('tai-ung-dung');
  }

  window.addEventListener('hashchange', () => {
    if (window.location.hash === '#tai-ung-dung') {
      navigateTab('tai-ung-dung');
    } else if (window.location.hash === '#home' || !window.location.hash) {
      navigateTab('home');
    }
  });
}

/**
 * Spotlight Hero Banner
 */
function initSpotlight() {
  if (!currentMovies || currentMovies.length === 0) return;
  const featured = currentMovies[0];

  const backdrop = document.getElementById('spotlight-backdrop');
  const poster = document.getElementById('spotlight-poster');
  const title = document.getElementById('spotlight-title');
  const origin = document.getElementById('spotlight-origin');
  const year = document.getElementById('spotlight-year');
  const lang = document.getElementById('spotlight-lang');
  const playBtn = document.getElementById('spotlight-play-btn');
  const detailBtn = document.getElementById('spotlight-detail-btn');

  if (backdrop && featured.thumbUrl) {
    backdrop.style.backgroundImage = `url('${featured.thumbUrl}')`;
  }
  if (poster && featured.posterUrl) {
    poster.src = featured.posterUrl;
  }
  if (title) title.textContent = featured.name;
  if (origin) origin.textContent = featured.originName || '';
  if (year) year.textContent = featured.year || '2026';
  if (lang) lang.textContent = featured.lang || 'Vietsub';

  if (playBtn) {
    playBtn.onclick = () => openMovie(featured.slug, true);
  }
  if (detailBtn) {
    detailBtn.onclick = () => openMovie(featured.slug, false);
  }
}

/**
 * Render Movie Cards Grid
 */
function renderCatalog(movies) {
  const grid = document.getElementById('movie-grid');
  const counter = document.getElementById('catalog-count');
  if (!grid) return;

  grid.innerHTML = '';
  if (counter) counter.textContent = `Hiển thị ${movies.length} bộ phim`;

  if (movies.length === 0) {
    grid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-dim);">Không tìm thấy phim phù hợp.</div>`;
    return;
  }

  movies.forEach(movie => {
    const card = document.createElement('div');
    card.className = 'movie-card';
    card.onclick = () => openMovie(movie.slug, false);

    const episodeBadge = movie.episodeCurrent ? `<span class="card-badge-ep">${movie.episodeCurrent}</span>` : '';
    const qualityBadge = movie.quality ? `<span class="card-badge-quality">${movie.quality}</span>` : '';

    card.innerHTML = `
      <div class="card-poster-box">
        <div class="card-badges">
          ${episodeBadge}
          ${qualityBadge}
        </div>
        <img src="${movie.posterUrl || movie.thumbUrl}" alt="${movie.name}" class="card-poster" loading="lazy" onerror="this.src='https://via.placeholder.com/300x450?text=No+Poster'" />
        <div class="card-play-overlay">
          <div class="play-circle"><i class="fa-solid fa-play"></i></div>
        </div>
      </div>
      <div class="card-info">
        <h4 class="card-title" title="${movie.name}">${movie.name}</h4>
        <span class="card-origin" title="${movie.originName}">${movie.originName || ''}</span>
        <div class="card-meta">
          <span>${movie.year || 2026}</span>
          <span>${movie.lang || 'Vietsub'}</span>
        </div>
      </div>
    `;

    grid.appendChild(card);
  });
}

/**
 * Filters
 */
function filterCatalog(type) {
  navigateTab('home');
  const heading = document.getElementById('catalog-heading');

  if (type === 'all') {
    if (heading) heading.textContent = 'Phim Mới Cập Nhật';
    renderCatalog(currentMovies);
  } else if (type === 'series') {
    if (heading) heading.textContent = 'Phim Bộ Đang Chiếu';
    const filtered = currentMovies.filter(m => m.type === 'series' || (m.episodeCurrent && m.episodeCurrent.includes('Tập')));
    renderCatalog(filtered);
  } else if (type === 'single') {
    if (heading) heading.textContent = 'Phim Lẻ Mới Nhất';
    const filtered = currentMovies.filter(m => m.type === 'single' || m.episodeCurrent === 'Full');
    renderCatalog(filtered);
  } else if (type === 'song-ngu') {
    if (heading) heading.textContent = 'Phim Song Ngữ & Lồng Tiếng';
    const filtered = currentMovies.filter(m => m.songNgu || (m.lang && m.lang.toLowerCase().includes('lồng tiếng')));
    renderCatalog(filtered.length ? filtered : currentMovies.slice(0, 10));
  }
}

function filterByGenre(genreName) {
  navigateTab('home');
  const heading = document.getElementById('catalog-heading');
  if (heading) heading.textContent = `Thể loại: ${genreName}`;

  const filtered = currentMovies.filter(m => {
    if (!m.category) return false;
    return m.category.some(c => c.name.toLowerCase().includes(genreName.toLowerCase()));
  });

  renderCatalog(filtered.length ? filtered : currentMovies.slice(0, 8));
}

function filterByCountry(countryName) {
  navigateTab('home');
  const heading = document.getElementById('catalog-heading');
  if (heading) heading.textContent = `Quốc gia: ${countryName}`;

  const filtered = currentMovies.filter(m => {
    if (!m.country) return false;
    return m.country.some(c => c.name.toLowerCase().includes(countryName.toLowerCase()));
  });

  renderCatalog(filtered.length ? filtered : currentMovies.slice(0, 8));
}

/**
 * Instant Search
 */
function initSearch() {
  const input = document.getElementById('search-input');
  const clearBtn = document.getElementById('search-clear');
  const suggBox = document.getElementById('search-suggestions');

  if (!input) return;

  input.addEventListener('input', (e) => {
    const val = e.target.value.trim().toLowerCase();
    if (val.length > 0) {
      clearBtn.classList.remove('hidden');
      const matches = currentMovies.filter(m => 
        m.name.toLowerCase().includes(val) || 
        (m.originName && m.originName.toLowerCase().includes(val))
      );
      renderSuggestions(matches.slice(0, 6));
    } else {
      clearBtn.classList.add('hidden');
      suggBox.classList.add('hidden');
      renderCatalog(currentMovies);
    }
  });

  clearBtn.addEventListener('click', () => {
    input.value = '';
    clearBtn.classList.add('hidden');
    suggBox.classList.add('hidden');
    renderCatalog(currentMovies);
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-box')) {
      suggBox.classList.add('hidden');
    }
  });
}

function renderSuggestions(matches) {
  const suggBox = document.getElementById('search-suggestions');
  if (!suggBox) return;

  if (matches.length === 0) {
    suggBox.innerHTML = '<div style="padding: 12px; font-size: 13px; color: var(--text-dim); text-align: center;">Không có kết quả gợi ý</div>';
    suggBox.classList.remove('hidden');
    return;
  }

  suggBox.innerHTML = '';
  matches.forEach(m => {
    const item = document.createElement('div');
    item.className = 'sugg-item';
    item.onclick = () => {
      suggBox.classList.add('hidden');
      openMovie(m.slug, false);
    };

    item.innerHTML = `
      <img src="${m.posterUrl || m.thumbUrl}" alt="" class="sugg-thumb" />
      <div class="sugg-info">
        <h5>${m.name}</h5>
        <span>${m.year || 2026} • ${m.episodeCurrent || m.quality || 'FHD'}</span>
      </div>
    `;
    suggBox.appendChild(item);
  });

  suggBox.classList.remove('hidden');
}

/**
 * Movie Detail & Streaming Player Modal
 */
async function openMovie(slug, autoPlay = false) {
  const modal = document.getElementById('movie-modal');
  const bodyContent = document.getElementById('modal-body-content');
  const playerContainer = document.getElementById('player-container');

  modal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';

  // Check pre-fetched details first
  let detail = null;
  if (window.MOVIE_DETAILS && window.MOVIE_DETAILS[slug]) {
    detail = window.MOVIE_DETAILS[slug];
  } else {
    // Try to find in currentMovies as fallback
    const summary = currentMovies.find(m => m.slug === slug);
    if (summary) {
      detail = {
        name: summary.name,
        originName: summary.originName,
        content: `Nội dung phim ${summary.name} (${summary.originName}). Phim chất lượng cao cập nhật trên hệ thống Đảo Phim & YangFlix.`,
        posterUrl: summary.posterUrl,
        thumbUrl: summary.thumbUrl,
        year: summary.year,
        quality: summary.quality,
        lang: summary.lang,
        episodeCurrent: summary.episodeCurrent,
        category: summary.category || [],
        country: summary.country || [],
        servers: [
          {
            serverName: 'Server VIP 1',
            taps: [
              { name: 'Tập 01', linkM3u8: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8' },
              { name: 'Tập 02', linkM3u8: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8' }
            ]
          }
        ]
      };
    }
  }

  currentMovieDetail = detail;
  activeServerIndex = 0;
  activeTapIndex = 0;

  renderModalBody(detail);

  if (autoPlay) {
    startPlayback(0, 0);
  } else {
    playerContainer.classList.add('hidden');
    stopPlayback();
  }
}

function renderModalBody(detail) {
  const body = document.getElementById('modal-body-content');
  if (!body || !detail) return;

  const categories = (detail.category || []).map(c => `<span class="badge badge-year">${c.name}</span>`).join(' ');
  const countries = (detail.country || []).map(c => `<span class="badge badge-lang">${c.name}</span>`).join(' ');

  // Build Server & Episode lists
  let episodesHtml = '';
  const servers = detail.servers || [];

  if (servers.length > 0) {
    const serverButtons = servers.map((s, idx) => `
      <button class="server-btn ${idx === activeServerIndex ? 'active' : ''}" onclick="selectServer(${idx})">
        <i class="fa-solid fa-server"></i> ${s.serverVariantName || s.serverName || `Server ${idx+1}`}
      </button>
    `).join('');

    const currentTaps = servers[activeServerIndex]?.taps || [];
    const tapButtons = currentTaps.map((tap, tIdx) => `
      <button class="episode-btn ${tIdx === activeTapIndex ? 'active' : ''}" onclick="startPlayback(${activeServerIndex}, ${tIdx})">
        ${tap.name || `Tập ${tIdx+1}`}
      </button>
    `).join('');

    episodesHtml = `
      <div class="episodes-section">
        <div style="font-size: 14px; font-weight: 700; color: #fff; margin-bottom: 10px;">
          <i class="fa-solid fa-list-ol"></i> Danh Sách Tập & Server:
        </div>
        <div class="server-selector">${serverButtons}</div>
        <div class="episodes-grid">${tapButtons}</div>
      </div>
    `;
  }

  body.innerHTML = `
    <div class="detail-top">
      <img src="${detail.posterUrl || detail.thumbUrl}" alt="${detail.name}" class="detail-poster" />
      <div class="detail-meta">
        <h2>${detail.name}</h2>
        <div class="detail-origin">${detail.originName || ''}</div>
        
        <div class="detail-tags">
          <span class="badge badge-quality">${detail.quality || 'FHD'}</span>
          <span class="badge badge-year">${detail.year || 2026}</span>
          <span class="badge badge-lang">${detail.lang || 'Vietsub'}</span>
          ${categories}
          ${countries}
        </div>

        <p class="detail-desc">${detail.content || 'Đang cập nhật nội dung...'}</p>

        <div style="margin-bottom: 20px;">
          <button class="btn btn-primary" onclick="startPlayback(0, 0)">
            <i class="fa-solid fa-play"></i> Phát Tập Đầu Tiên
          </button>
        </div>

        <div class="detail-info-grid">
          <div><strong>Trạng thái:</strong> ${detail.episodeCurrent || 'Hoàn tất'}</div>
          <div><strong>Thời lượng:</strong> ${detail.time || 'Đang cập nhật'}</div>
          <div><strong>Diễn viên:</strong> ${detail.actors ? detail.actors.join(', ') : 'Đang cập nhật'}</div>
          <div><strong>Đạo diễn:</strong> ${detail.directors ? detail.directors.join(', ') : 'Đang cập nhật'}</div>
        </div>
      </div>
    </div>
    ${episodesHtml}
  `;
}

function selectServer(serverIdx) {
  activeServerIndex = serverIdx;
  renderModalBody(currentMovieDetail);
}

function startPlayback(serverIdx, tapIdx) {
  activeServerIndex = serverIdx;
  activeTapIndex = tapIdx;

  const playerContainer = document.getElementById('player-container');
  const video = document.getElementById('hls-video');
  const iframe = document.getElementById('embed-iframe');
  const nowPlaying = document.getElementById('now-playing-text');

  playerContainer.classList.remove('hidden');

  const server = currentMovieDetail?.servers?.[serverIdx];
  const tap = server?.taps?.[tapIdx];

  if (!tap) return;

  if (nowPlaying) {
    nowPlaying.textContent = `Đang phát: ${currentMovieDetail.name} • ${tap.name || 'Tập ' + (tapIdx+1)} (${server.serverName || 'VIP'})`;
  }

  stopPlayback();

  // Highlight active episode button
  const epBtns = document.querySelectorAll('.episode-btn');
  epBtns.forEach((btn, idx) => {
    btn.classList.toggle('active', idx === tapIdx);
  });

  const m3u8Url = tap.linkM3u8;
  const embedUrl = tap.linkEmbed;

  if (m3u8Url && typeof Hls !== 'undefined' && Hls.isSupported()) {
    iframe.classList.add('hidden');
    video.classList.remove('hidden');

    currentHls = new Hls({
      enableWorker: true,
      lowLatencyMode: true,
    });
    currentHls.loadSource(m3u8Url);
    currentHls.attachMedia(video);
    currentHls.on(Hls.Events.MANIFEST_PARSED, () => {
      video.play().catch(() => {});
    });
  } else if (embedUrl) {
    video.classList.add('hidden');
    iframe.classList.remove('hidden');
    iframe.src = embedUrl;
  } else {
    showToast('Tập này đang cập nhật đường truyền.');
  }

  // Scroll player into view
  playerContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function stopPlayback() {
  const video = document.getElementById('hls-video');
  const iframe = document.getElementById('embed-iframe');

  if (currentHls) {
    currentHls.destroy();
    currentHls = null;
  }
  if (video) {
    video.pause();
    video.removeAttribute('src');
    video.load();
  }
  if (iframe) {
    iframe.src = '';
  }
}

function initModalListeners() {
  const modal = document.getElementById('movie-modal');
  const closeBtn = document.getElementById('modal-close-btn');
  const closePlayerBtn = document.getElementById('btn-close-player');

  const closeModal = () => {
    modal.classList.add('hidden');
    document.body.style.overflow = '';
    stopPlayback();
  };

  if (closeBtn) closeBtn.onclick = closeModal;
  if (closePlayerBtn) {
    closePlayerBtn.onclick = () => {
      document.getElementById('player-container').classList.add('hidden');
      stopPlayback();
    };
  }

  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });
}

/**
 * QR Code Toggle
 */
let qrInit = false;
function toggleQRCode() {
  const popup = document.getElementById('qr-popup');
  const target = document.getElementById('qrcode-target');

  popup.classList.toggle('hidden');

  if (!popup.classList.contains('hidden') && !qrInit) {
    target.innerHTML = '';
    if (typeof QRCode !== 'undefined') {
      new QRCode(target, {
        text: 'https://github.com/Lizamort1/yangflix-app/releases/download/v1.0.0/YangFlix-release.apk',
        width: 150,
        height: 150,
        colorDark: '#060b14',
        colorLight: '#ffffff',
      });
      qrInit = true;
    }
  }
}

/**
 * Clipboard Copy Helper
 */
function copyText(text, msg = 'Đã sao chép!') {
  navigator.clipboard.writeText(text).then(() => {
    showToast(msg);
  }).catch(() => {
    const temp = document.createElement('input');
    temp.value = text;
    document.body.appendChild(temp);
    temp.select();
    document.execCommand('copy');
    document.body.removeChild(temp);
    showToast(msg);
  });
}

/**
 * Toast Helper
 */
function showToast(msg) {
  const toast = document.getElementById('toast');
  if (!toast) return;

  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => {
    toast.classList.remove('show');
  }, 2600);
}
