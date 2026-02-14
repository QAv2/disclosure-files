(async function() {
// ═══════════════════════════════════════
// CANVAS CONTROLLER (shared infrastructure)
// ═══════════════════════════════════════

class CanvasController {
  constructor({ canvasId, containerId, centerOrigin = false, zoomInFactor = 1.1, zoomOutFactor = 0.9, hitTest, onNodeClick, onHover, isActive }) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.container = document.getElementById(containerId);
    this.centerOrigin = centerOrigin;
    this.zoomInFactor = zoomInFactor;
    this.zoomOutFactor = zoomOutFactor;
    this.hitTest = hitTest;
    this.onNodeClick = onNodeClick;
    this.onHover = onHover || null;
    this.isActive = isActive;

    this.W = 0; this.H = 0; this.dpr = 1;
    this.panX = 0; this.panY = 0; this.zoom = 1;
    this.hoveredNode = null;
    this.nodePositions = {};

    // Drag state
    this._isDragging = false;
    this._dragStart = { x: 0, y: 0 };
    this._panStart = { x: 0, y: 0 };

    // Touch state
    this._touchStartDist = 0;
    this._touchStartZoom = 1;
    this._touchStartTime = 0;
    this._touchStartPos = { x: 0, y: 0 };
    this._isTouchDragging = false;

    this._attachEvents();
  }

  resize() {
    this.dpr = window.devicePixelRatio || 1;
    this.W = window.innerWidth;
    this.H = window.innerHeight;
    this.canvas.width = this.W * this.dpr;
    this.canvas.height = this.H * this.dpr;
    this.canvas.style.width = this.W + 'px';
    this.canvas.style.height = this.H + 'px';
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  worldToScreen(wx, wy) {
    if (this.centerOrigin) {
      return {
        x: (wx - this.W / 2 + this.panX) * this.zoom + this.W / 2,
        y: (wy - this.H / 2 + this.panY) * this.zoom + this.H / 2
      };
    }
    return {
      x: (wx + this.panX) * this.zoom + this.W / 2,
      y: (wy + this.panY) * this.zoom + this.H / 2
    };
  }

  screenToWorld(sx, sy) {
    if (this.centerOrigin) {
      return {
        x: (sx - this.W / 2) / this.zoom + this.W / 2 - this.panX,
        y: (sy - this.H / 2) / this.zoom + this.H / 2 - this.panY
      };
    }
    return {
      x: (sx - this.W / 2) / this.zoom - this.panX,
      y: (sy - this.H / 2) / this.zoom - this.panY
    };
  }

  resetView() { this.panX = 0; this.panY = 0; this.zoom = 1; }
  zoomIn() { this.zoom = Math.min(3, this.zoom * this.zoomInFactor); }
  zoomOut() { this.zoom = Math.max(0.3, this.zoom * this.zoomOutFactor); }

  _attachEvents() {
    this.container.addEventListener('mousedown', (e) => {
      if (!this.isActive()) return;
      this._isDragging = true;
      this._dragStart = { x: e.clientX, y: e.clientY };
      this._panStart = { x: this.panX, y: this.panY };
      this.container.classList.add('dragging');
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.isActive()) return;
      if (this._isDragging) {
        this.panX = this._panStart.x + (e.clientX - this._dragStart.x) / this.zoom;
        this.panY = this._panStart.y + (e.clientY - this._dragStart.y) / this.zoom;
      }
      const nodeId = this.hitTest ? this.hitTest(this, e.clientX, e.clientY) : null;
      this.hoveredNode = nodeId;
      this.container.style.cursor = nodeId ? 'pointer' : (this._isDragging ? 'grabbing' : 'grab');
      if (this.onHover) this.onHover(nodeId, e, this._isDragging);
    });

    window.addEventListener('mouseup', (e) => {
      if (!this.isActive()) return;
      const wasDragging = this._isDragging;
      this._isDragging = false;
      this.container.classList.remove('dragging');
      if (wasDragging && Math.abs(e.clientX - this._dragStart.x) < 5 && Math.abs(e.clientY - this._dragStart.y) < 5) {
        if (this.hoveredNode && this.onNodeClick) this.onNodeClick(this.hoveredNode);
      }
    });

    this.container.addEventListener('wheel', (e) => {
      if (!this.isActive()) return;
      e.preventDefault();
      const factor = e.deltaY > 0 ? this.zoomOutFactor : this.zoomInFactor;
      this.zoom = Math.max(0.3, Math.min(3, this.zoom * factor));
    }, { passive: false });

    this.container.addEventListener('touchstart', (e) => {
      if (!this.isActive()) return;
      if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        this._touchStartDist = Math.sqrt(dx * dx + dy * dy);
        this._touchStartZoom = this.zoom;
        e.preventDefault();
      } else if (e.touches.length === 1) {
        const t = e.touches[0];
        this._touchStartTime = Date.now();
        this._touchStartPos = { x: t.clientX, y: t.clientY };
        this._dragStart = { x: t.clientX, y: t.clientY };
        this._panStart = { x: this.panX, y: this.panY };
        this._isTouchDragging = false;
      }
    }, { passive: false });

    this.container.addEventListener('touchmove', (e) => {
      if (!this.isActive()) return;
      e.preventDefault();
      if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (this._touchStartDist > 0) {
          this.zoom = Math.max(0.3, Math.min(3, this._touchStartZoom * (dist / this._touchStartDist)));
        }
      } else if (e.touches.length === 1) {
        const t = e.touches[0];
        const dx = t.clientX - this._dragStart.x;
        const dy = t.clientY - this._dragStart.y;
        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) this._isTouchDragging = true;
        this.panX = this._panStart.x + dx / this.zoom;
        this.panY = this._panStart.y + dy / this.zoom;
      }
    }, { passive: false });

    this.container.addEventListener('touchend', (e) => {
      if (!this.isActive()) return;
      if (e.touches.length === 0 && !this._isTouchDragging) {
        const elapsed = Date.now() - this._touchStartTime;
        if (elapsed < 300) {
          const nodeId = this.hitTest ? this.hitTest(this, this._touchStartPos.x, this._touchStartPos.y) : null;
          if (nodeId && this.onNodeClick) this.onNodeClick(nodeId);
        }
      }
      if (e.touches.length < 2) this._touchStartDist = 0;
    });
  }
}

