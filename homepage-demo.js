/* Campaign entry points: ?play=<key>, ?play=random, or bare ?play.
   Add supported carts here; URLs never become arbitrary iframe destinations. */
(() => {
  const demos = [
    { key: 'the-last-save-file', title: 'The Last Save File' },
    { key: 'f-zero-nova-3d', title: 'F-Zero Nova' },
    { key: 'star-fox-nova-3d', title: 'Star Fox Nova' },
    { key: 'crystal-cathedral-3d', title: 'Crystal Cathedral' },
    { key: 'cyberpunk-city-3d', title: 'Cyberpunk City' },
  ];
  const dialog = document.getElementById('homepage-demo');
  const stage = dialog.querySelector('.demo-modal__stage');
  const title = document.getElementById('homepage-demo-title');
  const loading = dialog.querySelector('.demo-modal__loading');
  const closeButton = dialog.querySelector('.demo-modal__close');
  let current = null;
  let frame = null;
  let openedAt = 0;
  let previousOverflow = '';
  let previousFocus = null;
  let closeReason = 'manual';

  function track(name, extra) {
    if (typeof window.gtag !== 'function' || !current) return;
    window.gtag('event', name, {
      demo_id: current.key, demo_title: current.title,
      event_category: 'demo', event_label: current.key, ...extra,
    });
  }

  function close(reason = 'manual') {
    if (!dialog.open) return;
    closeReason = reason;
    dialog.close();
    finishClose();
  }

  function open(key, source = 'api') {
    const demo = !key || key === 'random'
      ? demos[Math.floor(Math.random() * demos.length)]
      : demos.find((item) => item.key === key);
    if (!demo) {
      console.warn('[NovaDemo] Unknown demo key:', key);
      return false;
    }
    if (!dialog.open) {
      previousFocus = document.activeElement;
      previousOverflow = document.documentElement.style.overflow;
      document.documentElement.style.overflow = 'hidden';
      dialog.showModal();
    }
    frame?.remove();
    current = demo;
    openedAt = Date.now();
    title.textContent = demo.title;
    loading.hidden = false;
    const nextFrame = document.createElement('iframe');
    nextFrame.title = demo.title + ' — playable Nova64 demo';
    nextFrame.allow = 'autoplay; fullscreen';
    nextFrame.src = './demo-embed.html?demo=' + encodeURIComponent(demo.key);
    nextFrame.addEventListener('load', () => {
      if (frame !== nextFrame || !dialog.open) return;
      loading.hidden = true;
      // Keyboard events inside an iframe do not reach the parent dialog.
      nextFrame.contentWindow.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          close('escape');
        }
      });
    });
    frame = nextFrame;
    stage.append(frame);
    closeButton.focus({ preventScroll: true });
    track('demo_open', { source });
    return true;
  }

  closeButton.addEventListener('click', () => close('button'));
  dialog.addEventListener('cancel', (event) => {
    event.preventDefault();
    close('escape');
  });
  function finishClose() {
    if (!current) return;
    track('demo_close', { reason: closeReason, dwell_ms: Date.now() - openedAt });
    frame?.remove(); // Tear down the runtime and stop its audio on close.
    frame = null;
    current = null;
    closeReason = 'manual';
    document.documentElement.style.overflow = previousOverflow;
    const url = new URL(window.location.href);
    url.searchParams.delete('play'); // Keep campaign attribution and the hash.
    window.history.replaceState(window.history.state, '', url);
    if (previousFocus?.isConnected && previousFocus !== document.body) {
      previousFocus.focus({ preventScroll: true });
    } else {
      document.querySelector('a[aria-label="Nova64 home"]')?.focus({ preventScroll: true });
    }
  }
  dialog.addEventListener('close', () => {
    if (!dialog.open) finishClose();
  });

  window.NovaDemo = { open, close, demos };
  const params = new URLSearchParams(window.location.search);
  if (params.has('play')) open(params.get('play') || 'random', 'querystring');
})();
