/* Medhyx Solutions — shared site behaviour. Each block only runs if its elements exist on the page. */
(function () {
  'use strict';

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  // Clean URLs: show /contact instead of /contact.html
  if (location.pathname.endsWith('.html')) {
    const clean = location.pathname.replace(/\/index\.html$/, '/').replace(/\.html$/, '');
    history.replaceState(null, '', clean + location.search + location.hash);
  }

  $$('[data-year]').forEach(el => { el.textContent = new Date().getFullYear(); });

  // Header border once the page scrolls
  const header = $('.site-header');
  if (header) {
    const onScroll = () => header.classList.toggle('scrolled', window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  // Mobile menu
  const menuToggle = $('#menuToggle');
  const mobileMenu = $('#mobileMenu');
  if (menuToggle && mobileMenu) {
    menuToggle.addEventListener('click', () => {
      const open = mobileMenu.classList.toggle('open');
      menuToggle.setAttribute('aria-expanded', String(open));
    });
  }

  // FAQ accordion (one open at a time)
  $$('.faq-item').forEach(item => {
    const q = $('.faq-q', item);
    q.addEventListener('click', () => {
      const wasOpen = item.classList.contains('open');
      $$('.faq-item.open').forEach(other => {
        other.classList.remove('open');
        $('.faq-q', other).setAttribute('aria-expanded', 'false');
      });
      if (!wasOpen) {
        item.classList.add('open');
        q.setAttribute('aria-expanded', 'true');
      }
    });
  });

  // Testimonials
  $$('[data-quotes]').forEach(block => {
    const slides = $$('.quote-slide', block);
    const dotsWrap = $('.quote-dots', block);
    if (slides.length < 2) return;
    let index = 0;
    const dots = slides.map((_, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('aria-label', `Show testimonial ${i + 1}`);
      b.addEventListener('click', () => show(i));
      dotsWrap.appendChild(b);
      return b;
    });
    function show(i) {
      index = (i + slides.length) % slides.length;
      slides.forEach((s, n) => s.classList.toggle('active', n === index));
      dots.forEach((d, n) => d.classList.toggle('active', n === index));
    }
    $('[data-prev]', block).addEventListener('click', () => show(index - 1));
    $('[data-next]', block).addEventListener('click', () => show(index + 1));
    show(0);
  });

  // Single-choice option groups (matcher, calculator, form choices)
  $$('[data-options]').forEach(group => {
    group.addEventListener('click', e => {
      const btn = e.target.closest('.option-btn');
      if (!btn) return;
      $$('.option-btn', group).forEach(b => { b.classList.remove('active'); b.setAttribute('aria-pressed', 'false'); });
      btn.classList.add('active');
      btn.setAttribute('aria-pressed', 'true');
      group.dispatchEvent(new CustomEvent('change', { detail: btn.dataset }));
    });
  });
  const activeValue = (group, key) => { const b = $('.option-btn.active', group); return b ? b.dataset[key] : undefined; };

  // Highlight the jump-nav link for the section in view
  const jumpLinks = $$('.jump-nav a');
  if (jumpLinks.length && 'IntersectionObserver' in window) {
    const byId = new Map(jumpLinks.map(a => [a.getAttribute('href').slice(1), a]));
    const io = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        jumpLinks.forEach(a => a.classList.remove('active'));
        byId.get(entry.target.id)?.classList.add('active');
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    byId.forEach((_, id) => { const el = document.getElementById(id); if (el) io.observe(el); });
  }

  // Solution matcher
  const matcher = $('[data-matcher]');
  if (matcher) {
    const BLUEPRINTS = {
      'legacy_sql-cost': ['Phased medallion lakehouse migration with serverless auto-shutdown', 'Migrate on-premises SQL workloads into Delta Lake with serverless auto-scaling clusters, cutting legacy licensing and idle compute spend by up to 45%.'],
      'legacy_sql-speed': ['Photon-accelerated Delta lakehouse with partition compaction', 'Modernize transactional schemas into Delta Parquet with Z-Order clustering and Databricks Photon compute to accelerate analytic queries 5–10x.'],
      'legacy_sql-streaming': ['Change data capture with Kafka and Spark Structured Streaming', 'Automated Debezium or ADF CDC connectors feed raw tables directly into Delta Lake bronze layers with sub-30-second propagation.'],
      'legacy_sql-ai': ['Feature store and enterprise vector search with Azure OpenAI', 'Ingest enterprise text and metrics into Azure AI Search vector embeddings and conformed feature stores for real-time RAG applications.'],
      'azure_synapse-cost': ['Microsoft Fabric OneLake and Direct Lake migration', 'Move heavy Synapse dedicated pools to Fabric OneLake in Direct Lake mode, eliminating ETL synchronization costs and redundant compute.'],
      'azure_synapse-speed': ['Direct Lake semantic models on Microsoft Fabric', 'Replace Power BI import-mode refreshes by querying OneLake Delta tables in memory through Direct Lake for sub-second dashboards.'],
      'azure_synapse-streaming': ['Fabric Real-Time Analytics and Eventhouse stream processing', 'KQL databases and Eventstream pipelines for continuous, high-throughput event ingestion and real-time dashboards.'],
      'azure_synapse-ai': ['Azure Machine Learning and OpenAI model serving on OneLake', 'Connect Azure OpenAI endpoints to Fabric data engineering pipelines for automated summaries and semantic classification.'],
      'databricks-cost': ['FinOps engine: cluster rightsizing and spot guardrails', 'Refactor unoptimized Databricks clusters into spot-instance pools with auto-termination policies to recover 30–50% of wasted monthly DBU spend.'],
      'databricks-speed': ['Liquid Clustering, Delta 3.0 and PySpark vectorization', 'Upgrade Delta tables to Delta 3.0 with Liquid Clustering and refactor slow Python loops into distributed PySpark operations.'],
      'databricks-streaming': ['Delta Live Tables streaming with Unity Catalog', 'Self-healing Delta Live Tables with built-in expectations, automated schema evolution and declarative pipeline governance.'],
      'databricks-ai': ['Mosaic AI, MLflow registry and RAG architecture', 'Databricks Model Serving with MLflow governance, LangChain retrieval and automated LLM drift evaluation.'],
      'snowflake-cost': ['Snowflake warehouse rightsizing and Iceberg tables', 'Tune auto-suspend timers, eliminate remote spilling and adopt open Apache Iceberg tables to avoid proprietary storage lock-in.'],
      'snowflake-speed': ['Dynamic Tables, search optimization and clustering keys', 'Snowflake Dynamic Tables with incremental refreshes and the search optimization service for sub-second queries.'],
      'snowflake-streaming': ['Snowpipe Streaming with Apache Kafka', 'Ingest event payloads with sub-second latency directly into analytics-ready staging tables using Snowpipe Streaming.'],
      'snowflake-ai': ['Snowflake Cortex AI and vector search', 'Serverless LLMs and vector search running inside Snowflake Cortex, so sensitive data never leaves the perimeter.'],
    };
    const platform = $('[data-matcher-platform]', matcher);
    const goal = $('[data-matcher-goal]', matcher);
    const update = () => {
      const [title, desc] = BLUEPRINTS[`${activeValue(platform, 'value')}-${activeValue(goal, 'value')}`] || BLUEPRINTS['legacy_sql-cost'];
      $('[data-matcher-title]', matcher).textContent = title;
      $('[data-matcher-desc]', matcher).textContent = desc;
    };
    platform.addEventListener('change', update);
    goal.addEventListener('change', update);
    update();
  }

  // Medallion layer explorer
  const medallion = $('[data-medallion]');
  if (medallion) {
    const LAYERS = {
      bronze: {
        tag: 'Bronze layer · append-only source fidelity',
        title: 'Raw event and batch ingestion',
        desc: 'Preserves raw source history with no transformation loss. Streaming events from Kafka and batch CDC extracts from SQL servers land immutably in Azure Data Lake Gen2 in Delta Lake format.',
        format: 'Delta Parquet (Snappy compressed)', pattern: 'Structured Streaming / Auto Loader CDC', sla: 'Under 30 seconds latency',
        file: 'pyspark_bronze_ingest.py',
        code: `# Production bronze append stream
spark.readStream \\
  .format("cloudFiles") \\
  .option("cloudFiles.format", "json") \\
  .option("cloudFiles.schemaLocation", "/mnt/schemas/bronze") \\
  .load("/mnt/raw-events/") \\
  .writeStream \\
  .format("delta") \\
  .outputMode("append") \\
  .option("checkpointLocation", "/mnt/checkpoints/bronze") \\
  .trigger(availableNow=True) \\
  .toTable("enterprise_lake.bronze_events")`,
      },
      silver: {
        tag: 'Silver layer · cleansed and conformed models',
        title: 'Validated, de-duplicated and enriched records',
        desc: 'Enforces schemas, standardizes formats, de-duplicates events and masks personal data. This is the trusted tier for cross-functional analytics.',
        format: 'Delta Lake with Z-Order clustering', pattern: 'dbt transformations and PySpark', sla: 'Zero data quality regressions',
        file: 'pyspark_silver_merge.py',
        code: `# Production silver upsert (SCD Type 2)
from delta.tables import DeltaTable

target = DeltaTable.forName(spark, "enterprise_lake.silver_customers")
target.alias("target").merge(
    source=df_bronze_staged.alias("updates"),
    condition="target.customer_id = updates.customer_id AND target.is_current = true",
).whenMatchedUpdate(set={
    "is_current": "false",
    "valid_to": "updates.event_timestamp",
}).whenNotMatchedInsert(values={
    "customer_id": "updates.customer_id",
    "account_tier": "updates.account_tier",
    "is_current": "true",
    "valid_from": "updates.event_timestamp",
}).execute()`,
      },
      gold: {
        tag: 'Gold layer · curated business and AI metrics',
        title: 'High-concurrency aggregates and semantic models',
        desc: 'Pre-aggregated star schemas, data marts and curated feature tables that power Power BI Direct Lake reports and real-time ML inference.',
        format: 'Photon-optimized Delta tables', pattern: 'Star schema and feature store', sla: 'Sub-second query latency',
        file: 'pyspark_gold_metrics.py',
        code: `# Curated gold aggregation
gold_revenue = (
    spark.table("enterprise_lake.silver_orders")
    .filter("order_status = 'COMPLETED'")
    .groupBy("region", "product_category", "quarter")
    .agg(
        F.sum("net_amount").alias("total_revenue"),
        F.countDistinct("customer_id").alias("active_buyers"),
    )
)

gold_revenue.write.format("delta").mode("overwrite") \\
    .saveAsTable("enterprise_lake.gold_revenue_kpi")`,
      },
    };
    const tabs = $$('[data-layer]', medallion);
    const set = (layer) => {
      const d = LAYERS[layer];
      tabs.forEach(t => { const on = t.dataset.layer === layer; t.classList.toggle('active', on); t.setAttribute('aria-selected', String(on)); });
      for (const key of ['tag', 'title', 'desc', 'format', 'pattern', 'sla', 'file', 'code']) {
        $(`[data-med="${key}"]`, medallion).textContent = d[key];
      }
    };
    tabs.forEach(t => t.addEventListener('click', () => set(t.dataset.layer)));
    set('bronze');
  }

  // Technology filter
  const techFilter = $('[data-tech-filter]');
  if (techFilter) {
    const items = $$('.tech-item');
    techFilter.addEventListener('click', e => {
      const btn = e.target.closest('button[data-filter]');
      if (!btn) return;
      $$('button', techFilter).forEach(b => b.classList.toggle('active', b === btn));
      items.forEach(item => { item.hidden = btn.dataset.filter !== 'all' && item.dataset.category !== btn.dataset.filter; });
    });
  }

  // Cloud savings calculator
  const calc = $('[data-calc]');
  if (calc) {
    const BLUEPRINT = {
      Databricks: 'Delta Lake medallion with Databricks serverless autoscaling, Photon runtime optimization and automated spot-cluster fallback.',
      Fabric: 'Microsoft Fabric OneLake with Direct Lake semantic models and automated Delta file maintenance.',
      AzureADF: 'Azure Data Lake Gen2 storage tiering (hot to archive) with parallelized Azure Data Factory pipelines.',
      Snowflake: 'Snowflake warehouse auto-suspend tuning, multi-cluster concurrency limits and open Iceberg tables.',
    };
    const range = $('input[type="range"]', calc);
    const platformGroup = $('[data-calc-platform]', calc);
    const objectiveGroup = $('[data-calc-objective]', calc);
    const money = n => '$' + Math.round(n).toLocaleString('en-US');
    const render = () => {
      const spend = Number(range.value);
      const ratio = Number(activeValue(objectiveGroup, 'ratio'));
      const monthly = spend * ratio;
      $('[data-out="spend"]', calc).textContent = `${money(spend)} / mo`;
      $('[data-out="annual"]', calc).textContent = money(monthly * 12);
      $('[data-out="monthly"]', calc).textContent = money(monthly);
      $('[data-out="speed"]', calc).textContent = `${activeValue(objectiveGroup, 'speed')}x`;
      $('[data-out="blueprint"]', calc).textContent = BLUEPRINT[activeValue(platformGroup, 'platform')];
    };
    range.addEventListener('input', render);
    platformGroup.addEventListener('change', render);
    objectiveGroup.addEventListener('change', render);
    render();
  }

  // Contact form focus-area choice feeds a hidden field
  const focusGroup = $('[data-focus-area]');
  if (focusGroup) {
    focusGroup.addEventListener('change', e => { $('#focusAreaInput').value = e.detail.value; });
  }

  // Careers: "Apply" buttons pre-select the role and jump to the form
  $$('[data-apply-role]').forEach(btn => btn.addEventListener('click', () => {
    const select = $('#appliedRoleSelect');
    if (select) select.value = btn.dataset.applyRole;
    $('#apply')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setTimeout(() => $('#candName')?.focus({ preventScroll: true }), 600);
  }));

  // Web3Forms submissions (contact + careers)
  const escapeHtml = str => { const d = document.createElement('div'); d.textContent = str; return d.innerHTML; };
  $$('form[data-web3form]').forEach(form => {
    const status = $('.form-status', form);
    const submit = $('button[type="submit"]', form);
    form.addEventListener('submit', async e => {
      e.preventDefault();
      if (!form.reportValidity()) return;
      const data = Object.fromEntries(new FormData(form));
      const kind = form.dataset.web3form;
      data.subject = kind === 'careers'
        ? `[Medhyx Job Application] ${data.candidate_name} - ${data.target_role} (${data.experience})`
        : `[Medhyx Lead] Consultation request from ${data.name}`;
      const label = submit.textContent;
      submit.disabled = true;
      submit.textContent = 'Sending…';
      status.className = 'form-status';
      try {
        const res = await fetch('https://api.web3forms.com/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify(data),
        });
        const json = await res.json();
        if (!res.ok || !json.success) throw new Error(json.message || 'Submission failed');
        status.innerHTML = kind === 'careers'
          ? `<strong>Application received.</strong> Thank you, ${escapeHtml(data.candidate_name)}. Our engineering team reviews every application and will contact you at ${escapeHtml(data.email)}.`
          : `<strong>Thank you, ${escapeHtml(data.name)}.</strong> A principal engineer will review your request and reply to ${escapeHtml(data.email)} within one business day.`;
        status.className = 'form-status success show';
        form.reset();
        $$('[data-options]', form).forEach(g => { $$('.option-btn', g).forEach((b, i) => b.classList.toggle('active', i === 0)); });
        if ($('#focusAreaInput', form)) $('#focusAreaInput', form).value = $('.option-btn', form)?.dataset.value || '';
      } catch (err) {
        console.error('Form submission error:', err);
        status.innerHTML = `<strong>Sorry, something went wrong.</strong> Please email us directly at <a href="mailto:${kind === 'careers' ? 'careers' : 'hello'}@medhyx.com">${kind === 'careers' ? 'careers' : 'hello'}@medhyx.com</a>.`;
        status.className = 'form-status error show';
      } finally {
        submit.disabled = false;
        submit.textContent = label;
      }
    });
  });

  // ---------- AI motion layer ----------
  const reduceMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const hasIO = 'IntersectionObserver' in window;

  // Neural-network canvas: drifting nodes, links, travelling data pulses, cursor attraction.
  function neuralNetwork(host, { density = 1, pulses = 6, interactive = false } = {}) {
    const canvas = document.createElement('canvas');
    canvas.className = 'neural-bg';
    canvas.setAttribute('aria-hidden', 'true');
    const ctx = canvas.getContext && canvas.getContext('2d');
    if (!ctx) return;
    host.prepend(canvas);
    const LINK = 150;
    const mouse = { x: -9999, y: -9999 };
    let w = 0, h = 0, nodes = [], packets = [], running = false, inView = !hasIO;

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = host.clientWidth; h = host.clientHeight;
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.round(Math.min(150, Math.max(34, (w * h) / 9500)) * density);
      nodes = Array.from({ length: count }, () => ({
        x: Math.random() * w, y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.3, vy: (Math.random() - 0.5) * 0.3,
        r: Math.random() * 1.6 + 0.7,
      }));
      packets = [];
    }

    function draw(step) {
      ctx.clearRect(0, 0, w, h);
      if (step) {
        for (const n of nodes) {
          n.x += n.vx; n.y += n.vy;
          if (n.x < 0 || n.x > w) n.vx *= -1;
          if (n.y < 0 || n.y > h) n.vy *= -1;
        }
      }
      ctx.lineWidth = 1;
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j];
          const dx = a.x - b.x, dy = a.y - b.y, d2 = dx * dx + dy * dy;
          if (d2 < LINK * LINK) {
            ctx.strokeStyle = `rgba(120, 175, 255, ${(1 - Math.sqrt(d2) / LINK) * 0.42})`;
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
          }
        }
        if (interactive) {
          const mx = a.x - mouse.x, my = a.y - mouse.y, m2 = mx * mx + my * my;
          if (m2 < 170 * 170) {
            ctx.strokeStyle = `rgba(26, 163, 220, ${(1 - Math.sqrt(m2) / 170) * 0.7})`;
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(mouse.x, mouse.y); ctx.stroke();
          }
        }
      }
      for (const n of nodes) {
        ctx.fillStyle = 'rgba(180, 218, 255, 0.95)';
        ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2); ctx.fill();
      }
      if (!step) return;
      if (packets.length < pulses && Math.random() < 0.09) {
        const a = nodes[(Math.random() * nodes.length) | 0];
        const near = nodes.filter(b => b !== a && (a.x - b.x) ** 2 + (a.y - b.y) ** 2 < LINK * LINK);
        if (near.length) packets.push({ a, b: near[(Math.random() * near.length) | 0], t: 0 });
      }
      packets = packets.filter(p => p.t <= 1);
      for (const p of packets) {
        p.t += 0.018;
        const x = p.a.x + (p.b.x - p.a.x) * p.t, y = p.a.y + (p.b.y - p.a.y) * p.t;
        const g = ctx.createRadialGradient(x, y, 0, x, y, 9);
        g.addColorStop(0, 'rgba(130, 225, 255, 0.95)');
        g.addColorStop(1, 'rgba(130, 225, 255, 0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 9, 0, Math.PI * 2); ctx.fill();
      }
    }

    function loop() {
      if (!running) return;
      draw(true);
      requestAnimationFrame(loop);
    }
    function update() {
      const should = inView && !document.hidden && !reduceMotion;
      if (should && !running) { running = true; requestAnimationFrame(loop); }
      if (!should) running = false;
    }

    resize();
    draw(false);
    if (reduceMotion) return;
    let resizeTimer;
    window.addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(() => { resize(); draw(false); }, 200); });
    document.addEventListener('visibilitychange', update);
    if (hasIO) new IntersectionObserver(([e]) => { inView = e.isIntersecting; update(); }).observe(host);
    if (interactive) {
      host.addEventListener('pointermove', e => { const r = host.getBoundingClientRect(); mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; });
      host.addEventListener('pointerleave', () => { mouse.x = mouse.y = -9999; });
    }
    update();
  }
  $$('.hero').forEach(el => neuralNetwork(el, { density: 1, pulses: 8, interactive: true }));
  $$('.page-hero').forEach(el => neuralNetwork(el, { density: 0.6, pulses: 4 }));

  // Typing badge
  $$('[data-typer]').forEach(el => {
    const words = JSON.parse(el.dataset.typer);
    if (reduceMotion || words.length < 2) return;
    let wi = 0, ci = words[0].length, deleting = true;
    const tick = () => {
      const word = words[wi];
      ci += deleting ? -1 : 1;
      el.textContent = word.slice(0, ci);
      let delay = deleting ? 32 : 65;
      if (!deleting && ci === word.length) { deleting = true; delay = 1800; }
      else if (deleting && ci === 0) { deleting = false; wi = (wi + 1) % words.length; delay = 350; }
      setTimeout(tick, delay);
    };
    setTimeout(tick, 2200);
  });

  // Honeycomb wave order
  $$('.hex').forEach((hex, i) => hex.style.setProperty('--i', i));

  if (!reduceMotion && hasIO) {
    // Count-up stats
    const counters = $$('.stat-value');
    const countIO = new IntersectionObserver(entries => entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      countIO.unobserve(entry.target);
      const el = entry.target, final = el.textContent.trim();
      const m = final.match(/^([\d.]+)(.*)$/);
      if (!m) return;
      const target = parseFloat(m[1]), decimals = (m[1].split('.')[1] || '').length, start = performance.now();
      const step = now => {
        const p = Math.min(1, (now - start) / 1600), eased = 1 - Math.pow(1 - p, 3);
        el.textContent = p < 1 ? (target * eased).toFixed(decimals) + m[2] : final;
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }), { threshold: 0.4 });
    counters.forEach(c => countIO.observe(c));

    // Scroll reveal
    const revealTargets = $$('.section-head, .intro-grid, .p-card, .principle, .panel, .hex-row, .faq-item, .phase, .tech-item, .case, .job, .feature-list li, .aside-box, .tool, .calc, .form-card, .contact-list li, .call-card, .perks li, .figure-card, .quote-block, .certs, .layer-detail, .stat');
    revealTargets.forEach(el => {
      const siblings = [...el.parentElement.children];
      el.style.setProperty('--d', `${(siblings.indexOf(el) % 6) * 90}ms`);
      el.classList.add('reveal');
    });
    const revealIO = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add('in'); revealIO.unobserve(entry.target); }
    }), { rootMargin: '0px 0px -6% 0px' });
    revealTargets.forEach(el => revealIO.observe(el));
  }

  if (!reduceMotion) {
    // Cursor spotlight on dark surfaces
    $$('.dark, .hero, .page-hero, .cta-band').forEach(el => {
      el.addEventListener('pointermove', e => {
        const r = el.getBoundingClientRect();
        el.style.setProperty('--mx', `${e.clientX - r.left}px`);
        el.style.setProperty('--my', `${e.clientY - r.top}px`);
      });
      el.addEventListener('pointerleave', () => { el.style.removeProperty('--mx'); el.style.removeProperty('--my'); });
    });

    // 3D tilt on cards (mouse only)
    if (window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
      $$('.p-card, .tech-item, .case').forEach(card => {
        card.classList.add('tilt');
        const max = card.classList.contains('case') ? 3 : 7;
        card.addEventListener('pointermove', e => {
          const r = card.getBoundingClientRect();
          const px = (e.clientX - r.left) / r.width - 0.5, py = (e.clientY - r.top) / r.height - 0.5;
          card.style.transform = `perspective(900px) rotateX(${(-py * max).toFixed(2)}deg) rotateY(${(px * max).toFixed(2)}deg) translateY(-4px)`;
        });
        card.addEventListener('pointerleave', () => { card.style.transform = ''; });
      });
    }

    // "Decoding" effect on section labels as they appear
    if (hasIO) {
      const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&*+<>/';
      const decodeIO = new IntersectionObserver(entries => entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        decodeIO.unobserve(entry.target);
        const el = entry.target, final = el.textContent;
        el.setAttribute('aria-label', final);
        const start = performance.now(), dur = 700;
        const step = now => {
          const p = Math.min(1, (now - start) / dur), reveal = Math.floor(p * final.length);
          el.textContent = final.split('').map((ch, i) => (i < reveal || ch === ' ' ? ch : GLYPHS[(Math.random() * GLYPHS.length) | 0])).join('');
          if (p < 1) requestAnimationFrame(step); else el.textContent = final;
        };
        requestAnimationFrame(step);
      }), { threshold: 0.6 });
      $$('.eyebrow').forEach(el => { if (el.children.length === 0) decodeIO.observe(el); });
    }
  }

  // ---------- Sci-fi cinematic layer ----------

  // Boot sequence: first page of a session only (class set by an inline script in <head>)
  const root = document.documentElement;
  if (root.classList.contains('booting')) {
    try { sessionStorage.setItem('mx-boot', '1'); } catch (e) { /* storage blocked: boot shows each page */ }
    const boot = document.createElement('div');
    boot.className = 'boot';
    boot.setAttribute('aria-hidden', 'true');
    boot.innerHTML = '<div class="boot-scan"></div><div class="boot-inner"><img class="boot-logo" src="/images/medhyx-logo-light.png" alt=""><div class="boot-lines"></div><div class="boot-bar"><span></span></div><div class="boot-skip">Click to skip</div></div>';
    document.body.appendChild(boot);
    const lines = ['initializing medhyx data platform', 'connecting lakehouse layers', 'calibrating ai core', 'systems ready'];
    const box = $('.boot-lines', boot);
    let li = 0, finished = false;
    const typeLine = () => {
      if (finished || li >= lines.length) return;
      const row = document.createElement('div');
      row.className = 'boot-line';
      box.appendChild(row);
      const text = '> ' + lines[li];
      let ci = 0;
      const t = setInterval(() => {
        row.textContent = text.slice(0, ++ci);
        if (ci >= text.length) { clearInterval(t); row.classList.add('done'); li++; setTimeout(typeLine, 90); }
      }, 13);
    };
    typeLine();
    const finish = () => {
      if (finished) return;
      finished = true;
      boot.classList.add('out');
      root.classList.remove('booting');
      setTimeout(() => boot.remove(), 900);
    };
    boot.addEventListener('click', finish);
    document.addEventListener('keydown', e => { if (e.key === 'Escape') finish(); });
    setTimeout(finish, 2300);
  }

  // Tron floor + HUD frame in the home hero
  $$('.hero').forEach(hero => {
    const floor = document.createElement('div');
    floor.className = 'hero-floor';
    floor.setAttribute('aria-hidden', 'true');
    hero.prepend(floor);
    const visual = $('.hero-visual', hero);
    if (visual) {
      visual.insertAdjacentHTML('afterbegin',
        '<span class="hud-corner tl" aria-hidden="true"></span><span class="hud-corner tr" aria-hidden="true"></span>' +
        '<span class="hud-corner bl" aria-hidden="true"></span><span class="hud-corner br" aria-hidden="true"></span>' +
        '<span class="hud-label left" aria-hidden="true"><i></i>Live architecture</span>' +
        '<span class="hud-label right" aria-hidden="true">Lakehouse · AI · BI</span>');
    }
  });

  // Periodic hologram glitch on the hero headline
  if (!reduceMotion) {
    const glitchTarget = $('.hero h1 .line');
    if (glitchTarget) {
      setInterval(() => {
        if (document.hidden || root.classList.contains('booting')) return;
        glitchTarget.classList.add('glitching');
        setTimeout(() => glitchTarget.classList.remove('glitching'), 520);
      }, 6500);
    }
  }

  // Holographic globe with data arcs from New Delhi
  function holoGlobe(host) {
    const canvas = document.createElement('canvas');
    canvas.className = 'globe-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    const ctx = canvas.getContext && canvas.getContext('2d');
    if (!ctx) return;
    host.prepend(canvas);
    const toVec = (lat, lon) => {
      const phi = (lat * Math.PI) / 180, lam = (lon * Math.PI) / 180;
      return [Math.cos(phi) * Math.sin(lam), Math.sin(phi), Math.cos(phi) * Math.cos(lam)];
    };
    const N = 900, dots = [];
    for (let i = 0; i < N; i++) {
      const y = 1 - (i / (N - 1)) * 2, r = Math.sqrt(1 - y * y), th = Math.PI * (3 - Math.sqrt(5)) * i;
      dots.push([Math.cos(th) * r, y, Math.sin(th) * r]);
    }
    const hub = toVec(28.6, 77.2);
    const cities = [[40.7, -74.0], [51.5, -0.1], [50.1, 8.7], [25.2, 55.3], [1.35, 103.8], [-33.9, 151.2]].map(([a, b]) => toVec(a, b));
    const arcs = cities.map((c, i) => ({ to: c, offset: i / cities.length }));
    let size = 0, rot = 0, running = false, inView = !hasIO;

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      size = window.innerWidth > 1080 ? Math.min(680, host.clientHeight * 1.25) : Math.min(560, host.clientWidth * 0.95);
      canvas.width = Math.round(size * dpr); canvas.height = Math.round(size * dpr);
      canvas.style.width = size + 'px'; canvas.style.height = size + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    const tilt = 0.32;
    function project(v) {
      const cr = Math.cos(rot), sr = Math.sin(rot);
      let x = v[0] * cr + v[2] * sr, z = -v[0] * sr + v[2] * cr, y = v[1];
      const ct = Math.cos(tilt), st = Math.sin(tilt);
      const y2 = y * ct - z * st, z2 = y * st + z * ct;
      const R = size * 0.42;
      return [size / 2 + x * R, size / 2 - y2 * R, z2];
    }
    function slerp(a, b, t) {
      const dot = Math.max(-1, Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2])), om = Math.acos(dot), so = Math.sin(om) || 1;
      const k1 = Math.sin((1 - t) * om) / so, k2 = Math.sin(t * om) / so, lift = 1 + Math.sin(Math.PI * t) * 0.18;
      return [(a[0] * k1 + b[0] * k2) * lift, (a[1] * k1 + b[1] * k2) * lift, (a[2] * k1 + b[2] * k2) * lift];
    }
    function draw(time) {
      ctx.clearRect(0, 0, size, size);
      const g = ctx.createRadialGradient(size / 2, size / 2, size * 0.2, size / 2, size / 2, size * 0.5);
      g.addColorStop(0, 'rgba(43, 95, 217, 0.10)'); g.addColorStop(1, 'rgba(43, 95, 217, 0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, size, size);
      for (const d of dots) {
        const [x, y, z] = project(d);
        ctx.fillStyle = z > 0 ? `rgba(143, 200, 255, ${0.35 + z * 0.55})` : 'rgba(143, 200, 255, 0.08)';
        ctx.fillRect(x, y, z > 0 ? 1.6 : 1.1, z > 0 ? 1.6 : 1.1);
      }
      const t0 = (time / 2600) % 1;
      for (const arc of arcs) {
        ctx.beginPath();
        let started = false;
        for (let i = 0; i <= 40; i++) {
          const [x, y, z] = project(slerp(hub, arc.to, i / 40));
          if (z < -0.05) { started = false; continue; }
          if (!started) { ctx.moveTo(x, y); started = true; } else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = 'rgba(111, 208, 247, 0.45)'; ctx.lineWidth = 1.2; ctx.stroke();
        const tt = (t0 + arc.offset) % 1, [px, py, pz] = project(slerp(hub, arc.to, tt));
        if (pz > -0.05) {
          const pg = ctx.createRadialGradient(px, py, 0, px, py, 7);
          pg.addColorStop(0, 'rgba(160, 235, 255, 1)'); pg.addColorStop(1, 'rgba(160, 235, 255, 0)');
          ctx.fillStyle = pg; ctx.beginPath(); ctx.arc(px, py, 7, 0, Math.PI * 2); ctx.fill();
        }
        const [cx, cy, cz] = project(arc.to);
        if (cz > 0) { ctx.fillStyle = 'rgba(155, 123, 255, 0.95)'; ctx.beginPath(); ctx.arc(cx, cy, 2.6, 0, Math.PI * 2); ctx.fill(); }
      }
      const [hx, hy, hz] = project(hub);
      if (hz > 0) {
        const pulse = 4 + Math.sin(time / 300) * 2;
        ctx.strokeStyle = 'rgba(224, 97, 75, 0.9)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(hx, hy, pulse + 3, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = '#ff8a6b'; ctx.beginPath(); ctx.arc(hx, hy, 3.2, 0, Math.PI * 2); ctx.fill();
      }
    }
    function loop(time) { if (!running) return; rot += 0.0025; draw(time); requestAnimationFrame(loop); }
    function update() {
      const should = inView && !document.hidden && !reduceMotion;
      if (should && !running) { running = true; requestAnimationFrame(loop); }
      if (!should) running = false;
    }
    rot = -1.35; // start with India facing the viewer
    resize(); draw(0);
    if (reduceMotion) return;
    window.addEventListener('resize', () => { resize(); draw(0); });
    document.addEventListener('visibilitychange', update);
    if (hasIO) new IntersectionObserver(([e]) => { inView = e.isIntersecting; update(); }).observe(host);
    update();
  }
  $$('.cta-band').forEach(holoGlobe);

  // Legal modal
  const LEGAL = {
    privacy: {
      title: 'Privacy Policy',
      html: `
        <h4>1. Commitment to data privacy</h4>
        <p>Medhyx Solutions does not sell, rent or trade personal or corporate information. Contact and application submissions are used only for business engagement, consultation and recruitment.</p>
        <h4>2. Data collection and usage</h4>
        <p>Information submitted through our consultation or candidate application forms (such as names, work emails, phone numbers and technical background) is used to evaluate project scopes, schedule discovery sessions and assess applications.</p>
        <h4>3. Security and retention</h4>
        <p>All web traffic is encrypted with TLS. We retain personal data only for as long as needed for the purpose it was collected.</p>
        <h4>4. Contact</h4>
        <p>For data removal requests or privacy questions, email <a href="mailto:hello@medhyx.com">hello@medhyx.com</a>.</p>`,
    },
    terms: {
      title: 'Terms of Engagement',
      html: `
        <h4>1. Scope of services</h4>
        <p>Medhyx Solutions provides enterprise cloud engineering, lakehouse architecture, FinOps assessment and technical consultancy. Roadmaps and deliverables follow industry best practice.</p>
        <h4>2. Intellectual property</h4>
        <p>All custom code, infrastructure as code (Terraform), pipeline configurations and architecture models produced during paid engagements belong exclusively to the client upon milestone settlement.</p>
        <h4>3. Mutual confidentiality</h4>
        <p>We sign standard Non-Disclosure Agreements before accessing internal repositories, architecture diagrams or cloud environments.</p>
        <h4>4. Governing terms</h4>
        <p>Each engagement is governed by its master services agreement (MSA) and statement of work.</p>`,
    },
    security: {
      title: 'Security Posture',
      html: `
        <h4>1. Zero-trust access</h4>
        <p>Our engineers access client environments only through client-managed identities, multi-factor authentication and least-privilege role-based access control. Client production data is never downloaded to local workstations.</p>
        <h4>2. Cloud isolation and compliance</h4>
        <p>Deployments run inside client cloud subscriptions, with encryption at rest (AES-256) and in transit (TLS), aligned with SOC 2, HIPAA and GDPR guidelines.</p>
        <h4>3. Infrastructure as code</h4>
        <p>Deployments are codified and reviewed through automated Terraform CI/CD checks, preventing configuration drift.</p>
        <h4>4. Vulnerability disclosure</h4>
        <p>To report a security issue, email <a href="mailto:security@medhyx.com">security@medhyx.com</a>. We triage reports within 24 hours.</p>`,
    },
  };

  const legalButtons = $$('[data-legal]');
  if (legalButtons.length) {
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    backdrop.innerHTML = '<div class="modal" role="dialog" aria-modal="true" aria-labelledby="legalTitle"><button class="modal-close" type="button" aria-label="Close">&times;</button><h3 id="legalTitle"></h3><div class="modal-body"></div></div>';
    document.body.appendChild(backdrop);
    const close = () => backdrop.classList.remove('open');
    legalButtons.forEach(btn => btn.addEventListener('click', () => {
      const doc = LEGAL[btn.dataset.legal];
      $('#legalTitle', backdrop).textContent = doc.title;
      $('.modal-body', backdrop).innerHTML = doc.html;
      backdrop.classList.add('open');
      $('.modal-close', backdrop).focus();
    }));
    $('.modal-close', backdrop).addEventListener('click', close);
    backdrop.addEventListener('click', e => { if (e.target === backdrop) close(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
  }
})();
