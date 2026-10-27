(() => {
  const mounts = [...document.querySelectorAll('[data-ita-booking]')];
  if (!mounts.length) return;

  const money = (value, currency) => new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(value);
  const escapeHtml = text => String(text ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const longDate = iso => new Date(iso + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const init = mount => {
    const store = (mount.dataset.store || '').trim();
    const variant = (mount.dataset.variant || '').trim();
    const title = mount.dataset.title || 'Your journey';
    const deposit = Number(mount.dataset.deposit || 0);
    const currency = mount.dataset.currency || 'USD';
    const maxTravelers = Number(mount.dataset.max || 10);
    const dates = (mount.dataset.dates || '').split(',').map(d => d.trim()).filter(Boolean);
    if (!store || !/^\d+$/.test(variant) || !(deposit > 0)) return;

    const state = { date: '', travelers: 2, name: '', email: '', phone: '', error: '' };
    const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

    const openButton = document.createElement('button');
    openButton.type = 'button';
    openButton.className = 'btn bb-open';
    openButton.innerHTML = 'Reserve with a deposit <span class="arr">→</span>';
    mount.appendChild(openButton);

    const dialog = document.createElement('dialog');
    dialog.className = 'bb-dialog';
    dialog.setAttribute('aria-label', 'Reserve with a deposit');
    document.body.appendChild(dialog);

    const render = () => {
      const due = deposit * state.travelers;
      const dateField = dates.length
        ? `<label class="bb-field"><span>Departure date</span><select name="date"><option value="">Choose a departure</option>${dates.map(d => `<option value="${d}" ${d === state.date ? 'selected' : ''}>${longDate(d)}</option>`).join('')}</select></label>`
        : `<label class="bb-field"><span>Preferred start date</span><input name="date" type="date" min="${tomorrow}" value="${escapeHtml(state.date)}"></label>`;
      dialog.innerHTML = `<form method="dialog" class="bb-form" novalidate>
        <header><div><small>Reserve with a deposit</small><h3>${escapeHtml(title)}</h3></div><button type="button" class="bb-x" data-close aria-label="Close">✕</button></header>
        ${dateField}
        <div class="bb-group"><h4>Travelers</h4>
          <div class="bb-row"><span>Number of travelers<small>${money(deposit, currency)} deposit per traveler</small></span>
          <div class="bb-step"><button type="button" data-d="-1" aria-label="Fewer travelers">−</button><output>${state.travelers}</output><button type="button" data-d="1" aria-label="More travelers">+</button></div></div>
        </div>
        <div class="bb-group"><h4>Lead traveler</h4>
          <label class="bb-field"><span>Full name</span><input name="name" autocomplete="name" value="${escapeHtml(state.name)}"></label>
          <label class="bb-field"><span>Email</span><input name="email" type="email" autocomplete="email" value="${escapeHtml(state.email)}"></label>
          <label class="bb-field"><span>Phone / WhatsApp</span><input name="phone" type="tel" autocomplete="tel" value="${escapeHtml(state.phone)}"></label>
        </div>
        <div class="bb-summary" aria-live="polite">
          <div class="bb-total due"><span>Deposit due now</span><b>${money(due, currency)}</b></div>
          <p class="bb-hint">The remaining balance is arranged with your ITA Global specialist.</p>
        </div>
        <p class="bb-error" role="alert">${escapeHtml(state.error)}</p>
        <button type="button" class="btn bb-pay-btn" data-pay>Pay ${money(due, currency)} deposit securely</button>
        <p class="bb-hint center">You will be taken to Shopify's secure payment page.</p>
      </form>`;
    };

    const checkoutUrl = () => {
      const lines = [
        `Trip: ${title}`,
        `Start date: ${state.date}`,
        `Travelers: ${state.travelers}`,
        `Lead traveler: ${state.name}`,
        `Phone: ${state.phone}`,
        `Deposit paid: ${deposit * state.travelers} ${currency}`
      ];
      const query = new URLSearchParams();
      query.set('checkout[email]', state.email.trim());
      query.set('note', lines.join('\n'));
      query.set('attributes[Trip]', title);
      query.set('attributes[Start date]', state.date);
      query.set('attributes[Travelers]', String(state.travelers));
      query.set('attributes[Lead traveler]', state.name.trim());
      query.set('attributes[Phone]', state.phone.trim());
      return `https://${store}/cart/${variant}:${state.travelers}?${query.toString()}`;
    };

    const pay = () => {
      if (!state.date) { state.error = 'Please choose a date.'; render(); return; }
      if (!state.name.trim() || !state.phone.trim()) { state.error = 'Please add your name and phone.'; render(); return; }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(state.email.trim())) { state.error = 'Please add a valid email.'; render(); return; }
      window.location.href = checkoutUrl();
    };

    dialog.addEventListener('click', event => {
      if (event.target === dialog || event.target.closest('[data-close]')) { dialog.close(); return; }
      const step = event.target.closest('[data-d]');
      if (step) {
        state.travelers = Math.max(1, Math.min(maxTravelers, state.travelers + Number(step.dataset.d)));
        state.error = '';
        render();
        return;
      }
      if (event.target.closest('[data-pay]')) pay();
    });
    dialog.addEventListener('input', event => {
      if (['name', 'email', 'phone', 'date'].includes(event.target.name)) state[event.target.name] = event.target.value;
    });

    openButton.addEventListener('click', () => {
      render();
      if (typeof dialog.showModal === 'function') dialog.showModal(); else dialog.setAttribute('open', '');
      document.documentElement.classList.add('bb-lock');
    });
    dialog.addEventListener('close', () => document.documentElement.classList.remove('bb-lock'));
  };

  mounts.forEach(init);
})();