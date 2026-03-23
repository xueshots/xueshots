/* ============================
   ELEMENTS
============================ */
const hamburger = document.querySelector(".hamburger");
const menu = document.querySelector(".menu");
const menuPanels = document.querySelector(".menu-panels");
const body = document.body;
const HAMBURGER_RIGHT = 60;

let isMenuOpen = false;
let isMenuAnimating = false;
let scrollbarWidth = 0;

function getScrollbarWidth() {
  return Math.max(0, window.innerWidth - document.documentElement.clientWidth);
}

/* ============================
   MOBILE MENU TOGGLE
============================ */
hamburger.addEventListener("click", toggleMenu);

const menuLinks = document.querySelectorAll(".menu-main a:not(.writing-toggle), .menu-writing a");
menuLinks.forEach(link => {
  link.addEventListener("click", () => {
    if (isMenuOpen && window.innerWidth < 1024) {
      toggleMenu();
    }
  });
});

function toggleMenu() {
  if (isMenuAnimating) return;
  isMenuAnimating = true;
  const wasWritingOpen = menu.classList.contains("writing-open");
  isMenuOpen = !isMenuOpen;

  hamburger.classList.toggle("is-open");
  menu.classList.toggle("is-open");
  body.classList.toggle("menu-open");

  if (isMenuOpen) {
    // Measure scrollbar width before hiding it
    scrollbarWidth = getScrollbarWidth();

    // Lock scroll
    document.documentElement.style.overflow = "hidden";

    // Compensate for scrollbar disappearing
    document.body.style.paddingRight = scrollbarWidth + "px";

    // Keep hamburger in place
    hamburger.style.right = (HAMBURGER_RIGHT + scrollbarWidth) + "px";

    // Keep menu panels centered
    menu.style.setProperty("--scrollbar-width", scrollbarWidth + "px");
  } else {
    // Restore scroll and layout AFTER animation completes to prevent jump
    setTimeout(() => {
      document.documentElement.style.overflow = "";
      document.body.style.paddingRight = "";
      hamburger.style.right = "";
      menu.style.removeProperty("--scrollbar-width");
    }, 500);
  }

  if (!isMenuOpen && !wasWritingOpen) {
    menu.classList.remove("writing-open");
  }

  setTimeout(() => {
    if (!isMenuOpen && wasWritingOpen) {
      menu.classList.remove("writing-open");
    }
    isMenuAnimating = false;
  }, 500);
}

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && isMenuOpen) {
    toggleMenu();
  }
});

/* ============================
   WRITING SUBMENU (MOBILE)
============================ */
const writingToggle = document.querySelector(".writing-toggle");
const writingBack = document.getElementById("writingBack");
const desktopWritingTrigger = document.querySelector(".writing-nav > a");

if (desktopWritingTrigger) {
  desktopWritingTrigger.addEventListener("click", (e) => {
    if (window.innerWidth >= 1024) {
      e.preventDefault();
    }
  });
}

if (writingToggle) {
  writingToggle.addEventListener("click", (e) => {
    if (window.innerWidth >= 1024) return;
    e.preventDefault();
    e.stopPropagation();
    menu.classList.add("writing-open");
  });
}

if (writingBack) {
  writingBack.addEventListener("click", () => {
    menu.classList.remove("writing-open");
  });
}

/* ============================
   PREVENT FLASH ON RESIZE
============================ */
let menuResizeTimeout;
let isResizing = false;

window.addEventListener("resize", () => {
  if (!isResizing) {
    isResizing = true;
    // Instantly hide menu during resize to prevent flash
    menu.style.transition = "none";
    if (menuPanels) menuPanels.style.transition = "none";
  }

  clearTimeout(menuResizeTimeout);

  menuResizeTimeout = setTimeout(() => {
    menu.style.transition = "";
    if (menuPanels) menuPanels.style.transition = "";
    isResizing = false;

    // If resized to desktop while menu was open, clean up
    if (window.innerWidth >= 1024 && isMenuOpen) {
      isMenuOpen = false;
      hamburger.classList.remove("is-open");
      menu.classList.remove("is-open");
      menu.classList.remove("writing-open");
      body.classList.remove("menu-open");
      document.documentElement.style.overflow = "";
      document.body.style.paddingRight = "";
      hamburger.style.right = "";
      menu.style.removeProperty("--scrollbar-width");
    }
  }, 100);
});

