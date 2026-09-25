// App Component — 3D Interactive Neural Globe Login Page + Structured 3-Column Dashboard
const { useState, useEffect, useRef, useCallback } = React;
const {
  IconTower, IconTowerVision, IconUpload, IconQuality, IconYolo, IconChart, IconCanvas, IconReport,
  IconShieldAlert, IconCheck, IconX, IconUser, IconLock, IconMail, IconMouse,
  IconEye, IconEyeOff, IconZoomIn, IconZoomOut, IconDrone, IconWrench,
  IconSparkles, IconArrowRight, IconArrowDown
} = window;

// ─── 3D INTERACTIVE ROTATING NEURAL NETWORK GLOBE CANVAS ───
function NeuralGlobeCanvas() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    let width = (canvas.width = canvas.parentElement?.offsetWidth || 500);
    let height = (canvas.height = canvas.parentElement?.offsetHeight || 650);

    const handleResize = () => {
      if (canvas.parentElement) {
        width = canvas.width = canvas.parentElement.offsetWidth;
        height = canvas.height = canvas.parentElement.offsetHeight;
      }
    };
    window.addEventListener('resize', handleResize);

    // Mouse interactivity state
    let isDragging = false;
    let prevMousePos = { x: 0, y: 0 };
    let velX = 0.006;
    let velY = 0.002;
    const mouseScreen = { x: null, y: null };
    const shockwaves = [];

    const handleMouseDown = (e) => {
      isDragging = true;
      prevMousePos = { x: e.clientX, y: e.clientY };
    };

    const handleMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      mouseScreen.x = e.clientX - rect.left;
      mouseScreen.y = e.clientY - rect.top;

      if (isDragging) {
        const deltaX = e.clientX - prevMousePos.x;
        const deltaY = e.clientY - prevMousePos.y;
        velX = deltaX * 0.004;
        velY = deltaY * 0.004;
        prevMousePos = { x: e.clientX, y: e.clientY };
      }
    };

    const handleMouseUp = () => {
      isDragging = false;
    };

    const handleClick = (e) => {
      const rect = canvas.getBoundingClientRect();
      shockwaves.push({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        radius: 10,
        maxRadius: 200,
        alpha: 1.0
      });
    };

    const handleMouseLeave = () => {
      isDragging = false;
      mouseScreen.x = null;
      mouseScreen.y = null;
    };

    canvas.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('click', handleClick);
    canvas.addEventListener('mouseleave', handleMouseLeave);

    // Create 3D points on Fibonacci sphere
    const nodeCount = 130;
    const globeRadius = Math.min(width, height) * 0.38;
    const nodes = [];
    const phi = (1 + Math.sqrt(5)) / 2;

    for (let i = 0; i < nodeCount; i++) {
      const y = 1 - (i / (nodeCount - 1)) * 2;
      const radiusAtY = Math.sqrt(1 - y * y);
      const theta = (2 * Math.PI * i) / phi;

      nodes.push({
        x: Math.cos(theta) * radiusAtY * globeRadius,
        y: y * globeRadius,
        z: Math.sin(theta) * radiusAtY * globeRadius,
        baseColor: i % 4 === 0 ? '#c86446' : (i % 4 === 1 ? '#60a5fa' : (i % 4 === 2 ? '#38bdf8' : '#4ade80'))
      });
    }

    let angleY = 0;
    let angleX = 0.2;

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      if (!isDragging) {
        velX *= 0.96;
        velY *= 0.96;
        if (Math.abs(velX) < 0.003) velX = 0.005;
      }
      angleY += velX;
      angleX += velY;

      const cx = width / 2;
      const cy = height / 2;
      const fov = 420;

      for (let i = shockwaves.length - 1; i >= 0; i--) {
        const sw = shockwaves[i];
        sw.radius += 5;
        sw.alpha -= 0.02;

        if (sw.alpha <= 0 || sw.radius > sw.maxRadius) {
          shockwaves.splice(i, 1);
          continue;
        }

        ctx.beginPath();
        ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(245, 158, 11, ${sw.alpha * 0.7})`;
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      const projected = nodes.map(node => {
        let x1 = node.x * Math.cos(angleY) - node.z * Math.sin(angleY);
        let z1 = node.x * Math.sin(angleY) + node.z * Math.cos(angleY);

        let y2 = node.y * Math.cos(angleX) - z1 * Math.sin(angleX);
        let z2 = node.y * Math.sin(angleX) + z1 * Math.cos(angleX);

        const scale = fov / (fov + z2 + globeRadius);
        const px = cx + x1 * scale;
        const py = cy + y2 * scale;

        let distMouse = 999;
        if (mouseScreen.x !== null && mouseScreen.y !== null) {
          const dx = px - mouseScreen.x;
          const dy = py - mouseScreen.y;
          distMouse = Math.sqrt(dx * dx + dy * dy);
        }

        return {
          x: px, y: py, z: z2, scale,
          color: distMouse < 100 ? '#f59e0b' : node.baseColor,
          rawX: x1, rawY: y2, rawZ: z2,
          isNearMouse: distMouse < 100,
          distMouse
        };
      });

      projected.sort((a, b) => b.z - a.z);

      for (let i = 0; i < projected.length; i++) {
        const p1 = projected[i];
        for (let j = i + 1; j < projected.length; j++) {
          const p2 = projected[j];
          const dx = p1.rawX - p2.rawX;
          const dy = p1.rawY - p2.rawY;
          const dz = p1.rawZ - p2.rawZ;
          const dist3D = Math.sqrt(dx * dx + dy * dy + dz * dz);

          if (dist3D < globeRadius * 0.54) {
            let lineAlpha = (1 - dist3D / (globeRadius * 0.54)) * Math.max(0.04, (p1.scale + p2.scale) * 0.22);
            let lineColor = `rgba(96, 165, 250, ${lineAlpha})`;

            if (p1.isNearMouse || p2.isNearMouse) {
              lineColor = `rgba(245, 158, 11, ${lineAlpha * 2.5})`;
            }

            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = lineColor;
            ctx.lineWidth = p1.isNearMouse ? 1.6 : Math.max(0.5, p1.scale * 1.1);
            ctx.stroke();
          }
        }
      }

      if (mouseScreen.x !== null && mouseScreen.y !== null) {
        projected.forEach(p => {
          if (p.isNearMouse) {
            const alpha = (1 - p.distMouse / 100) * 0.6;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(mouseScreen.x, mouseScreen.y);
            ctx.strokeStyle = `rgba(245, 158, 11, ${alpha})`;
            ctx.lineWidth = 1.4;
            ctx.stroke();
          }
        });
      }

      projected.forEach(p => {
        let r = Math.max(1.2, 3.8 * p.scale);
        if (p.isNearMouse) r *= 1.7;

        const alpha = Math.max(0.15, (p.z + globeRadius) / (2 * globeRadius));

        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = p.isNearMouse ? 18 : (p.scale > 0.85 ? 10 : 0);
        ctx.globalAlpha = alpha;
        ctx.fill();
        ctx.globalAlpha = 1.0;
        ctx.shadowBlur = 0;
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      canvas.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('click', handleClick);
      canvas.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: '100%', height: '100%', display: 'block' }}
    />
  );
}

// ─── AMBIENT NEURAL MESH FOR HERO ───
function NeuralNetworkCanvas() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    let width = (canvas.width = canvas.parentElement?.offsetWidth || window.innerWidth);
    let height = (canvas.height = canvas.parentElement?.offsetHeight || window.innerHeight);

    const handleResize = () => {
      if (canvas.parentElement) {
        width = canvas.width = canvas.parentElement.offsetWidth;
        height = canvas.height = canvas.parentElement.offsetHeight;
      }
    };
    window.addEventListener('resize', handleResize);

    const mouse = { x: null, y: null, radius: 160 };
    const handleMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
    };
    const handleMouseLeave = () => {
      mouse.x = null;
      mouse.y = null;
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);

    const particleCount = Math.min(80, Math.floor((width * height) / 12000));
    const particles = [];
    const colors = ['#1e3a5f', '#c86446', '#2b5b84', '#6b4e71'];

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.7,
        vy: (Math.random() - 0.5) * 0.7,
        radius: Math.random() * 2 + 1.2,
        color: colors[i % colors.length]
      });
    }

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0 || p.x > width) p.vx *= -1;
        if (p.y < 0 || p.y > height) p.vy *= -1;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();

        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dx = p.x - p2.x;
          const dy = p.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 130) {
            const alpha = (1 - dist / 130) * 0.2;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `rgba(30, 58, 95, ${alpha})`;
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }

        if (mouse.x !== null && mouse.y !== null) {
          const dx = p.x - mouse.x;
          const dy = p.y - mouse.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < mouse.radius) {
            const alpha = (1 - dist / mouse.radius) * 0.4;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(mouse.x, mouse.y);
            ctx.strokeStyle = `rgba(200, 100, 70, ${alpha})`;
            ctx.lineWidth = 1.2;
            ctx.stroke();
          }
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 1
      }}
    />
  );
}

// ─── DEDICATED LOGIN PAGE WITH STYLED 3D INTERACTIVE NEURAL GLOBE ───
function LoginPage({ onLoginSuccess, onBackToHome }) {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('alex.vance@towervision.ai');
  const [password, setPassword] = useState('••••••••••••');
  const [role, setRole] = useState('Structural Engineering Specialist');

  const handleSubmit = (e) => {
    e.preventDefault();
    onLoginSuccess({
      name: email.split('@')[0].replace('.', ' ').replace(/\b\w/g, c => c.toUpperCase()),
      email,
      role
    });
  };

  const handleQuickDemo = (demoType) => {
    if (demoType === 'inspector') {
      onLoginSuccess({ name: 'Marcus Brody', email: 'marcus.brody@towervision.ai', role: 'Drone Field Inspector' });
    } else {
      onLoginSuccess({ name: 'Dr. Elena Rostova', email: 'elena.rostova@towervision.ai', role: 'Chief Structural Engineer' });
    }
  };

  return (
    <div className="login-page-container">
      {/* Left Panel: Interactive 3D Neural Network Globe */}
      <div className="login-globe-panel">
        <div className="globe-canvas-wrap">
          <NeuralGlobeCanvas />
        </div>

        <div className="globe-overlay-content">
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '24px' }}>
            <div style={{
              width: '44px', height: '44px', background: 'linear-gradient(135deg, #1e3a5f, #168a8a)',
              borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(30, 58, 95, 0.4)'
            }}>
              <IconTowerVision size={26} color="#ffffff" />
            </div>
            <div>
              <span style={{ fontSize: '22px', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em' }}>
                TowerVision <span style={{ color: '#60a5fa' }}>AI</span>
              </span>
              <div style={{ fontSize: '11px', color: '#94a3b8', letterSpacing: '0.04em' }}>
                Infrastructure Intelligence Platform
              </div>
            </div>
          </div>
          <h2 style={{ fontSize: '32px', fontWeight: 800, color: '#ffffff', lineHeight: 1.25, maxWidth: '420px', marginBottom: '16px' }}>
            Autonomous Structural Asset Intelligence
          </h2>
          <p style={{ fontSize: '15px', color: '#94a3b8', maxWidth: '420px', lineHeight: 1.6 }}>
            Real-time computer vision quality gating, YOLOv8 object detection, and compliance PDF generation for telecom towers.
          </p>
        </div>

        <div className="globe-overlay-content" style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
          <div style={{ background: 'rgba(255, 255, 255, 0.08)', padding: '12px 18px', borderRadius: '12px', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <IconMouse size={16} color="#f59e0b" />
            <div>
              <div style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Interactive 3D Mesh</div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#f59e0b' }}>Drag or Hover Globe</div>
            </div>
          </div>
          <div style={{ background: 'rgba(255, 255, 255, 0.08)', padding: '12px 18px', borderRadius: '12px', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <IconQuality size={16} color="#4ade80" />
            <div>
              <div style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Pipeline Latency</div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#4ade80' }}>&lt; 15 ms</div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel: Styled Authentication Form Card */}
      <div className="login-form-panel">
        <div style={{ width: '100%', maxWidth: '440px', marginBottom: '20px' }}>
          <button onClick={onBackToHome} style={{
            background: 'none', border: 'none', color: 'var(--text-secondary)',
            fontSize: '13.5px', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px'
          }}>
            ← Back to Home
          </button>
        </div>

        <div className="login-form-card">
          <div>
            <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--accent-copper)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>
              Authentication Portal
            </div>
            <h1 style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px' }}>
              {mode === 'login' ? 'Sign In to TowerVision' : 'Create Engineering Account'}
            </h1>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              {mode === 'login' ? 'Enter your operator credentials to access the inspection workstation' : 'Set up your structural engineering team profile'}
            </p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="login-input-group">
              <label className="login-input-label">Work Email / Operator ID</label>
              <div className="login-input-wrapper">
                <span className="login-input-icon"><IconMail size={16} color="var(--text-tertiary)" /></span>
                <input type="email" className="login-input-field" value={email} onChange={e => setEmail(e.target.value)} required />
              </div>
            </div>

            <div className="login-input-group">
              <label className="login-input-label">Password</label>
              <div className="login-input-wrapper">
                <span className="login-input-icon"><IconLock size={16} color="var(--text-tertiary)" /></span>
                <input type="password" className="login-input-field" value={password} onChange={e => setPassword(e.target.value)} required />
              </div>
            </div>

            <div className="login-input-group">
              <label className="login-input-label">Platform Role</label>
              <select className="login-select-field" value={role} onChange={e => setRole(e.target.value)}>
                <option value="Structural Engineering Specialist">Structural Specialist (Reviewer)</option>
                <option value="Drone Field Inspector">Drone Field Inspector (Operator)</option>
                <option value="Infrastructure Audit Director">Infrastructure Audit Director (Executive)</option>
              </select>
            </div>

            <button type="submit" className="login-btn-submit">
              {mode === 'login' ? 'Enter Inspection Console →' : 'Complete Registration →'}
            </button>
          </form>

          {/* Quick Demo Access Options */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', paddingTop: '16px', borderTop: '1px solid var(--border-default)' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-tertiary)' }}>
              1-Click Demo Logins
            </span>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div className="quick-demo-card" onClick={() => handleQuickDemo('inspector')}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <IconDrone size={18} color="var(--accent-primary)" />
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)' }}>Inspector Access</div>
                    <div style={{ fontSize: '10.5px', color: 'var(--text-tertiary)' }}>Field Operator</div>
                  </div>
                </div>
                <span style={{ fontSize: '14px', color: 'var(--text-tertiary)' }}>→</span>
              </div>
              <div className="quick-demo-card" onClick={() => handleQuickDemo('engineer')}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <IconWrench size={18} color="var(--accent-copper)" />
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)' }}>Specialist Access</div>
                    <div style={{ fontSize: '10.5px', color: 'var(--text-tertiary)' }}>Chief Engineer</div>
                  </div>
                </div>
                <span style={{ fontSize: '14px', color: 'var(--text-tertiary)' }}>→</span>
              </div>
            </div>
          </div>

          <div style={{ textAlign: 'center', fontSize: '13px', color: 'var(--text-tertiary)' }}>
            {mode === 'login' ? (
              <span>Don't have an account? <a href="#" style={{ color: 'var(--accent-primary)', fontWeight: 700 }} onClick={(e) => { e.preventDefault(); setMode('register'); }}>Sign up here</a></span>
            ) : (
              <span>Already registered? <a href="#" style={{ color: 'var(--accent-primary)', fontWeight: 700 }} onClick={(e) => { e.preventDefault(); setMode('login'); }}>Sign in here</a></span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── LANDING PAGE COMPONENT ───
function LandingPage({ onGetStarted, onNavigateLogin, currentUser, onLogout }) {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      background: '#f9f6f0',
      position: 'relative',
      overflow: 'hidden',
      color: '#1c1915'
    }}>
      <NeuralNetworkCanvas />

      {/* Top Nav */}
      <nav style={{
        padding: '22px 48px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        position: 'relative',
        zIndex: 10,
        background: 'rgba(255, 255, 255, 0.92)',
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid rgba(45, 38, 30, 0.1)',
        boxShadow: '0 2px 10px rgba(45, 38, 30, 0.04)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '44px', height: '44px',
            background: 'linear-gradient(135deg, #1e3a5f, #168a8a)',
            borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 14px rgba(30, 58, 95, 0.25)'
          }}>
            <IconTowerVision size={26} color="#ffffff" />
          </div>
          <div>
            <div style={{ fontSize: '19px', fontWeight: 800, color: '#1c1915', letterSpacing: '-0.02em' }}>
              TowerVision <span style={{ color: '#1e3a5f' }}>AI</span>
            </div>
            <div style={{ fontSize: '11px', color: '#877c6e', letterSpacing: '0.05em', textTransform: 'uppercase', fontWeight: 600 }}>
              Infrastructure Intelligence Platform
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            fontSize: '12px', fontFamily: 'var(--font-mono)', fontWeight: 600,
            padding: '6px 16px', background: '#e8f5e9', border: '1px solid #a5d6a7',
            borderRadius: '999px', color: '#1b5e20'
          }}>
            <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#2e7d32', boxShadow: '0 0 8px #2e7d32' }}></span>
            System Online
          </span>

          {currentUser && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                className="user-avatar-btn"
                title={`${currentUser.name || 'User'} (${currentUser.email || ''})`}
              >
                <IconUser size={16} color="#ffffff" />
              </div>
              <button onClick={onLogout} className="btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }}>Sign Out</button>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        textAlign: 'center', padding: '70px 24px 90px', position: 'relative', zIndex: 10
      }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 20px',
          background: 'rgba(30, 58, 95, 0.08)', border: '1px solid rgba(30, 58, 95, 0.22)',
          borderRadius: '999px', marginBottom: '28px', fontSize: '12.5px', fontWeight: 700,
          color: '#1e3a5f', letterSpacing: '0.03em'
        }}>
          <IconSparkles size={15} color="#1e3a5f" /> Real-Time Computer Vision &amp; Deep Learning Pipeline
        </div>

        <h1 style={{
          fontSize: 'clamp(38px, 5.8vw, 62px)', fontWeight: 800, lineHeight: 1.14,
          color: '#1c1915', letterSpacing: '-0.03em', maxWidth: '860px', marginBottom: '22px'
        }}>
          Intelligent Structural{' '}
          <span style={{
            background: 'linear-gradient(135deg, #1e3a5f 0%, #2c4c7c 50%, #c86446 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text'
          }}>
            Tower Inspection
          </span>
          <br />for Critical Infrastructure
        </h1>

        <blockquote style={{ maxWidth: '700px', marginBottom: '46px', padding: '0 24px', position: 'relative' }}>
          <p style={{ fontSize: '18.5px', fontStyle: 'italic', color: '#595045', lineHeight: 1.7, fontWeight: 500 }}>
            "Every piece of critical infrastructure deserves the precision of AI-driven analysis.
            We don't just detect — we understand, assess, and protect."
          </p>
        </blockquote>

        <div style={{ display: 'flex', gap: '16px', marginBottom: '68px', flexWrap: 'wrap', justifyContent: 'center' }}>
          <button
            onClick={onNavigateLogin}
            style={{
              background: '#1e3a5f', color: '#ffffff', border: 'none', fontSize: '15.5px', fontWeight: 700,
              fontFamily: 'var(--font-sans)', padding: '16px 40px', borderRadius: '12px', cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', gap: '10px', boxShadow: '0 8px 24px rgba(30, 58, 95, 0.28)', transition: 'all 0.2s ease'
            }}
            onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.background = '#12253f'; }}
            onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.background = '#1e3a5f'; }}
          >
            Get Started Now <IconArrowRight size={18} color="#ffffff" />
          </button>
          <a
            href="#features-section"
            onClick={(e) => {
              e.preventDefault();
              document.getElementById('features-section')?.scrollIntoView({ behavior: 'smooth' });
            }}
            style={{
              background: '#ffffff', color: '#1c1915', border: '1px solid rgba(45, 38, 30, 0.16)', fontSize: '15.5px',
              fontWeight: 600, fontFamily: 'var(--font-sans)', padding: '16px 32px', borderRadius: '12px', cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', gap: '8px', boxShadow: '0 2px 10px rgba(45, 38, 30, 0.05)', textDecoration: 'none', transition: 'all 0.2s ease'
            }}
          >
            Explore Features <IconArrowDown size={18} color="#1c1915" />
          </a>
        </div>

        {/* Pipeline Diagram with Vector SVG Icons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0', maxWidth: '820px', width: '100%', flexWrap: 'wrap', justifyContent: 'center' }}>
          {[
            { icon: <IconUpload size={24} color="#1e3a5f" />, label: 'Upload Image', color: '#1e3a5f' },
            { icon: <IconQuality size={24} color="#e65100" />, label: 'Quality Gate', color: '#e65100' },
            { icon: <IconYolo size={24} color="#c86446" />, label: 'YOLO Detection', color: '#c86446' },
            { icon: <IconChart size={24} color="#2e7d32" />, label: 'Analytics', color: '#2e7d32' },
            { icon: <IconReport size={24} color="#2b5b84" />, label: 'PDF Report', color: '#2b5b84' }
          ].map((step, i) => (
            <React.Fragment key={i}>
              <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', padding: '18px 18px',
                background: '#ffffff', border: '1px solid rgba(45, 38, 30, 0.12)', borderRadius: '14px', minWidth: '115px',
                boxShadow: '0 4px 12px rgba(45, 38, 30, 0.05)'
              }}>
                <div>{step.icon}</div>
                <span style={{ fontSize: '12px', fontWeight: 700, color: step.color }}>{step.label}</span>
              </div>
              {i < 4 && (<IconArrowRight size={16} color="#877c6e" style={{ margin: '0 8px' }} />)}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Features Section */}
      <section id="features-section" style={{ padding: '95px 40px 115px', background: '#f4efe6', borderTop: '1px solid rgba(45, 38, 30, 0.1)' }}>
        <div style={{ textAlign: 'center', marginBottom: '60px' }}>
          <h2 style={{ fontSize: '34px', fontWeight: 800, color: '#1c1915', marginBottom: '14px' }}>
            Why <span style={{ color: '#1e3a5f' }}>TowerVision</span>?
          </h2>
          <p style={{ fontSize: '16px', color: '#595045', maxWidth: '600px', margin: '0 auto', lineHeight: 1.6 }}>
            An end-to-end AI inspection pipeline designed for real-world telecommunications infrastructure — field-tested, compute-efficient, and audit-ready.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(295px, 1fr))', gap: '26px', maxWidth: '1180px', margin: '0 auto' }}>
          {[
            { icon: <IconQuality size={26} color="#e65100" />, title: 'Instant Quality Gating', desc: 'OpenCV-powered image validation in under 15ms. Rejects blurry, underexposed, or low-contrast shots before neural network execution.', accent: '#e65100' },
            { icon: <IconYolo size={26} color="#1e3a5f" />, title: 'YOLOv8 Structural Detection', desc: 'Identifies tower masts, antenna panels, mount brackets, insulators, and surface defects with real-time bounding boxes.', accent: '#1e3a5f' },
            { icon: <IconChart size={26} color="#c86446" />, title: 'Interactive Telemetry Charts', desc: 'Chart.js-powered radar plots, inventory doughnuts, and confidence histograms for deep inspection cycle analytics.', accent: '#c86446' },
            { icon: <IconCanvas size={26} color="#2e7d32" />, title: 'Canvas Bounding Box Viewer', desc: 'HTML5 Canvas viewport with zoom, pan, hover-inspect HUD tooltips, confidence filtering, and category toggles.', accent: '#2e7d32' },
            { icon: <IconReport size={26} color="#2b5b84" />, title: 'Automated PDF Audit Reports', desc: 'ReportLab-generated inspection PDFs with quality metrics, component inventories, and UTC-timestamped compliance logs.', accent: '#2b5b84' },
            { icon: <IconShieldAlert size={26} color="#c62828" />, title: 'Field-Ready Diagnostics', desc: 'When an image fails quality gating, operators receive precise recapture guidance — "Focus blurred: variance 34 < 100."', accent: '#c62828' }
          ].map((feature, i) => (
            <div key={i} style={{
              background: '#ffffff', border: '1px solid rgba(45, 38, 30, 0.12)', borderRadius: '16px', padding: '32px 28px',
              display: 'flex', flexDirection: 'column', gap: '14px', boxShadow: '0 4px 16px rgba(45, 38, 30, 0.05)'
            }}>
              <div style={{ width: '50px', height: '50px', borderRadius: '14px', background: `${feature.accent}12`, border: `1px solid ${feature.accent}25`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{feature.icon}</div>
              <h3 style={{ fontSize: '17.5px', fontWeight: 700, color: '#1c1915' }}>{feature.title}</h3>
              <p style={{ fontSize: '14px', color: '#595045', lineHeight: 1.6 }}>{feature.desc}</p>
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div style={{ textAlign: 'center', marginTop: '70px' }}>
          <button
            onClick={onNavigateLogin}
            style={{
              background: '#1e3a5f',
              color: '#ffffff',
              border: 'none',
              fontSize: '15.5px',
              fontWeight: 700,
              fontFamily: 'var(--font-sans)',
              padding: '16px 44px',
              borderRadius: '12px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '10px',
              boxShadow: '0 8px 24px rgba(30, 58, 95, 0.28)',
              transition: 'all 0.2s ease'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.background = '#12253f';
              e.currentTarget.style.boxShadow = '0 12px 32px rgba(30, 58, 95, 0.38)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.background = '#1e3a5f';
              e.currentTarget.style.boxShadow = '0 8px 24px rgba(30, 58, 95, 0.28)';
            }}
          >
            Get Started Now →
          </button>
          <p style={{ marginTop: '14px', fontSize: '13px', color: '#877c6e', fontWeight: 500 }}>
            No signup required. Select your role and start inspecting in seconds.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ padding: '24px 48px', borderTop: '1px solid rgba(45, 38, 30, 0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12.5px', color: '#877c6e', background: '#ffffff' }}>
        <span>TowerVision AI v1.0.0 — Computer Vision &amp; Structural Inspection</span>
        <span>OpenCV 4.8 · YOLOv8 · Chart.js · React 18</span>
      </footer>
    </div>
  );
}

// ─── STRUCTURED 3-COLUMN INSPECTION CONSOLE DASHBOARD ───
function InspectionConsole({ onBackToLanding, currentUser, onNavigateLogin }) {
  const [activeTab, setActiveTab] = useState('main');
  const [isLoading, setIsLoading] = useState(false);
  const [inspectionResult, setInspectionResult] = useState(null);
  const [rawImageUrl, setRawImageUrl] = useState(null);
  const [highlightedId, setHighlightedId] = useState(null);
  const [minConfidence, setMinConfidence] = useState(0.35);
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  const uploadAndInspect = async (file) => {
    setIsLoading(true);
    setHighlightedId(null);
    const localUrl = URL.createObjectURL(file);
    setRawImageUrl(localUrl);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/v1/inspect', { method: 'POST', body: formData });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Inspection pipeline request failed');
      }
      const data = await response.json();
      setInspectionResult(data);
      // Retain clean original image for crisp, interactive HTML5 canvas bounding box overlays
      if (data.original_image_url) {
        setRawImageUrl(data.original_image_url);
      }
    } catch (err) {
      alert('Inspection Failure: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault(); e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault(); e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) uploadAndInspect(e.dataTransfer.files[0]);
  };

  const loadPresetSample = (type) => {
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 900;
    const ctx = canvas.getContext('2d');

    if (type === 'good') {
      const grad = ctx.createLinearGradient(0, 0, 0, 900);
      grad.addColorStop(0, '#2b5b84');
      grad.addColorStop(1, '#f4efe6');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 1200, 900);
      ctx.strokeStyle = '#1c1915';
      ctx.lineWidth = 14;
      ctx.beginPath();
      ctx.moveTo(500, 900); ctx.lineTo(570, 100);
      ctx.moveTo(700, 900); ctx.lineTo(630, 100);
      ctx.stroke();
      ctx.lineWidth = 5;
      for (let y = 120; y < 900; y += 70) {
        const r = (y - 100) / 800;
        const x1 = 570 - 70 * r, x2 = 630 + 70 * r;
        ctx.beginPath();
        ctx.moveTo(x1, y); ctx.lineTo(x2, y + 70);
        ctx.moveTo(x2, y); ctx.lineTo(x1, y + 70);
        ctx.stroke();
      }
      ctx.fillStyle = '#6b4e71';
      ctx.fillRect(540, 180, 28, 120);
      ctx.fillRect(632, 180, 28, 120);
      ctx.fillRect(530, 360, 26, 110);
      ctx.fillRect(644, 360, 26, 110);
      ctx.fillStyle = '#2e7d32';
      ctx.fillRect(520, 220, 160, 10);
      ctx.fillRect(510, 400, 180, 10);
      ctx.fillStyle = '#c62828';
      ctx.fillRect(555, 680, 90, 35);
    } else if (type === 'blur') {
      ctx.fillStyle = '#877c6e';
      ctx.fillRect(0, 0, 1200, 900);
      ctx.filter = 'blur(40px)';
      ctx.fillStyle = '#1c1915';
      ctx.fillRect(500, 100, 200, 800);
    } else if (type === 'dark') {
      ctx.fillStyle = '#0a0908';
      ctx.fillRect(0, 0, 1200, 900);
      ctx.fillStyle = '#1c1915';
      ctx.fillRect(550, 100, 100, 800);
    }

    canvas.toBlob((blob) => {
      const file = new File([blob], 'sample_' + type + '.jpg', { type: 'image/jpeg' });
      uploadAndInspect(file);
    }, 'image/jpeg', 0.92);
  };

  const detections = inspectionResult?.detection_summary?.detections || [];
  const qualityData = inspectionResult?.quality_assessment || null;
  const isAccepted = inspectionResult?.status === 'COMPLETED_ACCEPTED';

  return (
    <div className="app-container">
      {/* Console Header */}
      <header className="console-header">
        <div className="brand-section">
          <div className="brand-logo-badge" onClick={onBackToLanding} style={{ cursor: 'pointer' }}>
            <IconTowerVision size={24} color="#ffffff" />
          </div>
          <div>
            <div className="brand-title">
              TowerVision <span className="tag">Console</span>
            </div>
            <div className="brand-subtitle">Infrastructure Inspection Workstation</div>
          </div>
        </div>

        <nav className="nav-tabs">
          <button className={'nav-tab-btn ' + (activeTab === 'main' ? 'active' : '')} onClick={() => setActiveTab('main')}>
            <IconCanvas size={15} /> Inspection Workstation
          </button>
          <button className={'nav-tab-btn ' + (activeTab === 'analytics' ? 'active' : '')} onClick={() => setActiveTab('analytics')}>
            <IconChart size={15} /> Telemetry Charts
          </button>
          <button className={'nav-tab-btn ' + (activeTab === 'audit' ? 'active' : '')} onClick={() => setActiveTab('audit')}>
            <IconReport size={15} /> Audit Inventory
          </button>
        </nav>

        <div className="nav-status-items">
          <span className="status-pill">
            <span className="status-indicator-dot"></span>
            ONLINE
          </span>

          {currentUser ? (
            <div
              className="user-avatar-btn"
              title={`${currentUser.name || 'User'} (${currentUser.email || ''}) • ${currentUser.role || ''}`}
            >
              <IconUser size={16} color="#ffffff" />
            </div>
          ) : (
            <button onClick={onNavigateLogin} className="btn-secondary" style={{ padding: '6px 14px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <IconLock size={13} /> Sign In
            </button>
          )}

          {inspectionResult?.report_download_url && (
            <a href={inspectionResult.report_download_url} target="_blank" rel="noopener noreferrer" className="btn-primary" style={{ padding: '6px 14px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <IconReport size={14} /> Download PDF
            </a>
          )}
        </div>
      </header>

      {/* Dashboard Workspace */}
      <main className="console-workspace">
        {/* Top Control & Telemetry Bar */}
        <div className="telemetry-strip">
          <div className="telemetry-group">
            <div className="telemetry-cell">
              <span className="telemetry-label">Inspection ID</span>
              <span className="telemetry-value">{inspectionResult?.inspection_id ? '#' + inspectionResult.inspection_id : '--'}</span>
            </div>
            <div className="telemetry-cell">
              <span className="telemetry-label">Quality Gating</span>
              <span className="telemetry-value" style={{
                color: isAccepted ? 'var(--status-pass-light)' : inspectionResult?.status ? 'var(--status-fail-light)' : 'var(--text-secondary)',
                fontSize: inspectionResult?.status ? '14px' : '15.5px'
              }}>
                {inspectionResult?.status?.replace(/_/g, ' ') || 'Awaiting Image'}
              </span>
            </div>
            <div className="telemetry-cell">
              <span className="telemetry-label">Assets Detected</span>
              <span className="telemetry-value">{inspectionResult?.detection_summary?.total_objects ?? '--'}</span>
            </div>
            <div className="telemetry-cell">
              <span className="telemetry-label">Pipeline Latency</span>
              <span className="telemetry-value">
                {inspectionResult?.detection_summary?.inference_time_ms
                  ? inspectionResult.detection_summary.inference_time_ms + ' ms'
                  : qualityData ? '< 15 ms' : '--'}
              </span>
            </div>
          </div>

          <div className="presets-container">
            <span className="presets-label">Quick Test Presets:</span>
            <div className="preset-buttons-row">
              <button className="btn-preset" onClick={() => loadPresetSample('good')}>
                <IconTower size={14} color="var(--accent-primary)" /> Clear Mast
              </button>
              <button className="btn-preset" onClick={() => loadPresetSample('blur')}>
                <IconShieldAlert size={14} color="var(--accent-copper)" /> Motion Blur
              </button>
              <button className="btn-preset" onClick={() => loadPresetSample('dark')}>
                <IconEyeOff size={14} color="var(--text-secondary)" /> Underexposed
              </button>
            </div>
          </div>
        </div>

        {/* TAB: Inspection Workstation */}
        {activeTab === 'main' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '28px', width: '100%' }}>
            {/* Top Row: Left Ingestion/Quality Gate + Right Canvas Viewport */}
            <div className="dashboard-workspace-grid">
              {/* Column 1: Image Ingestion & Quality Gate Assessment */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div className="card-panel">
                  <div className="card-header">
                    <div className="card-title-group">
                      <span className="stage-number">STAGE 1</span>
                      <span className="card-title">Image Ingestion</span>
                    </div>
                  </div>
                  <div className="card-body">
                    <input type="file" ref={fileInputRef} accept="image/*" hidden onChange={(e) => {
                      if (e.target.files && e.target.files[0]) uploadAndInspect(e.target.files[0]);
                    }} />
                    <div
                      className={'dropzone ' + (dragActive ? 'dragover' : '')}
                      onClick={() => fileInputRef.current.click()}
                      onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}
                    >
                      <div className="dropzone-icon">
                        <IconUpload size={24} color="var(--accent-primary)" />
                      </div>
                      <div>
                        <div className="dropzone-text-primary">Click to Browse or Drag Image</div>
                        <div className="dropzone-text-secondary">JPEG, PNG, WEBP (Max 25 MB)</div>
                      </div>
                    </div>
                  </div>
                </div>

                <QualityMetricsCard qualityData={qualityData} detectionSummary={inspectionResult?.detection_summary} />
              </div>

              {/* Column 2: Main Workstation Canvas Viewport */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', minWidth: 0 }}>
                <CanvasViewer
                  imageUrl={rawImageUrl} detections={detections} highlightedId={highlightedId}
                  onHoverDetection={setHighlightedId} minConfidence={minConfidence}
                  onChangeMinConfidence={setMinConfidence} selectedCategory={selectedCategory}
                  onSelectCategory={setSelectedCategory} isLoading={isLoading}
                />
              </div>
            </div>

            {/* Bottom Full-Width Section: Complete Structural Asset & Defect Inventory Table */}
            <div style={{ width: '100%' }}>
              <InventoryTable detections={detections} highlightedId={highlightedId}
                onHoverRow={setHighlightedId} minConfidence={minConfidence} selectedCategory={selectedCategory} />
            </div>
          </div>
        )}

        {/* TAB: Telemetry Analytics */}
        {activeTab === 'analytics' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <TelemetryCharts qualityData={qualityData} detectionSummary={inspectionResult?.detection_summary}
              activeCategory={selectedCategory} onSelectCategory={setSelectedCategory} />
          </div>
        )}

        {/* TAB: Audit Inventory */}
        {activeTab === 'audit' && (
          <InventoryTable detections={detections} highlightedId={highlightedId}
            onHoverRow={setHighlightedId} minConfidence={minConfidence} selectedCategory={selectedCategory} />
        )}
      </main>

      {/* Footer */}
      <footer className="console-footer">
        <div className="footer-left">
          <span style={{ cursor: 'pointer', color: 'var(--accent-primary)', fontWeight: 600 }} onClick={onBackToLanding}>← Back to Home</span>
          <span>·</span>
          <span>OpenCV 4.8 + YOLOv8 + Chart.js</span>
        </div>
        <span>Console v1.0.0</span>
      </footer>
    </div>
  );
}

// ─── ROOT APP (Router between Landing, Login & Console) ───
function App() {
  const [currentView, setCurrentView] = useState('landing');
  const [currentUser, setCurrentUser] = useState(null);

  const handleLoginSuccess = (userData) => {
    setCurrentUser(userData);
    setCurrentView('console');
  };

  const handleLogout = () => {
    setCurrentUser(null);
  };

  if (currentView === 'login') {
    return <LoginPage onLoginSuccess={handleLoginSuccess} onBackToHome={() => setCurrentView('landing')} />;
  }

  if (currentView === 'landing') {
    return (
      <LandingPage
        onGetStarted={() => setCurrentView('console')}
        onNavigateLogin={() => setCurrentView('login')}
        currentUser={currentUser}
        onLogout={handleLogout}
      />
    );
  }

  return (
    <InspectionConsole
      onBackToLanding={() => setCurrentView('landing')}
      onNavigateLogin={() => setCurrentView('login')}
      currentUser={currentUser}
    />
  );
}

// Mount
const rootElement = document.getElementById('root');
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(<App />);
}
