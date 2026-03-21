/* ============================
   CONFIG
============================ */
const AUTO_SLIDE_DELAY = 4000;
const SNAP_THRESHOLD = 0.2;

/* ============================
   ELEMENTS
============================ */
const carousel = document.querySelector(".carousel");
const track = document.querySelector(".carousel-track");

let slides = Array.from(document.querySelectorAll(".carousel-slide"));

let slideWidth = window.innerWidth;

// Force hardware acceleration on track
track.style.transform = 'translate3d(0, 0, 0)';

/* ============================
   STATE
============================ */
let currentIndex = 1;
let currentTranslate = 0;
let prevTranslate = 0;
let startX = 0;

let isDragging = false;
let isAnimating = false;
let pointerType = null;
let autoSlideTimer = null;

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

function updateIntroCrop() {
  const winW = window.innerWidth;
  const winH = window.innerHeight;
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

updateIntroCrop();
window.addEventListener('resize', updateIntroCrop);

/* ============================
   AUTO SLIDE
============================ */
function startAutoSlide() {
  stopAutoSlide();
  autoSlideTimer = setInterval(() => {
    if (!isAnimating) moveToSlide(currentIndex + 1);
  }, AUTO_SLIDE_DELAY);
}

function stopAutoSlide() {
  if (autoSlideTimer) clearInterval(autoSlideTimer);
}

/* ============================
   POINTER EVENTS
============================ */
carousel.addEventListener("pointerdown", onPointerDown);
carousel.addEventListener("pointermove", onPointerMove);
carousel.addEventListener("pointerup", onPointerUp);
carousel.addEventListener("pointercancel", onPointerUp);
carousel.addEventListener("pointerleave", onPointerUp);

function onPointerDown(e) {
  pointerType = e.pointerType;

  /* Desktop: LEFT click only */
  if (pointerType === "mouse") {
    if (e.button !== 0) return; // 0 = left click only
    if (isAnimating) return;
    moveToSlide(currentIndex + 1);
    return;
  }

  /* Mobile / tablet / stylus */
  isDragging = true;
  startX = e.clientX;
  prevTranslate = currentTranslate;

  stopAutoSlide();
  carousel.setPointerCapture(e.pointerId);
}

function onPointerMove(e) {
  if (!isDragging) return;

  const delta = e.clientX - startX;
  currentTranslate = prevTranslate + delta;
  setTranslate(currentTranslate, false);
}

function onPointerUp(e) {
  if (!isDragging) return;

  isDragging = false;
  carousel.releasePointerCapture(e.pointerId);

  const movedBy = currentTranslate - prevTranslate;
  const threshold = slideWidth * SNAP_THRESHOLD;

  if (movedBy < -threshold) currentIndex += 1;
  else if (movedBy > threshold) currentIndex -= 1;

  snapToSlide();
  startAutoSlide();
}

/* Disable right click menu */
document.addEventListener("contextmenu", (e) => {
  if (e.target.closest(".carousel")) {
    e.preventDefault();
  }
});

/* ============================
   TAP LEFT / RIGHT (MOBILE)
============================ */
carousel.addEventListener("click", (e) => {
  if (pointerType === "mouse" || isDragging) return;

  const rect = carousel.getBoundingClientRect();
  const x = e.clientX - rect.left;

  if (x > rect.width / 2) moveToSlide(currentIndex + 1);
  else moveToSlide(currentIndex - 1);
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
    moveToSlide(currentIndex + 1);
  }

  if (e.key === "ArrowLeft") {
    moveToSlide(currentIndex - 1);
  }
});

/* ============================
   TRANSLATION
============================ */
function setTranslate(value, animate = true) {
  if (animate) {
    isAnimating = true;
    track.style.transition = "transform 0.7s cubic-bezier(0.4, 0, 0.2, 1)";
  } else {
    track.style.transition = "none";
  }

  track.style.transform = `translateX(${value}px)`;
}

function moveToSlide(index) {
  currentIndex = index;
  currentTranslate = -currentIndex * slideWidth;
  setTranslate(currentTranslate, true);
}

function snapToSlide() {
  moveToSlide(currentIndex);
}

/* ============================
   TRANSITION END (INFINITE FIX)
============================ */
track.addEventListener("transitionend", () => {
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
let resizeTimeout;
let oldWidth = window.innerWidth;

window.addEventListener("resize", () => {
  // Stop auto-slide during resize
  stopAutoSlide();

  // Get new window width
  const newWidth = window.innerWidth;

  // Calculate proportion of translate to new width
  const scale = newWidth / oldWidth;
  currentTranslate *= scale;

  // Update the transform immediately without animation
  track.style.transition = "none";
  track.style.transform = `translateX(${currentTranslate}px)`;

  // Update slideWidth for future moves
  slideWidth = newWidth;
  oldWidth = newWidth;

  // Clear previous timeout
  clearTimeout(resizeTimeout);

  // Resume auto-slide after 200ms of no resizing
  resizeTimeout = setTimeout(() => {
    startAutoSlide();
  }, 200);
});

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
      moveToSlide(currentIndex + 1);
    } else if (e.deltaX < -30) {
      moveToSlide(currentIndex - 1);
    }

    // Reset wheel scrolling flag after animation completes
    clearTimeout(wheelTimeout);
    wheelTimeout = setTimeout(() => {
      isWheelScrolling = false;
    }, 1);
  }
}, { passive: false });