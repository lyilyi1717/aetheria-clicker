import re

with open('js/systems/CombatSystem.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix Hero Auto-Attack
hero_attack_old = '''    // Hero Auto-Attack
    h.attackCooldown -= dt;
    if (h.attackCooldown <= 0) {
      h.attackCooldown = h.attackSpeed;
      const crit = this.rollGearCrit();
      const dmg = this.getTotalAttack() * (crit ? 2 : 1);
      this.dealDamageToMonster(dmg, window.innerWidth / 2 + 100, window.innerHeight / 2, crit);
    }'''

hero_attack_new = '''    // Hero Auto-Attack
    h.attackCooldown -= dt;
    if (h.attackCooldown <= 0) {
      h.attackCooldown = h.attackSpeed;
      const crit = this.rollGearCrit();
      const dmg = this.getTotalAttack() * (crit ? 2 : 1);
      const isVisible = window.gameApp && window.gameApp.currentTab === 'combat';
      this.dealDamageToMonster(dmg, isVisible ? (window.innerWidth / 2 + 100) : null, isVisible ? (window.innerHeight / 2) : null, crit);
    }'''

content = content.replace(hero_attack_old, hero_attack_new)

# Fix Monster Auto-Attack
monster_attack_old = '''      if (dmg > 0) {
        h.hp -= dmg;
        sound.playHit();
        particles.spawnFloatingText(window.innerWidth / 2 - 100, window.innerHeight / 2, `-${this.fmt(dmg)}`, '#ef4444', false);

        if (h.hp <= 0) {'''

monster_attack_new = '''      if (dmg > 0) {
        h.hp -= dmg;
        const isVisible = window.gameApp && window.gameApp.currentTab === 'combat';
        if (isVisible) {
          sound.playHit();
          particles.spawnFloatingText(window.innerWidth / 2 - 100, window.innerHeight / 2, `-${this.fmt(dmg)}`, '#ef4444', false);
        }

        if (h.hp <= 0) {'''

content = content.replace(monster_attack_old, monster_attack_new)

with open('js/systems/CombatSystem.js', 'w', encoding='utf-8') as f:
    f.write(content)
print("Patched CombatSystem.js!")