/* ============================
   DESKTOP SLIDING UNDERLINE
============================ */
function initUnderline() {
  if (window.innerWidth < 1024) return;

  const links = Array.from(document.querySelectorAll(".menu-main > a:not(.instagram-link), .writing-nav > a"));

  const u1 = document.createElement("div");
  u1.className = "menu-underline";
  const u2 = document.createElement("div");
  u2.className = "menu-underline";
  menu.appendChild(u1);
  menu.appendChild(u2);

  const currentPage = window.location.pathname.split("/").pop();
  const writingNavLink = links.find(link => link.closest(".writing-nav")) || null;
  const activeLink = links.find(link => link.getAttribute("href") === currentPage)
    || (currentPage.startsWith("writing-") ? writingNavLink : null);

  let lastHovered = null;
  let u1Active = true;
  let isInDropdown = false;

  const dropdown = document.querySelector(".writing-dropdown");
  if (dropdown) {
    dropdown.addEventListener("mouseenter", () => { isInDropdown = true; });
    dropdown.addEventListener("mouseleave", () => { isInDropdown = false; });
  }

  function getVisible() { return u1Active ? u1 : u2; }
  function getHidden() { return u1Active ? u2 : u1; }

  function pos(el, link, animate) {
    const menuRect = menu.getBoundingClientRect();
    const linkRect = link.getBoundingClientRect();
    el.style.transition = animate ? "left 0.2s ease, width 0.2s ease, opacity 0.2s ease" : "none";
    el.style.left = (linkRect.left - menuRect.left) + "px";
    el.style.width = linkRect.width + "px";
  }

  function slide(link) {
    pos(getVisible(), link, true);
    getVisible().style.opacity = "1";
    getHidden().style.transition = "none";
    getHidden().style.opacity = "0";
  }

  function crossfade(link) {
    const from = getVisible();
    const to = getHidden();
    pos(to, link, false);
    requestAnimationFrame(() => {
      from.style.transition = "opacity 0.2s ease";
      to.style.transition = "opacity 0.2s ease";
      from.style.opacity = "0";
      to.style.opacity = "1";
    });
    u1Active = !u1Active;
  }

  function dist(a, b) {
    return Math.abs(links.indexOf(a) - links.indexOf(b));
  }

  u1.style.opacity = "0";
  u2.style.opacity = "0";
  u1.style.transition = "none";
  u2.style.transition = "none";

  if (activeLink) {
    pos(u1, activeLink, false);
    requestAnimationFrame(() => {
      u1.style.transition = "left 0.2s ease, width 0.2s ease, opacity 0.2s ease";
      u1.style.opacity = "1";
    });
  }

  links.forEach(link => {
    link.addEventListener("mouseenter", () => {
      const origin = lastHovered || activeLink;

      if (!origin) {
        pos(getVisible(), link, false);
        requestAnimationFrame(() => {
          getVisible().style.transition = "left 0.2s ease, width 0.2s ease, opacity 0.2s ease";
          getVisible().style.opacity = "1";
        });
      } else if (dist(link, origin) <= 1) {
        slide(link);
      } else {
        crossfade(link);
      }

      lastHovered = link;
    });
  });

  menu.addEventListener("mouseleave", (e) => {
    if (isInDropdown) return;

    if (activeLink && lastHovered) {
      if (dist(activeLink, lastHovered) <= 1) {
        slide(activeLink);
      } else {
        crossfade(activeLink);
      }
    } else if (!activeLink) {
      getVisible().style.transition = "opacity 0.2s ease";
      getVisible().style.opacity = "0";
      getHidden().style.transition = "none";
      getHidden().style.opacity = "0";
    }

    lastHovered = null;
  });
}

initUnderline();

let wasDesktop = window.innerWidth >= 1024;

window.addEventListener("resize", () => {
  const isDesktop = window.innerWidth >= 1024;
  if (isDesktop && !wasDesktop) {
    // Wait for resize to settle before reinitializing to prevent stretched underline
    setTimeout(() => {
      document.querySelectorAll(".menu-underline").forEach(el => el.remove());
      initUnderline();
    }, 150);
  }
  wasDesktop = isDesktop;
});

/* ============================
   SCROLL TO TOP
============================ */
function initScrollToTop() {
  if (document.body.classList.contains("about") || document.body.classList.contains("contact")) {
    return;
  }

  const button = document.createElement("button");
  button.className = "scroll-to-top";
  button.setAttribute("type", "button");
  button.setAttribute("aria-label", "Back to top");
  button.innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
      <polyline points="5 15 12 8 19 15"></polyline>
    </svg>
  `;

  const pageWrapper = document.querySelector(".page-wrapper");
  if (!pageWrapper) return;
  pageWrapper.appendChild(button);

  button.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
}

initScrollToTop();

/* ============================
   COVER COPY REVEAL
============================ */
function initCoverCopyReveal() {
  const coverImage = document.querySelector("body.page.writing.alaskanpanhandle .writing-cover-media img");
  const coverCopy = document.querySelector("body.page.writing.alaskanpanhandle .writing-cover-copy");

  if (!coverImage || !coverCopy) return;

  const reveal = () => {
    requestAnimationFrame(() => {
      coverCopy.classList.add("is-ready");
    });
  };

  if (coverImage.complete && coverImage.naturalWidth) {
    reveal();
    return;
  }

  coverImage.addEventListener("load", reveal, { once: true });
  coverImage.addEventListener("error", reveal, { once: true });
  window.addEventListener("pageshow", reveal, { once: true });
}

initCoverCopyReveal();
