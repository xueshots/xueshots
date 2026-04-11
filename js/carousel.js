/* ============================
   CONFIG
============================ */
const AUTO_SLIDE_DELAY = 4000;

/* ============================
   ELEMENTS
============================ */
const carousel = document.querySelector(".carousel");
const track = document.querySelector(".carousel-track");
const controls = document.getElementById("carouselControls");
const prevButton = document.getElementById("carouselPrevButton");
const nextButton = document.getElementById("carouselNextButton");
const autoplayToggle = document.getElementById("carouselAutoplayToggle");
const rootStyle = document.documentElement.style;

let slides = Array.from(document.querySelectorAll(".carousel-slide"));

function getCarouselWidth() {
  if (!carousel) return window.innerWidth;
  return Math.round(carousel.getBoundingClientRect().width) || window.innerWidth;
}

let slideWidth = getCarouselWidth();

// Force hardware acceleration on track
track.style.transform = 'translate3d(0, 0, 0)';

/* ============================
   STATE
============================ */
let currentIndex = 1;
let currentTranslate = 0;

let isAnimating = false;
let pointerType = null;
let autoSlideTimer = null;
let isAutoSlidePausedByUser = false;
let resizeTimeout = 0;

function forceCarouselImagesVisible() {
  document.querySelectorAll(".carousel-slide img").forEach((image) => {
    image.dataset.keepLoaded = "true";
    image.classList.add("is-loaded");
  });
}

function normalizeCurrentIndex() {
  if (currentIndex <= 0) {
    currentIndex = slides.length - 2;
  } else if (currentIndex >= slides.length - 1) {
    currentIndex = 1;
  }
}

/* ============================
   CLONE SLIDES (INFINITE)
============================ */
const firstClone = slides[0].cloneNode(true);
const lastClone = slides[slides.length - 1].cloneNode(true);

firstClone.classList.add("clone");
lastClone.classList.add("clone");

track.appendChild(firstClone);
track.insertBefore(lastClone, slides[0]);

slides = Array.from(document.querySelectorAll(".carousel-slide"));
forceCarouselImagesVisible();

/* ============================
   INITIAL POSITION
============================ */
setTranslate(-slideWidth, false);

/* ============================
   INTRO SLIDE
============================ */
const introSlide = document.getElementById('introSlide');
const introArrow = document.getElementById('introArrow');
let introDismissed = false;

function dismissIntro() {
  if (introDismissed) return;
  introDismissed = true;

  // Fade out arrow
  introArrow.classList.add('fade-out');

  // Slide intro out left, carousel in from right, simultaneously
  const carouselStartPos = -currentIndex * slideWidth;
  const carouselFromPos = carouselStartPos + slideWidth;

  track.style.transition = 'none';
  track.style.transform = `translateX(${carouselFromPos}px)`;

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      introSlide.style.transition = 'transform 0.7s cubic-bezier(0.4, 0, 0.2, 1)';
      introSlide.style.transform = 'translateX(-100%)';

      track.style.transition = 'transform 0.7s cubic-bezier(0.4, 0, 0.2, 1)';
      track.style.transform = `translateX(${carouselStartPos}px)`;
    });
  });

  setTimeout(() => {
    introSlide.style.display = 'none';
    currentTranslate = carouselStartPos;
    showAutoplayToggle();
    syncAutoplayToggle();
    startAutoSlide();
  }, 700);
}

// Arrow button click
introArrow.addEventListener('click', dismissIntro);

// Right arrow key only
window.addEventListener('keydown', (e) => {
  if (!introDismissed && e.key === 'ArrowRight') {
    e.stopImmediatePropagation();
    dismissIntro();
  }
}, true);

/* ============================
   INTRO SLIDE CROP
============================ */
const introImg = introSlide.querySelector('img');
const IMG_W = 3000;
const IMG_H = 1875;
const IMG_RATIO = IMG_W / IMG_H;

const X_STOP = 0.47;
const Y_TOP_STOP = 0.02;
const Y_BOT_STOP = 0.36;
const DESKTOP_ZOOM_QUERY = window.matchMedia("(hover: hover) and (pointer: fine) and (min-width: 1024px)");
const INITIAL_DEVICE_PIXEL_RATIO = window.devicePixelRatio || 1;
let desktopUnzoomedViewportSize = null;

function getVisibleViewportSize() {
  if (window.visualViewport) {
    return {
      width: Math.round(window.visualViewport.width),
      height: Math.round(window.visualViewport.height),
    };
  }

  return {
    width: window.innerWidth,
    height: window.innerHeight,
  };
}

function isDesktopBrowserZoomed() {
  if (!DESKTOP_ZOOM_QUERY.matches) return false;
  return Math.abs((window.devicePixelRatio || 1) - INITIAL_DEVICE_PIXEL_RATIO) > 0.01;
}

