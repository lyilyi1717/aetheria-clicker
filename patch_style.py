import re

with open('css/style.css', 'r', encoding='utf-8') as f:
    text = f.read()

new_root = ''':root {
  --bg-primary: #050a07;
  --bg-secondary: #0a140f;
  --bg-card: rgba(10, 20, 15, 0.85);
  --bg-card-hover: rgba(15, 30, 22, 0.95);
  --border-color: rgba(52, 211, 153, 0.6);
  --border-glow: rgba(52, 211, 153, 0.9);

  --accent-cyan: #38bdf8;
  --accent-gold: #fbbf24;
  --accent-purple: #c084fc;
  --accent-green: #34d399;
  --accent-rose: #f472b6;
  --accent-red: #f87171;

  --text-main: #ffffff;
  --text-muted: #e2e8f0;
  --text-dim: #94a3b8;'''

text = re.sub(r':root \{.*?--text-dim: #94a3b8;', new_root, text, flags=re.DOTALL)

with open('css/style.css', 'w', encoding='utf-8') as f:
    f.write(text)
