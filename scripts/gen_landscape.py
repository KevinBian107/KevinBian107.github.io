"""
Branching ridge and drainage networks over a rough scalar terrain, with the
Morse critical points marked.

The field is a sum of Gaussian bumps (the large-scale peaks and basins) plus a
power-law spectrum of plane waves (the terrain roughness). Keeping the noise as
a Fourier sum rather than interpolated value-noise means f, grad f and the
Hessian all stay analytic, so critical points can be found by seeding at grid
minima of |grad f|, polishing with Newton's method, and classifying by the
Hessian eigenvalues.

Over the terrain sits a single search tree, rooted above the surface and
branching down onto the peaks and basins below. Targets are split with a
kd-tree rule, so the branching factor follows the layout of the landscape
rather than being uniform, and the viewport is fitted over the terrain and the
tree together so the root is never cropped.
"""

import numpy as np
from matplotlib.colors import LinearSegmentedColormap
from scipy.ndimage import minimum_filter
from PIL import Image, ImageDraw

# ------------------------------------------------------------- scalar field

BUMPS = [
    # (x0,   y0,    amplitude, sigma)
    (-0.52, 0.18,  1.05, 0.30),   # M1
    ( 0.28, 0.62,  1.00, 0.28),   # M2
    ( 0.42, -0.38, -1.00, 0.38),  # v1 (broad basin)
    (-0.08, 0.46, -0.60, 0.19),   # v2 (small dip between the peaks)
    (-0.72, -0.52, 0.62, 0.26),
    ( 0.88, 0.16,  0.58, 0.24),
    (-0.20, -0.78, 0.50, 0.24),
    ( 0.78, 0.82,  0.45, 0.22),
    (-0.88, 0.80,  0.42, 0.22),
    (-0.55, -0.05, -0.30, 0.16),
]

ROUGHNESS = 0.26    # target std of the terrain relative to the bump field
BETA = 0.75         # spectral falloff; higher = smoother, rollier terrain
N_WAVES = 60
SEED = 11


def _make_waves():
    rng = np.random.default_rng(SEED)
    k = np.exp(rng.uniform(np.log(3.0), np.log(22.0), N_WAVES))
    th = rng.uniform(0, 2 * np.pi, N_WAVES)
    ph = rng.uniform(0, 2 * np.pi, N_WAVES)
    amp = k ** (-BETA)
    kx, ky = k * np.cos(th), k * np.sin(th)

    g = np.linspace(-1, 1, 200)
    X, Y = np.meshgrid(g, g)
    raw = sum(a * np.sin(ax * X + ay * Y + p)
              for a, ax, ay, p in zip(amp, kx, ky, ph))
    amp = amp * (ROUGHNESS / raw.std())
    return list(zip(kx, ky, amp, ph))


WAVES = _make_waves()


def f(x, y):
    z = np.zeros_like(x, dtype=float)
    for x0, y0, a, s in BUMPS:
        z = z + a * np.exp(-(((x - x0) ** 2 + (y - y0) ** 2) / (2 * s * s)))
    for kx, ky, a, p in WAVES:
        z = z + a * np.sin(kx * x + ky * y + p)
    return z


def grad(x, y):
    gx = np.zeros_like(x, dtype=float)
    gy = np.zeros_like(y, dtype=float)
    for x0, y0, a, s in BUMPS:
        e = a * np.exp(-(((x - x0) ** 2 + (y - y0) ** 2) / (2 * s * s)))
        gx = gx - e * (x - x0) / (s * s)
        gy = gy - e * (y - y0) / (s * s)
    for kx, ky, a, p in WAVES:
        c = a * np.cos(kx * x + ky * y + p)
        gx = gx + kx * c
        gy = gy + ky * c
    return gx, gy


def hessian(x, y):
    hxx = hyy = hxy = 0.0
    for x0, y0, a, s in BUMPS:
        s2 = s * s
        dx, dy = x - x0, y - y0
        e = a * np.exp(-((dx * dx + dy * dy) / (2 * s2)))
        hxx += e * (dx * dx / s2 - 1.0) / s2
        hyy += e * (dy * dy / s2 - 1.0) / s2
        hxy += e * (dx * dy) / (s2 * s2)
    for kx, ky, a, p in WAVES:
        sn = a * np.sin(kx * x + ky * y + p)
        hxx -= kx * kx * sn
        hyy -= ky * ky * sn
        hxy -= kx * ky * sn
    return np.array([[hxx, hxy], [hxy, hyy]])