// ═══════════════════════════════════════
// DATA: LOAD FROM EXTERNAL JSON
// ═══════════════════════════════════════

const [BRANCHES, QA_RINGS] = await Promise.all([
  fetch('data/disclosure-data.json').then(r => r.json()),
  fetch('data/qa-data.json').then(r => r.json())
]);

// Build flat node index
const ALL_NODES = {};
const BRANCH_LIST = Object.values(BRANCHES);

BRANCH_LIST.forEach(branch => {
  ALL_NODES[branch.id] = { ...branch, type: 'branch', branch: branch.id };
  branch.children.forEach(child => {
    ALL_NODES[child.id] = { ...child, type: 'child', branch: branch.id, branchColor: branch.color };
  });
});

// Build flat QA node index
const QA_ALL_NODES = {};
Object.entries(QA_RINGS).forEach(([ringId, ring]) => {
  ring.nodes.forEach(node => {
    QA_ALL_NODES[node.id] = { ...node, ring: ringId, ringColor: ring.color, ringLabel: ring.label };
  });
});

let currentTab = 'disclosure';
let showConnections = true;

// ═══════════════════════════════════════
// DISCLOSURE CANVAS
// ═══════════════════════════════════════

const tooltip = document.getElementById('tooltip');
const tooltipName = document.getElementById('tooltip-name');
const tooltipDesc = document.getElementById('tooltip-desc');

function disclosureHitTest(ctrl, sx, sy) {
  const world = ctrl.screenToWorld(sx, sy);
  for (const branch of BRANCH_LIST) {
    for (const child of branch.children) {
      const pos = ctrl.nodePositions[child.id];
      if (!pos) continue;
      const dx = world.x - pos.x, dy = world.y - pos.y;
      const childMult = window.innerWidth < 600 ? 3 : 1.5;
      const hitR = pos.radius * childMult;
      if (dx * dx + dy * dy < hitR * hitR) return child.id;
    }
  }
  for (const branch of BRANCH_LIST) {
    const pos = ctrl.nodePositions[branch.id];
    if (!pos) continue;
    const dx = world.x - pos.x, dy = world.y - pos.y;
    const branchMult = window.innerWidth < 600 ? 1.8 : 1.2;
    const hitR = pos.radius * branchMult;
    if (dx * dx + dy * dy < hitR * hitR) return branch.id;
  }
  return null;
}

function disclosureHover(nodeId, e, isDragging) {
  if (nodeId && !isDragging) {
    const node = ALL_NODES[nodeId];
    tooltipName.textContent = node.label;
    tooltipDesc.textContent = node.type === 'branch'
      ? `${node.children ? node.children.length : 0} sub-topics`
      : (node.description || '').substring(0, 100) + '...';
    tooltip.style.left = (e.clientX + 16) + 'px';
    tooltip.style.top = (e.clientY - 10) + 'px';
    tooltip.classList.add('visible');
  } else {
    tooltip.classList.remove('visible');
  }
}

const disclosureCtrl = new CanvasController({
  canvasId: 'graph',
  containerId: 'canvas-container',
  centerOrigin: false,
  zoomInFactor: 1.08,
  zoomOutFactor: 0.92,
  hitTest: disclosureHitTest,
  onNodeClick: (id) => openPanel(id),
  onHover: disclosureHover,
  isActive: () => currentTab === 'disclosure',
});

let time = 0;

function initPositions() {
  const cx = disclosureCtrl.W / 2, cy = disclosureCtrl.H / 2;
  const minDim = Math.min(disclosureCtrl.W, disclosureCtrl.H);
  const branchRadius = minDim * 0.3;
  const isMobile = minDim < 600;

  BRANCH_LIST.forEach((branch, i) => {
    const angle = (i / BRANCH_LIST.length) * Math.PI * 2 - Math.PI / 2;
    const bx = cx + Math.cos(angle) * branchRadius;
    const by = cy + Math.sin(angle) * branchRadius;
    const branchNodeRadius = isMobile ? 20 : 28;
    disclosureCtrl.nodePositions[branch.id] = { x: bx, y: by, targetX: bx, targetY: by, radius: branchNodeRadius };

    if (isMobile) {
      // Multi-ring layout: keeps children within their branch's sector
      const maxPerRing = 10;
      const baseR = minDim * 0.1;
      const ringGap = minDim * 0.06;
      const maxArc = Math.PI; // 180° spread
      const childNodeRadius = 6;
      branch.children.forEach((child, j) => {
        const ring = Math.floor(j / maxPerRing);
        const idxInRing = j % maxPerRing;
        const countInRing = Math.min(maxPerRing, branch.children.length - ring * maxPerRing);
        const r = baseR + ring * ringGap;
        const arcStep = countInRing > 1 ? maxArc / (countInRing - 1) : 0;
        const cAngle = angle + (idxInRing - (countInRing - 1) / 2) * arcStep;
        const cx2 = bx + Math.cos(cAngle) * r;
        const cy2 = by + Math.sin(cAngle) * r;
        disclosureCtrl.nodePositions[child.id] = { x: cx2, y: cy2, targetX: cx2, targetY: cy2, radius: childNodeRadius };
      });
    } else {
      // Desktop: original layout unchanged
      const childRadius = 100;
      branch.children.forEach((child, j) => {
        const cAngle = angle + ((j - (branch.children.length - 1) / 2) * 0.3);
        const cx2 = bx + Math.cos(cAngle) * childRadius;
        const cy2 = by + Math.sin(cAngle) * childRadius;
        disclosureCtrl.nodePositions[child.id] = { x: cx2, y: cy2, targetX: cx2, targetY: cy2, radius: 10 };
      });
    }
  });
}

