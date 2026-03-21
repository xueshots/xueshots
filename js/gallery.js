/* ============================
   LIGHTBOX + GALLERY SETUP
============================ */
const galleries = Array.from(document.querySelectorAll('.masonry-gallery[data-images-desktop][data-images-mobile]'));
const lightbox = document.getElementById('lightbox');
const lightboxImage = document.querySelector('.lightbox-image');
const lightboxClose = document.querySelector('.lightbox-close');
const lightboxPrev = document.querySelector('.lightbox-prev');
const lightboxNext = document.querySelector('.lightbox-next');
const hasLightbox = Boolean(lightbox && lightboxImage && lightboxClose && lightboxPrev && lightboxNext);

let activeGroup = [];
let activeIndex = 0;
let allowNavigation = false;

function setLightboxImage() {
  if (!activeGroup[activeIndex]) return;
  lightboxImage.src = activeGroup[activeIndex].src;
  lightboxImage.alt = activeGroup[activeIndex].alt || '';
}

function syncNavVisibility() {
  const showNav = allowNavigation && activeGroup.length > 1;
  lightbox.classList.toggle('single-image', !showNav);
  lightboxPrev.style.opacity = showNav ? '' : '0';
  lightboxNext.style.opacity = showNav ? '' : '0';
}

function openLightbox(group, index, canNavigate = true) {
  if (!hasLightbox || !group.length) return;

  const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

  activeGroup = group;
  activeIndex = index;
  allowNavigation = canNavigate;

  setLightboxImage();
  syncNavVisibility();
  lightboxImage.style.opacity = '1';
  lightboxClose.style.opacity = '';
  lightbox.style.display = 'flex';

  requestAnimationFrame(() => {
    lightbox.classList.add('active');
  });

  document.body.classList.add('lightbox-open');
  const pageWrapper = document.querySelector('.page-wrapper');
  if (pageWrapper) pageWrapper.style.paddingRight = `${scrollbarWidth}px`;
}

function closeLightbox() {
  if (!hasLightbox) return;

  lightboxImage.style.opacity = '0';
  lightboxClose.style.opacity = '0';
  lightboxPrev.style.opacity = '0';
  lightboxNext.style.opacity = '0';
  lightbox.classList.remove('active');

  setTimeout(() => {
    lightbox.style.display = 'none';
  }, 400);

  document.body.classList.remove('lightbox-open');
  lightbox.classList.remove('single-image');
  const pageWrapper = document.querySelector('.page-wrapper');
  if (pageWrapper) pageWrapper.style.paddingRight = '';
}

function nextImage() {
  if (!allowNavigation || activeGroup.length <= 1) return;
  activeIndex = (activeIndex + 1) % activeGroup.length;
  setLightboxImage();
}

function prevImage() {
  if (!allowNavigation || activeGroup.length <= 1) return;
  activeIndex = (activeIndex - 1 + activeGroup.length) % activeGroup.length;
  setLightboxImage();
}

if (hasLightbox) {
  lightboxClose.addEventListener('click', closeLightbox);
  lightboxNext.addEventListener('click', nextImage);
  lightboxPrev.addEventListener('click', prevImage);

  lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox) closeLightbox();
  });

  document.addEventListener('keydown', (e) => {
    if (!lightbox.classList.contains('active')) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowRight') nextImage();
    if (e.key === 'ArrowLeft') prevImage();
  });
}

