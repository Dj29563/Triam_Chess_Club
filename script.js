// Configuration - UPDATE THIS with your Google Apps Script URL
const GOOGLE_SCRIPT_URL = 'YOUR_GOOGLE_APPS_SCRIPT_URL_HERE?data=true';

// Or use sample data for testing
const USE_SAMPLE_DATA = true;

let ALL_POSTS = [];
let sliderInterval = null;

// Navigation
function go(id) {
  document.getElementById(id).scrollIntoView({ behavior: 'smooth' });
}

// Load data
function loadData() {
  if (USE_SAMPLE_DATA) {
    // Sample data for testing
    ALL_POSTS = [
      [
        '2024-01-07 10:30:00',
        'Chess Tournament 2024',
        'January 15, 2024',
        'Join us for our annual chess tournament! Open to all skill levels. Registration starts at 9 AM.',
        'https://drive.google.com/uc?id=SAMPLE_ID_1'
      ],
      [
        '2024-01-05 14:20:00',
        'Weekly Chess Practice',
        'Every Wednesday',
        'Come practice your chess skills every Wednesday from 4-6 PM in the library. All students welcome!',
        'https://drive.google.com/uc?id=SAMPLE_ID_2'
      ]
    ];
    renderPosts();
  } else {
    // Load from Google Sheets
    fetch(GOOGLE_SCRIPT_URL)
      .then(response => {
        if (!response.ok) {
          throw new Error('Failed to fetch data');
        }
        return response.json();
      })
      .then(data => {
        ALL_POSTS = data || [];
        renderPosts();
      })
      .catch(error => {
        document.getElementById('posts').innerHTML =
          '<div class="no-posts">Error loading activities. Please try again later.</div>';
        console.error('Error:', error);
      });
  }
}

// Render posts list
function renderPosts() {
  const box = document.getElementById('posts');
  box.innerHTML = '';

  if (!ALL_POSTS || ALL_POSTS.length === 0) {
    box.innerHTML = '<div class="no-posts">No activities yet. Check back soon!</div>';
    return;
  }

  ALL_POSTS.forEach(function (p, i) {
    const topic = p[1] || 'Untitled Activity';
    const date = p[2] || '';
    const context = p[3] || '';
    const imgs = parseImages(p[4]);

    const preview = context.length > 150 ? context.slice(0, 150) + '...' : context;

    const postDiv = document.createElement('div');
    postDiv.className = 'post';
    postDiv.onclick = function () {
      openPost(i);
    };

    let html = '<h3>' + escapeHtml(topic) + '</h3>';
    html += '<small>📅 ' + escapeHtml(date) + '</small>';
    if (imgs[0]) {
      html += '<img src="' + imgs[0] + '" alt="' + escapeHtml(topic) + '" onerror="this.style.display=\'none\'">';
    }
    html += '<div class="preview-text">' + escapeHtml(preview) + '</div>';

    postDiv.innerHTML = html;
    box.appendChild(postDiv);
  });

  // Check if viewing specific post
  const params = new URLSearchParams(window.location.search);
  const postId = params.get('post');
  if (postId !== null) {
    const index = parseInt(postId);
    if (!isNaN(index) && index >= 0 && index < ALL_POSTS.length) {
      showPost(index);
    }
  }
}

// Open post detail
function openPost(i) {
  window.location.search = '?post=' + i;
}

// Show post detail
function showPost(i) {
  if (sliderInterval) {
    clearInterval(sliderInterval);
    sliderInterval = null;
  }

  const box = document.getElementById('posts');
  const p = ALL_POSTS[i];

  if (!p) return;

  const topic = p[1] || 'Untitled Activity';
  const date = p[2] || '';
  const context = p[3] || '';
  const imgs = parseImages(p[4]);

  let sliderHtml = '';
  if (imgs && imgs.length > 0) {
    let slides = '';
    let dots = '';

    for (let idx = 0; idx < imgs.length; idx++) {
      slides += '<img class="slide ' + (idx === 0 ? 'active' : '') + '" src="' + imgs[idx] + '" alt="Image ' + (idx + 1) + '">';
      dots += '<span class="slider-dot ' + (idx === 0 ? 'active' : '') + '" onclick="goToSlide(' + idx + ')"></span>';
    }

    sliderHtml = '<div class="slider" id="imageSlider">' + slides;
    if (imgs.length > 1) {
      sliderHtml += '<div class="slider-controls">' + dots + '</div>';
    }
    sliderHtml += '</div>';
  }

  box.innerHTML =
    '<div class="post post-detail">' +
    '<button class="back-button" onclick="window.location.search=\'\'">← Back to Activities</button>' +
    '<h2>' + escapeHtml(topic) + '</h2>' +
    '<small>📅 ' + escapeHtml(date) + '</small>' +
    sliderHtml +
    '<div class="post-content">' + escapeHtml(context) + '</div>' +
    '</div>';

  if (imgs && imgs.length > 1) {
    startSlider();
  }
}

// Parse Google Drive image URLs
function parseImages(cell) {
  if (!cell || cell === '') {
    return [];
  }

  const urls = cell.split(',');
  const parsedUrls = [];

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i].trim();
    if (!url) continue;

    // Extract Google Drive ID
    const idMatch = url.match(/[-\w]{25,}/);
    if (idMatch) {
      parsedUrls.push('https://drive.google.com/uc?id=' + idMatch[0]);
    } else if (url.startsWith('http')) {
      parsedUrls.push(url);
    }
  }

  return parsedUrls;
}

// Image slider
let currentSlide = 0;

function startSlider() {
  const slides = document.querySelectorAll('.slide');
  const dots = document.querySelectorAll('.slider-dot');

  if (!slides || slides.length <= 1) return;

  sliderInterval = setInterval(function () {
    slides[currentSlide].classList.remove('active');
    if (dots[currentSlide]) {
      dots[currentSlide].classList.remove('active');
    }

    currentSlide = (currentSlide + 1) % slides.length;

    slides[currentSlide].classList.add('active');
    if (dots[currentSlide]) {
      dots[currentSlide].classList.add('active');
    }
  }, 4000);
}

function goToSlide(index) {
  if (sliderInterval) {
    clearInterval(sliderInterval);
  }

  const slides = document.querySelectorAll('.slide');
  const dots = document.querySelectorAll('.slider-dot');

  if (slides[currentSlide]) {
    slides[currentSlide].classList.remove('active');
  }
  if (dots[currentSlide]) {
    dots[currentSlide].classList.remove('active');
  }

  currentSlide = index;

  if (slides[currentSlide]) {
    slides[currentSlide].classList.add('active');
  }
  if (dots[currentSlide]) {
    dots[currentSlide].classList.add('active');
  }

  startSlider();
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Initialize
loadData();
