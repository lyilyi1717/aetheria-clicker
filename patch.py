import re

with open('js/main.js', 'r', encoding='utf-8') as f:
    text = f.read()

pattern = re.compile(r'  buildSettingsStructure\(\) \{.*?^\s*setupTabs\(\) \{', re.MULTILINE | re.DOTALL)
new_code = '''  buildSettingsStructure() {
    const cont = document.getElementById('settings-notation');
    if (cont) {
      const sample = new BigNum(1.5, 10);
      const options = [
        { id: 'scientific', label: 'Scientific' },
        { id: 'suffix', label: 'Standard (K, M, B…)' },
        { id: 'engineering', label: 'Engineering' }
      ];
      cont.innerHTML = options.map(o => \
        <label class="settings-option">
          <input type="radio" name="notation" value="\" \>
          <span>\</span>
          <span class="settings-sample">\</span>
        </label>
      \).join('');
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
      rhythmCont.innerHTML = rhythmOptions.map(o => \
        <label class="settings-option">
          <input type="radio" name="rhythmScale" value="\" \>
          <span>\</span>
        </label>
      \).join('');
      rhythmCont.addEventListener('change', (e) => {
        if (e.target.name !== 'rhythmScale') return;
        this.gameState.settings.rhythmScale = e.target.value;
        if (sound) {
          sound.rhythmScale = e.target.value;
        }
        this.saveManager.save();
      });
    }
  }

  setupTabs() {'''

text = pattern.sub(new_code, text)

with open('js/main.js', 'w', encoding='utf-8') as f:
    f.write(text)
