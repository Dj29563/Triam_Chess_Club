// Configuration - REPLACE WITH YOUR GOOGLE SHEET ID
const SHEET_ID = '1Arwq62vxQSOiRL74752tFAj3g2T0o_X9ixfzQ1ImgVg';
const SHEET_NAME = 'Form Responses 1';
const SHEET_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(SHEET_NAME)}`;

let ALL_POSTS = [];
let sliderInterval = null;
let postImageIntervals = {};
let currentPage = 1;
const POSTS_PER_PAGE = 10;

function go(id) {
  document.getElementById(id).scrollIntoView({ behavior: 'smooth' });
}

// Handle nav dropdown when in about section
window.addEventListener('scroll', function() {
  const aboutSection = document.getElementById('about');
  const nav = document.getElementById('mainNav');
  const aboutRect = aboutSection.getBoundingClientRect();
  
  if (aboutRect.top >= -100 && aboutRect.bottom > 0) {
    nav.classList.add('dropdown');
  } else {
    nav.classList.remove('dropdown');
  }
});

function loadData() {
  fetch(SHEET_URL)
    .then(response => response.text())
    .then(data => {
      const jsonString = data.substring(47).slice(0, -2);
      const json = JSON.parse(jsonString);
      const rows = json.table.rows;
      ALL_POSTS = [];
      
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const cells = row.c || [];
        const timestamp = cells[0] ? (cells[0].f || cells[0].v || '') : '';
        const topic = cells[1] ? String(cells[1].v || '') : '';
        const date = cells[2] ? (cells[2].f || cells[2].v || '') : '';
        const context = cells[3] ? String(cells[3].v || '') : '';
        const picture = cells[4] ? String(cells[4].v || '') : '';
        
        if (topic.trim()) {
          ALL_POSTS.push([timestamp, topic, date, context, picture]);
        }
      }
      
      ALL_POSTS.reverse();
      renderPosts();
    })
    .catch(error => {
      document.getElementById('posts').innerHTML =
        '<div class="no-posts">Error loading activities. Make sure the sheet is public!<br>Error: ' + error.message + '</div>';
      console.error('Error:', error);
    });
}

function renderPosts() {
  const box = document.getElementById('posts');
  const content = document.querySelector('#activities .content');
  
  // Clear box
  box.innerHTML = '';

  Object.values(postImageIntervals).forEach(interval => clearInterval(interval));
  postImageIntervals = {};

  if (!ALL_POSTS || ALL_POSTS.length === 0) {
    box.innerHTML = '<div class="no-posts">No activities yet. Check back soon!</div>';
    return;
  }

  // Render all posts in scrollable box
  ALL_POSTS.forEach(function (p, i) {
    const postDiv = createPostElement(p, i);
    box.appendChild(postDiv);

    const imgs = parseImages(p[4]);
    if (imgs.length > 1) {
      startPostImageRotation(postDiv, imgs.length, i);
    }
  });

  // Check if button already exists, if not create it
  let viewAllButton = document.getElementById('viewAllButton');
  if (!viewAllButton) {
    viewAllButton = document.createElement('button');
    viewAllButton.id = 'viewAllButton';
    viewAllButton.className = 'view-all-button';
    viewAllButton.onclick = showAllActivities;
    content.appendChild(viewAllButton);
  }
  
  viewAllButton.textContent = 'View All Activities (' + ALL_POSTS.length + ')';
}

function createPostElement(p, i) {
  const topic = p[1] || 'Untitled Activity';
  const date = p[2] || 'No date';
  const context = p[3] || 'No description available.';
  const imgs = parseImages(p[4]);

  const preview = context.length > 120 ? context.slice(0, 120) + '...' : context;

  const postDiv = document.createElement('div');
  postDiv.className = 'post';
  postDiv.onclick = function () {
    openActivityDetail(i);
  };

  let imageHtml = '<div class="post-image-container">';
  if (imgs.length > 0) {
    imgs.forEach(function(img, idx) {
      imageHtml += '<img src="' + img + '" class="' + (idx === 0 ? 'active' : '') + '" alt="' + escapeHtml(topic) + '" onerror="this.style.display=\'none\'">';
    });
  } else {
    imageHtml += '<div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; color: #999; font-size: 3em;">📷</div>';
  }
  imageHtml += '</div>';

  let contentHtml = '<div class="post-content-area">';
  contentHtml += '<h3>' + escapeHtml(topic) + '</h3>';
  contentHtml += '<small>📅 ' + escapeHtml(date) + '</small>';
  contentHtml += '<div class="preview-text">' + escapeHtml(preview) + '</div>';
  contentHtml += '</div>';

  postDiv.innerHTML = imageHtml + contentHtml;
  return postDiv;
}

function startPostImageRotation(postElement, imageCount, postIndex) {
  const images = postElement.querySelectorAll('.post-image-container img');
  let currentIndex = 0;

  const interval = setInterval(function() {
    images[currentIndex].classList.remove('active');
    currentIndex = (currentIndex + 1) % imageCount;
    images[currentIndex].classList.add('active');
  }, 3000);

  postImageIntervals[postIndex] = interval;
}

function showAllActivities() {
  currentPage = 1;
  renderAllActivitiesPage();
  
  const overlay = document.getElementById('allActivitiesOverlay');
  overlay.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function renderAllActivitiesPage() {
  const listContainer = document.getElementById('allActivitiesList');
  listContainer.innerHTML = '';

  Object.values(postImageIntervals).forEach(interval => clearInterval(interval));
  postImageIntervals = {};

  const totalPages = Math.ceil(ALL_POSTS.length / POSTS_PER_PAGE);
  const startIndex = (currentPage - 1) * POSTS_PER_PAGE;
  const endIndex = Math.min(startIndex + POSTS_PER_PAGE, ALL_POSTS.length);
  const postsToShow = ALL_POSTS.slice(startIndex, endIndex);

  postsToShow.forEach(function(p, i) {
    const actualIndex = startIndex + i;
    const postDiv = createPostElement(p, actualIndex);
    listContainer.appendChild(postDiv);

    const imgs = parseImages(p[4]);
    if (imgs.length > 1) {
      startPostImageRotation(postDiv, imgs.length, actualIndex);
    }
  });

  if (totalPages > 1) {
    const paginationDiv = document.createElement('div');
    paginationDiv.className = 'pagination-controls';
    
    const prevButton = document.createElement('button');
    prevButton.className = 'pagination-button';
    prevButton.innerHTML = '← Previous';
    prevButton.disabled = currentPage === 1;
    prevButton.onclick = function() {
      if (currentPage > 1) {
        currentPage--;
        renderAllActivitiesPage();
        document.getElementById('allActivitiesList').scrollTop = 0;
      }
    };
    paginationDiv.appendChild(prevButton);

    const pageInfo = document.createElement('span');
    pageInfo.className = 'page-info';
    pageInfo.textContent = 'Page ' + currentPage + ' of ' + totalPages;
    paginationDiv.appendChild(pageInfo);

    const nextButton = document.createElement('button');
    nextButton.className = 'pagination-button';
    nextButton.innerHTML = 'Next →';
    nextButton.disabled = currentPage === totalPages;
    nextButton.onclick = function() {
      if (currentPage < totalPages) {
        currentPage++;
        renderAllActivitiesPage();
        document.getElementById('allActivitiesList').scrollTop = 0;
      }
    };
    paginationDiv.appendChild(nextButton);

    listContainer.appendChild(paginationDiv);
  }
}

function closeAllActivities() {
  const overlay = document.getElementById('allActivitiesOverlay');
  overlay.classList.remove('active');
  document.body.style.overflow = '';

  Object.values(postImageIntervals).forEach(interval => clearInterval(interval));
  postImageIntervals = {};

  renderPosts();
}

function openActivityDetail(i) {
  if (sliderInterval) {
    clearInterval(sliderInterval);
    sliderInterval = null;
  }

  Object.values(postImageIntervals).forEach(interval => clearInterval(interval));
  postImageIntervals = {};

  const overlay = document.getElementById('activityDetailOverlay');
  const detailContainer = document.getElementById('activityDetail');
  
  const p = ALL_POSTS[i];
  if (!p) return;

  const topic = p[1] || 'Untitled Activity';
  const date = p[2] || 'No date';
  const context = p[3] || 'No description available.';
  const imgs = parseImages(p[4]);

  let sliderHtml = '';
  if (imgs && imgs.length > 0) {
    let slides = '';
    let dots = '';

    for (let idx = 0; idx < imgs.length; idx++) {
      slides += '<img class="slide ' + (idx === 0 ? 'active' : '') + '" src="' + imgs[idx] + '" alt="Image ' + (idx + 1) + '" onerror="this.style.display=\'none\'">';
      dots += '<span class="slider-dot ' + (idx === 0 ? 'active' : '') + '" onclick="goToSlide(' + idx + ')"></span>';
    }

    sliderHtml = '<div class="slider" id="imageSlider">' + slides;
    
    if (imgs.length > 1) {
      sliderHtml += '<div class="slider-controls">' + dots + '</div>';
    }
    
    sliderHtml += '</div>';
  }

  detailContainer.innerHTML =
    '<div class="activity-detail-content">' +
    '<h2>' + escapeHtml(topic) + '</h2>' +
    '<small>📅 ' + escapeHtml(date) + '</small>' +
    sliderHtml +
    '<div class="post-content">' + escapeHtml(context) + '</div>' +
    '</div>';

  overlay.classList.add('active');
  document.body.style.overflow = 'hidden';

  if (imgs && imgs.length > 1) {
    startSlider();
  }
}

function closeActivityDetail() {
  const overlay = document.getElementById('activityDetailOverlay');
  overlay.classList.remove('active');
  document.body.style.overflow = '';

  if (sliderInterval) {
    clearInterval(sliderInterval);
    sliderInterval = null;
  }

  const allActivitiesOverlay = document.getElementById('allActivitiesOverlay');
  if (allActivitiesOverlay.classList.contains('active')) {
    renderAllActivitiesPage();
  } else {
    renderPosts();
  }
}

function parseImages(cell) {
  if (!cell || cell === '') {
    return [];
  }

  const cellStr = String(cell).trim();
  if (!cellStr) return [];

  const urls = cellStr.split(/[,\n;]+/);
  const parsedUrls = [];

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i].trim();
    if (!url) continue;

    let fileId = null;
    
    let match = url.match(/drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/);
    if (match) {
      fileId = match[1];
    }
    
    if (!fileId) {
      match = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
      if (match) {
        fileId = match[1];
      }
    }
    
    if (!fileId) {
      match = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
      if (match) {
        fileId = match[1];
      }
    }
    
    if (!fileId && /^[a-zA-Z0-9_-]{25,50}$/.test(url)) {
      fileId = url;
    }

    if (fileId) {
      parsedUrls.push('https://drive.google.com/thumbnail?id=' + fileId + '&sz=w1000');
    } else if (url.startsWith('http')) {
      parsedUrls.push(url);
    }
  }

  return parsedUrls;
}

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

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

const aboutSection = document.getElementById("about");
const aboutPanel = document.getElementById("aboutPanel");
const mainNav = document.getElementById("mainNav");

const observer = new IntersectionObserver(
  ([entry]) => {
    if (entry.isIntersecting) {
      aboutPanel.classList.add("show");
      mainNav.classList.add("shift");
    } else {
      aboutPanel.classList.remove("show");
      mainNav.classList.remove("shift");
    }
  },
  { threshold: 0.6 }
);

observer.observe(aboutSection);

loadData();