/* ============================
   MASONRY LAYOUT
============================ */
if (galleries.length > 0) {
  const pageName = document.body.classList.contains('sports') ? 'sports' :
                   document.body.classList.contains('landscape') ? 'landscape' :
                   document.body.classList.contains('wildlife') ? 'wildlife' : '';

  const states = galleries.map((gallery) => ({
    gallery,
    desktopImages: JSON.parse(gallery.dataset.imagesDesktop || '[]'),
    mobileImages: JSON.parse(gallery.dataset.imagesMobile || '[]'),
    imagePath: gallery.dataset.imagePath || `../assets/images/${pageName}/`,
    images: [],
    columns: []
  }));

  function getColumnCount() {
    return window.innerWidth < 768 ? 2 : 3;
  }

  function createColumns(state) {
    state.gallery.innerHTML = '';
    state.columns = [];
    const columnCount = getColumnCount();

    for (let i = 0; i < columnCount; i++) {
      const column = document.createElement('div');
      column.className = 'masonry-column';
      state.gallery.appendChild(column);
      state.columns.push(column);
    }
  }

  function generateGallery(state) {
    const sourceImages = window.innerWidth < 768 ? state.mobileImages : state.desktopImages;
    createColumns(state);
    state.images = sourceImages.filter((filename) => filename !== null);

    let renderedIndex = 0;

    sourceImages.forEach((filename, sourceIndex) => {
      if (filename === null) return;

      const item = document.createElement('div');
      item.className = 'gallery-item';

      const img = document.createElement('img');
      img.src = state.imagePath + filename;
      img.alt = '';
      img.loading = 'lazy';

      item.appendChild(img);
      state.columns[sourceIndex % state.columns.length].appendChild(item);

      if (hasLightbox) {
        const openIndex = renderedIndex;
        item.addEventListener('click', () => {
          const group = state.images.map((name) => ({ src: state.imagePath + name, alt: '' }));
          openLightbox(group, openIndex, true);
        });
      }

      renderedIndex += 1;
    });
  }

  states.forEach(generateGallery);

  let resizeTimeout;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      const oldColumnCount = states[0].columns.length;
      const newColumnCount = getColumnCount();

      if (oldColumnCount !== newColumnCount) {
        states.forEach(generateGallery);
      }
    }, 250);
  });
}

/* ============================
   WRITING PAGE IMAGE LIGHTBOX
============================ */
if (hasLightbox) {
  const writingImages = Array.from(document.querySelectorAll('.writing-page .writing-figure img'));

  function getGroupForWritingImage(image) {
    const galleryGroup = image.closest('.writing-gallery');
    if (galleryGroup) {
      const images = Array.from(galleryGroup.querySelectorAll('.writing-figure img'));
      const group = images.map((img) => ({ src: img.currentSrc || img.src, alt: img.alt || '' }));
      return {
        group,
        index: images.indexOf(image),
        canNavigate: group.length > 1
      };
    }

    const tripleGroup = image.closest('.triple-layout');
    if (tripleGroup) {
      const images = Array.from(tripleGroup.querySelectorAll('.writing-figure img'));
      const group = images.map((img) => ({ src: img.currentSrc || img.src, alt: img.alt || '' }));
      return {
        group,
        index: images.indexOf(image),
        canNavigate: group.length > 1
      };
    }

    const splitGroup = image.closest('.writing-split');
    if (splitGroup) {
      return {
        group: [{ src: image.currentSrc || image.src, alt: image.alt || '' }],
        index: 0,
        canNavigate: false
      };
    }

    return {
      group: [{ src: image.currentSrc || image.src, alt: image.alt || '' }],
      index: 0,
      canNavigate: false
    };
  }

  writingImages.forEach((image) => {
    image.style.cursor = 'pointer';
    image.addEventListener('click', () => {
      const { group, index, canNavigate } = getGroupForWritingImage(image);
      openLightbox(group, index, canNavigate);
    });
  });
}

/* ============================
   JUSTIFIED WRITING GALLERIES
============================ */
const justifiedGalleries = Array.from(document.querySelectorAll('.writing-gallery.justified'));

if (justifiedGalleries.length) {
  const justifiedQuery = window.matchMedia('(min-width: 768px)');

  const resetJustified = (gallery) => {
    const figures = gallery.querySelectorAll('.writing-figure');
    figures.forEach((figure) => {
      figure.style.width = '';
    });

    const images = gallery.querySelectorAll('img');
    images.forEach((img) => {
      img.style.width = '';
      img.style.height = '';
    });
  };

  const layoutJustified = () => {
    justifiedGalleries.forEach((gallery) => {
      resetJustified(gallery);

      if (!justifiedQuery.matches) return;
      const perRow = gallery.classList.contains('gallery-3x1') ? 3 : 2;
      if (!gallery.classList.contains('gallery-2x1') && !gallery.classList.contains('gallery-3x1')) return;

      const figures = Array.from(gallery.querySelectorAll('.writing-figure'));
      const images = figures.map((figure) => figure.querySelector('img')).filter(Boolean);

      if (images.length < 2) return;
      if (images.some((img) => !img.naturalWidth || !img.naturalHeight)) return;

      const styles = getComputedStyle(gallery);
      const gap = parseFloat(styles.columnGap || styles.gap || 0);
      const paddingLeft = parseFloat(styles.paddingLeft || 0);
      const paddingRight = parseFloat(styles.paddingRight || 0);
      const containerWidth = gallery.clientWidth - paddingLeft - paddingRight;

      for (let i = 0; i < images.length; i += perRow) {
        const rowImages = images.slice(i, i + perRow);
        if (rowImages.length < perRow) break;
        const ratios = rowImages.map((img) => img.naturalWidth / img.naturalHeight);
        const totalRatio = ratios.reduce((sum, r) => sum + r, 0);
        if (!totalRatio) continue;

        const rowHeight = (containerWidth - (gap * (perRow - 1))) / totalRatio;

        rowImages.forEach((img, idx) => {
          const width = ratios[idx] * rowHeight;
          const figure = figures[i + idx];
          if (!figure) return;
          figure.style.width = `${width}px`;
          img.style.width = '100%';
          img.style.height = `${rowHeight}px`;
        });
      }
    });
  };

  let justifyTimeout;
  const scheduleJustified = () => {
    clearTimeout(justifyTimeout);
    justifyTimeout = setTimeout(layoutJustified, 60);
  };

  window.addEventListener('resize', scheduleJustified);
  justifiedQuery.addEventListener?.('change', scheduleJustified);
  window.addEventListener('load', layoutJustified);

  justifiedGalleries.forEach((gallery) => {
    const images = gallery.querySelectorAll('img');
    images.forEach((img) => {
      if (img.complete) return;
      img.addEventListener('load', scheduleJustified);
    });
  });

  layoutJustified();
}