# --------------------------------------------------------- critical points

def critical_points(n=340, merge=0.022):
    g = np.linspace(-1.02, 1.02, n)
    X, Y = np.meshgrid(g, g)
    gx, gy = grad(X, Y)
    mag = np.hypot(gx, gy)
    ii, jj = np.nonzero(minimum_filter(mag, size=3) == mag)

    pts = []
    for i, j in zip(ii, jj):
        p = np.array([X[i, j], Y[i, j]], float)
        for _ in range(40):
            gxp, gyp = grad(np.array(p[0]), np.array(p[1]))
            gvec = np.array([float(gxp), float(gyp)])
            if np.linalg.norm(gvec) < 1e-10:
                break
            H = hessian(p[0], p[1])
            if abs(H[0, 0] * H[1, 1] - H[0, 1] * H[1, 0]) < 1e-12:
                break
            p = p - np.linalg.solve(H, gvec)
            if not (-1.05 < p[0] < 1.05 and -1.05 < p[1] < 1.05):
                break
        if not (-0.97 < p[0] < 0.97 and -0.97 < p[1] < 0.97):
            continue
        gxp, gyp = grad(np.array(p[0]), np.array(p[1]))
        if np.hypot(float(gxp), float(gyp)) > 1e-6:
            continue
        if any(np.hypot(p[0] - q[0], p[1] - q[1]) < merge for q, _, _ in pts):
            continue
        ev = np.linalg.eigvalsh(hessian(p[0], p[1]))
        kind = "max" if ev[1] < 0 else "min" if ev[0] > 0 else "saddle"
        pts.append((p, kind, float(f(np.array(p[0]), np.array(p[1])))))
    return pts


# ------------------------------------------------------- branching skeleton

def search_tree(targets, kinds, ztop, spread=(0.0, 0.58, 0.86), max_leaf=2, levels=3):
    """One tree, rooted above the terrain, branching down onto the targets.

    Targets are split recursively along whichever axis they spread furthest on
    -- a kd-tree split -- so the branching factor follows the actual layout of
    the landscape rather than being uniform. An internal node sits at the
    centroid of everything below it, pulled toward the centre by `spread` and
    lifted by its depth, so the tree fans outward as it descends. Leaves land
    on the surface itself.

    Returns (nodes, edges); nodes are (x, y, z, kind) in world coordinates.
    """
    targets = np.asarray(targets, float)
    nodes, edges = [], []

    def recurse(idx, depth, parent):
        sub = targets[idx]
        c = sub.mean(axis=0)
        k = spread[min(depth, len(spread) - 1)]
        frac = min(depth / float(levels), 1.0)
        zfloor = float(np.mean([f(np.array(x), np.array(y)) for x, y in sub]))
        z = (1.0 - frac) * ztop + frac * zfloor + (1.0 - frac) * 0.10

        me = len(nodes)
        nodes.append((c[0] * k, c[1] * k, z, "root" if parent is None else "node"))
        if parent is not None:
            edges.append((parent, me))

        if len(idx) <= max_leaf or depth >= levels - 1:
            for i in idx:
                x, y = targets[i]
                leaf = len(nodes)
                nodes.append((x, y, float(f(np.array(x), np.array(y))), kinds[i]))
                edges.append((me, leaf))
            return

        axis = int(np.argmax(sub.max(axis=0) - sub.min(axis=0)))
        order = idx[np.argsort(targets[idx][:, axis])]
        for part in np.array_split(order, 3 if len(idx) >= 6 else 2):
            if len(part):
                recurse(part, depth + 1, me)

    recurse(np.arange(len(targets)), 0, None)
    return nodes, edges


def dash(p1, p2, on, off, phase=0.0):
    """Split a segment into dashes; returns a list of sub-segments."""
    (x1, y1), (x2, y2) = p1, p2
    L = np.hypot(x2 - x1, y2 - y1)
    if L < 1e-9:
        return []
    ux, uy = (x2 - x1) / L, (y2 - y1) / L
    out, t = [], phase
    while t < L:
        a, b = t, min(t + on, L)
        if b > 0:
            out.append(((x1 + ux * max(a, 0), y1 + uy * max(a, 0)),
                        (x1 + ux * b, y1 + uy * b)))
        t += on + off
    return out


# ------------------------------------------------------------- projection

def project(x, y, z, zscale=0.70, tilt=0.62):
    sx = (x - y) * 0.7071
    sy = (x + y) * 0.7071 * tilt - z * zscale
    return sx, sy