function getHomeLayoutViewportSize() {
  const visibleSize = getVisibleViewportSize();

  if (!DESKTOP_ZOOM_QUERY.matches) {
    desktopUnzoomedViewportSize = null;
    return visibleSize;
  }

  if (!desktopUnzoomedViewportSize || !isDesktopBrowserZoomed()) {
    desktopUnzoomedViewportSize = visibleSize;
  }

  return isDesktopBrowserZoomed() ? desktopUnzoomedViewportSize : visibleSize;
}

function syncHomeViewportMetrics() {
  const { width, height } = getHomeLayoutViewportSize();
  const controlsGap = Math.max(18, Math.min(44, Math.round(height * 0.04)));

  rootStyle.setProperty("--home-viewport-width", `${width}px`);
  rootStyle.setProperty("--home-viewport-height", `${height}px`);
  rootStyle.setProperty("--home-carousel-controls-gap", `${controlsGap}px`);
}

function syncCarouselPosition() {
  normalizeCurrentIndex();
  slideWidth = getCarouselWidth();
  currentTranslate = -currentIndex * slideWidth;
  isAnimating = false;
  forceCarouselImagesVisible();
  setTranslate(currentTranslate, false);
}

function handleCarouselResize() {
  stopAutoSlide();
  syncHomeViewportMetrics();
  syncCarouselPosition();

  clearTimeout(resizeTimeout);
  resizeTimeout = window.setTimeout(() => {
    startAutoSlide();
  }, 200);
}

function updateIntroCrop() {
  const { width: winW, height: winH } = getVisibleViewportSize();
  let posX, posY;

  if (winW / winH >= IMG_RATIO) {
    // Cropping in Y direction
    const renderedH = winW / IMG_RATIO;
    const cropTotal = Math.max(0, renderedH - winH);
    const maxTopCrop = Y_TOP_STOP * renderedH;
    const maxBotCrop = Y_BOT_STOP * renderedH;

    if (cropTotal <= maxTopCrop) {
      posY = (cropTotal / (renderedH - winH)) * 100;
    } else if (cropTotal <= maxTopCrop + maxBotCrop) {
      posY = (maxTopCrop / (renderedH - winH)) * 100;
    } else {
      const topCrop = maxTopCrop + (cropTotal - maxTopCrop - maxBotCrop) / 2;
      posY = (topCrop / (renderedH - winH)) * 100;
    }
    posX = 75;

  } else {
    // Cropping in X direction
    const renderedW = winH * IMG_RATIO;
    const cropTotal = Math.max(0, renderedW - winW);
    const maxLeftCrop = X_STOP * renderedW;

    if (cropTotal <= maxLeftCrop) {
      posX = 100;
    } else {
      const leftCrop = maxLeftCrop + (cropTotal - maxLeftCrop) / 2;
      posX = (leftCrop / (renderedW - winW)) * 100;
    }
    posY = 0;
  }

  introImg.style.objectPosition = `${posX}% ${posY}%`;
}

syncHomeViewportMetrics();
updateIntroCrop();
syncCarouselPosition();
window.addEventListener('resize', updateIntroCrop);
window.addEventListener("resize", syncHomeViewportMetrics);
window.addEventListener("resize", handleCarouselResize);

if (window.visualViewport) {
  window.visualViewport.addEventListener("resize", syncHomeViewportMetrics);
  window.visualViewport.addEventListener("resize", updateIntroCrop);
  window.visualViewport.addEventListener("resize", handleCarouselResize);
  window.visualViewport.addEventListener("scroll", syncHomeViewportMetrics);
}

/* ============================
   AUTO SLIDE
============================ */
function startAutoSlide() {
  stopAutoSlide();
  if (!introDismissed || isAutoSlidePausedByUser) return;

  autoSlideTimer = window.setTimeout(() => {
    autoSlideTimer = null;

    if (!isAnimating) {
      moveToSlide(currentIndex + 1);
    }

    startAutoSlide();
  }, AUTO_SLIDE_DELAY);
}

function stopAutoSlide() {
  if (autoSlideTimer) {
    clearTimeout(autoSlideTimer);
    autoSlideTimer = null;
  }
}

function manualMoveToSlide(index) {
  resumeAutoSlideFromManualNavigation();
  moveToSlide(index);
  startAutoSlide();
}

function syncAutoplayToggle() {
  if (!autoplayToggle) return;

  autoplayToggle.classList.toggle("is-playing", !isAutoSlidePausedByUser);
  autoplayToggle.classList.toggle("is-paused", isAutoSlidePausedByUser);
  autoplayToggle.setAttribute(
    "aria-label",
    isAutoSlidePausedByUser ? "Resume autoplay" : "Pause autoplay"
  );
  autoplayToggle.setAttribute("aria-pressed", String(isAutoSlidePausedByUser));
}