/* ============================
   METRO WRITING GALLERIES
============================ */
const metroGalleries = Array.from(document.querySelectorAll('.writing-gallery.metro'));

if (metroGalleries.length) {
  const metroQuery = window.matchMedia('(min-width: 768px)');

  const resetMetro = (gallery) => {
    gallery.style.gridTemplateColumns = '';
  };

  const layoutMetro = () => {
    metroGalleries.forEach((gallery) => {
      resetMetro(gallery);

      if (!metroQuery.matches) return;
      if (!gallery.classList.contains('gallery-2x2')) return;

      const figures = Array.from(gallery.querySelectorAll('.writing-figure'));
      if (figures.length < 2) return;

      const styles = getComputedStyle(gallery);
      const gap = parseFloat(styles.columnGap || styles.gap || 0);
      const paddingLeft = parseFloat(styles.paddingLeft || 0);
      const paddingRight = parseFloat(styles.paddingRight || 0);
      const containerWidth = gallery.clientWidth - paddingLeft - paddingRight;

      const col1 = [figures[0], figures[2]].filter(Boolean);
      const col2 = [figures[1], figures[3]].filter(Boolean);

      const getMaxNaturalWidth = (items) => {
        return items.reduce((max, figure) => {
          if (figure.classList.contains('is-empty')) return max;
          const img = figure.querySelector('img');
          if (!img || !img.naturalWidth) return max;
          return Math.max(max, img.naturalWidth);
        }, 0);
      };

      let col1Width = getMaxNaturalWidth(col1);
      let col2Width = getMaxNaturalWidth(col2);

      if (!col1Width && !col2Width) return;
      if (!col1Width) col1Width = col2Width;
      if (!col2Width) col2Width = col1Width;

      const total = col1Width + col2Width;
      if (!total) return;

      const scale = (containerWidth - gap) / total;
      if (!Number.isFinite(scale) || scale <= 0) return;

      gallery.style.gridTemplateColumns = `${col1Width * scale}px ${col2Width * scale}px`;
    });
  };

  let metroTimeout;
  const scheduleMetro = () => {
    clearTimeout(metroTimeout);
    metroTimeout = setTimeout(layoutMetro, 60);
  };

  window.addEventListener('resize', scheduleMetro);
  metroQuery.addEventListener?.('change', scheduleMetro);
  window.addEventListener('load', layoutMetro);

  metroGalleries.forEach((gallery) => {
    const images = gallery.querySelectorAll('img');
    images.forEach((img) => {
      if (img.complete) return;
      img.addEventListener('load', scheduleMetro);
    });
  });

  layoutMetro();
}

/* ============================
   DUAL LAYOUT COPY SCROLL MATCH
============================ */
const dualScrollLayouts = Array.from(document.querySelectorAll('.dual-layout.dual-scroll-match'));

