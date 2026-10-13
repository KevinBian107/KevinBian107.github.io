/* Home splash: a patch of neural tissue, grown procedurally, whose spikes are
   read out as a raster code and fed into a small artificial network.

   Natural intelligence sits on the far side (left on landscape screens, top on
   portrait ones): dendritic arbors drawn as outlined tubes with spines, the
   way reconstructed neuropil looks. Spikes run down the dendrites to the cell
   bodies, and the projection neurons send them out along axons that straighten
   into parallel lanes -- a spike raster, the neural code.

   The artificial side reads that code: an encoder of unit columns
   (squares) alternating with wider hidden layers (dots), with skip links
   carrying the residual stream past each hidden layer and attention arcs
   mixing units within a column, ending in a small output layer whose
   signals stream off the edge of the screen. The network is not drawn up
   front: it grows out behind the signal, each connection extending as the
   first pulse travels it and each unit appearing as it is first reached.

   Two stacked canvases: the tissue is drawn once (grown in over the first
   couple of seconds); the moving signal and the swaying network are redrawn
   each frame. */
(function () {
  var splash = document.querySelector('.splash');
  if (!splash) return;
  var tissueCv = splash.querySelector('.splash-tissue');
  var signalCv = splash.querySelector('.splash-signal');
  if (!tissueCv || !signalCv || !tissueCv.getContext) return;

  var tctx = tissueCv.getContext('2d');
  var sctx = signalCv.getContext('2d');
  var reduceMotion =
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var portraitQuery = window.matchMedia && window.matchMedia('(orientation: portrait)');

  var STEP = 3.5;          // px between consecutive points on every process
  var GROW_SPEED = 430;    // px/s the arbors extend during the intro
  var AXON_SPEED = 560;    // px/s the axons extend during the intro
  var SPIKE_SPEED = 340;   // px/s a spike travels along a dendrite or axon
  var PULSE_TIME = 0.42;   // s for a pulse to cross one network edge
  var MAX_PIXELS = 4.5e6;  // canvas backing-store budget per canvas


  // Depth layers, far to near: dimmer, thinner outlines further back.
  var INK_ALPHA = { dark: [0.2, 0.34, 0.52, 0.8], light: [0.16, 0.27, 0.42, 0.66] };
  var INTERIOR = [0.03, 0.05, 0.08, 0.12];
  var OUTLINE = [0.55, 0.65, 0.8, 0.95];

  /* ---------- helpers ---------- */

  var rand = Math.random;
  function seed(a) {
    rand = function () {
      a = (a + 0x6d2b79f5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function rr(a, b) { return a + (b - a) * rand(); }
  function gauss() {
    return Math.sqrt(-2 * Math.log(rand() || 1e-9)) * Math.cos(2 * Math.PI * rand());
  }
  function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }
  function smoothstep(a, b, x) {
    var t = clamp((x - a) / (b - a), 0, 1);
    return t * t * (3 - 2 * t);
  }
  function angDiff(a, b) {
    var d = a - b;
    while (d > Math.PI) d -= 2 * Math.PI;
    while (d < -Math.PI) d += 2 * Math.PI;
    return d;
  }
  function expWait(mean) { return -Math.log(rand() || 1e-9) * mean; }

  function hexRgb(h) {
    h = (h || '').trim().replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var n = parseInt(h, 16);
    if (isNaN(n)) return [128, 128, 128];
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function rgba(c, a) { return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')'; }
  function mix(a, b, t) {
    return [
      Math.round(a[0] + (b[0] - a[0]) * t),
      Math.round(a[1] + (b[1] - a[1]) * t),
      Math.round(a[2] + (b[2] - a[2]) * t),
    ];
  }

  /* ---------- theme ---------- */

  var colors, glowSprite;

  function readColors() {
    var cs = getComputedStyle(document.documentElement);
    var dark = document.documentElement.getAttribute('data-theme') === 'dark';
    var bg = hexRgb(cs.getPropertyValue('--bg-body'));
    var ink = hexRgb(cs.getPropertyValue('--splash-ink'));
    var alphas = dark ? INK_ALPHA.dark : INK_ALPHA.light;
    colors = {
      dark: dark,
      bg: bg,
      ink: alphas.map(function (a) { return rgba(ink, a); }),
      interior: INTERIOR.map(function (t) { return rgba(mix(bg, ink, t), 1); }),
      signal: hexRgb(cs.getPropertyValue('--splash-signal')),
      ann: hexRgb(cs.getPropertyValue('--splash-ann')),
      inkRgb: ink,
    };

    glowSprite = document.createElement('canvas');
    glowSprite.width = glowSprite.height = 64;
    var g = glowSprite.getContext('2d');
    var grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, rgba(mix(colors.signal, [255, 255, 255], dark ? 0.6 : 0), 1));
    grad.addColorStop(0.25, rgba(colors.signal, 0.75));
    grad.addColorStop(1, rgba(colors.signal, 0));
    g.fillStyle = grad;
    g.fillRect(0, 0, 64, 64);
  }

  /* ---------- geometry ---------- */

  var W, H, dpr, horiz, Z, across;

  // (u, v): u runs along the flow from tissue to network, v across it.
  function P(u, v) { return horiz ? [u * W, v * H] : [v * W, u * H]; }
  function uOf(x, y) { return horiz ? x / W : y / H; }

  function measure() {
    var r = splash.getBoundingClientRect();
    W = Math.max(1, Math.round(r.width));
    H = Math.max(1, Math.round(r.height));
    horiz = portraitQuery ? !portraitQuery.matches : W >= H;
    across = horiz ? H : W;
    Z = horiz
      ? { bio: 0.52, raster: 0.58, cols: [0.625, 0.685, 0.745, 0.805, 0.865], out: 0.92, exit: 1.01 }
      : { bio: 0.49, raster: 0.55, cols: [0.6, 0.65, 0.7, 0.75, 0.8], out: 0.85, exit: 0.94 };
    dpr = Math.min(window.devicePixelRatio || 1, 2, Math.sqrt(MAX_PIXELS / (W * H)));
    [tissueCv, signalCv].forEach(function (c) {
      c.width = Math.round(W * dpr);
      c.height = Math.round(H * dpr);
    });
  }

  /* ---------- scene ---------- */

  var segs;      // tissue tubes, stride 9: x0 y0 x1 y1 px py w layer birth
  var segOrder;
  var somas;     // {x, y, r, rot, layer, t}
  var wires;     // crisp lines, stride 6: x0 y0 x1 y1 kind birth
  var wireOrder;
  var neurons, projections, model, introEnd;

  var WIRE_LANE = 0;

  function build() {
    seed(1013);
    var s = [], w = [];
    somas = [];
    neurons = [];
    projections = [];

    var scale = clamp(Math.min(W, H) / 850, 0.65, 1.15);

    function grow(n, queue) {
      while (queue.length) {
        var b = queue.shift();
        var pts = [b.x, b.y];
        var bi = n.branches.length;
        n.branches.push({ pts: pts, parent: b.parent, at: b.at });
        var x = b.x, y = b.y, ang = b.ang, wd = b.w, curv = 0;
        var dist = b.dist, budget = b.budget, px = x, py = y;

        for (var i = 0; ; i++) {
          curv = curv * 0.78 + gauss() * 0.055;
          ang += curv;
          if (b.tropism != null) ang += angDiff(b.tropism, ang) * 0.03;
          var nx = x + Math.cos(ang) * STEP;
          var ny = y + Math.sin(ang) * STEP;
          dist += STEP;
          budget -= STEP;
          wd = Math.max(0.5, wd * 0.993);
          var tb = n.t0 + dist / GROW_SPEED;
          s.push(x, y, nx, ny, px, py, wd, n.layer, tb);
          px = x; py = y; x = nx; y = ny;
          pts.push(x, y);

          // Spines: short stubs off the thinner dendrites of nearer cells.
          if (n.layer >= 2 && wd < 2.2 && rand() < 0.14) {
            var sa = ang + (rand() < 0.5 ? -1 : 1) * (Math.PI / 2 + rr(-0.6, 0.6));
            var sl = rr(2.5, 5.5);
            s.push(x, y, x + Math.cos(sa) * sl, y + Math.sin(sa) * sl, x, y,
              rr(0.7, 1.2), n.layer, tb + 0.04);
          }

          if (budget <= 0) break;
          if (x < -60 || y < -60 || x > W + 60 || y > H + 60) break;
          var u = uOf(x, y);
          if (u > Z.bio) break;
          // A feathered edge: processes thin out over the last stretch.
          if (rand() < smoothstep(Z.bio - 0.2, Z.bio, u) * 0.06) break;

          if (i > 4 && b.order < 6 && rand() < (b.order < 2 ? 0.05 : 0.035)) {
            var side = rand() < 0.5 ? -1 : 1;
            queue.push({
              x: x, y: y, ang: ang + side * rr(0.35, 0.95), w: wd * 0.72,
              budget: budget * rr(0.45, 0.85), order: b.order + 1,
              parent: bi, at: pts.length / 2 - 1, dist: dist, tropism: null,
            });
            ang -= side * rr(0.05, 0.3);
            wd *= 0.9;
          }
        }
        if (pts.length >= 16) n.tips.push(bi);
      }
    }

    function makeNeuron(u, v, z, proj) {
      var p = P(u, v);
      var layer = proj ? 3 : Math.min(3, Math.floor(z * 4));
      var sc = (0.6 + 0.55 * z) * Math.sqrt(scale);
      var n = {
        x: p[0], y: p[1], layer: layer, r: rr(5, 8) * sc, proj: proj,
        t0: rr(0, 0.35) + clamp(u, 0, 1) * 0.6,
        branches: [], tips: [], paths: [],
        flash: 0, nextSpike: 0, lastPoke: -1,
      };
      var pyramidal = rand() < 0.55;
      var apical = -Math.PI / 2 + gauss() * 0.35;
      var prim = (pyramidal ? 4 : 5) + Math.floor(rand() * 3);
      var queue = [];
      for (var j = 0; j < prim; j++) {
        var isApical = pyramidal && j === 0;
        var ang = isApical ? apical : (j / prim) * 2 * Math.PI + rr(-0.4, 0.4);
        queue.push({
          x: n.x + Math.cos(ang) * n.r, y: n.y + Math.sin(ang) * n.r, ang: ang,
          w: (isApical ? 2.8 : 2.0) * sc,
          budget: (isApical ? rr(220, 440) : rr(90, 220)) * scale,
          order: 0, parent: -1, at: 0, dist: n.r, tropism: isApical ? apical : null,
        });
      }
      grow(n, queue);
      somas.push({ x: n.x, y: n.y, r: n.r, rot: rr(0, Math.PI), layer: layer, t: n.t0 });

      // A few tip-to-soma routes for spikes to travel.
      var tips = n.tips.slice();
      for (var k = 0; k < tips.length && n.paths.length < 6; k++) {
        var pick = tips.splice(Math.floor(rand() * tips.length), 1)[0];
        k--;
        var path = tipPath(n, pick);
        var ex = path[0], ey = path[1];
        if (path.length >= 40 && ex > 0 && ey > 0 && ex < W && ey < H) {
          n.paths.push(path);
        }
      }
      neurons.push(n);
      return n;
    }

    // Background tissue, densest at the far edge and thinning toward the code.
    var count = clamp(Math.round((W * H * Z.bio) / 8000), 30, 140);
    for (var i = 0; i < count; i++) {
      var u = -0.06 + (Z.bio * 0.92 + 0.06) * Math.pow(rand(), 1.35);
      makeNeuron(u, rr(-0.06, 1.06), rand(), false);
    }

    // The encoder: unit columns (squares) alternating with wider hidden
    // layers (dots), spread over most of the height.
    var along = horiz ? W : H;
    var lanes = clamp(Math.round((across * 0.68) / 46), 6, 14);
    var units = clamp(Math.round((across * 0.72) / 44), 6, 15);
    var gapV = 0.72 / (units - 1);
    // Wider through the middle, narrowing back toward the output.
    var SPANS = [0.6, 0.84, 0.8, 0.84, 0.62];
    var colGap = (Z.cols[1] - Z.cols[0]) * along;
    model = {
      cols: [], arcs: [], links: [], outputs: [],
      t: { net: 1.5 },
    };
    // Every connection is a link that grows out the first time a pulse
    // travels it.
    function link(a, b, kind) {
      var l = { a: a, b: b, kind: kind, grow: 0 };
      model.links.push(l);
      return l;
    }
    Z.cols.forEach(function (cu, c) {
      var hidden = c % 2 === 1;
      var n = hidden ? 2 * units - 1 : units;
      var step = SPANS[c] / (n - 1);
      var col = [];
      for (var k = 0; k < n; k++) {
        var p = P(cu, 0.5 + (k - (n - 1) / 2) * step);
        col.push({
          kind: 'unit', x: p[0], y: p[1], sx: p[0], sy: p[1], col: c, row: k, hidden: hidden,
          flash: 0, act: 0, refr: 0, out: [], skip: null, seenAt: -1,
        });
      }
      model.cols.push(col);
    });
    for (var c = 0; c + 1 < model.cols.length; c++) {
      var from = model.cols[c], to = model.cols[c + 1];
      from.forEach(function (a) {
        var targets = {};
        if (!a.hidden) {
          [2 * a.row - 1, 2 * a.row, 2 * a.row + 1].forEach(function (h) {
            if (h >= 0 && h < to.length) targets[h] = 1;
          });
        } else {
          targets[Math.floor(a.row / 2)] = 1;
          targets[Math.ceil(a.row / 2)] = 1;
        }
        if (rand() < 0.7) targets[Math.floor(rand() * to.length)] = 1;
        Object.keys(targets).forEach(function (k) { a.out.push(link(a, to[+k], 'w')); });
        if (!a.hidden && c + 2 < model.cols.length) a.skip = link(a, model.cols[c + 2][a.row], 'skip');
      });
    }
    // Attention: arcs within a unit column, bowed to one side or the other.
    for (var c2 = 2; c2 < model.cols.length; c2 += 2) {
      var seen = {};
      for (var tries = 0; tries < units * 5 && Object.keys(seen).length < units * 1.3; tries++) {
        var i0 = Math.floor(rand() * units);
        var j0 = clamp(i0 + (rand() < 0.5 ? -1 : 1) * (1 + Math.floor(rand() * 4)), 0, units - 1);
        var head = rand() < 0.55 ? 0 : 1;
        var key = head + ':' + Math.min(i0, j0) + ':' + Math.max(i0, j0);
        if (i0 === j0 || seen[key]) continue;
        seen[key] = 1;
        model.arcs.push({
          c: c2, i: i0, j: j0, head: head, flash: 0, grow: 0, fwd: true,
          bulge: Math.min(colGap * 0.85, 8 + 6 * Math.abs(i0 - j0)),
        });
      }
    }

    // The output layer, each unit streaming its signal off the edge.
    var last = model.cols[model.cols.length - 1];
    var nOut = Math.max(3, Math.round(units / 3));
    var outGap = 0.36 / (nOut - 1);
    for (var o = 0; o < nOut; o++) {
      var ov = 0.5 + (o - (nOut - 1) / 2) * outGap;
      var op = P(Z.out, ov), ex = P(Z.exit, ov);
      var out = {
        kind: 'output', x: op[0], y: op[1], sx: op[0], sy: op[1], hidden: false, col: -1, row: o,
        flash: 0, act: 0, refr: 0, out: [], skip: null, seenAt: -1,
      };
      out.out.push(link(out, { kind: 'exit', x: ex[0], y: ex[1], sx: ex[0], sy: ex[1] }, 'exit'));
      model.outputs.push(out);
    }
    last.forEach(function (u) {
      var near = Math.round((u.row / (last.length - 1)) * (nOut - 1));
      u.out.push(link(u, model.outputs[near], 'read'));
      if (rand() < 0.4) u.out.push(link(u, model.outputs[Math.floor(rand() * nOut)], 'read'));
    });

    // Projection neurons: one per raster lane, each driving an input unit.
    for (var k = 0; k < lanes; k++) {
      var laneV = 0.16 + (0.68 * k) / (lanes - 1);
      var n = makeNeuron(rr(0.12, Z.bio * 0.8), laneV + rr(-0.05, 0.05), rr(0.8, 1), true);
      n.axon = axonPath(n, laneV);
      n.exit = P(Z.raster, laneV);
      n.input = model.cols[0][Math.round((k * (units - 1)) / (lanes - 1))];
      n.lane = link({ x: n.exit[0], y: n.exit[1], sx: n.exit[0], sy: n.exit[1] }, n.input, 'lane');
      projections.push(n);

      var a = n.axon, t = n.t0 + 0.45;
      for (var q = 0; q + 3 < a.pts.length; q += 2) {
        var idx = q / 2;
        t += STEP / AXON_SPEED;
        if (idx < a.r0) {
          s.push(a.pts[q], a.pts[q + 1], a.pts[q + 2], a.pts[q + 3],
            q >= 2 ? a.pts[q - 2] : a.pts[q], q >= 2 ? a.pts[q - 1] : a.pts[q + 1],
            1.15, 3, t);
        } else {
          w.push(a.pts[q], a.pts[q + 1], a.pts[q + 2], a.pts[q + 3], WIRE_LANE, t);
        }
      }
    }

    segs = new Float32Array(s);
    wires = new Float32Array(w);
    segOrder = sortByBirth(segs, 9, 8);
    wireOrder = sortByBirth(wires, 6, 5);
    somas.sort(function (a, b) { return a.t - b.t; });

    introEnd = 0;
    for (var i2 = 8; i2 < segs.length; i2 += 9) introEnd = Math.max(introEnd, segs[i2]);
    for (var i3 = 5; i3 < wires.length; i3 += 6) introEnd = Math.max(introEnd, wires[i3]);
    introEnd += 0.1;
  }

  function sortByBirth(arr, stride, off) {
    var n = arr.length / stride, idx = new Array(n);
    for (var i = 0; i < n; i++) idx[i] = i;
    idx.sort(function (a, b) { return arr[a * stride + off] - arr[b * stride + off]; });
    return idx;
  }

  // Points from a dendrite tip back to its soma, evenly spaced by STEP.
  function tipPath(n, bi) {
    var out = [], from = null;
    while (bi >= 0) {
      var b = n.branches[bi], pts = b.pts;
      for (var k = from == null ? pts.length / 2 - 1 : from; k >= 0; k--) {
        out.push(pts[2 * k], pts[2 * k + 1]);
      }
      from = b.at;
      bi = b.parent;
    }
    out.push(n.x, n.y);
    return new Float32Array(out);
  }

  function appendLine(pts, tx, ty) {
    var x = pts[pts.length - 2], y = pts[pts.length - 1];
    var d = Math.hypot(tx - x, ty - y), k = Math.max(1, Math.round(d / STEP));
    for (var i = 1; i <= k; i++) pts.push(x + ((tx - x) * i) / k, y + ((ty - y) * i) / k);
  }

  // Wanders out of the tissue, settles onto its lane, and runs straight
  // through the raster.
  function axonPath(n, laneV) {
    var entry = P(Z.bio, laneV), exit = P(Z.raster, laneV);
    var pts = [n.x, n.y], x = n.x, y = n.y, u0 = uOf(x, y);
    var ang = Math.atan2(entry[1] - y, entry[0] - x) + gauss() * 0.6, curv = 0;
    for (var guard = 0; guard < 3000; guard++) {
      var dx = entry[0] - x, dy = entry[1] - y;
      if (Math.hypot(dx, dy) < STEP * 1.5) break;
      var prog = clamp((uOf(x, y) - u0) / (Z.bio - u0), 0, 1);
      curv = curv * 0.8 + gauss() * 0.05 * (1 - prog);
      ang += curv + angDiff(Math.atan2(dy, dx), ang) * (0.05 + 0.3 * prog * prog);
      x += Math.cos(ang) * STEP;
      y += Math.sin(ang) * STEP;
      pts.push(x, y);
    }
    appendLine(pts, entry[0], entry[1]);
    var r0 = pts.length / 2 - 1;
    appendLine(pts, exit[0], exit[1]);
    return { pts: new Float32Array(pts), r0: r0, r1: pts.length / 2 - 1 };
  }

  /* ---------- static layer ---------- */

  var drawn; // birth time the static layer has been drawn up to
  var segCur, wireCur, somaCur;

  function resetStatic() {
    tctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    tctx.fillStyle = rgba(colors.bg, 1);
    tctx.fillRect(0, 0, W, H);
    tctx.lineCap = 'round';
    tctx.lineJoin = 'round';
    drawn = -1;
    segCur = wireCur = somaCur = 0;
  }

  // Draw everything born in (drawn, t]. Within a layer all outlines go down
  // before any interiors, so overlapping processes merge into one outlined
  // silhouette, like an edge-detected projection of real neuropil.
  function drawStaticUpTo(t) {
    if (t <= drawn) return;
    var groups = {}, keys = [];
    while (segCur < segOrder.length && segs[segOrder[segCur] * 9 + 8] <= t) {
      var i = segOrder[segCur++], o = i * 9;
      var key = segs[o + 7] * 64 + Math.max(1, Math.round(segs[o + 6] * 2));
      if (!groups[key]) { groups[key] = []; keys.push(key); }
      groups[key].push(o);
    }
    keys.sort(function (a, b) { return a - b; });

    for (var layer = 0; layer < 4; layer++) {
      for (var pass = 0; pass < 2; pass++) {
        keys.forEach(function (key) {
          if (Math.floor(key / 64) !== layer) return;
          var width = (key % 64) / 2, list = groups[key];
          tctx.beginPath();
          for (var j = 0; j < list.length; j++) {
            var o = list[j];
            if (pass === 1) {
              tctx.moveTo(segs[o + 4], segs[o + 5]);
              tctx.lineTo(segs[o], segs[o + 1]);
            } else {
              tctx.moveTo(segs[o], segs[o + 1]);
            }
            tctx.lineTo(segs[o + 2], segs[o + 3]);
          }
          tctx.lineWidth = pass === 0 ? width + 2 * OUTLINE[layer] : width;
          tctx.strokeStyle = pass === 0 ? colors.ink[layer] : colors.interior[layer];
          tctx.stroke();
        });
      }
      while (somaCur < somas.length && somas[somaCur].t <= t && somas[somaCur].layer === layer) {
        drawSoma(somas[somaCur++]);
      }
    }
    while (somaCur < somas.length && somas[somaCur].t <= t) drawSoma(somas[somaCur++]);

    var wireStyles = [[rgba(colors.ann, 0.45), 1.4]];
    var wg = [[]];
    while (wireCur < wireOrder.length && wires[wireOrder[wireCur] * 6 + 5] <= t) {
      var wi = wireOrder[wireCur++] * 6;
      wg[wires[wi + 4]].push(wi);
    }
    wg.forEach(function (list, kind) {
      if (!list.length) return;
      tctx.beginPath();
      list.forEach(function (o) {
        tctx.moveTo(wires[o], wires[o + 1]);
        tctx.lineTo(wires[o + 2], wires[o + 3]);
      });
      tctx.strokeStyle = wireStyles[kind][0];
      tctx.lineWidth = wireStyles[kind][1];
      tctx.stroke();
    });

    drawn = t;
  }

  function drawSoma(s) {
    var ol = OUTLINE[s.layer];
    tctx.save();
    tctx.translate(s.x, s.y);
    tctx.rotate(s.rot);
    tctx.beginPath();
    tctx.ellipse(0, 0, s.r + ol, s.r * 0.82 + ol, 0, 0, 2 * Math.PI);
    tctx.fillStyle = colors.ink[s.layer];
    tctx.fill();
    tctx.beginPath();
    tctx.ellipse(0, 0, s.r, s.r * 0.82, 0, 0, 2 * Math.PI);
    tctx.fillStyle = colors.interior[s.layer];
    tctx.fill();
    if (s.layer >= 2) {
      tctx.beginPath();
      tctx.ellipse(0, 0, s.r * 0.5, s.r * 0.42, 0, 0, 2 * Math.PI);
      tctx.lineWidth = 0.7;
      tctx.strokeStyle = colors.ink[s.layer - 1];
      tctx.stroke();
    }
    tctx.restore();
  }

  /* ---------- signal ---------- */

  var time = 0, live = false;
  var dendPulses = [], axonPulses = [], netPulses = [];
  var nextAssembly = 0;

  function resetSignal() {
    dendPulses = [];
    axonPulses = [];
    netPulses = [];
    neurons.forEach(function (n) {
      n.flash = 0;
      n.nextSpike = time + expWait(n.proj ? 2.6 : 8);
    });
    model.cols.concat([model.outputs]).forEach(function (col) {
      col.forEach(function (u) { u.flash = u.act = 0; u.refr = 0; });
    });
    model.arcs.forEach(function (a) { a.flash = 0; });
    // The first assembly comes early, so the network starts growing soon.
    nextAssembly = time + 4;
    // On a fresh load each axon carries a spike at its growing tip, so the
    // signal reaches the edge just as the tissue finishes growing.
    if (time === 0) {
      projections.forEach(function (n) {
        axonPulses.push({
          n: n, s: 0, len: n.axon.pts.length / 2 - 1, speed: AXON_SPEED, delay: n.t0 + 0.45,
        });
      });
    }
  }

  function spike(n) {
    if (!n.paths.length || dendPulses.length > 90) return;
    var path = n.paths[Math.floor(rand() * n.paths.length)];
    dendPulses.push({ n: n, path: path, s: 0, len: path.length / 2 - 1 });
  }

  // A pulse from an element (or a fixed point, for the lanes) to an element.
  var GROW_SLOW = 2.4; // a first pulse is slower: it is laying the connection

  function send(l, dur, arc) {
    if (netPulses.length > 260) return;
    var grown = arc ? arc.a.grow >= 1 : l.grow >= 1;
    if (!grown) dur *= GROW_SLOW;
    netPulses.push({ link: l, s: 0, dur: dur, arc: arc || null });
  }

  // A unit fires: it passes the signal on through its weights and its skip,
  // may mix into a partner through an attention arc; outputs stream off.
  function arrive(el, viaArc) {
    if (el.kind === 'exit') return;
    if (el.seenAt < 0) el.seenAt = time;
    if (time < el.refr) return;
    el.flash = 1;
    el.act = Math.min(1.4, el.act + 0.6);
    el.refr = time + (el.hidden ? 0.12 : 0.18);
    var outp = el.kind === 'output';
    el.out.forEach(function (l) {
      if (outp || rand() < 0.42) send(l, PULSE_TIME * (outp ? 1.6 : l.kind === 'read' ? 1 : 0.7));
    });
    if (el.skip && rand() < 0.5) send(el.skip, PULSE_TIME * 1.3);
    if (!el.hidden && el.col > 0 && !viaArc && rand() < 0.6) {
      var options = model.arcs.filter(function (a) {
        return a.c === el.col && (a.i === el.row || a.j === el.row);
      });
      if (options.length) {
        var a = options[Math.floor(rand() * options.length)];
        var fwd = a.i === el.row;
        a.flash = 1;
        if (a.grow === 0) a.fwd = fwd;
        send({ a: el, b: model.cols[el.col][fwd ? a.j : a.i] }, PULSE_TIME * 0.8, { a: a, fwd: fwd });
      }
    }
  }

  function stepSignal(dt) {
    var i;
    neurons.forEach(function (n) {
      if (time >= n.nextSpike) {
        spike(n);
        n.nextSpike = time + expWait(n.proj ? 2.6 : 8);
      }
      n.flash *= Math.exp(-dt / 0.45);
    });

    // Now and then a cell assembly fires together and the network lights up.
    if (time >= nextAssembly) {
      projections.forEach(function (n) { if (rand() < 0.55) spike(n); });
      nextAssembly = time + rr(6, 9);
    }

    for (i = dendPulses.length - 1; i >= 0; i--) {
      var d = dendPulses[i];
      d.s += (SPIKE_SPEED * dt) / STEP;
      if (d.s >= d.len) {
        dendPulses.splice(i, 1);
        d.n.flash = 1;
        if (d.n.axon) {
          // A short burst, so the lanes carry patterns rather than single ticks.
          var burst = 1 + Math.floor(rand() * 3);
          for (var b = 0; b < burst; b++) {
            axonPulses.push({ n: d.n, s: -b * rr(5, 8), len: d.n.axon.pts.length / 2 - 1 });
          }
        }
      }
    }

    for (i = axonPulses.length - 1; i >= 0; i--) {
      var a = axonPulses[i];
      if (a.delay && time < a.delay) continue;
      a.s += ((a.speed || SPIKE_SPEED) * dt) / STEP;
      if (a.s >= a.len) {
        axonPulses.splice(i, 1);
        send(a.n.lane, PULSE_TIME * 0.6);
      }
    }

    for (i = netPulses.length - 1; i >= 0; i--) {
      var p = netPulses[i];
      p.s += dt / p.dur;
      // The first pulse along a connection draws it out behind itself.
      if (p.arc) {
        if (p.arc.fwd === p.arc.a.fwd) p.arc.a.grow = Math.max(p.arc.a.grow, Math.min(1, p.s));
      } else if (p.link.grow < 1) {
        p.link.grow = Math.max(p.link.grow, Math.min(1, p.s));
      }
      if (p.s >= 1) {
        netPulses.splice(i, 1);
        arrive(p.link.b, !!p.arc);
      }
    }

    model.cols.forEach(function (col) {
      col.forEach(function (u) {
        u.act *= Math.exp(-dt / 1.4);
        u.flash *= Math.exp(-dt / 0.3);
      });
    });
    model.arcs.forEach(function (a) { a.flash *= Math.exp(-dt / 0.5); });
    model.outputs.forEach(function (u) {
      u.act *= Math.exp(-dt / 1.4);
      u.flash *= Math.exp(-dt / 0.4);
    });
  }

  /* ---------- network ---------- */

  // An attention arc's bezier control points, bowed to its head's side.
  function arcControl(a) {
    var A = model.cols[a.c][a.i], B = model.cols[a.c][a.j];
    var bulge = a.head ? a.bulge : -a.bulge;
    var ox = horiz ? bulge : 0, oy = horiz ? 0 : bulge;
    return [A.x, A.y, A.x + ox * 1.33, A.y + oy * 1.33, B.x + ox * 1.33, B.y + oy * 1.33, B.x, B.y];
  }

  function bezierAt(k, f) {
    var g = 1 - f;
    return [
      g * g * g * k[0] + 3 * g * g * f * k[2] + 3 * g * f * f * k[4] + f * f * f * k[6],
      g * g * g * k[1] + 3 * g * g * f * k[3] + 3 * g * f * f * k[5] + f * f * f * k[7],
    ];
  }

  var LINK_STYLE = { lane: [0.32, 1.4], w: [0.2, 1.1], skip: [0.34, 1.5], read: [0.26, 1.2], exit: [0.4, 1.6] };

  function drawNetwork() {
    var ann = colors.ann;
    sctx.strokeStyle = rgba(ann, 1);
    sctx.lineCap = 'round';

    // Connections, each drawn as far as it has grown.
    model.links.forEach(function (l) {
      if (l.grow <= 0) return;
      var st = LINK_STYLE[l.kind];
      var x1 = l.a.x + (l.b.x - l.a.x) * l.grow, y1 = l.a.y + (l.b.y - l.a.y) * l.grow;
      if (l.kind === 'exit') {
        var gr = sctx.createLinearGradient(l.a.x, l.a.y, l.b.x, l.b.y);
        gr.addColorStop(0, rgba(ann, st[0]));
        gr.addColorStop(1, rgba(ann, 0));
        sctx.strokeStyle = gr;
        sctx.globalAlpha = 1;
      } else {
        sctx.strokeStyle = rgba(ann, 1);
        sctx.globalAlpha = st[0];
      }
      sctx.lineWidth = st[1];
      sctx.beginPath();
      sctx.moveTo(l.a.x, l.a.y);
      sctx.lineTo(x1, y1);
      sctx.stroke();
    });
    sctx.strokeStyle = rgba(ann, 1);

    model.arcs.forEach(function (a) {
      if (a.grow <= 0) return;
      var k = arcControl(a);
      sctx.globalAlpha = 0.24 + 0.7 * a.flash;
      sctx.lineWidth = 1.3 + 0.6 * a.flash;
      sctx.beginPath();
      var n = 20;
      for (var q = 0; q <= n; q++) {
        var f = (q / n) * a.grow;
        var pt = bezierAt(k, a.fwd ? f : 1 - f);
        if (q) sctx.lineTo(pt[0], pt[1]);
        else sctx.moveTo(pt[0], pt[1]);
      }
      sctx.stroke();
    });

    // Pulses in flight.
    sctx.fillStyle = rgba(ann, 1);
    netPulses.forEach(function (p) {
      var x, y;
      if (p.arc) {
        var pt = bezierAt(arcControl(p.arc.a), p.arc.fwd ? p.s : 1 - p.s);
        x = pt[0];
        y = pt[1];
      } else {
        x = p.link.a.x + (p.link.b.x - p.link.a.x) * p.s;
        y = p.link.a.y + (p.link.b.y - p.link.a.y) * p.s;
      }
      sctx.globalAlpha = p.link.kind === 'exit' ? 0.9 * (1 - p.s) : 0.95;
      sctx.fillRect(x - 2, y - 2, 4, 4);
    });

    // Units pop in where the signal first reaches them.
    model.cols.concat([model.outputs]).forEach(function (col) {
      col.forEach(function (u) {
        if (u.seenAt < 0) return;
        var f = smoothstep(u.seenAt, u.seenAt + 0.4, time);
        var sc = 0.4 + 0.6 * f;
        sctx.beginPath();
        if (u.kind === 'output') sctx.arc(u.x, u.y, 5.5 * sc, 0, 2 * Math.PI);
        else if (u.hidden) sctx.arc(u.x, u.y, 3.2 * sc, 0, 2 * Math.PI);
        else sctx.rect(u.x - 5 * sc, u.y - 5 * sc, 10 * sc, 10 * sc);
        var level = Math.max(u.flash, clamp(u.act, 0, 1) * 0.4);
        sctx.globalAlpha = f;
        sctx.fillStyle = rgba(mix(colors.bg, ann, level), 1);
        sctx.fill();
        sctx.globalAlpha = f * 0.9;
        sctx.lineWidth = 1.5;
        sctx.strokeStyle = rgba(ann, 1);
        sctx.stroke();
        if (u.kind === 'output' && u.flash > 0.05) {
          sctx.globalCompositeOperation = colors.dark ? 'lighter' : 'source-over';
          glow(u.x, u.y, 18 + 14 * u.flash, u.flash * 0.7);
          sctx.globalCompositeOperation = 'source-over';
        }
      });
    });
  }

  function glow(x, y, size, alpha) {
    if (alpha <= 0.01) return;
    sctx.globalAlpha = Math.min(1, alpha);
    sctx.drawImage(glowSprite, x - size / 2, y - size / 2, size, size);
  }

  function at(path, s) {
    var k = Math.max(0, Math.min(path.length / 2 - 2, Math.floor(s)));
    var f = clamp(s - k, 0, 1);
    return [
      path[2 * k] + (path[2 * k + 2] - path[2 * k]) * f,
      path[2 * k + 1] + (path[2 * k + 3] - path[2 * k + 1]) * f,
    ];
  }

  function renderSignal() {
    sctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    sctx.clearRect(0, 0, W, H);
    sctx.globalCompositeOperation = colors.dark ? 'lighter' : 'source-over';

    neurons.forEach(function (n) {
      if (n.flash > 0.02) glow(n.x, n.y, n.r * (5 + 4 * n.flash), n.flash * 0.9);
    });

    dendPulses.forEach(function (d) {
      for (var k = 3; k >= 0; k--) {
        var p = at(d.path, d.s - k * 1.6);
        glow(p[0], p[1], 15 - k * 2.5, (1 - k * 0.24) * 0.85);
      }
    });

    // Along the axon a spike turns from a soft glow into a raster tick; it
    // becomes a discrete pulse once it leaves the lane for the network.
    var tickColor = rgba(colors.dark ? mix(colors.signal, [255, 255, 255], 0.35) : colors.signal, 1);
    axonPulses.forEach(function (a) {
      if (a.s < 0 || (a.delay && time < a.delay)) return;
      var ax = a.n.axon, p = at(ax.pts, a.s);
      var into = a.s - ax.r0;
      if (into < 4) {
        var fade = clamp(1 - (into + 8) / 12, 0, 1);
        glow(p[0], p[1], 14, 0.25 + 0.65 * fade);
        if (fade < 1) tick(p, (1 - fade) * 0.9, tickColor);
        for (var k = 1; k <= 3; k++) {
          var q = at(ax.pts, a.s - k * 1.6);
          glow(q[0], q[1], 13 - k * 2.5, (1 - k * 0.26) * 0.75 * fade);
        }
      } else {
        for (var g = 5; g >= 1; g--) {
          if (a.s - g * 1.2 > ax.r0) tick(at(ax.pts, a.s - g * 1.2), 0.16 * (6 - g) / 5, tickColor);
        }
        tick(p, 1, tickColor);
      }
    });

    sctx.globalCompositeOperation = 'source-over';
    drawNetwork();
    sctx.globalAlpha = 1;
  }

  function tick(p, alpha, color) {
    sctx.globalAlpha = alpha;
    sctx.strokeStyle = color;
    sctx.lineWidth = 2;
    sctx.beginPath();
    if (horiz) {
      sctx.moveTo(p[0], p[1] - 7);
      sctx.lineTo(p[0], p[1] + 7);
    } else {
      sctx.moveTo(p[0] - 7, p[1]);
      sctx.lineTo(p[0] + 7, p[1]);
    }
    sctx.stroke();
  }

  /* ---------- loop ---------- */

  var raf = 0, last = 0, visible = true;

  function frame(now) {
    raf = 0;
    var dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
    last = now;
    time += dt;
    if (drawn < introEnd) drawStaticUpTo(time);
    if (time > 0) stepSignal(dt);
    renderSignal();
    schedule();
  }

  function schedule() {
    if (!raf && live && visible && !document.hidden) {
      raf = requestAnimationFrame(frame);
    }
  }

  function pause() {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    last = 0;
  }

  function rebuild(withIntro) {
    pause();
    measure();
    readColors();
    build();
    resetStatic();
    time = withIntro ? 0 : Math.max(introEnd, model.t.net + 1.5);
    // Without motion there is no signal to grow it, so show it whole.
    if (reduceMotion) {
      model.links.forEach(function (l) { l.grow = 1; });
      model.arcs.forEach(function (a) { a.grow = 1; });
      model.cols.concat([model.outputs]).forEach(function (col) { col.forEach(function (u) { u.seenAt = -10; }); });
    }
    resetSignal();
    if (!withIntro || reduceMotion) drawStaticUpTo(Infinity);
    sctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    sctx.clearRect(0, 0, W, H);
    live = !reduceMotion;
    if (!live) renderSignal(); // a still of the network
    schedule();
  }

  rebuild(true);

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting;
      if (visible) schedule();
      else pause();
    }).observe(splash);
  }

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) pause();
    else schedule();
  });

  // Regrow only when the shape really changes; a phone's URL bar sliding
  // away shouldn't reset the scene.
  var resizeTimer = 0;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      var r = splash.getBoundingClientRect();
      var flipped = portraitQuery && portraitQuery.matches === horiz;
      if (flipped || Math.abs(r.width - W) > 2 || Math.abs(r.height - H) > 140) {
        rebuild(false);
      }
    }, 200);
  });

  // Theme switch: same scene, repainted in the new ink.
  new MutationObserver(function () {
    var upTo = drawn;
    readColors();
    resetStatic();
    drawStaticUpTo(upTo);
  }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  // Pointing at a cell makes it fire...
  splash.addEventListener('pointermove', function (ev) {
    if (!live) return;
    var r = splash.getBoundingClientRect();
    var x = ev.clientX - r.left, y = ev.clientY - r.top;
    var best = null, bestD = 70 * 70;
    neurons.forEach(function (n) {
      if (n.layer < 2) return;
      var d = (n.x - x) * (n.x - x) + (n.y - y) * (n.y - y);
      if (d < bestD) { bestD = d; best = n; }
    });
    if (best && time - best.lastPoke > 0.5) {
      best.lastPoke = time;
      spike(best);
    }
    // ...and pointing into the network drives its units.
    model.cols.forEach(function (col) {
      col.forEach(function (u) {
        if (u.seenAt >= 0 && (u.x - x) * (u.x - x) + (u.y - y) * (u.y - y) < 12 * 12) arrive(u);
      });
    });
  });

  /* ---------- typed line ---------- */

  var typed = splash.querySelector('.splash-typed');
  if (typed && !reduceMotion) {
    var words = (typed.getAttribute('data-words') || '').split('|').filter(Boolean);
    var wi = 0, ci = words.length ? words[0].length : 0;
    var deleting = true;
    var tickType = function () {
      if (deleting) {
        ci--;
        if (ci <= 0) {
          deleting = false;
          wi = (wi + 1) % words.length;
        }
      } else {
        ci++;
      }
      typed.textContent = words[wi].slice(0, Math.max(0, ci));
      var done = !deleting && ci >= words[wi].length;
      if (done) deleting = true;
      setTimeout(tickType, done ? 2200 : deleting ? 32 : 70);
    };
    if (words.length > 1) setTimeout(tickType, 2600);
  }

  /* ---------- scroll cue ---------- */

  var next = splash.querySelector('.splash-next');
  if (next) {
    next.addEventListener('click', function (ev) {
      var target = document.querySelector(next.getAttribute('href'));
      if (!target) return;
      ev.preventDefault();
      target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
    });
  }
})();