function drawConnection(fromId, toId, alpha) {
  const from = disclosureCtrl.nodePositions[fromId];
  const to = disclosureCtrl.nodePositions[toId];
  if (!from || !to) return;
  const ctx = disclosureCtrl.ctx;
  const p1 = disclosureCtrl.worldToScreen(from.x, from.y);
  const p2 = disclosureCtrl.worldToScreen(to.x, to.y);

  ctx.beginPath();
  ctx.moveTo(p1.x, p1.y);
  const mx = (p1.x + p2.x) / 2, my = (p1.y + p2.y) / 2;
  const dx = p2.x - p1.x, dy = p2.y - p1.y;
  ctx.quadraticCurveTo(mx - dy * 0.15, my + dx * 0.15, p2.x, p2.y);
  ctx.strokeStyle = `rgba(201,168,76,${alpha * 0.12})`;
  ctx.lineWidth = 1;
  ctx.stroke();
}

function drawNode(id, node, branchData) {
  const pos = disclosureCtrl.nodePositions[id];
  if (!pos) return;
  const ctx = disclosureCtrl.ctx;
  const zoom = disclosureCtrl.zoom;
  const sp = disclosureCtrl.worldToScreen(pos.x, pos.y);
  const r = pos.radius * zoom;

  if (sp.x < -100 || sp.x > disclosureCtrl.W + 100 || sp.y < -100 || sp.y > disclosureCtrl.H + 100) return;

  const isBranch = node.type === 'branch';
  const color = isBranch ? node.color : (branchData ? branchData.color : '#666');
  const isHovered = disclosureCtrl.hoveredNode === id;
  const isResearched = node.status === 'researched';

  if (isBranch || isHovered || isResearched) {
    const glow = ctx.createRadialGradient(sp.x, sp.y, 0, sp.x, sp.y, r * (isBranch ? 3 : isResearched ? 2.8 : 2.5));
    glow.addColorStop(0, color + (isHovered ? '30' : isResearched ? '28' : '18'));
    glow.addColorStop(1, color + '00');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(sp.x, sp.y, r * (isBranch ? 3 : isResearched ? 2.8 : 2.5), 0, Math.PI * 2);
    ctx.fill();
  }

  if (isBranch) {
    const pulseR = r * (1.4 + Math.sin(time * 0.02 + BRANCH_LIST.indexOf(node) * 0.8) * 0.15);
    ctx.beginPath();
    ctx.arc(sp.x, sp.y, pulseR, 0, Math.PI * 2);
    ctx.strokeStyle = color + '25';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  if (isResearched && !isBranch) {
    const pulseR = r * (1.6 + Math.sin(time * 0.03 + id.length * 0.5) * 0.2);
    ctx.beginPath();
    ctx.arc(sp.x, sp.y, pulseR, 0, Math.PI * 2);
    ctx.strokeStyle = '#c9a84c44';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  ctx.beginPath();
  ctx.arc(sp.x, sp.y, r, 0, Math.PI * 2);
  if (isBranch) {
    const grad = ctx.createRadialGradient(sp.x - r * 0.3, sp.y - r * 0.3, 0, sp.x, sp.y, r);
    grad.addColorStop(0, color + 'cc');
    grad.addColorStop(1, color + '88');
    ctx.fillStyle = grad;
  } else if (isResearched) {
    ctx.fillStyle = isHovered ? color + 'ee' : color + 'aa';
  } else {
    ctx.fillStyle = isHovered ? color + 'cc' : color + '66';
  }
  ctx.fill();
  ctx.strokeStyle = isResearched ? '#c9a84c' : (isHovered ? color : color + '55');
  ctx.lineWidth = isResearched ? 2 : (isHovered ? 2 : 1);
  ctx.stroke();

  if (isBranch && zoom > 0.4) {
    ctx.font = `${Math.max(10, 13 * zoom)}px 'Outfit', sans-serif`;
    ctx.fillStyle = isHovered ? '#fff' : 'rgba(232,230,225,0.9)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const words = node.label.split(' ');
    if (words.length > 1 && r > 15) {
      ctx.fillText(words[0], sp.x, sp.y - 6 * zoom);
      ctx.fillText(words.slice(1).join(' '), sp.x, sp.y + 8 * zoom);
    } else {
      ctx.fillText(node.label, sp.x, sp.y);
    }
  } else if (!isBranch && zoom > 0.7) {
    ctx.font = `${Math.max(8, 10 * zoom)}px 'Outfit', sans-serif`;
    ctx.fillStyle = isHovered ? '#fff' : 'rgba(232,230,225,0.6)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(node.label, sp.x, sp.y + r + 4);
  }
}

function draw() {
  if (currentTab !== 'disclosure') return;
  time++;
  const ctx = disclosureCtrl.ctx;
  const W = disclosureCtrl.W, H = disclosureCtrl.H;
  ctx.clearRect(0, 0, W, H);

  // Background particles
  ctx.fillStyle = 'rgba(201,168,76,0.03)';
  for (let i = 0; i < 40; i++) {
    const px = ((i * 137.508 + time * 0.1) % W);
    const py = ((i * 97.31 + time * 0.07) % H);
    ctx.beginPath();
    ctx.arc(px, py, 1, 0, Math.PI * 2);
    ctx.fill();
  }

  // Draw branch-to-child lines
  BRANCH_LIST.forEach(branch => {
    const bp = disclosureCtrl.nodePositions[branch.id];
    if (!bp) return;
    const bScreen = disclosureCtrl.worldToScreen(bp.x, bp.y);
    branch.children.forEach(child => {
      const cp = disclosureCtrl.nodePositions[child.id];
      if (!cp) return;
      const cScreen = disclosureCtrl.worldToScreen(cp.x, cp.y);
      ctx.beginPath();
      ctx.moveTo(bScreen.x, bScreen.y);
      ctx.lineTo(cScreen.x, cScreen.y);
      ctx.strokeStyle = branch.color + '22';
      ctx.lineWidth = 1;
      ctx.stroke();
    });
  });

  if (showConnections) {
    BRANCH_LIST.forEach(branch => {
      branch.children.forEach(child => {
        if (child.connections) {
          child.connections.forEach(targetId => drawConnection(child.id, targetId, 1));
        }
      });
    });
  }

  BRANCH_LIST.forEach(branch => {
    branch.children.forEach(child => drawNode(child.id, ALL_NODES[child.id], branch));
  });
  BRANCH_LIST.forEach(branch => {
    drawNode(branch.id, ALL_NODES[branch.id], null);
  });

  requestAnimationFrame(draw);
}

// ═══════════════════════════════════════
// QA CANVAS
// ═══════════════════════════════════════

function qaHitTest(ctrl, sx, sy) {
  const world = ctrl.screenToWorld(sx, sy);
  let found = null;
  for (const [id, pos] of Object.entries(ctrl.nodePositions)) {
    const dx = world.x - pos.x, dy = world.y - pos.y;
    if (dx * dx + dy * dy < (pos.radius * 1.5) * (pos.radius * 1.5)) found = id;
  }
  return found;
}

const qaCtrl = new CanvasController({
  canvasId: 'qa-graph',
  containerId: 'qa-canvas-container',
  centerOrigin: true,
  zoomInFactor: 1.1,
  zoomOutFactor: 0.9,
  hitTest: qaHitTest,
  onNodeClick: (id) => qaOpenPanel(id),
  onHover: null,
  isActive: () => currentTab === 'qa',
});

let qaPrecomputedConnections = [];
let qaInitialized = false;
let qaTime = 0;

function qaInitPositions() {
  const cx = qaCtrl.W / 2, cy = qaCtrl.H / 2;

  Object.entries(QA_RINGS).forEach(([ringId, ring]) => {
    const count = ring.nodes.length;
    ring.nodes.forEach((node, i) => {
      let nx, ny, radius;
      if (ring.radius === 0) {
        nx = cx; ny = cy; radius = 36;
      } else {
        const angle = (i / count) * Math.PI * 2 - Math.PI / 2;
        const scaledRadius = ring.radius * Math.min(qaCtrl.W, qaCtrl.H) / 1200;
        nx = cx + Math.cos(angle) * scaledRadius;
        ny = cy + Math.sin(angle) * scaledRadius;
        radius = ringId === 'theorems' ? 20 :
                 ringId === 'spaces' ? 18 :
                 ringId === 'convergence' ? 14 :
                 ringId === 'applications' ? 14 : 12;
      }
      qaCtrl.nodePositions[node.id] = { x: nx, y: ny, radius: radius };
    });
  });

  // Pre-compute ring connections
  qaPrecomputedConnections = [];
  const ringOrder = ['theorems', 'spaces', 'convergence', 'applications', 'disclosure'];
  for (let ri = 0; ri < ringOrder.length - 1; ri++) {
    const innerRing = QA_RINGS[ringOrder[ri]];
    const outerRing = QA_RINGS[ringOrder[ri + 1]];
    innerRing.nodes.forEach(innerNode => {
      const innerPos = qaCtrl.nodePositions[innerNode.id];
      if (!innerPos) return;
      const closest = outerRing.nodes.map(n => ({
        id: n.id,
        dist: Math.hypot(qaCtrl.nodePositions[n.id].x - innerPos.x, qaCtrl.nodePositions[n.id].y - innerPos.y)
      })).sort((a, b) => a.dist - b.dist).slice(0, 2);
      closest.forEach(({ id: outerId }) => {
        qaPrecomputedConnections.push({ fromId: innerNode.id, toId: outerId, color: innerRing.color });
      });
    });
  }
}

function qaDraw() {
  if (currentTab !== 'qa') return;
  const ctx = qaCtrl.ctx;
  const W = qaCtrl.W, H = qaCtrl.H;

  ctx.clearRect(0, 0, W, H);
  qaTime += 0.005;

  const cx = W / 2, cy = H / 2;

  // Draw ring guides
  Object.entries(QA_RINGS).forEach(([ringId, ring]) => {
    if (ring.radius === 0) return;
    const scaledR = ring.radius * Math.min(W, H) / 1200;
    const screenCenter = qaCtrl.worldToScreen(cx, cy);
    const r = scaledR * qaCtrl.zoom;

    ctx.beginPath();
    ctx.arc(screenCenter.x, screenCenter.y, r, 0, Math.PI * 2);
    ctx.strokeStyle = ring.color + '18';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 8]);
    ctx.stroke();
    ctx.setLineDash([]);
  });

  // Draw connections from center to theorems
  const centerPos = qaCtrl.nodePositions['qa-observer'];
  if (centerPos) {
    QA_RINGS.theorems.nodes.forEach(node => {
      const pos = qaCtrl.nodePositions[node.id];
      if (!pos) return;
      const from = qaCtrl.worldToScreen(centerPos.x, centerPos.y);
      const to = qaCtrl.worldToScreen(pos.x, pos.y);

      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      const grad = ctx.createLinearGradient(from.x, from.y, to.x, to.y);
      grad.addColorStop(0, '#c9a84c44');
      grad.addColorStop(1, '#e8d5a022');
      ctx.strokeStyle = grad;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    });
  }

  // Draw pre-computed connections between rings
  qaPrecomputedConnections.forEach(({ fromId, toId, color }) => {
    const fromPos = qaCtrl.nodePositions[fromId];
    const toPos = qaCtrl.nodePositions[toId];
    if (!fromPos || !toPos) return;
    const from = qaCtrl.worldToScreen(fromPos.x, fromPos.y);
    const to = qaCtrl.worldToScreen(toPos.x, toPos.y);

    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    const midX = (from.x + to.x) / 2 + (from.y - to.y) * 0.1;
    const midY = (from.y + to.y) / 2 + (to.x - from.x) * 0.1;
    ctx.quadraticCurveTo(midX, midY, to.x, to.y);
    ctx.strokeStyle = color + '12';
    ctx.lineWidth = 0.8;
    ctx.stroke();
  });

  // Draw nodes (back to front)
  const drawOrder = ['disclosure', 'applications', 'convergence', 'spaces', 'theorems', 'center'];
  drawOrder.forEach(ringId => {
    const ring = QA_RINGS[ringId];
    if (!ring) return;

    ring.nodes.forEach(node => {
      const pos = qaCtrl.nodePositions[node.id];
      if (!pos) return;

      const screen = qaCtrl.worldToScreen(pos.x, pos.y);
      const r = pos.radius * qaCtrl.zoom;
      const isHovered = qaCtrl.hoveredNode === node.id;

      const glowR = r * (isHovered ? 3.5 : 2.5);
      const glow = ctx.createRadialGradient(screen.x, screen.y, r * 0.5, screen.x, screen.y, glowR);
      glow.addColorStop(0, ring.color + (isHovered ? '40' : '20'));
      glow.addColorStop(1, ring.color + '00');
      ctx.beginPath();
      ctx.arc(screen.x, screen.y, glowR, 0, Math.PI * 2);
      ctx.fillStyle = glow;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(screen.x, screen.y, r, 0, Math.PI * 2);
      ctx.fillStyle = isHovered ? ring.color + 'cc' : ring.color + '88';
      ctx.fill();
      ctx.strokeStyle = ring.color;
      ctx.lineWidth = isHovered ? 2 : 1;
      ctx.stroke();

      if (ringId === 'center') {
        const pulseR = r * (1.3 + 0.2 * Math.sin(qaTime * 2));
        ctx.beginPath();
        ctx.arc(screen.x, screen.y, pulseR, 0, Math.PI * 2);
        ctx.strokeStyle = '#c9a84c' + Math.round(40 + 20 * Math.sin(qaTime * 2)).toString(16).padStart(2, '0');
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      if (qaCtrl.zoom > 0.4) {
        ctx.font = `${isHovered ? 600 : 400} ${Math.max(9, 12 * qaCtrl.zoom)}px Outfit`;
        ctx.textAlign = 'center';
        ctx.fillStyle = isHovered ? '#fff' : '#e8e6e1cc';
        ctx.fillText(node.label, screen.x, screen.y + r + 16 * qaCtrl.zoom);

        if (node.subtitle && qaCtrl.zoom > 0.6) {
          ctx.font = `300 ${Math.max(7, 9 * qaCtrl.zoom)}px "JetBrains Mono"`;
          ctx.fillStyle = '#8a8a9a88';
          ctx.fillText(node.subtitle, screen.x, screen.y + r + 28 * qaCtrl.zoom);
        }
      }
    });
  });

  // Attribution
  ctx.font = '300 10px "JetBrains Mono"';
  ctx.fillStyle = '#5a5a6a44';
  ctx.textAlign = 'right';
  ctx.fillText('Vanhorn (2025) \u00b7 DOI: 10.5281/zenodo.17785676', W - 20, H - 14);

  requestAnimationFrame(qaDraw);
}

// ═══════════════════════════════════════
// INFO PANEL
// ═══════════════════════════════════════

function openPanel(nodeId) {
  const node = ALL_NODES[nodeId];
  if (!node) return;

  const panel = document.getElementById('info-panel');
  const branchData = BRANCHES[node.branch || node.id];
  const color = node.type === 'branch' ? node.color : branchData.color;

  const branchTag = document.getElementById('panel-branch');
  branchTag.textContent = branchData.label;
  branchTag.style.background = color + '20';
  branchTag.style.color = color;

  document.getElementById('panel-title').textContent = node.label;

  const statusEl = document.getElementById('panel-status');
  statusEl.textContent = node.status === 'scaffold' ? '\u25cb SCAFFOLD \u2014 Content pending' :
                         node.status === 'researched' ? '\u25cf RESEARCHED \u2014 Cross-referenced with source documents' :
                         node.status === 'draft' ? '\u25d0 DRAFT \u2014 In progress' :
                         '\u25cf PUBLISHED';
  statusEl.style.color = node.status === 'researched' ? '#c9a84c' : '';

  const body = document.getElementById('panel-body');
  let html = '';

  html += `<div class="panel-section">
    <div class="panel-section-title">Overview</div>
    <div class="panel-text">${node.description}</div>
  </div>`;

  if (node.type === 'branch' && node.children) {
    const researched = node.children.filter(c => c.status === 'researched').length;
    html += `<div class="panel-section">
      <div class="panel-section-title">Sub-Topics (${node.children.length}) \u2014 ${researched} researched</div>
      <div class="sub-nodes-list">`;
    node.children.forEach(child => {
      const statusIcon = child.status === 'researched' ? '\u25cf' : '\u25cb';
      const statusColor = child.status === 'researched' ? '#c9a84c' : '';
      html += `<div class="sub-node-item" onclick="openPanel('${child.id}')">
        <div class="sub-node-bullet" style="background:${child.status === 'researched' ? '#c9a84c' : color}"></div>
        <div class="sub-node-name">${child.label}</div>
        <div class="sub-node-status" style="color:${statusColor}">${statusIcon} ${child.status || 'scaffold'}</div>
      </div>`;
    });
    html += `</div></div>`;
  }

  if (node.connections && node.connections.length > 0) {
    html += `<div class="panel-section">
      <div class="panel-section-title">Connected To</div>
      <div class="connections-list">`;
    node.connections.forEach(connId => {
      const connNode = ALL_NODES[connId];
      if (connNode) {
        const connBranch = BRANCHES[connNode.branch || connNode.id];
        const connColor = connBranch ? connBranch.color : '#666';
        html += `<div class="connection-tag" style="border-color:${connColor}44" onclick="openPanel('${connId}')">${connNode.label}</div>`;
      }
    });
    html += `</div></div>`;
  }

  if (node.keyEvidence && node.keyEvidence.length > 0) {
    html += `<div class="panel-section">
      <div class="panel-section-title">Key Evidence</div>
      <div class="key-evidence-list">`;
    node.keyEvidence.forEach(ev => {
      html += `<div class="key-evidence-item">
        <span class="key-evidence-dot">${ev.classification}</span>
        <div class="key-evidence-body">
          <div class="key-evidence-claim">${ev.claim}</div>
          <div class="key-evidence-source">${ev.source}</div>
        </div>
      </div>`;
    });
    html += `</div></div>`;
  }

  if (node.sources && node.sources.length > 0) {
    html += `<div class="panel-section">
      <div class="panel-section-title">Primary Sources & Documents</div>
      <div class="source-list">`;
    node.sources.forEach(src => {
      const icon = src.type === 'congressional' ? '\ud83c\udfdb\ufe0f' :
                   src.type === 'court' ? '\u2696\ufe0f' :
                   src.type === 'foia' ? '\ud83d\udcc4' :
                   src.type === 'academic' ? '\ud83d\udcda' :
                   src.type === 'journalism' ? '\ud83d\udcf0' :
                   src.type === 'archive' ? '\ud83d\uddc3\ufe0f' :
                   src.type === 'government' ? '\ud83c\udfdb\ufe0f' :
                   src.type === 'data' ? '\ud83d\udcca' : '\ud83d\udd17';
      if (src.url) {
        html += `<div class="source-item">
          <span class="source-icon">${icon}</span>
          <div>
            <div class="source-label">${src.label}</div>
            <a href="${src.url}" target="_blank" rel="noopener">${src.url}</a>
          </div>
        </div>`;
      } else {
        html += `<div class="source-item">
          <span class="source-icon">${icon}</span>
          <div class="source-label">${src.label}</div>
        </div>`;
      }
    });
    html += `</div></div>`;
  }

  if (node.status === 'researched') {
    html += `<div class="panel-section">
      <div class="panel-section-title">Evidence Classification</div>
      <div class="panel-text">
        <span style="color:#5a8a6a">\ud83d\udfe2 Documented</span> \u2014 Court records, official releases, DOJ documents<br>
        <span style="color:#4a7c9b">\ud83d\udd35 Strong Evidence</span> \u2014 Sworn testimony, corroborated journalism, FOIA<br>
        <span style="color:#c9a84c">\ud83d\udfe1 Credible Allegation</span> \u2014 Named sources, partial corroboration<br>
        <span style="color:#b8763a">\ud83d\udfe0 Circumstantial</span> \u2014 Pattern analysis, unnamed sources<br>
        <span style="color:#a63d40">\ud83d\udd34 Speculative</span> \u2014 Theory, inference, unverified
      </div>
    </div>`;
    html += `<div class="panel-section">
      <div class="panel-section-title">Sources</div>
      <div class="panel-text" style="font-family:'JetBrains Mono',monospace; font-size:11px; color: var(--text-secondary);">
        DOJ Epstein Library (justice.gov/epstein) \u2022 FBI Vault \u2022 House Oversight Committee \u2022 Community Archive (epstein-docs.github.io) \u2022 INSLAW/PROMIS court records \u2022 Congressional reports (Church Committee 1976, Kerry Committee 1989, BCCI Report 1992) \u2022 Whitney Webb/MintPress News/Unlimited Hangout (PROMIS\u2192Palantir pipeline, Unit 8200, Carbyne) \u2022 BCCI Senate Report via FAS (irp.fas.org) \u2022 Investigative journalism (Al Jazeera, Drop Site News, CBS, CNN, AP, NPR, Middle East Eye, The Telegraph)
      </div>
    </div>`;
  } else {
    html += `<div class="panel-section">
      <div class="panel-section-title">Key Questions</div>
      <div class="panel-text" style="font-style:italic; color: var(--text-dim);">
        Content will be populated here \u2014 key questions this node seeks to answer, evidence, sources, and deeper analysis.
      </div>
    </div>`;
    html += `<div class="panel-section">
      <div class="panel-section-title">Sources & Evidence</div>
      <div class="panel-text" style="font-style:italic; color: var(--text-dim);">
        Hard data, documents, whistleblower testimony, and primary sources to be compiled here.
      </div>
    </div>`;
  }

  body.innerHTML = html;
  panel.classList.add('open');
}

document.getElementById('panel-close').addEventListener('click', () => {
  document.getElementById('info-panel').classList.remove('open');
});

// ═══════════════════════════════════════
// QA PANEL
// ═══════════════════════════════════════

function qaOpenPanel(nodeId) {
  const node = QA_ALL_NODES[nodeId];
  if (!node) return;

  const panel = document.getElementById('info-panel');
  document.getElementById('panel-branch').textContent = node.ringLabel;
  document.getElementById('panel-branch').style.background = node.ringColor + '22';
  document.getElementById('panel-branch').style.color = node.ringColor;
  document.getElementById('panel-title').textContent = node.label;
  document.getElementById('panel-status').textContent = node.subtitle || '';

  let html = '';

  if (node.description) {
    html += `<div class="panel-section">
      <div class="panel-section-title">Description</div>
      <div class="panel-text">${node.description.replace(/\n/g, '<br>')}</div>
    </div>`;
  }

  if (node.connections && node.connections.length > 0) {
    html += `<div class="panel-section">
      <div class="panel-section-title">Disclosure Map Connections</div>
      <div class="connections-list">`;
    node.connections.forEach(connId => {
      const connNode = ALL_NODES[connId];
      if (connNode) {
        const connColor = connNode.branchColor || '#666';
        html += `<div class="connection-tag" style="border-color:${connColor}44" onclick="switchTab('disclosure'); setTimeout(() => openPanel('${connId}'), 300);">${connNode.label}</div>`;
      }
    });
    html += `</div></div>`;
  }

  html += `<div class="panel-section">
    <div class="panel-section-title">Source</div>
    <div class="panel-text" style="font-family:'JetBrains Mono',monospace; font-size:11px; color: var(--text-secondary);">
      Vanhorn, J. (2025). <em>Qualia Algebra v2.2</em>. Zenodo.<br>
      DOI: <a href="https://doi.org/10.5281/zenodo.17785676" target="_blank" style="color:var(--accent-gold);">10.5281/zenodo.17785676</a><br>
      Paper: <a href="https://github.com/QAv2/qualia-algebra/blob/main/papers/Qualia_Algebra_Comprehensive.md" target="_blank" style="color:var(--accent-gold);">github.com/QAv2/qualia-algebra</a><br>
      License: CC-BY-4.0
    </div>
  </div>`;

  html += `<div class="panel-section">
    <div class="panel-section-title">Evidence Classification</div>
    <div class="panel-text">
      <span style="color:#5a8a6a">\ud83d\udfe2 Documented</span> \u2014 Published, peer-reviewed, or established fact<br>
      <span style="color:#c9a84c">\ud83d\udfe1 Credible</span> \u2014 Computational validation, published non-mainstream<br>
      <span style="color:#b8763a">\ud83d\udfe0 Well-argued inference</span> \u2014 Derived from axioms, pattern analysis<br>
      <span style="color:#a63d40">\ud83d\udd34 Speculative</span> \u2014 Untested predictions, theoretical<br><br>
      <em style="color:var(--text-dim);">EXPLORATORY: Author's own theoretical framework.<br>Not extracted third-party evidence.</em>
    </div>
  </div>`;

  document.getElementById('panel-body').innerHTML = html;
  panel.classList.add('open');
}

function qaFocusRing(ringId) {
  const ring = QA_RINGS[ringId];
  if (!ring || !ring.nodes.length) return;

  if (ringId === 'center') {
    qaCtrl.panX = 0; qaCtrl.panY = 0; qaCtrl.zoom = 1.5;
    qaOpenPanel('qa-observer');
    return;
  }

  let sumX = 0, sumY = 0;
  ring.nodes.forEach(node => {
    const pos = qaCtrl.nodePositions[node.id];
    if (pos) { sumX += pos.x; sumY += pos.y; }
  });
  const avgX = sumX / ring.nodes.length;
  const avgY = sumY / ring.nodes.length;

  qaCtrl.panX = qaCtrl.W / 2 - avgX;
  qaCtrl.panY = qaCtrl.H / 2 - avgY;
  qaCtrl.zoom = ringId === 'theorems' ? 1.8 :
                ringId === 'spaces' ? 1.3 :
                ringId === 'convergence' ? 1.0 : 0.85;
}

// ═══════════════════════════════════════
// LEGEND
// ═══════════════════════════════════════

function buildLegend() {
  const legend = document.getElementById('legend');
  legend.innerHTML = BRANCH_LIST.map(b => `
    <div class="legend-item" data-branch="${b.id}">
      <div class="legend-dot" style="background:${b.color}; box-shadow: 0 0 6px ${b.color}55;"></div>
      <div class="legend-label">${b.label}</div>
    </div>
  `).join('');

  legend.querySelectorAll('.legend-item').forEach(item => {
    item.addEventListener('click', () => {
      const branchId = item.dataset.branch;
      const pos = disclosureCtrl.nodePositions[branchId];
      if (pos) {
        disclosureCtrl.panX = -pos.x + 100;
        disclosureCtrl.panY = -pos.y;
        disclosureCtrl.zoom = 1.3;
        openPanel(branchId);
      }
    });
  });
}

// ═══════════════════════════════════════
// SEARCH
// ═══════════════════════════════════════

const searchToggle = document.getElementById('search-toggle');
const searchContainer = document.getElementById('search-container');
const searchInput = document.getElementById('search-input');
const searchResults = document.getElementById('search-results');

searchToggle.addEventListener('click', () => {
  searchContainer.classList.toggle('open');
  if (searchContainer.classList.contains('open')) searchInput.focus();
});

searchInput.addEventListener('input', () => {
  const q = searchInput.value.toLowerCase().trim();
  if (q.length < 2) {
    searchResults.classList.remove('has-results');
    return;
  }

  const matches = Object.values(ALL_NODES).filter(n =>
    n.label.toLowerCase().includes(q) ||
    (n.description && n.description.toLowerCase().includes(q))
  ).slice(0, 8);

  if (matches.length === 0) {
    searchResults.classList.remove('has-results');
    return;
  }

  searchResults.innerHTML = matches.map(n => {
    const branch = BRANCHES[n.branch || n.id];
    const color = branch ? branch.color : '#666';
    return `<div class="search-result-item" data-id="${n.id}">
      <div class="search-result-dot" style="background:${color}"></div>
      <div>
        <div class="search-result-name">${n.label}</div>
        <div class="search-result-branch">${branch ? branch.label : ''}</div>
      </div>
    </div>`;
  }).join('');

  searchResults.classList.add('has-results');

  searchResults.querySelectorAll('.search-result-item').forEach(item => {
    item.addEventListener('click', () => {
      const id = item.dataset.id;
      const pos = disclosureCtrl.nodePositions[id];
      if (pos) {
        disclosureCtrl.panX = -pos.x;
        disclosureCtrl.panY = -pos.y;
        disclosureCtrl.zoom = 1.5;
      }
      openPanel(id);
      searchContainer.classList.remove('open');
      searchInput.value = '';
      searchResults.classList.remove('has-results');
    });
  });
});

// ═══════════════════════════════════════
// CONTROLS
// ═══════════════════════════════════════

document.getElementById('reset-view').addEventListener('click', () => {
  if (currentTab === 'qa') qaCtrl.resetView();
  else disclosureCtrl.resetView();
});

document.getElementById('toggle-connections').addEventListener('click', function() {
  showConnections = !showConnections;
  this.classList.toggle('active');
});

document.getElementById('zoom-in').addEventListener('click', () => {
  if (currentTab === 'qa') qaCtrl.zoomIn();
  else disclosureCtrl.zoomIn();
});
document.getElementById('zoom-out').addEventListener('click', () => {
  if (currentTab === 'qa') qaCtrl.zoomOut();
  else disclosureCtrl.zoomOut();
});

// ═══════════════════════════════════════
// TAB SYSTEM
// ═══════════════════════════════════════

function switchTab(tab) {
  currentTab = tab;

  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tab);
  });

  document.getElementById('canvas-container').style.display = tab === 'disclosure' ? 'block' : 'none';
  document.getElementById('qa-canvas-container').style.display = tab === 'qa' ? 'block' : 'none';

  document.getElementById('legend').style.display = tab === 'disclosure' ? 'flex' : 'none';
  document.getElementById('qa-legend').classList.toggle('visible', tab === 'qa');

  document.querySelectorAll('.main-title-block').forEach(el => el.classList.toggle('hidden', tab !== 'disclosure'));
  document.querySelectorAll('.qa-title-block').forEach(el => el.classList.toggle('visible', tab === 'qa'));

  document.getElementById('info-panel').classList.remove('open');

  if (tab === 'qa') {
    qaCtrl.resize();
    if (!qaInitialized) { qaInitPositions(); qaInitialized = true; }
    qaDraw();
  } else if (tab === 'disclosure') {
    draw();
  }
}

