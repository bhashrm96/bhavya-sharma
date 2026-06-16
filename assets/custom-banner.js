(function () {
  // Keep close behavior in one place so Escape, overlay, resize, and outside clicks stay consistent.
  function closeTopbar(topbar) {
    var toggle = topbar.querySelector('[data-custom-banner-toggle]');

    topbar.classList.remove('is-open');

    if (toggle) {
      toggle.setAttribute('aria-expanded', 'false');
      toggle.setAttribute('aria-label', 'Open header menu');
    }
  }

  function initCustomBannerTopbar(topbar) {
    // Shopify theme editor can reload sections, so guard against binding duplicate listeners.
    if (topbar.dataset.customBannerInitialized === 'true') {
      return;
    }

    var toggle = topbar.querySelector('[data-custom-banner-toggle]');
    var banner = topbar.closest('.custom-banner');
    var overlay = banner ? banner.querySelector('[data-custom-banner-overlay]') : null;

    if (!toggle) {
      return;
    }

    topbar.dataset.customBannerInitialized = 'true';

    // Toggle the mobile menu state and keep assistive labels in sync with the visible icon.
    toggle.addEventListener('click', function () {
      var isOpen = topbar.classList.toggle('is-open');

      toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      toggle.setAttribute('aria-label', isOpen ? 'Close header menu' : 'Open header menu');
    });

    // Keyboard close support for the mobile menu.
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') {
        closeTopbar(topbar);
      }
    });

    // Any click outside the topbar, including the dimmed overlay, closes the menu.
    document.addEventListener('click', function (event) {
      if (!topbar.classList.contains('is-open')) {
        return;
      }

      if (topbar.contains(event.target)) {
        return;
      }

      closeTopbar(topbar);
    });

    if (overlay) {
      overlay.addEventListener('click', function () {
        closeTopbar(topbar);
      });
    }

    // Reset mobile-only state when returning to desktop.
    window.addEventListener('resize', function () {
      if (window.innerWidth > 749) {
        closeTopbar(topbar);
      }
    });
  }

  function initCustomBannerTopbars() {
    var topbars = document.querySelectorAll('[data-custom-banner-topbar]');

    topbars.forEach(initCustomBannerTopbar);
  }

  // Initialize on normal page load and when Shopify injects this section in the editor.
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCustomBannerTopbars);
  } else {
    initCustomBannerTopbars();
  }

  document.addEventListener('shopify:section:load', initCustomBannerTopbars);
})();
