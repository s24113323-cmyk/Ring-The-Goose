
import React, { useEffect, useRef, useCallback } from 'react';
import { 
  GameStatus, 
  GooseState, 
  HoopState, 
  DragState, 
  GooseType,
  Vector3D,
  GameSettings,
  GraphicsQuality,
  ActiveSkills
} from '../types';
import { 
  GRAVITY, 
  HOOP_RADIUS, 
  GOOSE_HITBOX_RADIUS, 
  GOOSE_SPEED, 
  NUM_GEESE,
  SFX_THROW,
  SFX_HIT,
  SFX_MISS,
  SFX_HONK,
  SFX_PECK
} from '../constants';

interface GameEngineProps {
  status: GameStatus;
  setStatus: (s: GameStatus) => void;
  onScoreUpdate: (points: number, isHit: boolean) => void;
  onHoopThrow: () => void;
  settings: GameSettings;
  isPaused?: boolean;
  activeSkills: ActiveSkills;
}

const WALK_STYLES = [
  { id: 0, name: 'Waddle', speed: 1.0, animRate: 0.22, bobMult: 1.0, lift: 12, stride: 12 },
  { id: 1, name: 'High-Step', speed: 0.8, animRate: 0.16, bobMult: 1.8, lift: 24, stride: 10 },
  { id: 2, name: 'Shuffle', speed: 1.4, animRate: 0.45, bobMult: 0.5, lift: 5, stride: 16 },
  { id: 3, name: 'Sneak', speed: 0.5, animRate: 0.12, bobMult: 0.3, lift: 4, stride: 8 },
  { id: 4, name: 'TipToe', speed: 0.7, animRate: 0.18, bobMult: 1.2, lift: 20, stride: 6 },
];