// ═══════════════════════════════════════
// INTRO
// ═══════════════════════════════════════

document.getElementById('enter-btn').addEventListener('click', () => {
  document.getElementById('intro').classList.add('hidden');
  setTimeout(() => {
    document.getElementById('intro').style.display = 'none';
  }, 1000);
});

// ═══════════════════════════════════════
// MOBILE: LEGEND TOGGLE + PANEL SWIPE
// ═══════════════════════════════════════

const legendToggle = document.getElementById('legend-toggle');
const legendEl = document.getElementById('legend');
const qaLegendEl = document.getElementById('qa-legend');

legendToggle.addEventListener('click', () => {
  const isQA = currentTab === 'qa';
  const target = isQA ? qaLegendEl : legendEl;
  const other = isQA ? legendEl : qaLegendEl;
  other.classList.remove('mobile-open');
  target.classList.toggle('mobile-open');
  legendToggle.classList.toggle('active', target.classList.contains('mobile-open'));
});

document.addEventListener('click', (e) => {
  if (window.innerWidth > 768) return;
  if (!e.target.closest('.branch-legend') && !e.target.closest('.qa-legend') && !e.target.closest('.legend-toggle')) {
    legendEl.classList.remove('mobile-open');
    qaLegendEl.classList.remove('mobile-open');
    legendToggle.classList.remove('active');
  }
});