function showAutoplayToggle() {
  if (controls) {
    controls.classList.add("is-visible");
    return;
  }

  if (autoplayToggle) {
    autoplayToggle.classList.add("is-visible");
  }
}

function resumeAutoSlideFromManualNavigation() {
  isAutoSlidePausedByUser = false;
  syncAutoplayToggle();
  stopAutoSlide();
}

function toggleAutoSlidePausedState() {
  isAutoSlidePausedByUser = !isAutoSlidePausedByUser;
  syncAutoplayToggle();

  if (isAutoSlidePausedByUser) {
    stopAutoSlide();
    return;
  }

  startAutoSlide();
}

if (autoplayToggle) {
  syncAutoplayToggle();
  autoplayToggle.addEventListener("click", () => {
    toggleAutoSlidePausedState();
  });
}

if (prevButton) {
  prevButton.addEventListener("click", () => {
    if (isAnimating) return;
    manualMoveToSlide(currentIndex - 1);
  });
}

if (nextButton) {
  nextButton.addEventListener("click", () => {
    if (isAnimating) return;
    manualMoveToSlide(currentIndex + 1);
  });
}

/* ============================
   POINTER EVENTS
============================ */
carousel.addEventListener("pointerdown", onPointerDown);

function onPointerDown(e) {
  pointerType = e.pointerType;

  /* Desktop: LEFT click only */
  if (pointerType === "mouse") {
    if (e.button !== 0) return; // 0 = left click only
    if (isAnimating) return;
    manualMoveToSlide(currentIndex + 1);
  }
}

/* Disable right click menu */
document.addEventListener("contextmenu", (e) => {
  if (e.target.closest(".carousel")) {
    e.preventDefault();
  }
});

/* ============================
   TAP TO ADVANCE (MOBILE)
============================ */
carousel.addEventListener("click", () => {
  if (pointerType === "mouse" || isAnimating) return;
  manualMoveToSlide(currentIndex + 1);
});

/* Disable long press (mobile) */
carousel.addEventListener("touchstart", (e) => {
  if (e.touches.length > 1) {
    e.preventDefault();
  }
});

/* Disable drag (mobile) */
document.addEventListener("dragstart", (e) => {
  if (e.target.closest(".carousel")) {
    e.preventDefault();
  }
});

/* ============================
   KEYBOARD NAVIGATION
============================ */
window.addEventListener("keydown", (e) => {
  if (isAnimating) return;

  if (e.key === "ArrowRight") {
    manualMoveToSlide(currentIndex + 1);
  }

  if (e.key === "ArrowLeft") {
    manualMoveToSlide(currentIndex - 1);
  }
});

/* ============================
   TRANSLATION
============================ */
function setTranslate(value, animate = true, options = {}) {
  if (animate) {
    isAnimating = true;
    const duration = options.duration ?? 700;
    const easing = options.easing ?? "cubic-bezier(0.4, 0, 0.2, 1)";
    track.style.transition = `transform ${duration}ms ${easing}`;
  } else {
    track.style.transition = "none";
  }

  track.style.transform = `translate3d(${value}px, 0, 0)`;
}

function moveToSlide(index, options = {}) {
  currentIndex = index;
  currentTranslate = -currentIndex * slideWidth;
  setTranslate(currentTranslate, true, options);
}

/* ============================
   TRANSITION END (INFINITE FIX)
============================ */
track.addEventListener("transitionend", (event) => {
  if (event.target !== track || event.propertyName !== "transform") return;

  isAnimating = false;

  if (slides[currentIndex].classList.contains("clone")) {
    track.style.transition = "none";

    if (currentIndex === slides.length - 1) {
      currentIndex = 1;
    } else if (currentIndex === 0) {
      currentIndex = slides.length - 2;
    }

    currentTranslate = -currentIndex * slideWidth;
    setTranslate(currentTranslate, false);
  }
});

/* ============================
   RESIZE
============================ */
window.addEventListener("pageshow", handleCarouselResize);

/* ============================
   TRACKPAD SWIPE (LAPTOP)
============================ */
let wheelTimeout;
let isWheelScrolling = false;

carousel.addEventListener("wheel", (e) => {
  // Only handle horizontal swipes (two-finger swipe on trackpad)
  // deltaX is positive when swiping left, negative when swiping right
  if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
    e.preventDefault();

    // Prevent multiple rapid triggers
    if (isWheelScrolling || isAnimating) return;

    isWheelScrolling = true;

    // Swipe left (deltaX positive) = go to next slide
    // Swipe right (deltaX negative) = go to previous slide
    if (e.deltaX > 30) {
      manualMoveToSlide(currentIndex + 1);
    } else if (e.deltaX < -30) {
      manualMoveToSlide(currentIndex - 1);
    }

    // Reset wheel scrolling flag after animation completes
    clearTimeout(wheelTimeout);
    wheelTimeout = setTimeout(() => {
      isWheelScrolling = false;
    }, 1);
  }
}, { passive: false });
