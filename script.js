// Configuration
const SHEET_ID = '1Arwq62vxQSOiRL74752tFAj3g2T0o_X9ixfzQ1ImgVg';
const SHEET_NAME = 'Form Responses 1'; // Change if your sheet has a different name
const SHEET_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(SHEET_NAME)}`;

let ALL_POSTS = [];
let sliderInterval = null;

// Navigation
function go(id) {
  document.getElementById(id).scrollIntoView({ behavior: 'smooth' });
}

// Load data from Google Sheets
function loadData() {
  fetch(SHEET_URL)
    .then(response => response.text())
    .then(data => {
      // Remove the wrapper to get JSON
      const jsonString = data.substring(47).slice(0, -2);
      const json = JSON.parse(jsonString);
      
      // Extract rows
      const rows = json.table.rows;
      
      // Convert to array format (skip header row)
      ALL_POSTS = rows.slice(1).map(row => {
        return row.c.map(cell => cell ? cell.v : '');
      }).reverse(); // Newest first
      
      renderPosts();
    })
    .catch(error => {
      document.getElementById('posts').innerHTML =
        '<div class="no-posts">Error loading activities. Make sure the sheet is public!</div>';
      console.error('Error:', error);
    });
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
    // p[0] = Timestamp (not used)
    // p[1] = Topic
    // p[2] = Date
    // p[3] = Context
    // p[4] = Picture links
    
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
    
    // Show first image as preview
    if (imgs.length > 0) {
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

// Show post detail with ALL images in slider
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

    // Create slides for ALL images
    for (let idx = 0; idx < imgs.length; idx++) {
      slides += '<img class="slide ' + (idx === 0 ? 'active' : '') + '" src="' + imgs[idx] + '" alt="Image ' + (idx + 1) + '">';
      dots += '<span class="slider-dot ' + (idx === 0 ? 'active' : '') + '" onclick="goToSlide(' + idx + ')"></span>';
    }

    sliderHtml = '<div class="slider" id="imageSlider">' + slides;
    
    // Show navigation dots if more than 1 image
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

  // Start auto-sliding if multiple images
  if (imgs && imgs.length > 1) {
    startSlider();
  }
}

// Parse Google Drive image URLs
function parseImages(cell) {
  if (!cell || cell === '') {
    return [];
  }

  // Split by comma to get multiple links
  const urls = cell.split(',');
  const parsedUrls = [];

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i].trim();
    if (!url) continue;

    // Extract Google Drive file ID from various URL formats
    let fileId = null;
    
    // Format 1: https://drive.google.com/file/d/FILE_ID/view
    let match = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (match) {
      fileId = match[1];
    }
    
    // Format 2: https://drive.google.com/open?id=FILE_ID
    if (!fileId) {
      match = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
      if (match) {
        fileId = match[1];
      }
    }
    
    // Format 3: Already in uc format or direct link
    if (!fileId && url.includes('drive.google.com/uc')) {
      match = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
      if (match) {
        fileId = match[1];
      }
    }
    
    // Format 4: Just the file ID
    if (!fileId && url.match(/^[a-zA-Z0-9_-]{25,}$/)) {
      fileId = url;
    }

    if (fileId) {
      // Convert to direct image URL
      parsedUrls.push('https://drive.google.com/uc?export=view&id=' + fileId);
    } else if (url.startsWith('http')) {
      // Use as-is if it's already a full URL
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
