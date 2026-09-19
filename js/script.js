/**
 * Accessible Enterprise Dashboard - Core JavaScript
 * Standards: WCAG 2.1 AA/AAA Focus Management, ARIA live announcements, Client Validation
 */

document.addEventListener('DOMContentLoaded', () => {
  initMobileNav();
  initModalDialog();
  initFormValidation();
  initTableInteractivity();
  initAccessibilityPreferences();
  initPasswordToggles();
});

/**
 * 1. Screen Reader Live Region Announcer
 * Announces dynamic state changes to assistive technology without disrupting focus.
 */
function announceToScreenReader(message) {
  const announcer = document.getElementById('live-announcer');
  if (!announcer) return;
  // Clear and update to force screen reader notification
  announcer.textContent = '';
  setTimeout(() => {
    announcer.textContent = message;
  }, 50);
}

/**
 * 2. Mobile Navigation Toggle with ARIA Attributes
 */
function initMobileNav() {
  const toggleBtn = document.querySelector('.mobile-nav-toggle');
  const sidebar = document.querySelector('.app-sidebar');

  if (!toggleBtn || !sidebar) return;

  toggleBtn.addEventListener('click', () => {
    const isExpanded = toggleBtn.getAttribute('aria-expanded') === 'true';
    const newState = !isExpanded;

    toggleBtn.setAttribute('aria-expanded', String(newState));
    sidebar.classList.toggle('is-open', newState);

    if (newState) {
      announceToScreenReader('Navigation menu expanded');
      // Focus first link in sidebar
      const firstLink = sidebar.querySelector('a');
      if (firstLink) firstLink.focus();
    } else {
      announceToScreenReader('Navigation menu collapsed');
    }
  });

  // Close sidebar on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && sidebar.classList.contains('is-open')) {
      sidebar.classList.remove('is-open');
      toggleBtn.setAttribute('aria-expanded', 'false');
      toggleBtn.focus();
      announceToScreenReader('Navigation menu collapsed');
    }
  });

  // Close sidebar when clicking outside on mobile backdrop
  document.addEventListener('click', (e) => {
    if (
      sidebar.classList.contains('is-open') &&
      !sidebar.contains(e.target) &&
      !toggleBtn.contains(e.target)
    ) {
      sidebar.classList.remove('is-open');
      toggleBtn.setAttribute('aria-expanded', 'false');
    }
  });
}

/**
 * 3. Accessible Modal Dialog (<dialog>) Management
 * Complies with native modal dialog standard and focus restoration
 */
let lastFocusedTrigger = null;

function initModalDialog() {
  const modal = document.getElementById('user-modal');
  if (!modal) return;

  const openTriggers = document.querySelectorAll('[data-open-modal="user-modal"]');
  const closeTriggers = modal.querySelectorAll('[data-close-modal]');
  const modalTitle = document.getElementById('modal-title');
  const userForm = document.getElementById('user-form');

  // Open modal handlers
  openTriggers.forEach((trigger) => {
    trigger.addEventListener('click', (e) => {
      e.preventDefault();
      lastFocusedTrigger = trigger;

      const mode = trigger.getAttribute('data-modal-mode') || 'add';
      if (modalTitle) {
        modalTitle.textContent = mode === 'edit' ? 'Edit User Profile' : 'Add New User';
      }

      if (mode === 'edit' && userForm) {
        // Prepopulate with sample data for demonstration
        const nameInput = userForm.querySelector('#user-fullname');
        const emailInput = userForm.querySelector('#user-email');
        const deptInput = userForm.querySelector('#user-department');
        const roleInput = userForm.querySelector('#user-role');
        const statusInput = userForm.querySelector('#status-active');

        if (nameInput) nameInput.value = trigger.getAttribute('data-user-name') || 'Jane Doe';
        if (emailInput) emailInput.value = trigger.getAttribute('data-user-email') || 'jane.doe@enterprise.corp';
        if (deptInput) deptInput.value = trigger.getAttribute('data-user-dept') || 'Engineering';
        if (roleInput) roleInput.value = trigger.getAttribute('data-user-role') || 'Admin';
        if (statusInput) statusInput.checked = true;
      } else if (userForm) {
        userForm.reset();
        clearAllFormErrors(userForm);
      }

      // Open natively as modal (traps focus and applies backdrop)
      if (typeof modal.showModal === 'function') {
        modal.showModal();
      } else {
        modal.setAttribute('open', '');
      }

      announceToScreenReader(`${modalTitle ? modalTitle.textContent : 'Dialog'} opened`);

      // Focus the first interactive field in the modal
      const firstInput = modal.querySelector('input:not([type="hidden"]), select');
      if (firstInput) firstInput.focus();
    });
  });

  // Close handlers
  closeTriggers.forEach((btn) => {
    btn.addEventListener('click', () => {
      closeModal(modal);
    });
  });

  // Native cancel event (e.g. Esc key pressed)
  modal.addEventListener('cancel', () => {
    announceToScreenReader('Dialog closed');
    restoreFocus();
  });

  // Close when clicking outside the dialog content box (on the backdrop)
  modal.addEventListener('click', (e) => {
    const dialogRect = modal.getBoundingClientRect();
    const isInDialog = (
      dialogRect.top <= e.clientY &&
      e.clientY <= dialogRect.top + dialogRect.height &&
      dialogRect.left <= e.clientX &&
      e.clientX <= dialogRect.left + dialogRect.width
    );
    if (!isInDialog) {
      closeModal(modal);
    }
  });
}

