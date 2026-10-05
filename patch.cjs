const fs = require('fs');
let code = fs.readFileSync('js/main.js', 'utf8');

const oldCode = `    cont.addEventListener('change', (e) => {
      if (e.target.name !== 'notation') return;
      this.gameState.settings.notation = e.target.value;
      BigNum.notation = e.target.value;
      for (const t in this.tabNeedsFullRender) this.tabNeedsFullRender[t] = true;
      this.saveManager.save();
    });
  }`;

const newCode = `    cont.addEventListener('change', (e) => {
      if (e.target.name !== 'notation') return;
      this.gameState.settings.notation = e.target.value;
      BigNum.notation = e.target.value;
      for (const t in this.tabNeedsFullRender) this.tabNeedsFullRender[t] = true;
      this.saveManager.save();
    });

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
      rhythmCont.innerHTML = rhythmOptions.map(o => \\\`
        <label class="settings-option">
          <input type="radio" name="rhythmScale" value="\\\${o.id}" \\\${this.gameState.settings.rhythmScale === o.id ? 'checked' : ''}>
          <span>\\\${o.label}</span>
        </label>
      \\\`).join('');
      rhythmCont.addEventListener('change', (e) => {
        if (e.target.name !== 'rhythmScale') return;
        this.gameState.settings.rhythmScale = e.target.value;
        if (window.sound) {
          window.sound.rhythmScale = e.target.value;
        }
        this.saveManager.save();
      });
    }
  }`;

code = code.replace(oldCode, newCode.replace(/\\\\/g, ''));
fs.writeFileSync('js/main.js', code);
console.log('patched successfully');