const GameEngine: React.FC<GameEngineProps> = ({ status, setStatus, onScoreUpdate, onHoopThrow, settings, isPaused = false, activeSkills }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const gameState = useRef({
    geese: [] as GooseState[],
    hoop: {
      pos: { x: 0, y: 0, z: 0 },
      vel: { x: 0, y: 0, z: 0 },
      active: false,
      landed: false,
      scale: 1,
    } as HoopState,
    drag: {
      isDragging: false,
      start: { x: 0, y: 0 },
      current: { x: 0, y: 0 },
    } as DragState,
    particles: [] as { x: number, y: number, vx: number, vy: number, life: number, color: string, size?: number, isPetal?: boolean }[],
  });

  const playSFX = (url: string) => {
    if (isPaused) return;
    const audio = new Audio(url);
    audio.volume = settings.sfxVolume;
    audio.play().catch(() => {});
  };

  const createGoose = (canvas: HTMLCanvasElement, forcedType?: GooseType): GooseState => {
    const margin = 80;
    const initialDir = Math.random() > 0.5 ? 1 : -1;
    let type: GooseType = forcedType || 'standard';
    let points = 5;
    if (type === 'rainbow') points = 20;
    else if (type === 'gold') points = 10;

    return {
      pos: { 
        x: margin + Math.random() * (canvas.width - margin * 2), 
        y: 20 + Math.random() * (canvas.height * 0.35), 
        z: 0 
      },
      vel: { 
        x: GOOSE_SPEED, 
        y: (Math.random() - 0.5) * 0.8, 
        z: 0 
      },
      targetPos: { x: 0, y: 0, z: 0 },
      isCaught: false,
      neckAngle: 0,
      legFrame: Math.random() * 10,
      direction: initialDir,
      pauseTimer: 0,
      alertLevel: 0,
      isDodging: false,
      dodgeCooldown: 0,
      reactionTimer: 0,
      dashCount: 0,
      exhaustionTimer: 0,
      type,
      points,
      walkStyle: Math.floor(Math.random() * WALK_STYLES.length),
      peckTimer: 0
    } as GooseState;
  };

  const initGame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const newGeese: GooseState[] = [];
    newGeese.push(createGoose(canvas, 'rainbow'));
    newGeese.push(createGoose(canvas, 'gold'));
    for (let i = 2; i < NUM_GEESE; i++) newGeese.push(createGoose(canvas, 'standard'));
    gameState.current.geese = newGeese;
    resetHoop(canvas);
  }, []);

  const resetHoop = (canvas: HTMLCanvasElement) => {
    const canvasObj = canvasRef.current;
    if (!canvasObj) return;
    gameState.current.hoop = {
      pos: { x: canvasObj.width / 2, y: -50, z: 0 },
      vel: { x: 0, y: 0, z: 0 },
      active: false,
      landed: false,
      scale: 1,
    };
    gameState.current.drag.isDragging = false;
  };

  const calculateThrowVelocity = (tx: number, ty: number, canvas: HTMLCanvasElement) => {
    const startX = canvas.width / 2;
    const startY_screen = canvas.height - 80;
    const startZ = 40;
    const horizon = canvas.height * 0.6;
    const targetY = Math.max(horizon + 5, Math.min(canvas.height - 5, ty));
    const targetDepth = startY_screen - targetY;
    const vZ = 12 + Math.sqrt(Math.max(0, targetDepth)) * 1.4;
    const determinant = vZ * vZ + 2 * GRAVITY * startZ;
    const T = (vZ + Math.sqrt(Math.max(0, determinant))) / GRAVITY;
    const vX = (tx - startX) / Math.max(0.1, T);
    const vY = targetDepth / Math.max(0.1, T);
    return { x: vX, y: vY, z: vZ };
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (status !== GameStatus.PLAYING || gameState.current.hoop.active || isPaused) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    gameState.current.drag.isDragging = true;
    const rect = canvas.getBoundingClientRect();
    gameState.current.drag.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    canvas.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!gameState.current.drag.isDragging || isPaused) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    gameState.current.drag.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!gameState.current.drag.isDragging || isPaused) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const { current } = gameState.current.drag;
    const horizon = canvas.height * 0.6;
    const constrainedY = Math.max(horizon + 5, Math.min(canvas.height - 5, current.y));
    gameState.current.hoop.active = true;
    gameState.current.hoop.landed = false;
    gameState.current.hoop.pos.x = canvas.width / 2;
    gameState.current.hoop.pos.y = 0; 
    gameState.current.hoop.pos.z = 40;
    gameState.current.hoop.vel = calculateThrowVelocity(current.x, constrainedY, canvas);
    gameState.current.drag.isDragging = false;
    canvas.releasePointerCapture(e.pointerId);
    playSFX(SFX_THROW);
    onHoopThrow();
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;
    let animationFrameId: number;
    const render = (time: number) => {
      if (status === GameStatus.PLAYING && !isPaused) {
        updateGeese(canvas);
        updateHoop(canvas);
        updateParticles();
      }
      draw(ctx, canvas, time);
      animationFrameId = requestAnimationFrame(render);
    };
    animationFrameId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animationFrameId);
  }, [status, isPaused, activeSkills]);

  const updateGeese = (canvas: HTMLCanvasElement) => {
    if (activeSkills.freeze > 0) return;
    const geese = gameState.current.geese;
    const h = gameState.current.hoop;
    const horizon = canvas.height * 0.6; 
    const isSlow = activeSkills.slow > 0;
    const isLure = activeSkills.lure > 0;

    geese.forEach(g => {
      if (g.isCaught) {
        g.neckAngle = Math.sin(Date.now() / 150) * 0.4;
        return;
      }
      const style = WALK_STYLES[g.walkStyle] || WALK_STYLES[0];
      if (g.reactionTimer > 0) g.reactionTimer--;
      if (g.dodgeCooldown > 0) g.dodgeCooldown--;
      if (g.exhaustionTimer > 0) g.exhaustionTimer--;

      let speedMult = style.speed * (isSlow ? 0.4 : 1);
      if (g.type === 'gold') speedMult *= 1.3;
      if (g.type === 'rainbow') speedMult *= 1.6;

      if (h.active && !h.landed && !isSlow) {
        const hoopImpactX = h.pos.x;
        const hoopImpactScreenY = (canvas.height - 80) - h.pos.y; 
        const gooseScreenY = horizon + g.pos.y;
        const distToHoop = Math.hypot(g.pos.x - hoopImpactX, gooseScreenY - hoopImpactScreenY);
        if (distToHoop < 250) {
          speedMult *= 1.5;
          if (g.reactionTimer <= 0) { g.reactionText = "?"; g.reactionTimer = 45; }
        }
        if (distToHoop < 100 && g.dodgeCooldown <= 0 && g.exhaustionTimer <= 0 && h.pos.z < 60) {
          g.isDodging = true; g.dodgeCooldown = 90;
          g.direction = g.pos.x < hoopImpactX ? -1 : 1;
          g.vel.y = gooseScreenY < hoopImpactScreenY ? -2 : 2;
          g.dashCount++;
          if (g.dashCount >= 2) { g.dashCount = 0; g.exhaustionTimer = 180; }
          g.peckTimer = 0; g.reactionText = "!"; g.reactionTimer = 60;
          playSFX(SFX_HONK);
        }
      }

      if (isLure) {
        const targetX = canvas.width / 2;
        const targetYWorld = canvas.height * 0.2;
        const dx = targetX - g.pos.x;
        const dy = targetYWorld - g.pos.y;
        const angle = Math.atan2(dy, dx);
        g.pos.x += Math.cos(angle) * speedMult * 2;
        g.pos.y += Math.sin(angle) * speedMult * 2;
        g.direction = dx > 0 ? 1 : -1;
      } else {
        if (g.isDodging) {
          speedMult *= 2.8;
          if (g.dodgeCooldown < 65) g.isDodging = false;
        }
        if (g.peckTimer > 0) {
          g.peckTimer++;
          if (g.peckTimer === 5) playSFX(SFX_PECK);
          if (g.peckTimer > 35) g.peckTimer = 0;
        }
        if (g.pauseTimer > 0) { 
          g.pauseTimer--; 
          if (g.peckTimer === 0 && Math.random() < 0.03) {
              g.peckTimer = 1;
              if (g.reactionTimer <= 0) { g.reactionText = "..."; g.reactionTimer = 40; }
          }
          return; 
        }
        if (Math.random() < 0.005 && !g.isDodging) { g.pauseTimer = 30 + Math.random() * 60; return; }
        if (Math.random() < 0.01 && !g.isDodging) { g.direction = Math.random() > 0.5 ? 1 : -1; }
        g.pos.x += g.vel.x * g.direction * speedMult;
        g.pos.y += g.vel.y * speedMult;
      }

      if (g.pos.x < 50) { g.direction = 1; g.pos.x = 50; }
      if (g.pos.x > canvas.width - 50) { g.direction = -1; g.pos.x = canvas.width - 50; }
      if (g.pos.y < 0) { g.vel.y = Math.abs(g.vel.y); g.pos.y = 0; }
      if (g.pos.y > canvas.height * 0.4) { g.vel.y = -Math.abs(g.vel.y); g.pos.y = canvas.height * 0.4; }
      g.legFrame += style.animRate * (g.isDodging ? 2.5 : 1) * (isSlow ? 0.5 : 1);
      g.neckAngle = Math.sin(g.legFrame * 0.5) * 0.15;
    });
  };

  const updateHoop = (canvas: HTMLCanvasElement) => {
    const h = gameState.current.hoop;
    if (!h.active || h.landed) return;
    h.pos.x += h.vel.x;
    h.pos.y += h.vel.y;
    h.pos.z += h.vel.z;
    h.vel.z -= GRAVITY;
    if (h.pos.z <= 0) {
      h.pos.z = 0; h.landed = true; h.active = false;
      checkCollision(canvas);
      setTimeout(() => resetHoop(canvas), 1000);
    }
  };

  const updateParticles = () => {
    const parts = gameState.current.particles;
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.x += p.vx; p.y += p.vy;
      p.vy += p.isPetal ? -0.05 : 0.25;
      p.life -= 0.025;
      if (p.life <= 0) parts.splice(i, 1);
    }
  };

  const checkCollision = (canvas: HTMLCanvasElement) => {
    const h = gameState.current.hoop;
    const horizon = canvas.height * 0.6;
    const hoopScreenY = (canvas.height - 80) - h.pos.y;
    let hitAnything = false;
    gameState.current.geese.forEach(g => {
      if (g.isCaught) return;
      const gooseScreenY = horizon + g.pos.y;
      const dist = Math.hypot(h.pos.x - g.pos.x, hoopScreenY - gooseScreenY);
      if (dist < GOOSE_HITBOX_RADIUS) {
        onScoreUpdate(g.points, true);
        const pColor = g.type === 'gold' ? '#fbbf24' : (g.type === 'rainbow' ? '#ec4899' : '#FFFFFF');
        createParticles(g.pos.x, gooseScreenY - 50, pColor);
        g.isCaught = true; hitAnything = true; playSFX(SFX_HIT);
        const caughtType = g.type;
        setTimeout(() => {
          const idx = gameState.current.geese.indexOf(g);
          if (idx !== -1) gameState.current.geese[idx] = createGoose(canvas, caughtType);
        }, 1500);
      }
    });
    if (!hitAnything) {
      onScoreUpdate(0, false);
      createParticles(h.pos.x, hoopScreenY, '#333333');
      playSFX(SFX_MISS);
    }
  };

  const createParticles = (x: number, y: number, color: string) => {
    if (settings.graphicsQuality === GraphicsQuality.LOW) return;
    const count = settings.graphicsQuality === GraphicsQuality.MEDIUM ? 8 : 18;
    for (let i = 0; i < count; i++) {
      gameState.current.particles.push({
        x, y, vx: (Math.random() - 0.5) * 14, vy: (Math.random() - 0.5) * 10 - 6, life: 1.2, color, isPetal: false
      });
    }
  };

  const drawSunsetGarden = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    ctx.save();
    const horizon = height * 0.6;
    ctx.fillStyle = '#1e1b4b'; 
    const pagodaX = width * 0.8;
    ctx.fillRect(pagodaX - 30, horizon - 150, 60, 150);
    for (let i = 0; i < 4; i++) {
        const roofY = horizon - 40 - (i * 35);
        const roofW = 100 - (i * 15);
        ctx.beginPath();
        ctx.moveTo(pagodaX - roofW/2, roofY); ctx.lineTo(pagodaX + roofW/2, roofY);
        ctx.lineTo(pagodaX + roofW/2 - 10, roofY - 15); ctx.lineTo(pagodaX - roofW/2 + 10, roofY - 15);
        ctx.fill();
    }
    const toriiX = width * 0.15;
    ctx.fillStyle = '#312e81';
    ctx.fillRect(toriiX - 60, horizon - 120, 10, 120); ctx.fillRect(toriiX + 50, horizon - 120, 10, 120);
    ctx.fillRect(toriiX - 80, horizon - 130, 160, 12); ctx.fillRect(toriiX - 70, horizon - 110, 140, 8);
    ctx.restore();
  };

  const drawGooseProcedural = (ctx: CanvasRenderingContext2D, goose: GooseState) => {
    const style = WALK_STYLES[goose.walkStyle] || WALK_STYLES[0];
    const phase = goose.legFrame;
    const bob = Math.sin(phase * 2) * (3 * style.bobMult);
    const waddle = Math.sin(phase) * (0.12 * (style.id === 0 ? 1 : 0.5)); 
    const peckProgress = goose.peckTimer > 0 ? Math.sin((goose.peckTimer / 35) * Math.PI) : 0;
    const peckAngle = peckProgress * 1.3; 
    ctx.save();
    ctx.rotate(waddle);
    let baseColor: string | CanvasGradient = goose.type === 'gold' ? '#fbbf24' : '#FFFFFF';
    const isHigh = settings.graphicsQuality === GraphicsQuality.HIGH;
    if (goose.type === 'gold') {
      const pulse = Math.sin(Date.now() / 300) * 0.5 + 0.5;
      if (isHigh) { ctx.shadowBlur = 15 + pulse * 25; ctx.shadowColor = '#fbbf24'; }
      const goldGrad = ctx.createLinearGradient(-40, -40, 60, 40);
      goldGrad.addColorStop(0, '#d97706'); goldGrad.addColorStop(0.5, '#fbbf24'); goldGrad.addColorStop(1, '#d97706'); 
      baseColor = goldGrad;
    } else if (goose.type === 'rainbow') {
      const hue = (Date.now() / 5) % 360;
      if (isHigh) { ctx.shadowBlur = 25; ctx.shadowColor = `hsl(${hue}, 100%, 70%)`; }
      ctx.filter = isHigh ? `hue-rotate(${hue}deg)` : 'none';
    }
    ctx.fillStyle = baseColor;
    ctx.beginPath(); ctx.ellipse(0, -15 + bob, 40, 26, 0, 0, Math.PI * 2); ctx.fill();
    ctx.save(); 
    const neckBaseX = style.id === 3 ? 35 : 30; const neckBaseY = style.id === 3 ? -15 : -25;
    ctx.translate(neckBaseX, neckBaseY + bob); 
    ctx.rotate(goose.neckAngle + peckAngle - waddle * 0.5 + (style.id === 3 ? 0.3 : 0)); 
    ctx.fillStyle = baseColor;
    ctx.fillRect(-8, -45, 16, 48); 
    ctx.beginPath(); ctx.arc(0, -45, 18, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(8, -48, 3.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ea580c'; ctx.beginPath(); ctx.moveTo(16, -48); ctx.lineTo(38, -44); ctx.lineTo(16, -40); ctx.fill();
    ctx.restore();
    const drawLeg = (isLeft: boolean) => {
        const legPhase = isLeft ? phase : phase + Math.PI;
        const lift = Math.max(0, Math.cos(legPhase)) * style.lift;
        const stride = Math.sin(legPhase) * style.stride;
        const legX = (isLeft ? -12 : 12) + stride;
        const legYStart = 5 + bob; const legYEnd = 28 - lift;
        ctx.strokeStyle = '#ea580c'; ctx.lineWidth = 5; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(isLeft ? -12 : 12, legYStart);
        if (lift > 2) {
            const midX = (isLeft ? -15 : 15) + stride * 0.5;
            const midY = legYStart + (legYEnd - legYStart) * 0.5 - lift * 0.4;
            ctx.quadraticCurveTo(midX, midY, legX, legYEnd);
        } else { ctx.lineTo(legX, legYEnd); }
        ctx.stroke();
        ctx.beginPath(); ctx.moveTo(legX, legYEnd); ctx.lineTo(legX + 8, legYEnd + 2); ctx.stroke();
    };
    drawLeg(true); drawLeg(false); ctx.restore();
  };

  const draw = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, time: number) => {
    const { width, height } = canvas;
    const { geese, hoop, drag, particles } = gameState.current;
    const skyGrad = ctx.createLinearGradient(0, 0, 0, height);
    skyGrad.addColorStop(0, '#312e81'); skyGrad.addColorStop(0.3, '#831843'); skyGrad.addColorStop(0.5, '#db2777'); skyGrad.addColorStop(0.7, '#fb923c'); 
    ctx.fillStyle = skyGrad; ctx.fillRect(0, 0, width, height);
    drawSunsetGarden(ctx, width, height);
    const horizon = height * 0.6;
    ctx.fillStyle = '#0f172a'; ctx.fillRect(0, horizon, width, height - horizon);
    ctx.fillStyle = '#1e1b4b'; ctx.beginPath();
    ctx.moveTo(width * 0.2, horizon); ctx.lineTo(width * 0.8, horizon);
    ctx.lineTo(width * 1.1, height); ctx.lineTo(-width * 0.1, height);
    ctx.closePath(); ctx.fill();
    
    // Skill Overlays
    if (activeSkills.freeze > 0) {
      ctx.fillStyle = 'rgba(147, 197, 253, 0.2)'; ctx.fillRect(0, 0, width, height);
    } else if (activeSkills.slow > 0) {
      ctx.fillStyle = 'rgba(236, 72, 153, 0.1)'; ctx.fillRect(0, 0, width, height);
    }
    if (activeSkills.lure > 0) {
      ctx.fillStyle = 'rgba(251, 191, 36, 0.1)';
      ctx.beginPath(); ctx.arc(width/2, horizon + height * 0.2, 100, 0, Math.PI * 2); ctx.fill();
    }

    const sortedGeese = [...geese].sort((a, b) => a.pos.y - b.pos.y);
    sortedGeese.forEach(g => {
      const gY = horizon + g.pos.y;
      const dR = g.pos.y / (height * 0.4);
      const scale = 0.5 + dR * 0.8;
      ctx.save(); ctx.translate(g.pos.x, gY); ctx.scale(scale * g.direction, scale);
      ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(0, 18, 35, 10, 0, 0, Math.PI * 2); ctx.fill();
      if (activeSkills.freeze > 0) { ctx.filter = 'brightness(1.5) saturate(0.5) hue-rotate(180deg)'; }
      drawGooseProcedural(ctx, g); ctx.restore();
      if (g.reactionTimer > 0 && g.reactionText) {
        ctx.save(); const fadeStart = 20; const opacity = g.reactionTimer > fadeStart ? 1 : g.reactionTimer / fadeStart;
        const floatUp = (60 - g.reactionTimer) * 0.5; ctx.translate(g.pos.x, gY - (140 * scale) - floatUp); ctx.globalAlpha = opacity;
        ctx.fillStyle = '#fff'; ctx.font = 'bold 28px font-asian'; ctx.textAlign = 'center'; ctx.strokeStyle = '#ec4899'; ctx.lineWidth = 4;
        ctx.strokeText(g.reactionText, 0, 0); ctx.fillText(g.reactionText, 0, 0); ctx.globalAlpha = 1; ctx.restore();
      }
    });
    const startY = height - 80;
    if (hoop.active || hoop.landed) {
      const hX = hoop.pos.x; const hY = startY - hoop.pos.y - hoop.pos.z; const hScale = Math.max(0.4, 1 - (hoop.pos.y / 700));
      ctx.save(); ctx.translate(hX, hY); ctx.scale(hScale, hScale * 0.45); 
      ctx.beginPath(); ctx.arc(0, 0, HOOP_RADIUS, 0, Math.PI * 2);
      ctx.lineWidth = 18; ctx.strokeStyle = '#FF4081'; ctx.shadowBlur = 20; ctx.shadowColor = '#FF4081'; ctx.stroke(); ctx.lineWidth = 6; ctx.strokeStyle = '#fbcfe8'; ctx.shadowBlur = 0; ctx.stroke();
      ctx.restore();
    } else if (drag.isDragging) {
      const constrainedY = Math.max(horizon + 5, Math.min(height - 5, drag.current.y));
      const targetDepthWorld = startY - constrainedY; const dScale = Math.max(0.6, 1.4 - (targetDepthWorld / 700)); 
      ctx.save(); ctx.translate(drag.current.x, constrainedY); ctx.scale(dScale, dScale * 0.4); 
      ctx.beginPath(); ctx.arc(0, 0, HOOP_RADIUS, 0, Math.PI * 2); ctx.lineWidth = 14; ctx.strokeStyle = 'rgba(255, 64, 129, 0.6)'; ctx.stroke(); ctx.restore();
      if (settings.showTrajectory) drawTrajectory(ctx, canvas, drag);
    }
    particles.forEach(p => {
      ctx.fillStyle = p.color; ctx.globalAlpha = Math.max(0, p.life);
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size || 5, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
    });
  };

  const drawTrajectory = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, drag: DragState) => {
    const startX = canvas.width / 2; const startY = canvas.height - 80; const vel = calculateThrowVelocity(drag.current.x, drag.current.y, canvas);
    ctx.save(); ctx.beginPath(); ctx.moveTo(startX, startY);
    let sX = startX, sYd = 0, sZ = 40, svX = vel.x, svY = vel.y, svZ = vel.z;
    ctx.setLineDash([8, 12]);
    for(let i=0; i<60; i++) { 
      sX += svX; sYd += svY; sZ += svZ; svZ -= GRAVITY;
      if (sZ <= 0) { ctx.lineTo(sX, startY - sYd); break; }
      if (i % 2 === 0) ctx.lineTo(sX, startY - sYd - sZ);
    }
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)'; ctx.lineWidth = 3; ctx.stroke(); ctx.restore();
  };

  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current && canvasRef.current) {
        canvasRef.current.width = containerRef.current.clientWidth;
        canvasRef.current.height = containerRef.current.clientHeight;
        initGame();
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, [initGame]);

  return (
    <div ref={containerRef} className="absolute inset-0 w-full h-full touch-none">
      <canvas ref={canvasRef} onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onPointerLeave={handlePointerUp} className={`block w-full h-full touch-none ${isPaused ? 'cursor-default' : 'cursor-crosshair'}`} />
    </div>
  );
};

export default GameEngine;