function closeModal(modal) {
  if (typeof modal.close === 'function') {
    modal.close();
  } else {
    modal.removeAttribute('open');
  }
  announceToScreenReader('Dialog closed');
  restoreFocus();
}

function restoreFocus() {
  if (lastFocusedTrigger && typeof lastFocusedTrigger.focus === 'function') {
    lastFocusedTrigger.focus();
    lastFocusedTrigger = null;
  }
}

/**
 * 4. Comprehensive Accessible Client-side Form Validation
 */
function initFormValidation() {
  const forms = document.querySelectorAll('form.accessible-form');

  forms.forEach((form) => {
    // Real-time validation on blur
    form.addEventListener('blur', (e) => {
      if (e.target.matches('input, select, textarea')) {
        validateField(e.target);
      }
    }, true);

    // Clear error on input when corrected
    form.addEventListener('input', (e) => {
      if (e.target.getAttribute('aria-invalid') === 'true') {
        validateField(e.target);
      }
    });

    // Form submit validation
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const fields = form.querySelectorAll('input, select, textarea');
      let isFormValid = true;
      let firstInvalidField = null;

      fields.forEach((field) => {
        const isValid = validateField(field);
        if (!isValid) {
          isFormValid = false;
          if (!firstInvalidField) {
            firstInvalidField = field;
          }
        }
      });

      if (!isFormValid && firstInvalidField) {
        firstInvalidField.focus();
        announceToScreenReader('Form submission failed. Please correct the highlighted errors.');
      } else if (isFormValid) {
        handleSuccessfulSubmit(form);
      }
    });
  });
}

function validateField(field) {
  const errorElement = document.getElementById(`${field.id}-error`);
  let errorMessage = '';

  // Required field check
  if (field.hasAttribute('required')) {
    if (field.type === 'checkbox' && !field.checked) {
      errorMessage = 'You must agree to continue.';
    } else if (field.type === 'radio') {
      const radioGroup = document.getElementsByName(field.name);
      const isChecked = Array.from(radioGroup).some((r) => r.checked);
      if (!isChecked) {
        errorMessage = 'Please select an option.';
      }
    } else if (!field.value.trim()) {
      errorMessage = `${getFieldLabel(field)} is required.`;
    }
  }

  // Type & Pattern checks if not already errored
  if (!errorMessage && field.value.trim()) {
    if (field.type === 'email') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(field.value.trim())) {
        errorMessage = 'Please enter a valid email address (e.g. user@domain.com).';
      }
    } else if (field.type === 'tel') {
      const phoneRegex = /^[0-9+\-\s()]{7,20}$/;
      if (!phoneRegex.test(field.value.trim())) {
        errorMessage = 'Please enter a valid phone number (e.g. +1 555-0199).';
      }
    } else if (field.minLength > 0 && field.value.length < field.minLength) {
      errorMessage = `Must be at least ${field.minLength} characters.`;
    }

    // Password confirmation match check
    if (field.id === 'user-confirm-password') {
      const pwd = document.getElementById('user-password');
      if (pwd && field.value !== pwd.value) {
        errorMessage = 'Passwords do not match.';
      }
    }
  }

  // Update DOM accessibility state
  if (errorMessage) {
    field.setAttribute('aria-invalid', 'true');
    if (errorElement) {
      errorElement.textContent = errorMessage;
    }
    return false;
  } else {
    field.setAttribute('aria-invalid', 'false');
    if (errorElement) {
      errorElement.textContent = '';
    }
    return true;
  }
}

