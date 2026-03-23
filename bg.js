function initBgCanvas() {
  const canvas = document.getElementById('bgCanvas');
  const ctx = canvas.getContext('2d');
  
  // Resize canvas
  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);
  
  let stars = [];
  let shootingStars = [];
  let bats = [];
  let moon = null;
  let sun = null;
  let clouds = [];
  let birds = [];
  let time = 0;
  
  function getTheme() {
    return document.documentElement.getAttribute('data-theme') === 'dark';
  }
  
  function initElements(isDark) {
    stars = [];
    shootingStars = [];
    bats = [];
    clouds = [];
    birds = [];
    
    if (isDark) {
      // Dark mode: 200+ stars
      for (let i = 0; i < 220; i++) {
        stars.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          size: Math.random() * 1.5 + 0.5,
          speed: Math.random() * 0.03 + 0.005,
          alpha: Math.random()
        });
      }
      
      // Moon at (W*0.82, H*0.14), r=52, 4 craters
      moon = {
        x: canvas.width * 0.82,
        y: canvas.height * 0.14,
        radius: 52,
        craters: [
          {x: 12, y: 14, r: 8},
          {x: 28, y: 28, r: 6},
          {x: 42, y: 18, r: 7},
          {x: 22, y: 42, r: 5}
        ]
      };
      
      // 6 bats
      for (let i = 0; i < 6; i++) {
        bats.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height * 0.6,
          speed: (Math.random() * 0.4 + 0.3),
          wingAngle: 0
        });
      }
    } else {
      // Light mode sky gradient
      // Sun at (W*0.15, H*0.13), r=48
      sun = {
        x: canvas.width * 0.15,
        y: canvas.height * 0.13,
        radius: 48,
        rayAngle: 0
      };
      
      // 7 clouds
      for (let i = 0; i < 7; i++) {
        clouds.push({
          x: Math.random() * canvas.width,
          y: (Math.random() * 0.3 + 0.1) * canvas.height,
          size: Math.random() * 60 + 50,
          speed: Math.random() * 0.15 + 0.08
        });
      }
      
      // 10 birds V-shape
      for (let i = 0; i < 10; i++) {
        birds.push({
          x: -50,
          y: Math.random() * canvas.height * 0.4 + 50,
          speed: Math.random() * 0.6 + 0.4,
          wingAngle: 0
        });
      }
    }
  }
  
  function draw() {
    const isDark = getTheme();
    
    // Sky gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    if (isDark) {
      gradient.addColorStop(0, '#020818');
      gradient.addColorStop(0.5, '#050d2a');
      gradient.addColorStop(1, '#0a0520');
    } else {
      gradient.addColorStop(0, '#2980d6');
      gradient.addColorStop(0.5, '#56aee8');
      gradient.addColorStop(1, '#a8d8f0');
    }
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    if (isDark) {
      // Stars twinkling
      stars.forEach(star => {
        star.alpha += Math.sin(time * star.speed) * 0.02;
        star.alpha = Math.max(0.3, Math.min(1, star.alpha));
        ctx.save();
        ctx.globalAlpha = star.alpha;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });
      
      // Moon with glow and craters
      if (moon) {
        const pulse = Math.sin(time * 0.01) * 0.08 + 0.92;
        // Glow
        const glow = ctx.createRadialGradient(moon.x, moon.y, 0, moon.x, moon.y, moon.radius * 1.8);
        glow.addColorStop(0, 'rgba(255, 255, 150, 0.4)');
        glow.addColorStop(0.7, 'rgba(255, 255, 150, 0.05)');
        glow.addColorStop(1, 'transparent');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(moon.x, moon.y, moon.radius * 1.8 * pulse, 0, Math.PI * 2);
        ctx.fill();
        
        // Moon surface
        const moonGrad = ctx.createRadialGradient(moon.x - 15, moon.y - 15, 0, moon.x, moon.y, moon.radius);
        moonGrad.addColorStop(0, '#fff8dc');
        moonGrad.addColorStop(0.7, '#f0e68c');
        moonGrad.addColorStop(1, '#daa520');
        ctx.fillStyle = moonGrad;
        ctx.beginPath();
        ctx.arc(moon.x, moon.y, moon.radius * pulse, 0, Math.PI * 2);
        ctx.fill();
        
        // 4 Craters
        moon.craters.forEach(c => {
          ctx.fillStyle = 'rgba(0,0,0,0.25)';
          ctx.beginPath();
          ctx.arc(moon.x + c.x, moon.y + c.y, c.r * pulse, 0, Math.PI * 2);
          ctx.fill();
        });
      }
      
      // Shooting stars
      if (Math.random() < 0.015) {
        shootingStars.push({ x: 0, y: Math.random() * 200, trail: [] });
      }
      shootingStars = shootingStars.filter(s => {
        s.x += 12;
        s.y += 7;
        s.trail.unshift({x: s.x, y: s.y});
        s.trail = s.trail.slice(0, 12);
        s.trail.forEach((p, i) => {
          ctx.save();
          ctx.globalAlpha = (i / 12) * 0.8;
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2 - i * 0.15;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(s.x + i * 2, s.y + i * 1.5);
          ctx.stroke();
          ctx.restore();
        });
        return s.x < canvas.width + 50;
      });
      
      // 6 Bats with bezier wings, red eyes
      bats.forEach(bat => {
        bat.x += bat.speed;
        bat.y += Math.sin(time * 0.015 + bat.x * 0.002) * 1;
        bat.wingAngle += 0.25;
        if (bat.x > canvas.width + 60) bat.x = -60;
        
        // Body
        ctx.fillStyle = '#2c1810';
        ctx.beginPath();
        ctx.ellipse(bat.x, bat.y, 12, 6, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Wings (bezier, sine flap)
        const flap = Math.sin(bat.wingAngle) * 3;
        ctx.fillStyle = '#1f0f08';
        // Left wing
        ctx.beginPath();
        ctx.moveTo(bat.x - 12, bat.y);
        ctx.bezierCurveTo(bat.x - 30, bat.y - 10 + flap, bat.x - 25, bat.y + 8, bat.x - 8, bat.y + 2);
        ctx.lineTo(bat.x - 12, bat.y);
        ctx.fill();
        // Right wing  
        ctx.beginPath();
        ctx.moveTo(bat.x + 12, bat.y);
        ctx.bezierCurveTo(bat.x + 30, bat.y - 8 - flap, bat.x + 25, bat.y + 10, bat.x + 8, bat.y - 2);
        ctx.lineTo(bat.x + 12, bat.y);
        ctx.fill();
        
        // Red eyes
        ctx.fillStyle = '#ff3333';
        ctx.beginPath();
        ctx.arc(bat.x - 4, bat.y - 2, 2, 0, Math.PI * 2);
        ctx.arc(bat.x + 4, bat.y - 2, 2, 0, Math.PI * 2);
        ctx.fill();
      });
      
    } else {
      // Light mode Sun (r=48, 12 rays, happy face)
      if (sun) {
        sun.rayAngle += 0.03;
        const pulse = Math.sin(time * 0.012) * 0.12 + 0.88;
        
        // 12 rotating rays
        ctx.save();
        ctx.translate(sun.x, sun.y);
        ctx.rotate(sun.rayAngle);
        for (let i = 0; i < 12; i++) {
          ctx.save();
          ctx.rotate((i / 12) * Math.PI * 2);
          ctx.strokeStyle = '#ffd700';
          ctx.lineWidth = 4;
          ctx.lineCap = 'round';
          ctx.shadowColor = '#ffaa00';
          ctx.shadowBlur = 25;
          ctx.beginPath();
          ctx.moveTo(0, -sun.radius * 1.3);
          ctx.lineTo(0, -sun.radius * 2.2);
          ctx.stroke();
          ctx.restore();
        }
        ctx.restore();
        
        // Sun glow
        const sunGlow = ctx.createRadialGradient(sun.x, sun.y, 0, sun.x, sun.y, sun.radius * 2.2);
        sunGlow.addColorStop(0, 'rgba(255, 255, 200, 0.6)');
        sunGlow.addColorStop(0.6, 'rgba(255, 200, 100, 0.3)');
        sunGlow.addColorStop(1, 'transparent');
        ctx.fillStyle = sunGlow;
        ctx.beginPath();
        ctx.arc(sun.x, sun.y, sun.radius * 2.2 * pulse, 0, Math.PI * 2);
        ctx.fill();
        
        // Sun surface
        const sunGrad = ctx.createRadialGradient(sun.x - 12, sun.y - 12, 0, sun.x, sun.y, sun.radius);
        sunGrad.addColorStop(0, '#fffb99');
        sunGrad.addColorStop(0.6, '#ffdd44');
        sunGrad.addColorStop(1, '#ffaa00');
        ctx.shadowColor = '#ff8800';
        ctx.shadowBlur = 18;
        ctx.fillStyle = sunGrad;
        ctx.beginPath();
        ctx.arc(sun.x, sun.y, sun.radius * pulse, 0, Math.PI * 2);
        ctx.fill();
        
        // Happy face
        ctx.fillStyle = '#ffdd66';
        ctx.shadowBlur = 0;
        // Eyes
        ctx.beginPath();
        ctx.arc(sun.x - 14, sun.y - 6, 4, 0, Math.PI * 2);
        ctx.arc(sun.x + 14, sun.y - 6, 4, 0, Math.PI * 2);
        ctx.fill();
        // Smile
        ctx.strokeStyle = '#ffdd66';
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.arc(sun.x, sun.y + 10, 16, 0, Math.PI);
        ctx.stroke();
      }
      
      // 7 Clouds (overlapping arcs)
      clouds.forEach(cloud => {
        cloud.x += cloud.speed;
        if (cloud.x > canvas.width + 100) cloud.x = -100;
        
        const sizes = [cloud.size, cloud.size * 0.75, cloud.size * 0.6, cloud.size * 0.85];
        const yOffsets = [0, -8, 4, 12];
        sizes.forEach((size, i) => {
          ctx.save();
          ctx.globalAlpha = 0.9;
          ctx.fillStyle = '#ffffff';
          ctx.shadowColor = 'rgba(255,255,255,0.8)';
          ctx.shadowBlur = 12;
          ctx.beginPath();
          ctx.arc(cloud.x + i * 15, cloud.y + yOffsets[i], size, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        });
      });
      
      // 10 Birds (V-shapes flapping)
      birds.forEach(bird => {
        bird.x += bird.speed;
        bird.y += Math.sin(time * 0.008 + bird.x * 0.001) * 0.6;
        bird.wingAngle += 0.3;
        if (bird.x > canvas.width + 60) bird.x = -40;
        
        ctx.save();
        ctx.translate(bird.x, bird.y);
        ctx.rotate(Math.sin(bird.wingAngle) * 0.08);
        
        const flapOffset = Math.sin(bird.wingAngle) * 4;
        ctx.strokeStyle = '#2c3e50';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.shadowColor = 'rgba(0,0,0,0.3)';
        ctx.shadowBlur = 4;
        
        // Left wing
        ctx.beginPath();
        ctx.moveTo(-15, 0);
        ctx.lineTo(-25, -flapOffset);
        ctx.lineTo(-8, flapOffset);
        ctx.stroke();
        
        // Right wing  
        ctx.beginPath();
        ctx.moveTo(15, 0);
        ctx.lineTo(25, flapOffset);
        ctx.lineTo(8, -flapOffset);
        ctx.stroke();
        
        // Body
        ctx.fillStyle = '#34495e';
        ctx.beginPath();
        ctx.arc(0, 0, 5, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
      });
    }
    
    time++;
    requestAnimationFrame(draw);
  }
  
  // Re-init on theme change
  window.addEventListener('themeChanged', () => {
    initElements(getTheme());
  });
  
  // Start animation
  initElements(getTheme());
  requestAnimationFrame(draw);
}

// Initialize when loaded
window.addEventListener('load', initBgCanvas);