CMAP = LinearSegmentedColormap.from_list(
    "landscape",
    ["#2A2585", "#3552BE", "#3E86C0", "#63C2CE", "#A5E2DC", "#DCF2E2", "#F4F1C0"],
)
DOT = {"max": (232, 56, 47), "saddle": (79, 209, 58), "min": (91, 200, 245)}


def shade(zn, normal, light=np.array([-0.42, -0.32, 0.85]), bands=15):
    q = np.floor(np.clip(zn, 0, 1) * bands) / max(bands - 1, 1)
    base = np.array(CMAP(float(np.clip(q, 0, 1)))[:3])
    L = light / np.linalg.norm(light)
    lam = max(0.0, float(np.dot(normal, L)))
    return tuple((np.clip(base * (0.62 + 0.38 * lam), 0, 1) * 255).astype(int))


def build_scene(n_grid, size, detail, pts=None, depth_bias=0.004):
    g = np.linspace(-1, 1, n_grid + 1)
    h = g[1] - g[0]
    X, Y = np.meshgrid(g, g)
    Z = f(X, Y)
    zmin, zmax = Z.min(), Z.max()
    SX, SY = project(X, Y, Z)

    if pts is None:
        pts = critical_points()

    # the tree is laid out first: the viewport has to be fitted over the
    # terrain and the tree together, or the root gets cropped off the top
    nodes = edges = None
    if detail:
        keep = [(q, k) for q, k, _ in pts if k in ("max", "min")]
        targets = np.array([[q[0], q[1]] for q, _ in keep])
        kinds = [k for _, k in keep]
        nodes, edges = search_tree(targets, kinds, ztop=Z.max() + 0.80)
        NX, NY = project(np.array([n[0] for n in nodes]),
                         np.array([n[1] for n in nodes]),
                         np.array([n[2] for n in nodes]))
        bx0, bx1 = min(SX.min(), NX.min()), max(SX.max(), NX.max())
        by0, by1 = min(SY.min(), NY.min()), max(SY.max(), NY.max())
    else:
        bx0, bx1, by0, by1 = SX.min(), SX.max(), SY.min(), SY.max()

    pad = 0.05 * size
    span = max(bx1 - bx0, by1 - by0)
    scale = (size - 2 * pad) / span
    ox = pad + ((size - 2 * pad) - (bx1 - bx0) * scale) / 2 - bx0 * scale
    oy = pad + ((size - 2 * pad) - (by1 - by0) * scale) / 2 - by0 * scale

    px = SX * scale + ox
    py = SY * scale + oy

    def world_px(x, y):
        z = float(f(np.array(x), np.array(y)))
        sx, sy = project(np.array(x), np.array(y), z)
        return float(sx) * scale + ox, float(sy) * scale + oy

    # ---- surface quads
    items = []
    for i in range(n_grid):
        for j in range(n_grid):
            zc = (Z[i, j] + Z[i + 1, j] + Z[i, j + 1] + Z[i + 1, j + 1]) / 4.0
            v1 = np.array([X[i + 1, j] - X[i, j], Y[i + 1, j] - Y[i, j], Z[i + 1, j] - Z[i, j]])
            v2 = np.array([X[i, j + 1] - X[i, j], Y[i, j + 1] - Y[i, j], Z[i, j + 1] - Z[i, j]])
            nrm = np.cross(v1, v2)
            if nrm[2] < 0:
                nrm = -nrm
            nrm = nrm / (np.linalg.norm(nrm) + 1e-12)
            pxy = [(px[a, b], py[a, b])
                   for a, b in ((i, j), (i + 1, j), (i + 1, j + 1), (i, j + 1))]
            items.append((X[i, j] + Y[i, j], "q", pxy,
                          shade((zc - zmin) / (zmax - zmin), nrm), 0.0))

    items.sort(key=lambda t: t[0])

    # ---- one search tree, rooted above the terrain and branching down onto
    # ---- the peaks and basins it finds
    tree_segs, dots = [], []
    order = {"min": 0, "saddle": 1, "max": 2}

    if detail:
        npx = []
        for x, y, z, _ in nodes:
            sx, sy = project(np.array(x), np.array(y), np.array(z))
            npx.append((float(sx) * scale + ox, float(sy) * scale + oy))

        on, off = size * 0.017, size * 0.012
        for pa, ch in edges:
            for seg in dash(npx[pa], npx[ch], on, off):
                tree_segs.append((seg, size * 0.0055))

        r = size * 0.018
        for (x, y, z, kind), (sx, sy) in zip(nodes, npx):
            if kind == "root":
                dots.append((sx, sy, r * 1.4, (22, 22, 22)))
            elif kind == "node":
                dots.append((sx, sy, r * 0.70, (252, 252, 252)))
        for (x, y, z, kind), (sx, sy) in zip(nodes, npx):
            if kind in DOT:
                dots.append((sx, sy, r, DOT[kind]))
    else:
        r = size * 0.045
        for p, kind, _ in sorted(pts, key=lambda t: order[t[1]]):
            x, y = world_px(p[0], p[1])
            dots.append((x, y, r, DOT[kind]))

    return dict(size=size, items=items, dots=dots, tree=tree_segs,
                lw=size * 0.004, pts=pts)


