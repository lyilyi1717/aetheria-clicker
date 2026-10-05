import random
import math

def generate_falafel_svg():
    svg = []
    svg.append('<svg width="100%" height="100%" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">')
    svg.append('  <defs>')
    
    # Gradient for the TOP surface
    svg.append('    <radialGradient id="top-grad" cx="50%" cy="50%" r="50%">')
    svg.append('      <stop offset="0%" stop-color="#704214" />')
    svg.append('      <stop offset="70%" stop-color="#8b5a2b" />')
    svg.append('      <stop offset="100%" stop-color="#5c3a21" />')
    svg.append('    </radialGradient>')
    
    # Gradient for the SIDE thickness
    svg.append('    <linearGradient id="side-grad" x1="0%" y1="0%" x2="0%" y2="100%">')
    svg.append('      <stop offset="0%" stop-color="#4a2e1b" />')
    svg.append('      <stop offset="100%" stop-color="#1e1008" />')
    svg.append('    </linearGradient>')

    # Inner hole side thickness
    svg.append('    <linearGradient id="inner-side-grad" x1="0%" y1="0%" x2="0%" y2="100%">')
    svg.append('      <stop offset="0%" stop-color="#3a2212" />')
    svg.append('      <stop offset="100%" stop-color="#1a0e07" />')
    svg.append('    </linearGradient>')

    # Magic glow
    svg.append('    <filter id="magic-glow" x="-20%" y="-20%" width="140%" height="140%">')
    svg.append('      <feGaussianBlur stdDeviation="12" result="blur" />')
    svg.append('      <feComponentTransfer in="blur" result="glow">')
    svg.append('        <feFuncA type="linear" slope="1.5" />')
    svg.append('      </feComponentTransfer>')
    svg.append('      <feMerge>')
    svg.append('        <feMergeNode in="glow"/>')
    svg.append('        <feMergeNode in="SourceGraphic"/>')
    svg.append('      </feMerge>')
    svg.append('    </filter>')
    svg.append('  </defs>')
    
    # Holy Golden Outer glow
    svg.append('  <ellipse cx="100" cy="110" rx="105" ry="75" fill="rgba(251, 191, 36, 0.35)" filter="url(#magic-glow)" />')

    # 1. Outer Side (Thickness)
    svg.append('  <path d="M 10 90 A 90 55 0 0 0 190 90 L 190 120 A 90 55 0 0 1 10 120 Z" fill="url(#side-grad)" />')

    # 2. Inner Side (Thickness of the hole)
    svg.append('  <path d="M 60 90 A 40 25 0 0 1 140 90 L 140 120 A 40 25 0 0 0 60 120 Z" fill="url(#inner-side-grad)" />')

    # 3. Top Surface (The ring itself)
    svg.append('  <path d="M 10 90 A 90 55 0 0 0 190 90 A 90 55 0 0 0 10 90 Z M 60 90 A 40 25 0 0 0 140 90 A 40 25 0 0 0 60 90 Z" fill="url(#top-grad)" fill-rule="evenodd" />')
    
    # 4. Sesame seeds on top surface
    svg.append('  <g fill="#f5deb3" opacity="0.95">')
    for _ in range(150):
        angle = random.uniform(0, 2 * math.pi)
        r = random.uniform(43, 87)
        x = 100 + r * math.cos(angle)
        y = 90 + r * math.sin(angle) * (55.0/90.0)
        
        rot = random.uniform(0, 360)
        # We also scale the sesame seeds slightly to match perspective if we wanted, 
        # but just standard ellipses rotated look good.
        svg.append(f'    <ellipse cx="{x:.1f}" cy="{y:.1f}" rx="2.5" ry="1.5" transform="rotate({rot:.1f} {x:.1f} {y:.1f})" />')
        
    svg.append('  </g>')
    svg.append('</svg>')
    
    with open('falafel.svg', 'w') as f:
        f.write('\n'.join(svg))

generate_falafel_svg()