const infoPanel = document.getElementById('info-panel');
let panelTouchStartX = 0;
let panelTouchStartY = 0;

infoPanel.addEventListener('touchstart', (e) => {
  panelTouchStartX = e.touches[0].clientX;
  panelTouchStartY = e.touches[0].clientY;
}, { passive: true });

infoPanel.addEventListener('touchend', (e) => {
  const dx = e.changedTouches[0].clientX - panelTouchStartX;
  const dy = Math.abs(e.changedTouches[0].clientY - panelTouchStartY);
  if (dx > 80 && dy < 60) {
    infoPanel.classList.remove('open');
  }
}, { passive: true });

// ═══════════════════════════════════════
// RESIZE
// ═══════════════════════════════════════

window.addEventListener('resize', () => {
  disclosureCtrl.resize();
  initPositions();
  if (currentTab === 'qa') {
    qaCtrl.resize();
    qaInitPositions();
  }
});

// ═══════════════════════════════════════
// INIT
// ═══════════════════════════════════════

window.openPanel = openPanel;
window.switchTab = switchTab;
window.qaOpenPanel = qaOpenPanel;
window.qaFocusRing = qaFocusRing;

disclosureCtrl.resize();
initPositions();
if (Math.min(disclosureCtrl.W, disclosureCtrl.H) < 600) {
  disclosureCtrl.zoom = 0.75;
}
buildLegend();
draw();

})(); // end async IIFE