# ---------------------------------------------------------------- emitters

def emit_png(sc, path, ss=4):
    size = sc["size"]
    im = Image.new("RGB", (size * ss, size * ss), "white")
    d = ImageDraw.Draw(im)
    for _, kind, geo, col, w in sc["items"]:
        if kind == "q":
            d.polygon([(x * ss, y * ss) for x, y in geo], fill=col, outline=col)
        else:
            (x1, y1), (x2, y2) = geo
            d.line([(x1 * ss, y1 * ss), (x2 * ss, y2 * ss)],
                   fill=col, width=max(1, int(round(w * ss))))
    for (p1, p2), w in sc.get("tree", []):
        d.line([(p1[0] * ss, p1[1] * ss), (p2[0] * ss, p2[1] * ss)],
               fill=(20, 20, 20), width=max(1, int(round(w * ss))))
    for x, y, r, col in sc["dots"]:
        R, cx, cy = r * ss, x * ss, y * ss
        d.ellipse([cx - R, cy - R, cx + R, cy + R], fill=col,
                  outline=(16, 16, 16), width=max(1, int(sc["lw"] * ss)))
    im.resize((size, size), Image.LANCZOS).save(path)


def emit_svg(sc, path, rounded=None):
    size = sc["size"]
    o = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {size} {size}" '
         f'width="{size}" height="{size}" role="img" aria-labelledby="ttl">',
         '<title id="ttl">Search tree over a scalar landscape</title>']
    o.append(f'<defs><clipPath id="rc"><rect width="{size}" height="{size}" '
             f'rx="{rounded:.1f}"/></clipPath></defs><g clip-path="url(#rc)">'
             if rounded else "<g>")
    o.append(f'<rect width="{size}" height="{size}" fill="#FFFFFF"/>')
    for _, kind, geo, col, w in sc["items"]:
        c = "#%02X%02X%02X" % col
        if kind == "q":
            pp = " ".join(f"{x:.1f},{y:.1f}" for x, y in geo)
            o.append(f'<polygon points="{pp}" fill="{c}" stroke="{c}" stroke-width="0.5"/>')
        else:
            (x1, y1), (x2, y2) = geo
            o.append(f'<line x1="{x1:.1f}" y1="{y1:.1f}" x2="{x2:.1f}" y2="{y2:.1f}" '
                     f'stroke="{c}" stroke-width="{w:.2f}" stroke-linecap="round"/>')
    for (p1, p2), w in sc.get("tree", []):
        o.append(f'<line x1="{p1[0]:.1f}" y1="{p1[1]:.1f}" x2="{p2[0]:.1f}" '
                 f'y2="{p2[1]:.1f}" stroke="#141414" stroke-width="{w:.2f}" '
                 f'stroke-linecap="round"/>')
    for x, y, r, col in sc["dots"]:
        o.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{r:.2f}" fill="#%02X%02X%02X" '
                 f'stroke="#101010" stroke-width="{sc["lw"]:.2f}"/>' % col)
    o.append("</g></svg>")
    open(path, "w").write("\n".join(o))


if __name__ == "__main__":
    pts = critical_points()
    c = {}
    for _, k, _ in pts:
        c[k] = c.get(k, 0) + 1
    print("critical points:", c,
          "| max - saddle + min =", c.get("max", 0) - c.get("saddle", 0) + c.get("min", 0))

    # PNG only: depth-interleaving splits the skeleton into ~45k short
    # segments, which is fine for a raster but bloats SVG past 6 MB.
    big = build_scene(n_grid=180, size=1000, detail=True, pts=pts)
    emit_png(big, "landscape@2x.png", ss=3)
    Image.open("landscape@2x.png").resize((800, 800), Image.LANCZOS).save("landscape.png")
    emit_svg(big, "landscape.svg")
    print("wrote landscape.png, landscape@2x.png, landscape.svg")