function getFieldLabel(field) {
  const label = document.querySelector(`label[for="${field.id}"]`);
  if (label) {
    // Return text without required asterisk
    return label.childNodes[0].textContent.trim();
  }
  return field.name || 'Field';
}

function clearAllFormErrors(form) {
  const fields = form.querySelectorAll('input, select, textarea');
  fields.forEach((f) => {
    f.removeAttribute('aria-invalid');
    const err = document.getElementById(`${f.id}-error`);
    if (err) err.textContent = '';
  });
}

function handleSuccessfulSubmit(form) {
  const formId = form.id;
  let successMessage = 'Information saved successfully.';

  if (formId === 'user-form') {
    successMessage = 'User record processed and updated successfully.';
    const modal = document.getElementById('user-modal');
    if (modal) {
      closeModal(modal);
    }
    form.reset();
    clearAllFormErrors(form);
  } else if (formId === 'filter-form') {
    successMessage = 'Report filters applied. Table data updated.';
  } else if (formId === 'settings-form') {
    successMessage = 'Preferences saved successfully.';
  }

  showToast(successMessage, 'success');
  announceToScreenReader(successMessage);
}

/**
 * 5. Accessible Toast Notification System
 */
function showToast(message, type = 'info') {
  let toastContainer = document.querySelector('.toast-container');
  if (!toastContainer) {
    toastContainer = document.createElement('section');
    toastContainer.className = 'toast-container';
    toastContainer.setAttribute('aria-label', 'System notifications');
    document.body.appendChild(toastContainer);
  }

  const toast = document.createElement('article');
  toast.className = 'toast';
  toast.setAttribute('role', 'status');
  toast.innerHTML = `
    <span aria-hidden="true" style="font-weight: bold; color: var(--color-primary);">&#10003;</span>
    <p style="margin: 0; font-size: 0.9375rem; font-weight: 600;">${escapeHtml(message)}</p>
  `;

  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 4000);
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * 6. Accessible Table Search, Department Filter, and Actions
 */
function initTableInteractivity() {
  const searchInput = document.getElementById('table-search-input');
  const deptFilter = document.getElementById('table-dept-filter');
  const table = document.querySelector('.data-table');

  if (!table) return;

  const rows = Array.from(table.querySelectorAll('tbody tr'));

  function filterTable() {
    const query = searchInput ? searchInput.value.toLowerCase().trim() : '';
    const dept = deptFilter ? deptFilter.value.toLowerCase().trim() : '';
    let visibleCount = 0;

    rows.forEach((row) => {
      const text = row.textContent.toLowerCase();
      const rowDept = (row.getAttribute('data-dept') || '').toLowerCase();

      const matchesSearch = !query || text.includes(query);
      const matchesDept = !dept || rowDept === dept || dept === 'all';

      if (matchesSearch && matchesDept) {
        row.style.display = '';
        visibleCount++;
      } else {
        row.style.display = 'none';
      }
    });

    announceToScreenReader(`Table filtered. ${visibleCount} matching ${visibleCount === 1 ? 'record' : 'records'} found.`);
  }

  if (searchInput) {
    searchInput.addEventListener('input', debounce(filterTable, 250));
  }

  if (deptFilter) {
    deptFilter.addEventListener('change', filterTable);
  }

  // Row action buttons (Delete confirmation)
  table.addEventListener('click', (e) => {
    const deleteBtn = e.target.closest('[data-action="delete-user"]');
    if (deleteBtn) {
      const userName = deleteBtn.getAttribute('data-user-name') || 'User';
      const confirmed = window.confirm(`Are you sure you want to delete ${userName}? This action cannot be undone.`);
      if (confirmed) {
        const row = deleteBtn.closest('tr');
        if (row) {
          row.remove();
          announceToScreenReader(`${userName} has been removed from the directory.`);
          showToast(`${userName} deleted successfully.`, 'info');
        }
      }
    }
  });

  // Table Column Sort Headers
  const sortHeaders = table.querySelectorAll('th[data-sortable]');
  sortHeaders.forEach((th) => {
    th.setAttribute('tabindex', '0');
    th.setAttribute('role', 'columnheader');
    th.style.cursor = 'pointer';

    const sortAction = () => {
      const colIndex = Array.from(th.parentNode.children).indexOf(th);
      const currentSort = th.getAttribute('aria-sort') || 'none';
      const newSort = currentSort === 'ascending' ? 'descending' : 'ascending';

      sortHeaders.forEach((h) => h.removeAttribute('aria-sort'));
      th.setAttribute('aria-sort', newSort);

      const tbody = table.querySelector('tbody');
      const currentRows = Array.from(tbody.querySelectorAll('tr'));

      currentRows.sort((a, b) => {
        const aText = a.children[colIndex].textContent.trim();
        const bText = b.children[colIndex].textContent.trim();
        return newSort === 'ascending'
          ? aText.localeCompare(bText, undefined, { numeric: true })
          : bText.localeCompare(aText, undefined, { numeric: true });
      });

      currentRows.forEach((r) => tbody.appendChild(r));
      announceToScreenReader(`Table sorted by ${th.textContent.trim()} ${newSort}`);
    };

    th.addEventListener('click', sortAction);
    th.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        sortAction();
      }
    });
  });
}

