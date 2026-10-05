import random

def generate_falafel_svg():
    svg = []
    svg.append('<svg width="100%" height="100%" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">')
    svg.append('  <defs>')
    svg.append('    <radialGradient id="falafel-grad" cx="30%" cy="30%" r="70%">')
    svg.append('      <stop offset="0%" stop-color="#c48a47" />')
    svg.append('      <stop offset="70%" stop-color="#704214" />')
    svg.append('      <stop offset="100%" stop-color="#3e2723" />')
    svg.append('    </radialGradient>')
    svg.append('    <filter id="magic-glow" x="-20%" y="-20%" width="140%" height="140%">')
    svg.append('      <feGaussianBlur stdDeviation="8" result="blur" />')
    svg.append('      <feComponentTransfer in="blur" result="glow">')
    svg.append('        <feFuncA type="linear" slope="1.5" />')
    svg.append('      </feComponentTransfer>')
    svg.append('      <feMerge>')
    svg.append('        <feMergeNode in="glow"/>')
    svg.append('        <feMergeNode in="SourceGraphic"/>')
    svg.append('      </feMerge>')
    svg.append('    </filter>')
    svg.append('  </defs>')
    
    # Outer glow ring underneath
    svg.append('  <circle cx="100" cy="100" r="95" fill="rgba(52, 211, 153, 0.4)" filter="url(#magic-glow)" />')
    
    # The Falafel ring (Donut shape using path with evenodd fill rule)
    # Outer radius = 90, Inner radius = 35
    svg.append('  <path d="M100 10 A 90 90 0 1 0 100 190 A 90 90 0 1 0 100 10 Z M100 65 A 35 35 0 1 1 100 135 A 35 35 0 1 1 100 65 Z"')
    svg.append('        fill="url(#falafel-grad)" fill-rule="evenodd" />')
    
    # Sesame seeds
    svg.append('  <g fill="#f5deb3" opacity="0.9">')
    
    for _ in range(120):
        # random point in an annulus (radius 40 to 85)
        angle = random.uniform(0, 2 * 3.14159)
        r = random.uniform(40, 85)
        x = 100 + r * 3.14159 * (1 if random.random() > 0.5 else -1) # wait math is wrong
        import math
        x = 100 + r * math.cos(angle)
        y = 100 + r * math.sin(angle)
        
        # rotation of the seed
        rot = random.uniform(0, 360)
        svg.append(f'    <ellipse cx="{x:.1f}" cy="{y:.1f}" rx="2" ry="1.2" transform="rotate({rot:.1f} {x:.1f} {y:.1f})" />')
        
    svg.append('  </g>')
    svg.append('</svg>')
    
    with open('falafel.svg', 'w') as f:
        f.write('\n'.join(svg))

generate_falafel_svg()