# ------------------------------------------------------------------- favicon

def iproject(x, y, z, zscale=0.52, tilt=0.50):
    """Front-above view used for the icon: the domain maps to a rectangle that
    fills a square tile, instead of the diamond an isometric view would give."""
    return x, y * tilt - z * zscale


def build_icon(size=128, n_grid=22, n_max=2, n_min=1, rounded=0.22,
               extent=0.80, lift=0.34):
    """A drastically reduced variant that still reads at 16 px.

    Everything that only survives at poster size is stripped: the mesh drops to
    a few hundred quads, the dashes become solid strokes (a dash gap is a
    fraction of a pixel in a browser tab), internal nodes lose their dots, and
    what is left is one root, a two-way split, and four landings.
    """
    pts = critical_points()
    ms = sorted([(p, v) for p, k, v in pts if k == "max"], key=lambda t: -t[1])[:n_max]
    ns = sorted([(p, v) for p, k, v in pts if k == "min"], key=lambda t: t[1])[:n_min]
    targets = np.array([p for p, _ in ms + ns])
    kinds = ["max"] * len(ms) + ["min"] * len(ns)

    # crop in on the middle of the domain so the terrain fills the tile
    g = np.linspace(-extent, extent, n_grid + 1)
    X, Y = np.meshgrid(g, g)
    Z = f(X, Y)
    zmin, zmax = Z.min(), Z.max()
    SX, SY = iproject(X, Y, Z)

    inside = np.all(np.abs(targets) < extent * 0.92, axis=1)
    targets, kinds = targets[inside], [k for k, m in zip(kinds, inside) if m]

    # a single fan: one root straight to each landing, no internal nodes
    nodes, edges = search_tree(targets, kinds, ztop=Z.max() + lift,
                               spread=(0.0,), levels=1)
    NX, NY = iproject(np.array([n[0] for n in nodes]),
                      np.array([n[1] for n in nodes]),
                      np.array([n[2] for n in nodes]))

    # stretch to fill the tile on each axis independently -- a square icon has
    # no room to waste on the empty corners a uniform fit would leave
    bx0, bx1 = min(SX.min(), NX.min()), max(SX.max(), NX.max())
    by0, by1 = min(SY.min(), NY.min()), max(SY.max(), NY.max())
    pad = 0.055 * size
    sx_ = (size - 2 * pad) / (bx1 - bx0)
    sy_ = (size - 2 * pad) / (by1 - by0)
    ox, oy = pad - bx0 * sx_, pad - by0 * sy_
    px, py = SX * sx_ + ox, SY * sy_ + oy

    items = []
    for i in range(n_grid):
        for j in range(n_grid):
            zc = (Z[i, j] + Z[i + 1, j] + Z[i, j + 1] + Z[i + 1, j + 1]) / 4.0
            v1 = np.array([X[i + 1, j] - X[i, j], Y[i + 1, j] - Y[i, j], Z[i + 1, j] - Z[i, j]])
            v2 = np.array([X[i, j + 1] - X[i, j], Y[i, j + 1] - Y[i, j], Z[i, j + 1] - Z[i, j]])
            nrm = np.cross(v1, v2)
            if nrm[2] < 0:
                nrm = -nrm
            nrm = nrm / (np.linalg.norm(nrm) + 1e-12)
            pxy = [(px[a, b], py[a, b])
                   for a, b in ((i, j), (i + 1, j), (i + 1, j + 1), (i, j + 1))]
            items.append((X[i, j] + Y[i, j], "q", pxy,
                          shade((zc - zmin) / (zmax - zmin), nrm, bands=8), 0.0))
    items.sort(key=lambda t: t[0])

    npx = [(float(a) * sx_ + ox, float(b) * sy_ + oy) for a, b in zip(NX, NY)]
    tree = [((npx[a], npx[b]), size * 0.024) for a, b in edges]   # solid, heavy

    r = size * 0.076
    dots = [(npx[i], r * 1.15, (20, 20, 20)) for i, n in enumerate(nodes) if n[3] == "root"]
    dots += [(npx[i], r, DOT[n[3]]) for i, n in enumerate(nodes) if n[3] in DOT]
    dots = [(p[0], p[1], rr, c) for p, rr, c in dots]

    return dict(size=size, items=items, dots=dots, tree=tree,
                lw=size * 0.018, pts=pts, rounded=size * rounded)
