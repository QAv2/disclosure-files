// ============================================================
// The Disclosure Files — SVG Radial Transformation Map Engine
// Pure vanilla JS + SVG, no dependencies
// v3 — Ring 3 support, wider viewBox
// ============================================================

(function () {
  "use strict";

  // ---- Constants ----
  var SVG_NS = "http://www.w3.org/2000/svg";
  var CENTER_X = 0;
  var CENTER_Y = 0;
  var CENTER_RADIUS = 80;
  var CATEGORY_RADIUS = 32;
  var SUBTOPIC_RADIUS = 14;
  var RING1_DISTANCE = 280;
  var RING2_DISTANCE = 440;
  var RING3_DISTANCE = 600;
  var CATEGORY_RING = 180;
  var DIM_OPACITY = 0.08;
  var LINE_DEFAULT_OPACITY = 0.12;
  var LINE_HIGHLIGHT_OPACITY = 0.65;

  // ---- State ----
  var state = {
    selectedNode: null,
    showConnections: true,
    zoom: 1,
    panX: 0,
    panY: 0,
    isPanning: false,
    panStartX: 0,
    panStartY: 0,
    panStartViewX: 0,
    panStartViewY: 0,
    viewBox: { x: -1200, y: -700, w: 2400, h: 1400 },
    nodePositions: {},
    nodeElements: {},
    labelElements: {},
    connectionPaths: [],
    spokePaths: [],
    branchGroups: {}
  };

  // ---- Build lookup maps (Disclosure) ----
  var nodeMap = {};
  NODES.forEach(function (n) { nodeMap[n.id] = n; });

  var connectionsByNode = {};
  NODES.forEach(function (n) { connectionsByNode[n.id] = []; });
  connectionsByNode["center"] = Object.keys(BRANCHES);

  CONNECTIONS.forEach(function (c) {
    if (!connectionsByNode[c[0]]) connectionsByNode[c[0]] = [];
    if (!connectionsByNode[c[1]]) connectionsByNode[c[1]] = [];
    connectionsByNode[c[0]].push(c[1]);
    connectionsByNode[c[1]].push(c[0]);
  });

  // For each branch, collect its nodes
  var branchNodes = {};
  Object.keys(BRANCHES).forEach(function (b) { branchNodes[b] = []; });
  NODES.forEach(function (n) { branchNodes[n.branch].push(n); });


  // ---- SVG helpers ----
  function svgEl(tag, attrs) {
    var el = document.createElementNS(SVG_NS, tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        el.setAttribute(k, attrs[k]);
      });
    }
    return el;
  }

  function deg2rad(deg) {
    return (deg * Math.PI) / 180;
  }

  // ---- Clear SVG ----
  function clearSVG() {
    var svg = document.getElementById("map-svg");
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    state.nodePositions = {};
    state.nodeElements = {};
    state.labelElements = {};
    state.connectionPaths = [];
    state.spokePaths = [];
    state.branchGroups = {};
  }

  // ---- Compute node positions (Disclosure) ----
  function computePositions() {
    state.nodePositions["center"] = { x: CENTER_X, y: CENTER_Y };

    var branchKeys = Object.keys(BRANCHES);

    branchKeys.forEach(function (bKey) {
      var branch = BRANCHES[bKey];
      var baseAngle = branch.angle;
      var nodes = branchNodes[bKey];

      // Separate ring 1, ring 2, and ring 3 nodes
      var ring1 = nodes.filter(function (n) { return n.ring === 1; });
      var ring2 = nodes.filter(function (n) { return n.ring === 2; });
      var ring3 = nodes.filter(function (n) { return n.ring === 3; });

      // Spread ring 1 nodes around their branch angle
      var spread1 = Math.min(18, 40 / Math.max(ring1.length, 1));
      var startAngle1 = baseAngle - ((ring1.length - 1) * spread1) / 2;
      ring1.forEach(function (n, i) {
        var angle = startAngle1 + i * spread1;
        var rad = deg2rad(angle);
        state.nodePositions[n.id] = {
          x: CENTER_X + Math.cos(rad) * RING1_DISTANCE,
          y: CENTER_Y + Math.sin(rad) * RING1_DISTANCE
        };
      });

      // Spread ring 2 nodes
      var spread2 = Math.min(14, 36 / Math.max(ring2.length, 1));
      var startAngle2 = baseAngle - ((ring2.length - 1) * spread2) / 2;
      ring2.forEach(function (n, i) {
        var angle = startAngle2 + i * spread2;
        var rad = deg2rad(angle);
        state.nodePositions[n.id] = {
          x: CENTER_X + Math.cos(rad) * RING2_DISTANCE,
          y: CENTER_Y + Math.sin(rad) * RING2_DISTANCE
        };
      });

      // Spread ring 3 nodes
      var spread3 = Math.min(12, 32 / Math.max(ring3.length, 1));
      var startAngle3 = baseAngle - ((ring3.length - 1) * spread3) / 2;
      ring3.forEach(function (n, i) {
        var angle = startAngle3 + i * spread3;
        var rad = deg2rad(angle);
        state.nodePositions[n.id] = {
          x: CENTER_X + Math.cos(rad) * RING3_DISTANCE,
          y: CENTER_Y + Math.sin(rad) * RING3_DISTANCE
        };
      });

      // Category anchor point (for spoke lines)
      var catRad = deg2rad(baseAngle);
      state.nodePositions["branch-" + bKey] = {
        x: CENTER_X + Math.cos(catRad) * CATEGORY_RING,
        y: CENTER_Y + Math.sin(catRad) * CATEGORY_RING
      };
    });
  }

  // ---- Build SVG ----
  function buildSVG() {
    var svg = document.getElementById("map-svg");
    var vb = state.viewBox;
    svg.setAttribute("viewBox", vb.x + " " + vb.y + " " + vb.w + " " + vb.h);

    var defs = svgEl("defs");
    svg.appendChild(defs);

    // Radial gradient for central node
    var grad = svgEl("radialGradient", { id: "centerGrad", cx: "40%", cy: "35%", r: "65%" });
    var stop1 = svgEl("stop", { offset: "0%", "stop-color": "#3399ff" });
    var stop2 = svgEl("stop", { offset: "100%", "stop-color": "#0050cc" });
    grad.appendChild(stop1);
    grad.appendChild(stop2);
    defs.appendChild(grad);

    // Glow filter
    var filter = svgEl("filter", { id: "glow", x: "-50%", y: "-50%", width: "200%", height: "200%" });
    var feGauss = svgEl("feGaussianBlur", { stdDeviation: "6", result: "coloredBlur" });
    var feMerge = svgEl("feMerge");
    var fmn1 = svgEl("feMergeNode", { "in": "coloredBlur" });
    var fmn2 = svgEl("feMergeNode", { "in": "SourceGraphic" });
    feMerge.appendChild(fmn1);
    feMerge.appendChild(fmn2);
    filter.appendChild(feGauss);
    filter.appendChild(feMerge);
    defs.appendChild(filter);

    // Subtle glow for center
    var filterBig = svgEl("filter", { id: "glowBig", x: "-80%", y: "-80%", width: "260%", height: "260%" });
    var feGauss2 = svgEl("feGaussianBlur", { stdDeviation: "18", result: "coloredBlur" });
    var feMerge2 = svgEl("feMerge");
    var fmn3 = svgEl("feMergeNode", { "in": "coloredBlur" });
    var fmn4 = svgEl("feMergeNode", { "in": "SourceGraphic" });
    feMerge2.appendChild(fmn3);
    feMerge2.appendChild(fmn4);
    filterBig.appendChild(feGauss2);
    filterBig.appendChild(feMerge2);
    defs.appendChild(filterBig);

    // Per-branch glow filters
    Object.keys(BRANCHES).forEach(function (bKey) {
      var color = BRANCHES[bKey].color;
      var f = svgEl("filter", { id: "glow-" + bKey, x: "-50%", y: "-50%", width: "200%", height: "200%" });
      var fe = svgEl("feDropShadow", { dx: "0", dy: "0", stdDeviation: "5", "flood-color": color, "flood-opacity": "0.7" });
      f.appendChild(fe);
      defs.appendChild(f);
    });

    // Create layer groups (bottom to top)
    var gConnections = svgEl("g", { id: "layer-connections" });
    var gSpokes = svgEl("g", { id: "layer-spokes" });
    var gNodes = svgEl("g", { id: "layer-nodes" });
    var gLabels = svgEl("g", { id: "layer-labels" });

    svg.appendChild(gConnections);
    svg.appendChild(gSpokes);
    svg.appendChild(gNodes);
    svg.appendChild(gLabels);

    // ---- Draw cross-connections (curved beziers) ----
    CONNECTIONS.forEach(function (conn) {
      var p1 = state.nodePositions[conn[0]];
      var p2 = state.nodePositions[conn[1]];
      if (!p1 || !p2) return;

      var mx = (p1.x + p2.x) / 2;
      var my = (p1.y + p2.y) / 2;
      // Curve toward center for the spiderweb look
      var cx = mx * 0.55;
      var cy = my * 0.55;

      var d = "M " + p1.x + " " + p1.y + " Q " + cx + " " + cy + " " + p2.x + " " + p2.y;
      var path = svgEl("path", {
        d: d,
        fill: "none",
        stroke: "rgba(211,211,211," + LINE_DEFAULT_OPACITY + ")",
        "stroke-width": "1",
        "data-from": conn[0],
        "data-to": conn[1],
        class: "cross-connection"
      });
      gConnections.appendChild(path);
      state.connectionPaths.push(path);
    });

    // ---- Draw spoke lines (center -> branch anchors) ----
    Object.keys(BRANCHES).forEach(function (bKey) {
      var bp = state.nodePositions["branch-" + bKey];
      var path = svgEl("line", {
        x1: CENTER_X, y1: CENTER_Y,
        x2: bp.x, y2: bp.y,
        stroke: "rgba(211,211,211,0.12)",
        "stroke-width": "2",
        class: "spoke-line",
        "data-branch": bKey
      });
      gSpokes.appendChild(path);
      state.spokePaths.push(path);

      // Extend spokes through ring 1, ring 2, and ring 3
      var branchAngle = BRANCHES[bKey].angle;
      var rad = deg2rad(branchAngle);
      var outerX = CENTER_X + Math.cos(rad) * (RING3_DISTANCE + 60);
      var outerY = CENTER_Y + Math.sin(rad) * (RING3_DISTANCE + 60);
      var extLine = svgEl("line", {
        x1: bp.x, y1: bp.y,
        x2: outerX, y2: outerY,
        stroke: "rgba(211,211,211,0.05)",
        "stroke-width": "1",
        class: "spoke-ext",
        "data-branch": bKey
      });
      gSpokes.appendChild(extLine);
    });

    // ---- Draw branch category nodes (on CATEGORY_RING) ----
    Object.keys(BRANCHES).forEach(function (bKey) {
      var branch = BRANCHES[bKey];
      var bp = state.nodePositions["branch-" + bKey];

      var group = svgEl("g", {
        class: "branch-node",
        "data-branch": bKey,
        "data-id": "branch-" + bKey,
        style: "cursor:pointer"
      });

      // Outer ring
      var outerCircle = svgEl("circle", {
        cx: bp.x, cy: bp.y, r: CATEGORY_RADIUS + 3,
        fill: "none",
        stroke: branch.color,
        "stroke-width": "1.5",
        "stroke-opacity": "0.3"
      });
      group.appendChild(outerCircle);

      // Main circle
      var circle = svgEl("circle", {
        cx: bp.x, cy: bp.y, r: CATEGORY_RADIUS,
        fill: branch.color,
        "fill-opacity": "0.2",
        stroke: branch.color,
        "stroke-width": "2",
        class: "branch-circle"
      });
      group.appendChild(circle);

      // Count badge
      var count = branchNodes[bKey].length;
      var countText = svgEl("text", {
        x: bp.x, y: bp.y + 1,
        "text-anchor": "middle",
        "dominant-baseline": "central",
        fill: branch.color,
        "font-size": "14",
        "font-weight": "700",
        "font-family": "'Helvetica Neue', Arial, sans-serif"
      });
      countText.textContent = count;
      group.appendChild(countText);

      // Label outside circle
      var labelAngle = branch.angle;
      var labelDist = CATEGORY_RING + CATEGORY_RADIUS + 20;
      var lRad = deg2rad(labelAngle);
      var lx = CENTER_X + Math.cos(lRad) * labelDist;
      var ly = CENTER_Y + Math.sin(lRad) * labelDist;

      var anchor = "middle";
      if (labelAngle > 90 && labelAngle < 270) anchor = "end";
      else if (labelAngle < 90 || labelAngle > 270) anchor = "start";
      if (labelAngle === 0 || labelAngle === 180) anchor = "middle";
      if (labelAngle === 90 || labelAngle === 270) anchor = "middle";

      var label = svgEl("text", {
        x: lx, y: ly,
        "text-anchor": anchor,
        "dominant-baseline": "central",
        fill: branch.color,
        "font-size": "11",
        "font-weight": "600",
        "font-family": "'Helvetica Neue', Arial, sans-serif",
        "letter-spacing": "0.5",
        class: "branch-label"
      });
      label.textContent = branch.label;
      gLabels.appendChild(label);

      gNodes.appendChild(group);
      state.nodeElements["branch-" + bKey] = group;
      state.labelElements["branch-" + bKey] = label;

      // Event listeners
      group.addEventListener("click", function (e) {
        e.stopPropagation();
        selectBranch(bKey);
      });
      group.addEventListener("mouseenter", function () {
        if (!state.selectedNode) {
          circle.setAttribute("fill-opacity", "0.35");
          group.style.transform = "scale(1.08)";
          group.style.transformOrigin = bp.x + "px " + bp.y + "px";
        }
      });
      group.addEventListener("mouseleave", function () {
        if (!state.selectedNode) {
          circle.setAttribute("fill-opacity", "0.2");
          group.style.transform = "";
        }
      });
    });

    // ---- Draw sub-topic nodes ----
    NODES.forEach(function (node) {
      var pos = state.nodePositions[node.id];
      if (!pos) return;
      var branch = BRANCHES[node.branch];

      var group = svgEl("g", {
        class: "topic-node",
        "data-id": node.id,
        "data-branch": node.branch,
        style: "cursor:pointer"
      });

      var r = node.ring === 1 ? SUBTOPIC_RADIUS : (node.ring === 2 ? SUBTOPIC_RADIUS - 2 : SUBTOPIC_RADIUS - 3);

      // Node circle
      var circle = svgEl("circle", {
        cx: pos.x, cy: pos.y, r: r,
        fill: branch.color,
        "fill-opacity": "0.15",
        stroke: branch.color,
        "stroke-width": "1.5",
        "stroke-opacity": "0.6",
        class: "topic-circle"
      });
      group.appendChild(circle);

      // Label
      var labelOffY = r + 14;
      var label = svgEl("text", {
        x: pos.x,
        y: pos.y + labelOffY,
        "text-anchor": "middle",
        fill: "rgba(255,255,255,0.55)",
        "font-size": node.ring === 1 ? "9" : (node.ring === 2 ? "8" : "7.5"),
        "font-weight": "500",
        "font-family": "'Helvetica Neue', Arial, sans-serif",
        class: "topic-label"
      });

      // Wrap long titles
      var title = node.title;
      if (title.length > 22) {
        var words = title.split(/[\s\u2014\u2192]+/);
        var line1 = "";
        var line2 = "";
        var half = Math.ceil(words.length / 2);
        words.forEach(function (w, i) {
          if (i < half) line1 += (line1 ? " " : "") + w;
          else line2 += (line2 ? " " : "") + w;
        });
        var tspan1 = svgEl("tspan", { x: pos.x, dy: "0" });
        tspan1.textContent = line1;
        var tspan2 = svgEl("tspan", { x: pos.x, dy: "11" });
        tspan2.textContent = line2;
        label.appendChild(tspan1);
        label.appendChild(tspan2);
      } else {
        label.textContent = title;
      }

      gLabels.appendChild(label);
      gNodes.appendChild(group);

      state.nodeElements[node.id] = group;
      state.labelElements[node.id] = label;

      // Events
      group.addEventListener("click", function (e) {
        e.stopPropagation();
        selectNode(node.id);
      });
      group.addEventListener("mouseenter", function () {
        if (state.selectedNode !== node.id) {
          circle.setAttribute("fill-opacity", "0.35");
          circle.setAttribute("r", r * 1.15);
        }
        if (!state.selectedNode) {
          highlightNodeConnections(node.id, branch.color);
        }
      });
      group.addEventListener("mouseleave", function () {
        if (state.selectedNode !== node.id) {
          circle.setAttribute("fill-opacity", "0.15");
          circle.setAttribute("r", r);
        }
        if (!state.selectedNode) {
          unhighlightHoverConnections();
        }
      });
    });

    // ---- Draw central node ----
    var centerGroup = svgEl("g", {
      class: "center-node",
      "data-id": "center",
      style: "cursor:pointer"
    });

    // Background glow
    var centerGlow = svgEl("circle", {
      cx: CENTER_X, cy: CENTER_Y, r: CENTER_RADIUS + 30,
      fill: "#0065F2",
      "fill-opacity": "0.08",
      filter: "url(#glowBig)"
    });
    centerGroup.appendChild(centerGlow);

    // Outer ring
    var centerOuter = svgEl("circle", {
      cx: CENTER_X, cy: CENTER_Y, r: CENTER_RADIUS + 4,
      fill: "none",
      stroke: "#0065F2",
      "stroke-width": "1.5",
      "stroke-opacity": "0.3"
    });
    centerGroup.appendChild(centerOuter);

    // Main circle
    var centerCircle = svgEl("circle", {
      cx: CENTER_X, cy: CENTER_Y, r: CENTER_RADIUS,
      fill: "url(#centerGrad)",
      stroke: "#0065F2",
      "stroke-width": "2.5"
    });
    centerGroup.appendChild(centerCircle);

    // Center title
    var centerTitle = svgEl("text", {
      x: CENTER_X, y: CENTER_Y - 12,
      "text-anchor": "middle",
      "dominant-baseline": "central",
      fill: "#ffffff",
      "font-size": "14",
      "font-weight": "700",
      "font-family": "'Helvetica Neue', Arial, sans-serif"
    });
    var ctLine1 = svgEl("tspan", { x: CENTER_X, dy: "0" });
    ctLine1.textContent = "The Disclosure";
    var ctLine2 = svgEl("tspan", { x: CENTER_X, dy: "18" });
    ctLine2.textContent = "Files";
    centerTitle.appendChild(ctLine1);
    centerTitle.appendChild(ctLine2);
    centerGroup.appendChild(centerTitle);

    // Center subtitle — dynamic count
    var centerSub = svgEl("text", {
      x: CENTER_X, y: CENTER_Y + 28,
      "text-anchor": "middle",
      "dominant-baseline": "central",
      fill: "rgba(255,255,255,0.5)",
      "font-size": "9",
      "font-family": "'Helvetica Neue', Arial, sans-serif"
    });
    centerSub.textContent = NODES.length + " nodes \u00b7 " + Object.keys(BRANCHES).length + " branches";
    centerGroup.appendChild(centerSub);

    gNodes.appendChild(centerGroup);
    state.nodeElements["center"] = centerGroup;

    centerGroup.addEventListener("click", function (e) {
      e.stopPropagation();
      selectCenter();
    });
    centerGroup.addEventListener("mouseenter", function () {
      centerCircle.setAttribute("filter", "url(#glowBig)");
    });
    centerGroup.addEventListener("mouseleave", function () {
      centerCircle.removeAttribute("filter");
    });

    // ---- Click on background to deselect ----
    svg.addEventListener("click", function () {
      deselectAll();
    });
  }

  // ---- Selection Logic ----
  function selectNode(nodeId) {
    var node = nodeMap[nodeId];
    if (!node) return;
    state.selectedNode = nodeId;

    var connectedIds = getConnectedNodes(nodeId);
    connectedIds.push(nodeId);
    // Also include the branch anchor
    connectedIds.push("branch-" + node.branch);

    // Dim everything
    dimAll();

    // Highlight connected
    connectedIds.forEach(function (id) {
      brightenNode(id);
    });

    // Highlight connections
    state.connectionPaths.forEach(function (path) {
      var from = path.getAttribute("data-from");
      var to = path.getAttribute("data-to");
      if ((from === nodeId || to === nodeId)) {
        path.setAttribute("stroke", BRANCHES[node.branch].color);
        path.setAttribute("stroke-opacity", LINE_HIGHLIGHT_OPACITY);
        path.setAttribute("stroke-width", "1.8");
      }
    });

    // Highlight spoke for this branch
    state.spokePaths.forEach(function (s) {
      if (s.getAttribute("data-branch") === node.branch) {
        s.setAttribute("stroke-opacity", "0.4");
      }
    });

    showPanel(nodeId);
  }

  function selectBranch(bKey) {
    state.selectedNode = "branch-" + bKey;

    var branchNodeIds = branchNodes[bKey].map(function (n) { return n.id; });
    branchNodeIds.push("branch-" + bKey);
    branchNodeIds.push("center");

    dimAll();

    branchNodeIds.forEach(function (id) {
      brightenNode(id);
    });

    // Highlight connections within this branch
    state.connectionPaths.forEach(function (path) {
      var from = path.getAttribute("data-from");
      var to = path.getAttribute("data-to");
      var fromInBranch = branchNodeIds.indexOf(from) >= 0;
      var toInBranch = branchNodeIds.indexOf(to) >= 0;
      if (fromInBranch && toInBranch) {
        path.setAttribute("stroke", BRANCHES[bKey].color);
        path.setAttribute("stroke-opacity", LINE_HIGHLIGHT_OPACITY);
        path.setAttribute("stroke-width", "1.8");
      } else if (fromInBranch || toInBranch) {
        path.setAttribute("stroke", BRANCHES[bKey].color);
        path.setAttribute("stroke-opacity", "0.25");
        path.setAttribute("stroke-width", "1.2");
      }
    });

    state.spokePaths.forEach(function (s) {
      if (s.getAttribute("data-branch") === bKey) {
        s.setAttribute("stroke", BRANCHES[bKey].color);
        s.setAttribute("stroke-opacity", "0.5");
      }
    });

    showBranchPanel(bKey);
  }

  function selectCenter() {
    state.selectedNode = "center";
    resetVisuals();

    // Brighten all spokes
    state.spokePaths.forEach(function (s) {
      s.setAttribute("stroke-opacity", "0.35");
    });

    showCenterPanel();
  }

  function deselectAll() {
    state.selectedNode = null;
    resetVisuals();
    closePanel();
  }

  function dimAll() {
    // Dim all nodes
    Object.keys(state.nodeElements).forEach(function (id) {
      var el = state.nodeElements[id];
      el.style.opacity = DIM_OPACITY;
    });
    Object.keys(state.labelElements).forEach(function (id) {
      var el = state.labelElements[id];
      el.style.opacity = DIM_OPACITY;
    });

    // Dim all connections
    state.connectionPaths.forEach(function (path) {
      path.setAttribute("stroke", "rgba(211,211,211," + (LINE_DEFAULT_OPACITY * 0.3) + ")");
      path.setAttribute("stroke-opacity", LINE_DEFAULT_OPACITY * 0.3);
      path.setAttribute("stroke-width", "0.5");
    });

    // Dim spokes
    state.spokePaths.forEach(function (s) {
      s.setAttribute("stroke-opacity", "0.03");
    });
  }

  function brightenNode(id) {
    var el = state.nodeElements[id];
    if (el) el.style.opacity = "1";
    var lbl = state.labelElements[id];
    if (lbl) lbl.style.opacity = "1";
  }

  function resetVisuals() {
    Object.keys(state.nodeElements).forEach(function (id) {
      state.nodeElements[id].style.opacity = "1";
    });
    Object.keys(state.labelElements).forEach(function (id) {
      state.labelElements[id].style.opacity = "1";
    });
    state.connectionPaths.forEach(function (path) {
      path.setAttribute("stroke", "rgba(211,211,211," + LINE_DEFAULT_OPACITY + ")");
      path.setAttribute("stroke-opacity", LINE_DEFAULT_OPACITY);
      path.setAttribute("stroke-width", "1");
    });
    state.spokePaths.forEach(function (s) {
      if (s.classList.contains("spoke-ext")) {
        s.setAttribute("stroke-opacity", "0.05");
      } else {
        s.setAttribute("stroke", "rgba(211,211,211,0.12)");
        s.setAttribute("stroke-opacity", "0.12");
      }
    });
  }

  // ---- Hover connection highlighting ----
  function highlightNodeConnections(nodeId, color) {
    state.connectionPaths.forEach(function (path) {
      var from = path.getAttribute("data-from");
      var to = path.getAttribute("data-to");
      if (from === nodeId || to === nodeId) {
        path.setAttribute("stroke", color);
        path.setAttribute("stroke-opacity", LINE_HIGHLIGHT_OPACITY);
        path.setAttribute("stroke-width", "1.8");
      }
    });
  }

  function unhighlightHoverConnections() {
    state.connectionPaths.forEach(function (path) {
      path.setAttribute("stroke", "rgba(211,211,211," + LINE_DEFAULT_OPACITY + ")");
      path.setAttribute("stroke-opacity", LINE_DEFAULT_OPACITY);
      path.setAttribute("stroke-width", "1");
    });
  }

  function getConnectedNodes(nodeId) {
    return connectionsByNode[nodeId] ? connectionsByNode[nodeId].slice() : [];
  }

  // ---- Panel ----
  var panel = null;
  var panelInner = null;

  function initPanel() {
    panel = document.querySelector(".panel");
    panelInner = document.querySelector(".panel-inner");
    document.querySelector(".panel-close").addEventListener("click", function (e) {
      e.stopPropagation();
      deselectAll();
    });

    // Delegated click handler for auto-linked keywords in descriptions
    panelInner.addEventListener("click", function (e) {
      var link = e.target.closest ? e.target.closest(".desc-link") : null;
      // Fallback for browsers without .closest()
      if (!link) {
        var el = e.target;
        while (el && el !== panelInner) {
          if (el.classList && el.classList.contains("desc-link")) {
            link = el;
            break;
          }
          el = el.parentNode;
        }
      }
      if (!link) return;

      var targetId = link.getAttribute("data-target");
      if (!targetId) return;

      e.stopPropagation();

      // Select the node
      selectNode(targetId);

      // Pan to the node after a brief delay to allow render
      setTimeout(function () {
        var pos = state.nodePositions[targetId];
        if (pos) {
          state.viewBox.x = pos.x - state.viewBox.w / 2;
          state.viewBox.y = pos.y - state.viewBox.h / 2;
          updateViewBox();
        }
      }, 50);
    });
  }

  function showPanel(nodeId) {
    var node = nodeMap[nodeId];
    if (!node) return;
    var branch = BRANCHES[node.branch];

    var connected = getConnectedNodes(nodeId);
    var desc = node.fullDescription || node.description || "";

    var evidenceHtml = "";
    if (node.evidence && node.evidence.length) {
      evidenceHtml = '<div class="panel-section-label">Evidence</div><div class="evidence-list">';
      node.evidence.forEach(function (ev) {
        evidenceHtml += '<div class="evidence-item" data-tier="' + ev.tier + '">' +
          escapeHtml(ev.text) +
          '<span class="evidence-source">\u2014 ' + escapeHtml(ev.source) + '</span></div>';
      });
      evidenceHtml += "</div>";
    }

    var chipsHtml = "";
    if (connected.length) {
      chipsHtml = '<div class="panel-section-label">Connected Nodes (' + connected.length + ')</div><div class="connected-chips">';
      connected.forEach(function (cId) {
        var cn = nodeMap[cId];
        if (!cn) return;
        var cb = BRANCHES[cn.branch];
        chipsHtml += '<div class="chip" data-goto="' + cId + '"><span class="chip-dot" style="background:' + cb.color + '"></span>' + escapeHtml(cn.title) + '</div>';
      });
      chipsHtml += "</div>";
    }

    var sourcesHtml = "";
    if (node.sources && node.sources.length) {
      var sourceLimit = 5;
      var total = node.sources.length;
      sourcesHtml = '<div class="panel-section-label">Sources (' + total + ')</div>';
      node.sources.forEach(function (s, i) {
        var hidden = i >= sourceLimit && total > sourceLimit ? ' style="display:none" data-source-extra' : '';
        sourcesHtml += '<a class="source-link"' + hidden + ' href="' + escapeHtml(s.url) + '" target="_blank" rel="noopener">' + escapeHtml(s.label) + ' \u2197</a>';
      });
      if (total > sourceLimit) {
        sourcesHtml += '<button class="source-toggle-btn" data-expanded="false">Show ' + (total - sourceLimit) + ' more sources</button>';
      }
    }

    panelInner.innerHTML =
      '<div class="panel-branch-tag" style="background:' + branch.color + '22;color:' + branch.color + '">' + escapeHtml(branch.label) + '</div>' +
      '<h2 class="panel-title">' + escapeHtml(node.title) + '</h2>' +
      '<p class="panel-description">' + linkifyDescription(desc, nodeId) + '</p>' +
      evidenceHtml +
      chipsHtml +
      sourcesHtml;

    panel.classList.add("open");

    // Chip click handlers
    panelInner.querySelectorAll(".chip").forEach(function (chip) {
      chip.addEventListener("click", function () {
        var goto = chip.getAttribute("data-goto");
        if (goto) selectNode(goto);
      });
    });

    // Source "Show more" toggle
    var toggleBtn = panelInner.querySelector(".source-toggle-btn");
    if (toggleBtn) {
      toggleBtn.addEventListener("click", function () {
        var expanded = toggleBtn.getAttribute("data-expanded") === "true";
        panelInner.querySelectorAll("[data-source-extra]").forEach(function (el) {
          el.style.display = expanded ? "none" : "";
        });
        expanded = !expanded;
        toggleBtn.setAttribute("data-expanded", String(expanded));
        var total = node.sources.length;
        var sourceLimit = 5;
        toggleBtn.textContent = expanded ? "Show fewer sources" : "Show " + (total - sourceLimit) + " more sources";
      });
    }
  }

  function showBranchPanel(bKey) {
    var branch = BRANCHES[bKey];
    var nodes = branchNodes[bKey];

    var branchDesc = branch.description || ('This branch contains ' + nodes.length + ' nodes exploring topics related to ' + branch.label.toLowerCase() + '.');

    var nodesHtml = '<div class="panel-section-label">Nodes (' + nodes.length + ')</div><div class="connected-chips">';
    nodes.forEach(function (n) {
      nodesHtml += '<div class="chip" data-goto="' + n.id + '"><span class="chip-dot" style="background:' + branch.color + '"></span>' + escapeHtml(n.title) + '</div>';
    });
    nodesHtml += "</div>";

    panelInner.innerHTML =
      '<div class="panel-branch-tag" style="background:' + branch.color + '22;color:' + branch.color + '">' + escapeHtml(branch.label) + '</div>' +
      '<h2 class="panel-title">' + escapeHtml(branch.label) + '</h2>' +
      '<p class="panel-description">' + linkifyDescription(branchDesc, "branch-" + bKey) + '</p>' +
      nodesHtml;

    panel.classList.add("open");

    panelInner.querySelectorAll(".chip").forEach(function (chip) {
      chip.addEventListener("click", function () {
        var goto = chip.getAttribute("data-goto");
        if (goto) selectNode(goto);
      });
    });
  }

  function showCenterPanel() {
    var center = MAP_CONFIG.centerNode;
    var desc = center.description || "";

    var branchChips = '<div class="panel-section-label">Branches (' + Object.keys(BRANCHES).length + ')</div><div class="connected-chips">';
    Object.keys(BRANCHES).forEach(function (bKey) {
      var b = BRANCHES[bKey];
      branchChips += '<div class="chip" data-goto-branch="' + bKey + '"><span class="chip-dot" style="background:' + b.color + '"></span>' + escapeHtml(b.label) + '</div>';
    });
    branchChips += "</div>";

    var sourcesHtml = "";
    if (center.sources && center.sources.length) {
      sourcesHtml = '<div class="panel-section-label">Key Sources</div>';
      center.sources.forEach(function (s) {
        sourcesHtml += '<a class="source-link" href="' + escapeHtml(s.url) + '" target="_blank" rel="noopener">' + escapeHtml(s.label) + ' \u2197</a>';
      });
    }

    panelInner.innerHTML =
      '<div class="panel-branch-tag" style="background:#0065F222;color:#0065F2">Overview</div>' +
      '<h2 class="panel-title">' + escapeHtml(center.title) + '</h2>' +
      '<p class="panel-description">' + linkifyDescription(desc, "center") + '</p>' +
      branchChips +
      sourcesHtml;

    panel.classList.add("open");

    panelInner.querySelectorAll(".chip[data-goto-branch]").forEach(function (chip) {
      chip.addEventListener("click", function () {
        var bKey = chip.getAttribute("data-goto-branch");
        if (bKey) selectBranch(bKey);
      });
    });
  }

  function closePanel() {
    panel.classList.remove("open");
  }

  function escapeHtml(str) {
    var div = document.createElement("div");
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  // ---- Description Auto-Linking ----
  // Scans description text for keywords from KEYWORD_LINKS and wraps them
  // in clickable <span class="desc-link"> elements that navigate to target nodes.
  function linkifyDescription(text, currentNodeId) {
    // Graceful fallback if KEYWORD_LINKS is not defined or empty
    if (typeof KEYWORD_LINKS === "undefined" || !KEYWORD_LINKS || !KEYWORD_LINKS.length) {
      return escapeHtml(text);
    }

    // First, escape the full text to get safe HTML
    var html = escapeHtml(text);

    // Build an array of match regions to avoid double-linking.
    // Each entry: { start: Number, end: Number, replacement: String }
    var regions = [];

    // KEYWORD_LINKS is pre-sorted longest-first, so we iterate in order.
    for (var k = 0; k < KEYWORD_LINKS.length; k++) {
      var keyword = KEYWORD_LINKS[k][0];
      var targetId = KEYWORD_LINKS[k][1];

      // Skip self-links
      if (targetId === currentNodeId) continue;

      // Build a case-insensitive regex for this keyword.
      // Escape special regex characters in the keyword.
      var escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      // Use word boundaries to avoid partial matches inside other words
      var re = new RegExp("\\b" + escaped + "\\b", "gi");

      var match;
      while ((match = re.exec(html)) !== null) {
        var mStart = match.index;
        var mEnd = mStart + match[0].length;

        // Check if this region overlaps with any already-claimed region
        var overlaps = false;
        for (var r = 0; r < regions.length; r++) {
          if (mStart < regions[r].end && mEnd > regions[r].start) {
            overlaps = true;
            break;
          }
        }
        if (overlaps) continue;

        // Claim this region (preserve original case from the escaped HTML)
        regions.push({
          start: mStart,
          end: mEnd,
          original: match[0],
          targetId: targetId
        });
      }
    }

    // If no regions matched, return the escaped HTML as-is
    if (regions.length === 0) return html;

    // Sort regions by start position ascending
    regions.sort(function (a, b) { return a.start - b.start; });

    // Build the final HTML by splicing in <span> wrappers
    var result = "";
    var cursor = 0;
    for (var i = 0; i < regions.length; i++) {
      var reg = regions[i];
      // Append text before this match
      result += html.substring(cursor, reg.start);
      // Append the linked span
      result += '<span class="desc-link" data-target="' + reg.targetId + '">' + reg.original + '</span>';
      cursor = reg.end;
    }
    // Append remaining text after last match
    result += html.substring(cursor);

    return result;
  }

  // ---- Pan & Zoom ----
  function initPanZoom() {
    var svg = document.getElementById("map-svg");

    svg.addEventListener("mousedown", function (e) {
      if (e.target === svg || e.target.tagName === "line" || e.target.tagName === "path") {
        state.isPanning = true;
        state.panStartX = e.clientX;
        state.panStartY = e.clientY;
        state.panStartViewX = state.viewBox.x;
        state.panStartViewY = state.viewBox.y;
        svg.style.cursor = "grabbing";
      }
    });

    window.addEventListener("mousemove", function (e) {
      if (!state.isPanning) return;
      var dx = (e.clientX - state.panStartX) * (state.viewBox.w / svg.clientWidth);
      var dy = (e.clientY - state.panStartY) * (state.viewBox.h / svg.clientHeight);
      state.viewBox.x = state.panStartViewX - dx;
      state.viewBox.y = state.panStartViewY - dy;
      updateViewBox();
    });

    window.addEventListener("mouseup", function () {
      state.isPanning = false;
      svg.style.cursor = "grab";
    });

    svg.addEventListener("wheel", function (e) {
      e.preventDefault();
      var factor = e.deltaY > 0 ? 1.08 : 0.92;
      zoomBy(factor, e.clientX, e.clientY);
    }, { passive: false });

    // Touch support
    var lastTouchDist = 0;
    var lastTouchMid = { x: 0, y: 0 };

    svg.addEventListener("touchstart", function (e) {
      if (e.touches.length === 1) {
        state.isPanning = true;
        state.panStartX = e.touches[0].clientX;
        state.panStartY = e.touches[0].clientY;
        state.panStartViewX = state.viewBox.x;
        state.panStartViewY = state.viewBox.y;
      } else if (e.touches.length === 2) {
        state.isPanning = false;
        lastTouchDist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        lastTouchMid = {
          x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
          y: (e.touches[0].clientY + e.touches[1].clientY) / 2
        };
      }
    }, { passive: true });

    svg.addEventListener("touchmove", function (e) {
      e.preventDefault();
      if (e.touches.length === 1 && state.isPanning) {
        var dx = (e.touches[0].clientX - state.panStartX) * (state.viewBox.w / svg.clientWidth);
        var dy = (e.touches[0].clientY - state.panStartY) * (state.viewBox.h / svg.clientHeight);
        state.viewBox.x = state.panStartViewX - dx;
        state.viewBox.y = state.panStartViewY - dy;
        updateViewBox();
      } else if (e.touches.length === 2) {
        var dist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        var factor = lastTouchDist / dist;
        var mid = {
          x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
          y: (e.touches[0].clientY + e.touches[1].clientY) / 2
        };
        zoomBy(factor, mid.x, mid.y);
        lastTouchDist = dist;
      }
    }, { passive: false });

    svg.addEventListener("touchend", function () {
      state.isPanning = false;
    });
  }

  function zoomBy(factor, clientX, clientY) {
    var svg = document.getElementById("map-svg");
    var rect = svg.getBoundingClientRect();

    // Point in SVG coords where mouse is
    var px = state.viewBox.x + (clientX - rect.left) / rect.width * state.viewBox.w;
    var py = state.viewBox.y + (clientY - rect.top) / rect.height * state.viewBox.h;

    var newW = state.viewBox.w * factor;
    var newH = state.viewBox.h * factor;

    // Clamp zoom (increased max to 10000)
    if (newW < 400 || newW > 10000) return;

    state.viewBox.x = px - (px - state.viewBox.x) * (newW / state.viewBox.w);
    state.viewBox.y = py - (py - state.viewBox.y) * (newH / state.viewBox.h);
    state.viewBox.w = newW;
    state.viewBox.h = newH;

    updateViewBox();
  }

  function updateViewBox() {
    var svg = document.getElementById("map-svg");
    svg.setAttribute("viewBox",
      state.viewBox.x + " " + state.viewBox.y + " " + state.viewBox.w + " " + state.viewBox.h);
  }

  function resetView() {
    state.viewBox = { x: -1200, y: -700, w: 2400, h: 1400 };
    updateViewBox();
  }

  function zoomIn() {
    var svg = document.getElementById("map-svg");
    var rect = svg.getBoundingClientRect();
    zoomBy(0.8, rect.left + rect.width / 2, rect.top + rect.height / 2);
  }

  function zoomOut() {
    var svg = document.getElementById("map-svg");
    var rect = svg.getBoundingClientRect();
    zoomBy(1.25, rect.left + rect.width / 2, rect.top + rect.height / 2);
  }

  // ---- Toolbar ----
  function initToolbar() {
    document.getElementById("btn-reset").addEventListener("click", function () {
      deselectAll();
      resetView();
    });
    document.getElementById("btn-zoom-in").addEventListener("click", zoomIn);
    document.getElementById("btn-zoom-out").addEventListener("click", zoomOut);

    var btnToggle = document.getElementById("btn-toggle-connections");
    btnToggle.addEventListener("click", function () {
      state.showConnections = !state.showConnections;
      var layer = document.getElementById("layer-connections");
      if (layer) layer.style.display = state.showConnections ? "" : "none";
      btnToggle.classList.toggle("active", state.showConnections);
    });
    btnToggle.classList.add("active");

    document.getElementById("btn-search").addEventListener("click", function () {
      toggleSearch();
    });
  }

  // ---- Search ----
  function initSearch() {
    var container = document.querySelector(".search-container");
    var input = container.querySelector("input");
    var results = container.querySelector(".search-results");

    input.addEventListener("input", function () {
      var q = input.value.trim().toLowerCase();
      if (!q) {
        results.innerHTML = "";
        results.classList.remove("has-results");
        return;
      }

      // Search both tabs — disclosure nodes + QA nodes
      var disclosureMatches = NODES.filter(function (n) {
        var title = (n.title || n.label || "").toLowerCase();
        var desc = (n.description || "").toLowerCase();
        var full = (n.fullDescription || "").toLowerCase();
        var sub = (n.subtitle || "").toLowerCase();
        if (title.indexOf(q) >= 0 || desc.indexOf(q) >= 0 || full.indexOf(q) >= 0 || sub.indexOf(q) >= 0 || n.id.toLowerCase().indexOf(q) >= 0) return true;
        // Search evidence text
        if (n.evidence) {
          for (var i = 0; i < n.evidence.length; i++) {
            if ((n.evidence[i].text || "").toLowerCase().indexOf(q) >= 0) return true;
          }
        }
        return false;
      }).map(function (n) { return { node: n, tab: "disclosure" }; });

      var matches = disclosureMatches.slice(0, 12);

      if (matches.length === 0) {
        results.innerHTML = '<div style="padding:14px 16px;color:rgba(255,255,255,0.4);font-size:13px;">No results found</div>';
        results.classList.add("has-results");
        return;
      }

      var html = "";
      matches.forEach(function (m) {
        var n = m.node;
        var b = BRANCHES[n.branch];
        var dotColor = b.color;
        var tagLabel = b.label;
        var displayTitle = n.title || n.label || n.id;
        html += '<div class="search-result-item" data-id="' + n.id + '">' +
          '<span class="search-result-dot" style="background:' + dotColor + '"></span>' +
          '<span class="search-result-title">' + escapeHtml(displayTitle) + '</span>' +
          '<span class="search-result-branch">' + escapeHtml(tagLabel) + '</span>' +
          '</div>';
      });
      results.innerHTML = html;
      results.classList.add("has-results");

      results.querySelectorAll(".search-result-item").forEach(function (item) {
        item.addEventListener("click", function () {
          var id = item.getAttribute("data-id");

          container.classList.remove("open");
          input.value = "";
          results.innerHTML = "";
          results.classList.remove("has-results");

          selectNode(id);

          // Pan to node after brief delay to allow render
          setTimeout(function () {
            var pos = state.nodePositions[id];
            if (pos) {
              state.viewBox.x = pos.x - state.viewBox.w / 2;
              state.viewBox.y = pos.y - state.viewBox.h / 2;
              updateViewBox();
            }
          }, 50);
        });
      });
    });

    // Close search on Escape
    input.addEventListener("keydown", function (e) {
      if (e.key === "Escape") {
        container.classList.remove("open");
        input.value = "";
        results.innerHTML = "";
        results.classList.remove("has-results");
      }
    });

    // Close search on click outside
    document.addEventListener("click", function (e) {
      if (!container.contains(e.target) && !document.getElementById("btn-search").contains(e.target)) {
        container.classList.remove("open");
      }
    });
  }

  function toggleSearch() {
    var container = document.querySelector(".search-container");
    container.classList.toggle("open");
    if (container.classList.contains("open")) {
      setTimeout(function () {
        container.querySelector("input").focus();
      }, 100);
    }
  }

  // ---- Keyboard shortcuts ----
  function initKeyboard() {
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") {
        deselectAll();
        var container = document.querySelector(".search-container");
        container.classList.remove("open");
      }
      if (e.key === "/" && !e.ctrlKey && !e.metaKey) {
        var active = document.activeElement;
        if (active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA")) return;
        e.preventDefault();
        toggleSearch();
      }
    });
  }

  // ---- Initialization ----
  function init() {
    initPanel();
    initPanZoom();
    initToolbar();
    initSearch();
    initKeyboard();
    clearSVG();
    computePositions();
    buildSVG();
    resetView();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

})();