if (dualScrollLayouts.length) {
  const dualScrollQuery = window.matchMedia('(min-width: 768px)');

  const ensureDualCopyWrapper = (copy) => {
    if (!copy || copy.querySelector('.writing-copy-scroll')) return;
    const wrapper = document.createElement('div');
    wrapper.className = 'writing-copy-scroll';
    while (copy.firstChild) {
      wrapper.appendChild(copy.firstChild);
    }
    copy.appendChild(wrapper);
  };

  const resetDualScroll = (layout) => {
    const wrappers = layout.querySelectorAll('.writing-copy-scroll');
    wrappers.forEach((wrapper) => {
      wrapper.classList.remove('is-scroll');
      wrapper.classList.remove('at-bottom');
      wrapper.style.maxHeight = '';
      wrapper.style.overflowY = '';
    });
  };

  const layoutDualScroll = () => {
    dualScrollLayouts.forEach((layout) => {
      resetDualScroll(layout);
      if (!dualScrollQuery.matches) return;

      const leftFigure = layout.querySelector('.dual-media.dual-left .writing-figure');
      const rightMedia = layout.querySelector('.dual-media.dual-right');
      const rightFigure = rightMedia?.querySelector('.writing-figure');
      const copy = rightMedia?.querySelector('.writing-copy');
      if (!leftFigure || !rightMedia || !rightFigure || !copy) return;

      ensureDualCopyWrapper(copy);
      const wrapper = copy.querySelector('.writing-copy-scroll');
      if (!wrapper) return;

      const leftHeight = leftFigure.getBoundingClientRect().height;
      const rightImageHeight = rightFigure.getBoundingClientRect().height;
      if (!leftHeight || !rightImageHeight) return;

      const rightStyles = getComputedStyle(rightMedia);
      const gap = parseFloat(rightStyles.rowGap || rightStyles.gap || 0);
      const copyStyles = getComputedStyle(copy);
      const padTop = parseFloat(copyStyles.paddingTop || 0);
      const padBottom = parseFloat(copyStyles.paddingBottom || 0);

      const available = leftHeight - rightImageHeight - gap - padTop - padBottom;
      if (available <= 0) return;

      wrapper.style.maxHeight = `${available}px`;

      if (wrapper.scrollHeight > available + 1) {
        wrapper.classList.add('is-scroll');
        wrapper.style.overflowY = 'auto';
        wrapper.classList.toggle(
          'at-bottom',
          wrapper.scrollTop + wrapper.clientHeight >= wrapper.scrollHeight - 1
        );
      }
    });
  };

  let dualScrollTimeout;
  const scheduleDualScroll = () => {
    clearTimeout(dualScrollTimeout);
    dualScrollTimeout = setTimeout(layoutDualScroll, 60);
  };

  window.addEventListener('resize', scheduleDualScroll);
  dualScrollQuery.addEventListener?.('change', scheduleDualScroll);
  window.addEventListener('load', layoutDualScroll);

  dualScrollLayouts.forEach((layout) => {
    const images = layout.querySelectorAll('img');
    images.forEach((img) => {
      if (img.complete) return;
      img.addEventListener('load', scheduleDualScroll);
    });
  });

  layoutDualScroll();
}

/* ============================
   DUAL LAYOUT HEIGHT MATCH
============================ */
const dualMatchLayouts = Array.from(document.querySelectorAll('.dual-layout.dual-match-heights'));

