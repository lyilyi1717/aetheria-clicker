const fs = require('fs');
let code = fs.readFileSync('js/main.js', 'utf8');

const oldCode = `  buildSettingsStructure() {
    const cont = document.getElementById('settings-notation');
    if (!cont) return;
    const sample = new BigNum(1.5, 10);
    const options = [
      { id: 'scientific', label: 'Scientific' },
      { id: 'suffix', label: 'Standard (K, M, B…)' },
      { id: 'engineering', label: 'Engineering' }
    ];
    cont.innerHTML = options.map(o => \`
      <label class="settings-option">
        <input type="radio" name="notation" value="\${o.id}" \${this.gameState.settings.notation === o.id ? 'checked' : ''}>
        <span>\${o.label}</span>
        <span class="settings-sample">\${sample.format(o.id, 2)}</span>
      </label>
    \`).join('');
    cont.addEventListener('change', (e) => {
      if (e.target.name !== 'notation') return;
      this.gameState.settings.notation = e.target.value;
      BigNum.notation = e.target.value;
      for (const t in this.tabNeedsFullRender) this.tabNeedsFullRender[t] = true;
      this.saveManager.save();
    });
  }`;

const newCode = `  buildSettingsStructure() {
    const cont = document.getElementById('settings-notation');
    if (cont) {
      const sample = new BigNum(1.5, 10);
      const options = [
        { id: 'scientific', label: 'Scientific' },
        { id: 'suffix', label: 'Standard (K, M, B…)' },
        { id: 'engineering', label: 'Engineering' }
      ];
      cont.innerHTML = options.map(o => \`
        <label class="settings-option">
          <input type="radio" name="notation" value="\${o.id}" \${this.gameState.settings.notation === o.id ? 'checked' : ''}>
          <span>\${o.label}</span>
          <span class="settings-sample">\${sample.format(o.id, 2)}</span>
        </label>
      \`).join('');
      cont.addEventListener('change', (e) => {
        if (e.target.name !== 'notation') return;
        this.gameState.settings.notation = e.target.value;
        BigNum.notation = e.target.value;
        for (const t in this.tabNeedsFullRender) this.tabNeedsFullRender[t] = true;
        this.saveManager.save();
      });
    }

    const rhythmCont = document.getElementById('settings-rhythm');
    if (rhythmCont) {
      const rhythmOptions = [
        { id: 'pentatonic', label: 'Pentatonic (C Major)' },
        { id: 'hijaz', label: 'Hijaz (Desert)' },
        { id: 'mystic', label: 'Mystic (Byzantine)' },
        { id: 'lofi', label: 'Lofi (A Minor)' },
        { id: 'boss', label: 'Boss (Deep/Dark)' }
      ];
      if (!this.gameState.settings.rhythmScale) {
        this.gameState.settings.rhythmScale = 'hijaz';
      }
      rhythmCont.innerHTML = rhythmOptions.map(o => \`
        <label class="settings-option">
          <input type="radio" name="rhythmScale" value="\${o.id}" \${this.gameState.settings.rhythmScale === o.id ? 'checked' : ''}>
          <span>\${o.label}</span>
        </label>
      \`).join('');
      rhythmCont.addEventListener('change', (e) => {
        if (e.target.name !== 'rhythmScale') return;
        this.gameState.settings.rhythmScale = e.target.value;
        if (window.gameApp && window.gameApp.sound) {
          window.gameApp.sound.rhythmScale = e.target.value;
        } else if (typeof sound !== 'undefined') {
          sound.rhythmScale = e.target.value;
        }
        this.saveManager.save();
      });
    }
  }`;

if (code.includes(oldCode)) {
  code = code.replace(oldCode, newCode);
  fs.writeFileSync('js/main.js', code);
  console.log('patched successfully');
} else {
  console.log('could not find oldCode');
}
