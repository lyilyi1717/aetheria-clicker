// Dig feature "runcard": UI wiring, modal card display, and Web Share API
import * as G from '../../game.js';
import { ui } from '../../ui/app.js';
import { createRunCardCanvas } from './canvas.js';
import { formatShareText } from './rules.js';

const { t } = G;

/**
 * Open the Daily Dig Run Card Modal.
 */
export function openRunCardModal(app, summary) {
  if (!app || !app.modal) return;
  const s = app.state;
  const run = summary || (s && s.runcard && (s.runcard.lastRun || s.runcard.activeRun));
  if (!run) {
    if (app.toast) app.toast(t('runcard_title') + ': ' + t('dr_none'));
    return;
  }

  const shareText = formatShareText(run);
  const dayNum = run.dayNumber || 1;

  const html = `
    <div class="runcard-modal">
      <div class="runcard-title-row">
        <h2>⛏️ ${t('runcard_title')} #${dayNum}</h2>
        <button type="button" class="runcard-close-btn" data-action="close" aria-label="Close">✕</button>
      </div>
      <div class="runcard-preview-box" id="runcard-canvas-container">
        <!-- Canvas or preview image will be mounted here -->
      </div>
      <div class="runcard-actions">
        <button type="button" class="runcard-btn primary" data-action="share">
          📤 ${t('runcard_share_btn')}
        </button>
        <button type="button" class="runcard-btn secondary" data-action="copy">
          📋 ${t('runcard_copy_btn')}
        </button>
      </div>
    </div>
  `;

  const m = app.modal.open('runcard', html);
  if (!m) return;

  const container = m.querySelector('#runcard-canvas-container');
  let canvas = null;
  let dataUrl = '';

  try {
    canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 600;
    createRunCardCanvas(run, canvas);
    dataUrl = canvas.toDataURL('image/png');

    const img = document.createElement('img');
    img.src = dataUrl;
    img.className = 'runcard-canvas-img';
    img.alt = `Daily Dig #${dayNum} Run Card`;
    container.appendChild(img);
  } catch (err) {
    console.error('Error rendering run card canvas:', err);
    container.innerHTML = `<pre style="font-size:13px;color:#ffd700;padding:12px;">${shareText}</pre>`;
  }

  // Bind Close Button
  m.querySelector('[data-action="close"]').addEventListener('click', () => {
    app.modal.close();
  });

  // Bind Share Button (Web Share API with clipboard fallback)
  m.querySelector('[data-action="share"]').addEventListener('click', async () => {
    if (navigator.share) {
      try {
        if (canvas && canvas.toBlob) {
          canvas.toBlob(async blob => {
            const file = new File([blob], `daily-dig-${dayNum}.png`, { type: 'image/png' });
            try {
              await navigator.share({
                title: `Aetheria: The Daily Dig #${dayNum}`,
                text: shareText,
                files: [file],
              });
              if (app.toast) app.toast(t('runcard_shared'));
            } catch (shareErr) {
              // Fallback to text-only share
              try {
                await navigator.share({
                  title: `Aetheria: The Daily Dig #${dayNum}`,
                  text: shareText,
                  url: 'https://aetheria.dev/dig',
                });
                if (app.toast) app.toast(t('runcard_shared'));
              } catch {
                fallbackCopy(app, shareText);
              }
            }
          });
          return;
        } else {
          await navigator.share({
            title: `Aetheria: The Daily Dig #${dayNum}`,
            text: shareText,
            url: 'https://aetheria.dev/dig',
          });
          if (app.toast) app.toast(t('runcard_shared'));
          return;
        }
      } catch (e) {
        fallbackCopy(app, shareText);
      }
    } else {
      fallbackCopy(app, shareText);
    }
  });

  // Bind Copy Button
  m.querySelector('[data-action="copy"]').addEventListener('click', () => {
    fallbackCopy(app, shareText);
  });
}

function fallbackCopy(app, text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => {
      if (app.toast) app.toast(t('runcard_copied'));
    }).catch(() => {
      promptCopy(text);
    });
  } else {
    promptCopy(text);
  }
}

function promptCopy(text) {
  window.prompt('Copy Run Card summary:', text);
}

ui({
  id: 'runcard',
  css: new URL('./runcard.css', import.meta.url).href,
  panels: [
    {
      id: 'runcard',
      elId: 'runcard-panel',
      at: 45,
      tab: 'level',
      title: 'runcard_title',
      when: () => true,
      build(el, app) {
        el.innerHTML = `
          <div class="runcard-panel-widget">
            <h3>⛏️ <span data-t="runcard_title">The Daily Dig</span></h3>
            <p data-t="runcard_sub">Deterministic daily expedition with shareable run card</p>
            <button type="button" class="primary runcard-btn" data-action="view-card">
              📜 <span data-t="runcard_view_card">View Run Card</span>
            </button>
          </div>
        `;
        el.querySelector('[data-action="view-card"]').addEventListener('click', () => {
          openRunCardModal(app);
        });
      },
      update(el, s) {
        const btn = el.querySelector('[data-action="view-card"]');
        if (!btn) return;
        const hasRun = !!(s && s.runcard && (s.runcard.lastRun || s.runcard.activeRun));
        btn.textContent = hasRun ? `📜 ${t('runcard_view_card')}` : `⛏️ ${t('runcard_start_daily')}`;
      },
    },
  ],
  on: {
    dailyExpeditionFinished(summary, app) {
      openRunCardModal(app, summary);
    },
  },
});