if (dualMatchLayouts.length) {
  const dualMatchQuery = window.matchMedia('(min-width: 768px)');

  const resetDualMatch = (layout) => {
    const leftGallery = layout.querySelector('.dual-media.dual-left .writing-gallery');
    if (leftGallery) {
      leftGallery.style.width = '';
      leftGallery.style.maxWidth = '';
      leftGallery.style.marginRight = '';
    }
    layout.style.removeProperty('--left-gallery-width');
  };

  const layoutDualMatch = () => {
    dualMatchLayouts.forEach((layout) => {
      resetDualMatch(layout);
      if (!dualMatchQuery.matches) return;

      const leftMedia = layout.querySelector('.dual-media.dual-left');
      const leftGallery = leftMedia?.querySelector('.writing-gallery');
      const rightImage = layout.querySelector('.dual-media.dual-right img');
      if (!leftMedia || !leftGallery || !rightImage) return;

      const figures = Array.from(leftGallery.querySelectorAll('.writing-figure'));
      if (!figures.length) return;

      const styles = getComputedStyle(leftGallery);
      const gap = parseFloat(styles.rowGap || styles.gap || 0);
      const totalGaps = gap * Math.max(0, figures.length - 1);

      const totalImageHeight = figures.reduce((sum, figure) => sum + figure.getBoundingClientRect().height, 0);
      const currentHeight = totalImageHeight + totalGaps;
      const targetHeight = rightImage.getBoundingClientRect().height;

      if (!currentHeight || !targetHeight) return;

      const available = targetHeight - totalGaps;
      if (available <= 0) return;

      const scale = Math.min(1, available / totalImageHeight);
      const currentWidth = leftGallery.getBoundingClientRect().width;
      if (scale < 1) {
        const nextWidth = currentWidth * scale;
        leftGallery.style.width = `${nextWidth}px`;
        leftGallery.style.maxWidth = '100%';
        leftGallery.style.marginRight = 'auto';
      }

      const measuredWidth = leftGallery.getBoundingClientRect().width;
      if (measuredWidth) {
        layout.style.setProperty('--left-gallery-width', `${measuredWidth}px`);
        const leftOffset = leftGallery.getBoundingClientRect().left - leftMedia.getBoundingClientRect().left;
        if (Number.isFinite(leftOffset)) {
          layout.style.setProperty('--left-gallery-offset', `${leftOffset}px`);
        }
      }
    });
  };

  let dualMatchTimeout;
  const scheduleDualMatch = () => {
    clearTimeout(dualMatchTimeout);
    dualMatchTimeout = setTimeout(layoutDualMatch, 60);
  };

  window.addEventListener('resize', scheduleDualMatch);
  dualMatchQuery.addEventListener?.('change', scheduleDualMatch);
  window.addEventListener('load', layoutDualMatch);

  dualMatchLayouts.forEach((layout) => {
    const images = layout.querySelectorAll('img');
    images.forEach((img) => {
      if (img.complete) return;
      img.addEventListener('load', scheduleDualMatch);
    });
  });

  layoutDualMatch();
}

/* ============================
   FILL-SECOND 2x2 GALLERIES
============================ */
const fillSecondGalleries = Array.from(document.querySelectorAll('.writing-gallery.gallery-2x2.fill-second'));

if (fillSecondGalleries.length) {
  const fillSecondQuery = window.matchMedia('(min-width: 768px)');

  const resetFillSecond = (gallery) => {
    gallery.style.gridTemplateColumns = '';
    gallery.style.gridTemplateRows = '';
    const figures = gallery.querySelectorAll('.writing-figure');
    figures.forEach((figure) => {
      figure.style.width = '';
      figure.style.height = '';
    });
    const images = gallery.querySelectorAll('img');
    images.forEach((img) => {
      img.style.width = '';
      img.style.height = '';
      img.style.objectFit = '';
    });
  };

  const layoutFillSecond = () => {
    fillSecondGalleries.forEach((gallery) => {
      resetFillSecond(gallery);
      if (!fillSecondQuery.matches) return;

      const rightFigure = gallery.querySelector('.writing-figure.span-rows');
      const figures = Array.from(gallery.querySelectorAll('.writing-figure')).filter(
        (figure) => figure !== rightFigure && !figure.classList.contains('is-empty')
      );
      if (!rightFigure || figures.length < 2) return;

      const leftTop = figures[0];
      const leftBottom = figures[1];

      const imgTop = leftTop.querySelector('img');
      const imgBottom = leftBottom.querySelector('img');
      const imgRight = rightFigure.querySelector('img');

      if (!imgTop || !imgBottom || !imgRight) return;
      if (!imgTop.naturalWidth || !imgTop.naturalHeight) return;
      if (!imgBottom.naturalWidth || !imgBottom.naturalHeight) return;
      if (!imgRight.naturalWidth || !imgRight.naturalHeight) return;

      const styles = getComputedStyle(gallery);
      const gapX = parseFloat(styles.columnGap || styles.gap || 0);
      const gapY = parseFloat(styles.rowGap || styles.gap || 0);
      const paddingLeft = parseFloat(styles.paddingLeft || 0);
      const paddingRight = parseFloat(styles.paddingRight || 0);
      const containerWidth = gallery.clientWidth - paddingLeft - paddingRight;

      const r1 = imgTop.naturalWidth / imgTop.naturalHeight;
      const r2 = imgBottom.naturalWidth / imgBottom.naturalHeight;
      const r3 = imgRight.naturalWidth / imgRight.naturalHeight;
      if (!r1 || !r2 || !r3) return;

      const denom = 1 + r3 * (1 / r1 + 1 / r2);
      const available = containerWidth - gapX - (r3 * gapY);
      if (!denom || available <= 0) return;

      const leftWidth = available / denom;
      if (leftWidth <= 0) return;

      const h1 = leftWidth / r1;
      const h2 = leftWidth / r2;
      const totalHeight = h1 + h2 + gapY;
      const rightWidth = r3 * totalHeight;

      if (!Number.isFinite(leftWidth) || !Number.isFinite(rightWidth)) return;

      gallery.style.gridTemplateColumns = `${leftWidth}px ${rightWidth}px`;
      gallery.style.gridTemplateRows = `${h1}px ${h2}px`;

      [leftTop, leftBottom, rightFigure].forEach((figure) => {
        figure.style.width = '100%';
        figure.style.height = '100%';
      });

      [imgTop, imgBottom, imgRight].forEach((img) => {
        img.style.width = '100%';
        img.style.height = '100%';
        img.style.objectFit = 'contain';
      });
    });
  };

  let fillSecondTimeout;
  const scheduleFillSecond = () => {
    clearTimeout(fillSecondTimeout);
    fillSecondTimeout = setTimeout(layoutFillSecond, 60);
  };

  window.addEventListener('resize', scheduleFillSecond);
  fillSecondQuery.addEventListener?.('change', scheduleFillSecond);
  window.addEventListener('load', layoutFillSecond);

  fillSecondGalleries.forEach((gallery) => {
    const images = gallery.querySelectorAll('img');
    images.forEach((img) => {
      if (img.complete) return;
      img.addEventListener('load', scheduleFillSecond);
    });
  });

  layoutFillSecond();
}