function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * 7. Accessibility Preferences (Contrast, Theme, Font Size, Motion)
 */
function initAccessibilityPreferences() {
  const contrastToggle = document.getElementById('pref-high-contrast');
  const themeSelect = document.getElementById('pref-theme');
  const fontSelect = document.getElementById('pref-font-size');
  const motionToggle = document.getElementById('pref-reduce-motion');

  // Load stored preferences
  const storedContrast = localStorage.getItem('pref-high-contrast');
  const storedTheme = localStorage.getItem('pref-theme');
  const storedFont = localStorage.getItem('pref-font-size');
  const storedMotion = localStorage.getItem('pref-reduce-motion');

  if (storedContrast === 'true') {
    document.documentElement.setAttribute('data-high-contrast', 'true');
    if (contrastToggle) contrastToggle.checked = true;
  }

  if (storedTheme) {
    document.documentElement.setAttribute('data-theme', storedTheme);
    if (themeSelect) themeSelect.value = storedTheme;
  }

  if (storedFont) {
    document.documentElement.setAttribute('data-font-size', storedFont);
    if (fontSelect) fontSelect.value = storedFont;
  }

  if (storedMotion === 'true') {
    document.documentElement.setAttribute('data-reduce-motion', 'true');
    if (motionToggle) motionToggle.checked = true;
  }

  // Preference Event Listeners
  if (contrastToggle) {
    contrastToggle.addEventListener('change', (e) => {
      const isChecked = e.target.checked;
      if (isChecked) {
        document.documentElement.setAttribute('data-high-contrast', 'true');
        localStorage.setItem('pref-high-contrast', 'true');
        announceToScreenReader('High contrast mode enabled');
      } else {
        document.documentElement.removeAttribute('data-high-contrast');
        localStorage.setItem('pref-high-contrast', 'false');
        announceToScreenReader('High contrast mode disabled');
      }
    });
  }

  if (themeSelect) {
    themeSelect.addEventListener('change', (e) => {
      const val = e.target.value;
      document.documentElement.setAttribute('data-theme', val);
      localStorage.setItem('pref-theme', val);
      announceToScreenReader(`Theme changed to ${val}`);
    });
  }

  if (fontSelect) {
    fontSelect.addEventListener('change', (e) => {
      const val = e.target.value;
      document.documentElement.setAttribute('data-font-size', val);
      localStorage.setItem('pref-font-size', val);
      announceToScreenReader(`Font size changed to ${val}`);
    });
  }

  if (motionToggle) {
    motionToggle.addEventListener('change', (e) => {
      const isChecked = e.target.checked;
      if (isChecked) {
        document.documentElement.setAttribute('data-reduce-motion', 'true');
        localStorage.setItem('pref-reduce-motion', 'true');
        announceToScreenReader('Reduced motion enabled');
      } else {
        document.documentElement.removeAttribute('data-reduce-motion');
        localStorage.setItem('pref-reduce-motion', 'false');
        announceToScreenReader('Standard motion enabled');
      }
    });
  }
}

/**
 * 8. Password Visibility Toggles
 */
function initPasswordToggles() {
  const toggleButtons = document.querySelectorAll('[data-toggle-password]');

  toggleButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-toggle-password');
      const input = document.getElementById(targetId);
      if (!input) return;

      const isPassword = input.type === 'password';
      input.type = isPassword ? 'text' : 'password';

      const isPressed = isPassword;
      btn.setAttribute('aria-pressed', String(isPressed));
      btn.textContent = isPassword ? 'Hide' : 'Show';
      btn.setAttribute('aria-label', `${isPassword ? 'Hide' : 'Show'} ${getFieldLabel(input)}`);

      announceToScreenReader(`Password visibility ${isPassword ? 'shown' : 'hidden'}`);
    });
  });
}
