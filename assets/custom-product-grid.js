(function () {
  // Shopify cart add expects a variant id here.
  var BLACK_MEDIUM_EXTRA_VARIANT_ID = 48450599583901;

  function formatMoney(cents, moneyFormat) {
    if (window.Shopify && typeof window.Shopify.formatMoney === 'function') {
      return window.Shopify.formatMoney(cents, moneyFormat);
    }

    return (cents / 100).toLocaleString(undefined, {
      style: 'currency',
      currency: window.Shopify && window.Shopify.currency ? window.Shopify.currency.active : 'USD',
    });
  }

  function getVariants(form) {
    var script = form.querySelector('[data-custom-product-grid-variants]');

    if (!script) {
      return [];
    }

    try {
      return JSON.parse(script.textContent);
    } catch (error) {
      return [];
    }
  }

  function getSelectedOptions(form) {
    var selectedOptions = [];

    Array.from(form.querySelectorAll('.custom-product-grid__option')).forEach(function (option) {
      var selected = option.querySelector('[data-custom-product-grid-option]:checked');
      var optionPosition = Number(option.dataset.optionPosition || 0);

      if (!selected) {
        selected = option.querySelector('[data-custom-product-grid-option]');
      }

      if (optionPosition > 0) {
        selectedOptions[optionPosition - 1] = selected ? selected.value : null;
      }
    });

    return selectedOptions;
  }

  function getSelectedOptionValue(form, optionNames) {
    var value = null;

    Array.from(form.querySelectorAll('.custom-product-grid__option')).some(function (option) {
      var label = option.querySelector('.custom-product-grid__option-label');
      var optionName = label ? label.textContent.trim().toLowerCase() : '';
      var isMatchingOption = optionNames.some(function (name) {
        return optionName.indexOf(name) > -1;
      });

      if (!isMatchingOption) {
        return false;
      }

      var selected = option.querySelector('[data-custom-product-grid-option]:checked');

      if (!selected) {
        selected = option.querySelector('[data-custom-product-grid-option]');
      }

      value = selected ? selected.value.trim().toLowerCase() : null;
      return true;
    });

    return value;
  }

  function shouldAddBlackMediumProduct(form) {
    var color = getSelectedOptionValue(form, ['color', 'colour']);
    var size = getSelectedOptionValue(form, ['size']);

    return color && color.indexOf('black') > -1 && (size === 'm' || size === 'medium');
  }

  function addBlackMediumProductIfNeeded(form) {
    if (!shouldAddBlackMediumProduct(form)) {
      return Promise.resolve();
    }

    return fetch('/cart/add.js', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        id: BLACK_MEDIUM_EXTRA_VARIANT_ID,
        quantity: 1,
      }),
    })
      .then(function (response) {
        if (!response.ok) {
          return response.json().catch(function () {
            return {};
          }).then(function (error) {
            if (window.console && typeof window.console.warn === 'function') {
              window.console.warn('Could not add black medium bonus product.', error);
            }
          });
        }
      })
      .catch(function (error) {
        if (window.console && typeof window.console.warn === 'function') {
          window.console.warn('Could not add black medium bonus product.', error);
        }
      });
  }

  function findSelectedVariant(form) {
    var selectedOptions = getSelectedOptions(form);

    return getVariants(form).find(function (variant) {
      return selectedOptions.every(function (value, index) {
        return variant.options[index] === value;
      });
    });
  }

  function setAddButtonText(button, text) {
    if (!button) {
      return;
    }

    var label = button.querySelector('[data-custom-product-grid-add-text]');

    if (label) {
      label.textContent = text;
      return;
    }

    button.textContent = text;
  }

  function updateFormState(form) {
    var variant = findSelectedVariant(form);
    var variantInput = form.querySelector('[data-custom-product-grid-variant-id]');
    var addButton = form.querySelector('[data-custom-product-grid-add]');
    var modal = form.closest('[data-custom-product-grid-modal]');
    var priceContainer = modal ? modal.querySelector('[data-custom-product-grid-price]') : null;

    if (!variant) {
      if (addButton) {
        addButton.disabled = true;
        setAddButtonText(addButton, 'Unavailable');
      }

      return;
    }

    if (variantInput) {
      variantInput.value = variant.id;
    }

    if (addButton) {
      addButton.disabled = !variant.available;
      setAddButtonText(addButton, variant.available ? 'ADD TO CART' : 'Sold out');
    }

    if (priceContainer && typeof variant.price === 'number') {
      priceContainer.textContent = formatMoney(variant.price, form.dataset.moneyFormat || '');
    }
  }

  function updateColorIndicator(colorOptions) {
    if (!colorOptions) {
      return;
    }

    var colorInputs = Array.from(colorOptions.querySelectorAll('input[type="radio"]'));
    var checkedIndex = colorInputs.findIndex(function (input) {
      return input.checked;
    });

    if (checkedIndex < 0) {
      checkedIndex = 0;
    }

    colorOptions.style.setProperty('--custom-product-grid-active-column', String(checkedIndex % 2));
    colorOptions.style.setProperty('--custom-product-grid-active-row', String(Math.floor(checkedIndex / 2)));
  }

  function closeModal(modal) {
    if (!modal) {
      return;
    }

    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');

    if (!document.querySelector('[data-custom-product-grid-modal].is-open')) {
      document.body.classList.remove('custom-product-grid-modal-open');
    }
  }

  function openModal(modal) {
    if (!modal) {
      return;
    }

    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('custom-product-grid-modal-open');

    var closeButton = modal.querySelector('[data-custom-product-grid-close]');

    if (closeButton) {
      closeButton.focus();
    }
  }

  function setMessage(form, text, type) {
    var message = form.querySelector('[data-custom-product-grid-message]');

    if (!message) {
      return;
    }

    message.textContent = text;
    message.classList.toggle('is-error', type === 'error');
    message.classList.toggle('is-success', type === 'success');
  }

  function initSection(section) {
    if (section.dataset.customProductGridInitialized === 'true') {
      return;
    }

    section.dataset.customProductGridInitialized = 'true';

    section.querySelectorAll('[data-custom-product-grid-open]').forEach(function (button) {
      button.addEventListener('click', function () {
        var modalId = button.getAttribute('aria-controls');
        openModal(document.getElementById(modalId));
      });
    });

    section.querySelectorAll('[data-custom-product-grid-close]').forEach(function (button) {
      button.addEventListener('click', function () {
        closeModal(button.closest('[data-custom-product-grid-modal]'));
      });
    });

    section.querySelectorAll('[data-custom-product-grid-form]').forEach(function (form) {
      form.querySelectorAll('.custom-product-grid__color-options').forEach(updateColorIndicator);

      form.querySelectorAll('[data-custom-product-grid-option]').forEach(function (input) {
        input.addEventListener('change', function () {
          setMessage(form, '', '');
          updateColorIndicator(input.closest('.custom-product-grid__color-options'));
          updateFormState(form);
        });
      });

      updateFormState(form);

      form.addEventListener('submit', function (event) {
        event.preventDefault();

        var addButton = form.querySelector('[data-custom-product-grid-add]');
        var variantInput = form.querySelector('[data-custom-product-grid-variant-id]');

        if (!variantInput || !variantInput.value || (addButton && addButton.disabled)) {
          return;
        }

        if (addButton) {
          addButton.disabled = true;
          setAddButtonText(addButton, 'Adding...');
        }

        setMessage(form, '', '');

        fetch('/cart/add.js', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({
            id: Number(variantInput.value),
            quantity: 1,
          }),
        })
          .then(function (response) {
            if (!response.ok) {
              return response.json().then(function (error) {
                throw error;
              });
            }

            return response.json();
          })
          .then(function () {
            return addBlackMediumProductIfNeeded(form);
          })
          .then(function () {
            var cartPromise = fetch('/cart.js', {
              headers: {
                Accept: 'application/json',
              },
            })
              .then(function (response) {
                return response.json();
              })
              .then(function (cart) {
                return {
                  cart: {
                    totalQuantity: cart.item_count,
                  },
                  detail: {
                    items: cart.items,
                    itemCount: cart.item_count,
                    source: 'custom-product-grid',
                    didError: false,
                  },
                };
              });
            var cartEvent = new Event('shopify:cart:lines-update', { bubbles: true });

            cartEvent.action = 'add';
            cartEvent.promise = cartPromise;
            form.dispatchEvent(cartEvent);

            window.location.href = '/cart';
          })
          .catch(function (error) {
            setMessage(form, error.description || error.message || 'Could not add this product.', 'error');
            updateFormState(form);
          });
      });
    });
  }

  function initCustomProductGrids() {
    document.querySelectorAll('.custom-product-grid').forEach(initSection);
  }

  document.addEventListener('keydown', function (event) {
    if (event.key !== 'Escape') {
      return;
    }

    document.querySelectorAll('[data-custom-product-grid-modal].is-open').forEach(closeModal);
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCustomProductGrids);
  } else {
    initCustomProductGrids();
  }

  document.addEventListener('shopify:section:load', initCustomProductGrids);
})();