/* ============================
   GALLERY COPY SCROLL
============================ */
const copyScrollGalleries = Array.from(document.querySelectorAll('.writing-gallery'));

if (copyScrollGalleries.length) {
  const copyScrollQuery = window.matchMedia('(min-width: 768px)');

  const ensureCopyWrappers = () => {
    copyScrollGalleries.forEach((gallery) => {
      const figures = gallery.querySelectorAll('.writing-figure');
      figures.forEach((figure) => {
        if (figure.querySelector('.writing-copy-scroll')) return;
        const paragraphs = Array.from(figure.querySelectorAll(':scope > .writing-paragraph'));
        if (!paragraphs.length) return;

        const wrapper = document.createElement('div');
        wrapper.className = 'writing-copy-scroll';
        figure.insertBefore(wrapper, paragraphs[0]);
        paragraphs.forEach((p) => wrapper.appendChild(p));
      });
    });
  };

  const updateCopyScroll = () => {
    ensureCopyWrappers();

    copyScrollGalleries.forEach((gallery) => {
      const wrappers = gallery.querySelectorAll('.writing-copy-scroll');
      wrappers.forEach((wrapper) => {
        wrapper.classList.remove('is-scroll');
        wrapper.classList.remove('at-bottom');
        wrapper.style.maxHeight = '';
        wrapper.style.overflowY = '';

        if (!copyScrollQuery.matches) return;

        const sample = wrapper.querySelector('.writing-paragraph');
        if (!sample) return;

        const computed = getComputedStyle(sample);
        let lineHeight = parseFloat(computed.lineHeight);
        if (Number.isNaN(lineHeight)) {
          const fontSize = parseFloat(computed.fontSize) || 16;
          lineHeight = fontSize * 1.8;
        }

        const maxHeight = lineHeight * 10;
        wrapper.style.maxHeight = `${maxHeight}px`;

        if (wrapper.scrollHeight > maxHeight + 1) {
          wrapper.classList.add('is-scroll');
          wrapper.style.overflowY = 'auto';
          wrapper.classList.toggle(
            'at-bottom',
            wrapper.scrollTop + wrapper.clientHeight >= wrapper.scrollHeight - 1
          );
        }
      });
    });
  };

  const handleScroll = (event) => {
    const target = event.target;
    if (!target.classList.contains('writing-copy-scroll')) return;
    target.classList.toggle(
      'at-bottom',
      target.scrollTop + target.clientHeight >= target.scrollHeight - 1
    );
  };

  let copyScrollTimeout;
  const scheduleCopyScroll = () => {
    clearTimeout(copyScrollTimeout);
    copyScrollTimeout = setTimeout(updateCopyScroll, 80);
  };

  window.addEventListener('resize', scheduleCopyScroll);
  copyScrollQuery.addEventListener?.('change', scheduleCopyScroll);
  window.addEventListener('load', updateCopyScroll);
  document.addEventListener('scroll', handleScroll, true);
  updateCopyScroll();
}
