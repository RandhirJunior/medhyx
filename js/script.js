/**
 * Medhyx Solutions — Enterprise Interactive UI Script
 */

document.addEventListener('DOMContentLoaded', () => {
  // 1. Dynamic Footer Year
  const yearEl = document.getElementById('year');
  if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
  }

  // 2. Mobile Drawer Navigation
  const mobileMenuBtn = document.getElementById('mobileMenuBtn');
  const closeDrawerBtn = document.getElementById('closeDrawerBtn');
  const mobileDrawer = document.getElementById('mobileDrawer');
  const drawerBackdrop = document.getElementById('drawerBackdrop');
  const drawerLinks = document.querySelectorAll('.drawer-link');

  function openDrawer() {
    mobileDrawer.classList.add('open');
    drawerBackdrop.classList.add('active');
    document.body.style.overflow = 'hidden';
    mobileMenuBtn.setAttribute('aria-expanded', 'true');
  }

  function closeDrawer() {
    mobileDrawer.classList.remove('open');
    drawerBackdrop.classList.remove('active');
    document.body.style.overflow = '';
    mobileMenuBtn.setAttribute('aria-expanded', 'false');
  }

  if (mobileMenuBtn && mobileDrawer) {
    mobileMenuBtn.addEventListener('click', openDrawer);
    closeDrawerBtn.addEventListener('click', closeDrawer);
    drawerBackdrop.addEventListener('click', closeDrawer);

    drawerLinks.forEach(link => {
      link.addEventListener('click', closeDrawer);
    });
  }

  // 3. Solutions Matrix Tabs
  const tabButtons = document.querySelectorAll('.solutions-tabs-nav .tab-btn');
  const tabPanels = document.querySelectorAll('.tab-panel');

  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-tab');

      tabButtons.forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
      });
      tabPanels.forEach(p => p.classList.remove('active'));

      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');
      
      const targetPanel = document.getElementById(targetId);
      if (targetPanel) {
        targetPanel.classList.add('active');
      }
    });
  });

  // 4. Technology Stack Filter Bar
  const filterButtons = document.querySelectorAll('.tech-filter-bar .filter-btn');
  const techCards = document.querySelectorAll('.tech-grid .tech-card');

  filterButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      filterButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const filterVal = btn.getAttribute('data-filter');

      techCards.forEach(card => {
        const category = card.getAttribute('data-category');
        if (filterVal === 'all' || category === filterVal) {
          card.style.display = 'flex';
          card.style.animation = 'fadeIn 0.25s ease';
        } else {
          card.style.display = 'none';
        }
      });
    });
  });

  // 5. Contact Form Focus Area Chips
  const chipButtons = document.querySelectorAll('#focusAreaGroup .chip-btn');
  const focusAreaInput = document.getElementById('focusAreaInput');

  chipButtons.forEach(chip => {
    chip.addEventListener('click', () => {
      chipButtons.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      if (focusAreaInput) {
        focusAreaInput.value = chip.getAttribute('data-value');
      }
    });
  });

  // 6. Contact Form Submission (Live via Web3Forms)
  const consultationForm = document.getElementById('consultationForm');
  const formStatus = document.getElementById('formStatus');
  const submitBtn = document.getElementById('submitFormBtn');

  if (consultationForm) {
    consultationForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const nameInput = document.getElementById('clientName');
      const emailInput = document.getElementById('clientEmail');
      const name = nameInput ? nameInput.value.trim() : '';
      const email = emailInput ? emailInput.value.trim() : '';
      const focus = focusAreaInput ? focusAreaInput.value : 'Lakehouse Engineering';

      if (!name || !email) return;

      // Show processing state
      submitBtn.disabled = true;
      const originalBtnHTML = submitBtn.innerHTML;
      submitBtn.innerHTML = '<span>Transmitting Request...</span>';
      formStatus.style.display = 'none';

      try {
        const formData = new FormData(consultationForm);
        formData.set('subject', `[Medhyx Lead] Consultation Request from ${name}`);

        const response = await fetch('https://api.web3forms.com/submit', {
          method: 'POST',
          body: formData
        });

        const data = await response.json();

        if (response.status === 200 && data.success) {
          submitBtn.innerHTML = '<span>Request Delivered ✓</span>';
          formStatus.className = 'form-status success';
          formStatus.style.display = 'block';
          formStatus.innerHTML = `
            <strong>Thank you, ${name}!</strong><br>
            Your inquiry regarding <em>${focus}</em> has been securely sent. A principal cloud data architect will review your project details and reach out to <code>${email}</code> within 1 business day.
          `;

          consultationForm.reset();
          chipButtons.forEach((c, idx) => {
            if (idx === 0) c.classList.add('active');
            else c.classList.remove('active');
          });
          if (focusAreaInput) {
            focusAreaInput.value = 'Lakehouse Engineering';
          }
        } else {
          throw new Error(data.message || 'Submission failed');
        }
      } catch (err) {
        console.error('Submission error:', err);
        submitBtn.innerHTML = originalBtnHTML;
        formStatus.className = 'form-status error';
        formStatus.style.display = 'block';
        formStatus.innerHTML = `
          <strong>Transmission issue encountered.</strong><br>
          Please email us directly at <a href="mailto:hello@medhyx.com" style="color: #60a5fa; text-decoration: underline;">hello@medhyx.com</a>.
        `;
      } finally {
        submitBtn.disabled = false;
      }
    });
  }

  // 7. Live Telemetry Realistic Simulator
  const teleLatency = document.getElementById('teleLatency');
  const teleThroughput = document.getElementById('teleThroughput');

  if (teleLatency && teleThroughput) {
    setInterval(() => {
      const lat = Math.floor(21 + Math.random() * 8);
      const tp = (1.75 + Math.random() * 0.25).toFixed(2);
      teleLatency.textContent = `${lat} ms`;
      teleThroughput.textContent = `${tp} GB/s`;
    }, 3500);
  }

  // 8. Animated Counters via IntersectionObserver
  const counterElements = document.querySelectorAll('.counter');
  let counted = false;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting && !counted) {
        counted = true;
        counterElements.forEach(el => {
          const target = parseFloat(el.getAttribute('data-target'));
          const isDecimal = String(target).includes('.');
          let current = 0;
          const step = target / 40;
          const interval = setInterval(() => {
            current += step;
            if (current >= target) {
              current = target;
              clearInterval(interval);
            }
            el.textContent = isDecimal ? current.toFixed(2) : Math.floor(current);
          }, 30);
        });
      }
    });
  }, { threshold: 0.4 });

  const metricsSection = document.querySelector('.metrics-strip');
  if (metricsSection) {
    observer.observe(metricsSection);
  }
});