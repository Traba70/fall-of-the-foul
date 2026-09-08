/* ============================================================
   Fall of the Foul — ART (procedural, no image assets)
   Detailed class portraits, top-down entities, projectiles, FX.
   ============================================================ */
(function (G) {
  "use strict";
  var ITEMS = G.ITEMS;
  var TAU = Math.PI * 2;

  function darken(hex, f) { var c = parseInt(hex.slice(1), 16), r = (c >> 16) & 255, g = (c >> 8) & 255, b = c & 255; return "rgb(" + Math.round(r * f) + "," + Math.round(g * f) + "," + Math.round(b * f) + ")"; }
  function lighten(hex, f) { var c = parseInt(hex.slice(1), 16), r = (c >> 16) & 255, g = (c >> 8) & 255, b = c & 255; return "rgb(" + Math.min(255, Math.round(r + (255 - r) * f)) + "," + Math.min(255, Math.round(g + (255 - g) * f)) + "," + Math.min(255, Math.round(b + (255 - b) * f)) + ")"; }
  G.darken = darken; G.lighten = lighten;
  function toRGBA(c, a) {
    if (!c) return "rgba(0,0,0," + a + ")";
    if (c.charAt(0) === "#") { var n = parseInt(c.slice(1), 16); return "rgba(" + ((n >> 16) & 255) + "," + ((n >> 8) & 255) + "," + (n & 255) + "," + a + ")"; }
    if (c.indexOf("rgb(") === 0) return c.replace("rgb(", "rgba(").replace(")", "," + a + ")");
    return c;
  }
  function shade(ctx, x, y, r, c1, c2) { var g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.4, r * 0.15, x, y, r); g.addColorStop(0, c1); g.addColorStop(1, c2); return g; }
  function eqColor(slot, fb) { var it = G.getEquipped(slot); return it ? ITEMS[it.id].color : fb; }

  // ============================================================
  // HOME PORTRAIT — detailed, distinct per class
  // ============================================================
  var PORTRAIT_MOOD = {
    melee: { back: "#b5642a", fog: "#141821", mote: "#ff8a3a", moteN: 13, moteSeed: 5 },
    ranged: { back: "#3f7a46", fog: "#0e1410", mote: "#a8d689", moteN: 10, moteSeed: 11 },
    mage: { back: "#5b6ad0", fog: "#0c1020", mote: "#9fc7ff", moteN: 15, moteSeed: 23 }
  };
  G.drawPortrait = function (canvas) {
    var ctx = canvas.getContext("2d"), W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H); ctx.imageSmoothingEnabled = false;
    var cls = G.state.cls, mood = PORTRAIT_MOOD[cls] || PORTRAIT_MOOD.melee;
    var chest = eqColor("chest", "#6b6257"), helm = G.getEquipped("helmet") ? eqColor("helmet", null) : null;
    var rw = G.getEquipped("right"), wpnC = rw ? ITEMS[rw.id].color : "#c3c8cf", wtype = rw ? ITEMS[rw.id].type : "melee";
    // atmospheric backlight
    var bl = ctx.createRadialGradient(W / 2, H * 0.44, 8, W / 2, H * 0.48, W * 0.62);
    bl.addColorStop(0, toRGBA(mood.back, .30)); bl.addColorStop(.5, toRGBA(mood.back, .07)); bl.addColorStop(1, toRGBA(mood.back, 0));
    ctx.fillStyle = bl; ctx.fillRect(0, 0, W, H);
    // floor shadow
    ctx.fillStyle = "rgba(0,0,0,.5)"; ctx.beginPath(); ctx.ellipse(W / 2, H * 0.855, W * 0.26, H * 0.045, 0, 0, TAU); ctx.fill();
    // large pixel hero
    var o = heroOpts(cls, chest, helm, wpnC, wtype); o.scale = 2.75;
    var r = W * 0.205, cy = H * 0.82 - r * 0.92;
    pxHumanoid(ctx, W / 2, cy, r, false, o);
    // drifting motes
    var ps = W / 360;
    motes(ctx, W / 2, H * 0.5, W * 0.62, H * 0.66, mood.moteN, mood.mote, mood.moteSeed, 1.6 * ps);
  };

  // limb capsule
  function capsule(ctx, x0, y0, x1, y1, w, fill) {
    var a = Math.atan2(y1 - y0, x1 - x0);
    ctx.save(); ctx.fillStyle = fill;
    ctx.beginPath(); ctx.arc(x0, y0, w, a + Math.PI / 2, a - Math.PI / 2); ctx.arc(x1, y1, w, a - Math.PI / 2, a + Math.PI / 2); ctx.closePath(); ctx.fill(); ctx.restore();
  }
  function plate(ctx, pts, fill, stroke) { ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (var i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]); ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 2.5; ctx.stroke(); } }

  // ----- dark-fantasy drawing helpers -----
  function rnd(seed) { var s = (seed || 1) >>> 0 || 1; return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
  function roundRect(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  // brushed-metal linear gradient (bright top-left -> deep shadow bottom-right)
  function metalGrad(ctx, x0, y0, x1, y1, base) { var g = ctx.createLinearGradient(x0, y0, x1, y1); g.addColorStop(0, lighten(base, .6)); g.addColorStop(.32, lighten(base, .16)); g.addColorStop(.56, base); g.addColorStop(.8, darken(base, .45)); g.addColorStop(1, darken(base, .72)); return g; }
  function clothGrad(ctx, x0, y0, x1, y1, base) { var g = ctx.createLinearGradient(x0, y0, x1, y1); g.addColorStop(0, lighten(base, .22)); g.addColorStop(.5, base); g.addColorStop(1, darken(base, .52)); return g; }
  // worn scratches over a region (deterministic per seed)
  function scratches(ctx, x, y, w, h, n, col, seed) { var r = rnd(seed); ctx.save(); ctx.globalAlpha = .26; ctx.strokeStyle = col; ctx.lineWidth = 1; for (var i = 0; i < n; i++) { var sx = x + (r() - .5) * w, sy = y + (r() - .5) * h, len = 3 + r() * 11, a = (r() - .5) * 1.4; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + Math.cos(a) * len, sy + Math.sin(a) * len); ctx.stroke(); } ctx.restore(); }
  // two glowing eyes centred at x=0 of the current transform
  function glowEyes(ctx, y, dx, r, col) { ctx.save(); ctx.fillStyle = col; ctx.shadowColor = col; ctx.shadowBlur = 12; ctx.beginPath(); ctx.arc(-dx, y, r, 0, TAU); ctx.arc(dx, y, r, 0, TAU); ctx.fill(); ctx.shadowBlur = 0; ctx.fillStyle = "rgba(255,255,255,.9)"; ctx.beginPath(); ctx.arc(-dx, y, r * .42, 0, TAU); ctx.arc(dx, y, r * .42, 0, TAU); ctx.fill(); ctx.restore(); }
  // floating ash / spores / arcane sparks
  function motes(ctx, cx, cy, w, h, n, col, seed, size) { var r = rnd(seed); ctx.save(); for (var i = 0; i < n; i++) { var x = cx + (r() - .5) * w, y = cy + (r() - .5) * h, s = size * (0.4 + r() * 0.9); ctx.globalAlpha = 0.22 + 0.5 * r(); ctx.fillStyle = col; ctx.shadowColor = col; ctx.shadowBlur = 7; ctx.beginPath(); ctx.arc(x, y, s, 0, TAU); ctx.fill(); } ctx.restore(); }
  // low creeping ground fog
  function groundMist(ctx, col) { var r = rnd(4); ctx.save(); for (var i = 0; i < 5; i++) { var x = -70 + i * 35 + (r() - .5) * 20, y = 150 + (r() - .5) * 12, w = 46 + r() * 40, h = 12 + r() * 8; var g = ctx.createRadialGradient(x, y, 2, x, y, w); g.addColorStop(0, toRGBA(lighten(col, .5), .22)); g.addColorStop(1, toRGBA(col, 0)); ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x, y, w, h, 0, 0, TAU); ctx.fill(); } ctx.restore(); }
  // tattered drape (cloak / robe) — builds a closed path with a ragged hem
  function drape(ctx, xL, xR, yTop, yMid, yBot, bulge, teeth, seed) { var r = rnd(seed); ctx.beginPath(); ctx.moveTo(xL, yTop); ctx.quadraticCurveTo(xL - bulge, yMid, xL - bulge * 0.5, yBot); var bx0 = xL - bulge * 0.5, bx1 = xR + bulge * 0.5, span = bx1 - bx0; for (var i = 0; i < teeth; i++) { var tipx = bx0 + span * ((i + 0.5) / teeth), tipy = yBot + 5 + r() * 15; var valx = bx0 + span * ((i + 1) / teeth), valy = yBot - (2 + r() * 7); ctx.lineTo(tipx, tipy); ctx.lineTo(valx, valy); } ctx.quadraticCurveTo(xR + bulge, yMid, xR, yTop); ctx.closePath(); }

  // ---------- KNIGHT (melee) — fallen champion ----------
  function drawKnight(ctx, C) {
    var steel = (C.chest === "#6b6257") ? "#474d57" : C.chest;
    var legsC = (C.legs === "#574f45" || C.legs === "#6b6257") ? "#3d424b" : C.legs;
    var helmC = (C.helm === "#6b6257") ? "#4a515b" : C.helm;
    var edge = "#15110c", gold = "#c8a862", cape = "#6e1414";
    // ---- tattered cape behind ----
    drape(ctx, -38, 38, -44, 50, 150, 40, 7, 3);
    var cg = ctx.createLinearGradient(0, -44, 0, 150); cg.addColorStop(0, lighten(cape, .15)); cg.addColorStop(.5, cape); cg.addColorStop(1, darken(cape, .55));
    ctx.fillStyle = cg; ctx.fill();
    ctx.strokeStyle = "rgba(20,4,4,.7)"; ctx.lineWidth = 2;
    for (var f = -1; f <= 1; f++) { ctx.beginPath(); ctx.moveTo(f * 20, -30); ctx.quadraticCurveTo(f * 30, 60, f * 24, 140); ctx.stroke(); }
    ctx.strokeStyle = "rgba(150,170,200,.22)"; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(-38, -40); ctx.quadraticCurveTo(-56, 40, -40, 132); ctx.stroke();
    // ---- legs: greaves ----
    capsule(ctx, -17, 64, -21, 138, 15, metalGrad(ctx, -30, 64, -12, 138, legsC));
    capsule(ctx, 17, 64, 21, 138, 15, metalGrad(ctx, 12, 64, 30, 138, legsC));
    ctx.fillStyle = lighten(legsC, .25); ctx.beginPath(); ctx.arc(-20, 102, 10, 0, TAU); ctx.arc(21, 102, 10, 0, TAU); ctx.fill();
    ctx.fillStyle = darken(legsC, .5); ctx.beginPath(); ctx.arc(-20, 102, 10, .5, 2.3); ctx.fill(); ctx.beginPath(); ctx.arc(21, 102, 10, .9, 2.7); ctx.fill();
    // sabatons (pointed steel boots)
    plate(ctx, [[-32, 134], [-9, 134], [-6, 150], [-40, 156]], darken(legsC, .6), edge);
    plate(ctx, [[9, 134], [32, 134], [40, 156], [6, 150]], darken(legsC, .6), edge);
    // ---- faulds (skirt plates) ----
    for (var i = -2; i <= 2; i++) { plate(ctx, [[i * 15 - 9, 60], [i * 15 + 9, 60], [i * 15 + 6, 86], [i * 15 - 6, 86]], darken(steel, .62), edge); }
    // ---- torso cuirass ----
    var tg = metalGrad(ctx, -30, -34, 30, 74, steel);
    plate(ctx, [[-44, -32], [-30, -40], [30, -40], [44, -32], [41, 44], [24, 72], [-24, 72], [-41, 44]], tg, edge);
    ctx.strokeStyle = "rgba(0,0,0,.4)"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, -30); ctx.lineTo(0, 68); ctx.stroke();          // central ridge
    ctx.strokeStyle = "rgba(0,0,0,.28)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-30, -8); ctx.quadraticCurveTo(0, 6, 30, -8); ctx.stroke(); // pectoral
    ctx.strokeStyle = gold; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-34, -26); ctx.lineTo(0, -36); ctx.lineTo(34, -26); ctx.stroke();       // collar trim
    ctx.strokeStyle = "rgba(255,255,255,.28)"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-20, -24); ctx.quadraticCurveTo(-26, 10, -16, 46); ctx.stroke(); // sheen
    // engraved emblem (gold diamond with blood core)
    ctx.fillStyle = toRGBA(gold, .5); ctx.beginPath(); ctx.moveTo(0, -16); ctx.lineTo(13, 10); ctx.lineTo(0, 34); ctx.lineTo(-13, 10); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = toRGBA(gold, .8); ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = toRGBA("#8a1c1c", .7); ctx.beginPath(); ctx.arc(0, 9, 4, 0, TAU); ctx.fill();
    scratches(ctx, 0, 12, 68, 88, 9, "rgba(230,232,240,.5)", 5);
    scratches(ctx, 0, 12, 68, 88, 5, "rgba(0,0,0,.5)", 8);
    // belt
    ctx.fillStyle = "#2a1c10"; ctx.fillRect(-26, 66, 52, 8); ctx.fillStyle = gold; ctx.fillRect(-6, 65, 12, 10);
    // ---- arms: vambraces ----
    capsule(ctx, -46, -22, -54, 42, 12, metalGrad(ctx, -58, -22, -42, 42, steel));
    capsule(ctx, 46, -22, 54, 42, 12, metalGrad(ctx, 42, -22, 58, 42, steel));
    ctx.fillStyle = darken(steel, .5); ctx.strokeStyle = edge; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(-55, 46, 12, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.arc(55, 46, 12, 0, TAU); ctx.fill(); ctx.stroke();
    // ---- spiked pauldrons ----
    drawPauldron(ctx, -46, -40, steel, gold, -1);
    drawPauldron(ctx, 46, -40, steel, gold, 1);
    // ---- offhand: shield, or a wand if one is held in the left hand ----
    if (C.offtype === "shield") drawHeaterShield(ctx, -66, 44, C.off);
    else if (C.offtype === "magic") drawOffhandWand(ctx, -58, 44, C.off);
    // ---- horned great helm ----
    ctx.save(); ctx.translate(0, -70);
    ctx.fillStyle = darken(gold, .35);
    ctx.beginPath(); ctx.moveTo(-20, -14); ctx.quadraticCurveTo(-40, -30, -46, -8); ctx.quadraticCurveTo(-34, -14, -20, -2); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(20, -14); ctx.quadraticCurveTo(40, -30, 46, -8); ctx.quadraticCurveTo(34, -14, 20, -2); ctx.closePath(); ctx.fill();
    ctx.fillStyle = metalGrad(ctx, -22, -24, 22, 26, helmC); ctx.strokeStyle = edge; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(0, -2, 25, Math.PI, TAU); ctx.lineTo(22, 20); ctx.quadraticCurveTo(0, 32, -22, 20); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = darken(helmC, .55); ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, -26); ctx.lineTo(0, 26); ctx.stroke();       // reinforcing ridge
    ctx.strokeStyle = "#040404"; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(-16, 4); ctx.lineTo(16, 4); ctx.moveTo(0, -6); ctx.lineTo(0, 16); ctx.stroke(); // cross visor
    glowEyes(ctx, 4, 8, 2.6, "#e0402a");
    ctx.strokeStyle = "rgba(170,190,220,.4)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, -2, 24, Math.PI * 1.05, Math.PI * 1.5); ctx.stroke();
    ctx.fillStyle = darken(cape, .2); ctx.beginPath(); ctx.moveTo(-3, -26); ctx.quadraticCurveTo(-24, -52, -4, -64); ctx.quadraticCurveTo(10, -46, 6, -26); ctx.closePath(); ctx.fill(); // plume
    ctx.restore();
    // ---- weapon in right hand ----
    drawSwordPortrait(ctx, 58, 30, C.wpn, C.wtype);
  }
  function drawPauldron(ctx, x, y, steel, gold, dir) {
    ctx.save();
    ctx.fillStyle = darken(steel, .5); ctx.strokeStyle = "#15110c"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x, y + 6, 23, 0, TAU); ctx.fill(); ctx.stroke();                         // lower lame
    ctx.fillStyle = metalGrad(ctx, x - 20 * dir, y - 20, x + 20 * dir, y + 16, steel);
    ctx.beginPath(); ctx.arc(x, y, 22, 0, TAU); ctx.fill(); ctx.stroke();                             // main dome
    ctx.fillStyle = darken(steel, .35); ctx.beginPath(); ctx.moveTo(x + dir * 13, y - 15); ctx.lineTo(x + dir * 36, y - 26); ctx.lineTo(x + dir * 20, y - 2); ctx.closePath(); ctx.fill(); // spike
    ctx.strokeStyle = gold; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, 22, -2.4, -0.5); ctx.stroke();
    ctx.strokeStyle = "rgba(180,200,230,.5)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, 21, Math.PI * 1.05, Math.PI * 1.55); ctx.stroke();
    ctx.restore();
  }
  function drawHeaterShield(ctx, x, y, col) {
    col = col || "#6a4a2a";
    ctx.save(); ctx.translate(x, y);
    ctx.fillStyle = metalGrad(ctx, -24, -40, 24, 44, col); ctx.strokeStyle = "#15110c"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(-28, -40); ctx.lineTo(28, -40); ctx.lineTo(28, -4); ctx.quadraticCurveTo(28, 34, 0, 52); ctx.quadraticCurveTo(-28, 34, -28, -4); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = toRGBA("#c8a862", .7); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-23, -35); ctx.lineTo(23, -35); ctx.lineTo(23, -4); ctx.quadraticCurveTo(23, 30, 0, 46); ctx.quadraticCurveTo(-23, 30, -23, -4); ctx.closePath(); ctx.stroke();
    ctx.strokeStyle = toRGBA("#c8a862", .85); ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(0, -32); ctx.lineTo(0, 40); ctx.moveTo(-20, -6); ctx.lineTo(20, -6); ctx.stroke();
    ctx.fillStyle = "#8a1c1c"; ctx.beginPath(); ctx.arc(0, -6, 5, 0, TAU); ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,.25)"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-16, -32); ctx.quadraticCurveTo(-22, 0, -12, 30); ctx.stroke();
    ctx.restore();
  }
  // short wand held in the off-hand (shown when a wand sits in the left slot)
  function drawOffhandWand(ctx, x, y, col) {
    col = col || "#e6883a";
    ctx.save(); ctx.translate(x, y); ctx.rotate(-0.32);
    ctx.strokeStyle = "#3a2a1a"; ctx.lineWidth = 5; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(2, 18); ctx.lineTo(-4, -30); ctx.stroke();
    ctx.strokeStyle = "#5a4530"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(2, 18); ctx.lineTo(-4, -30); ctx.stroke();
    var g = ctx.createRadialGradient(-5, -34, 1, -5, -34, 15); g.addColorStop(0, "#fff"); g.addColorStop(.35, lighten(col, .3)); g.addColorStop(1, toRGBA(col, 0));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(-5, -34, 15, 0, TAU); ctx.fill();
    ctx.fillStyle = col; ctx.beginPath(); ctx.arc(-5, -34, 4.5, 0, TAU); ctx.fill();
    ctx.restore();
  }
  function drawSwordPortrait(ctx, x, y, col, wtype) {
    ctx.save(); ctx.translate(x, y);
    if (wtype === "ranged") { drawBowPortrait(ctx, col); ctx.restore(); return; }
    if (wtype === "magic") { drawStaffPortrait(ctx, col); ctx.restore(); return; }
    var blade = (col === "#c8b89a") ? "#c3c8cf" : col;
    // wrapped grip
    ctx.strokeStyle = "#2a2018"; ctx.lineWidth = 6; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(0, 42); ctx.lineTo(0, 14); ctx.stroke();
    ctx.strokeStyle = "#4a3826"; ctx.lineWidth = 6; for (var w = 0; w < 4; w++) { ctx.beginPath(); ctx.moveTo(-3, 20 + w * 5); ctx.lineTo(3, 22 + w * 5); ctx.stroke(); }
    ctx.fillStyle = "#c8a862"; ctx.beginPath(); ctx.arc(0, 45, 5.5, 0, TAU); ctx.fill();                                       // pommel
    ctx.fillStyle = darken("#c8a862", .5); ctx.beginPath(); ctx.arc(0, 46, 2.2, 0, TAU); ctx.fill();
    ctx.strokeStyle = "#8a6d33"; ctx.lineWidth = 6; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(-16, 12); ctx.quadraticCurveTo(0, 18, 16, 12); ctx.stroke(); // crossguard
    ctx.fillStyle = "#c8a862"; ctx.beginPath(); ctx.arc(0, 13, 3.5, 0, TAU); ctx.fill();
    // blade
    var g = ctx.createLinearGradient(-8, -96, 8, 12); g.addColorStop(0, lighten(blade, .6)); g.addColorStop(.5, blade); g.addColorStop(1, darken(blade, .55));
    ctx.fillStyle = g; ctx.strokeStyle = darken(blade, .55); ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(-8, 10); ctx.lineTo(8, 10); ctx.lineTo(8, -80); ctx.lineTo(0, -98); ctx.lineTo(-8, -80); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = "rgba(255,255,255,.5)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-2, -88); ctx.lineTo(-2, 6); ctx.stroke();     // fuller gleam
    ctx.strokeStyle = "rgba(0,0,0,.22)"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(3, -84); ctx.lineTo(3, 6); ctx.stroke();
    ctx.lineCap = "butt"; ctx.restore();
  }
  function drawBowPortrait(ctx, col) {
    col = col || "#8a6a3a";
    ctx.strokeStyle = darken(col, .2); ctx.lineWidth = 6; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(4, -62); ctx.quadraticCurveTo(-34, -30, -30, 0); ctx.quadraticCurveTo(-34, 30, 4, 62); ctx.stroke();       // recurve limbs
    ctx.strokeStyle = lighten(col, .35); ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(4, -62); ctx.quadraticCurveTo(-30, -30, -27, 0); ctx.quadraticCurveTo(-30, 30, 4, 62); ctx.stroke();
    ctx.fillStyle = "#c8a862"; ctx.beginPath(); ctx.arc(4, -62, 3, 0, TAU); ctx.arc(4, 62, 3, 0, TAU); ctx.fill();                          // nock caps
    ctx.strokeStyle = "rgba(233,226,207,.9)"; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(4, -62); ctx.lineTo(4, 62); ctx.stroke();  // string
    ctx.strokeStyle = "#5a4326"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-22, 0); ctx.lineTo(34, 0); ctx.stroke();                 // nocked arrow
    ctx.fillStyle = "#cfd4da"; ctx.beginPath(); ctx.moveTo(42, 0); ctx.lineTo(32, -5); ctx.lineTo(32, 5); ctx.closePath(); ctx.fill();     // head
    ctx.fillStyle = "#7a1414"; ctx.beginPath(); ctx.moveTo(-22, 0); ctx.lineTo(-30, -5); ctx.lineTo(-26, 0); ctx.lineTo(-30, 5); ctx.closePath(); ctx.fill(); // fletching
    ctx.lineCap = "butt";
  }
  function drawStaffPortrait(ctx, col) {
    col = col || "#7fc7e6";
    ctx.strokeStyle = "#3a2a1a"; ctx.lineWidth = 6; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(6, 52); ctx.lineTo(-6, -58); ctx.stroke();
    ctx.strokeStyle = "#5a4530"; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(6, 52); ctx.lineTo(-6, -58); ctx.stroke();
    ctx.strokeStyle = "#6a5232"; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(-8, -60, 13, -0.7, Math.PI + 0.7); ctx.stroke();              // claw setting
    ctx.beginPath(); ctx.moveTo(-19, -58); ctx.lineTo(-14, -66); ctx.moveTo(3, -58); ctx.lineTo(-2, -66); ctx.stroke();
    var g = ctx.createRadialGradient(-8, -64, 1, -8, -64, 26); g.addColorStop(0, "#fff"); g.addColorStop(.3, lighten(col, .4)); g.addColorStop(.7, toRGBA(col, .5)); g.addColorStop(1, toRGBA(col, 0));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(-8, -64, 26, 0, TAU); ctx.fill();                                                          // glow
    ctx.fillStyle = lighten(col, .2); ctx.strokeStyle = "#fff"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(-8, -76); ctx.lineTo(-1, -63); ctx.lineTo(-8, -50); ctx.lineTo(-15, -63); ctx.closePath(); ctx.fill(); ctx.stroke(); // crystal
    ctx.fillStyle = "rgba(255,255,255,.85)"; ctx.beginPath(); ctx.moveTo(-8, -76); ctx.lineTo(-8, -63); ctx.lineTo(-15, -63); ctx.closePath(); ctx.fill();
    ctx.lineCap = "butt";
  }

  // ---------- RANGER — hunter of the wilds ----------
  function drawRanger(ctx, C) {
    var leather = (C.chest === "#6b6257") ? "#5a4326" : C.chest;
    var cloak = (C.helm !== "#6b6257") ? C.helm : "#26402b";
    var legsC = (C.legs === "#574f45" || C.legs === "#6b6257") ? "#3a2f22" : C.legs;
    var gold = "#c8a862";
    // ---- tattered cloak behind ----
    drape(ctx, -30, 34, -52, 46, 152, 44, 7, 7);
    var cg = ctx.createLinearGradient(-30, -52, 40, 152); cg.addColorStop(0, lighten(cloak, .12)); cg.addColorStop(.55, cloak); cg.addColorStop(1, darken(cloak, .6));
    ctx.fillStyle = cg; ctx.fill();
    ctx.strokeStyle = toRGBA(darken(cloak, .7), .8); ctx.lineWidth = 2; for (var f = -1; f <= 1; f++) { ctx.beginPath(); ctx.moveTo(f * 22, -20); ctx.quadraticCurveTo(f * 30, 70, f * 28, 148); ctx.stroke(); }
    ctx.strokeStyle = "rgba(160,180,150,.22)"; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(-30, -46); ctx.quadraticCurveTo(-50, 44, -34, 140); ctx.stroke();
    // ---- quiver on back ----
    ctx.save(); ctx.rotate(0.22);
    ctx.fillStyle = "#3a2817"; ctx.strokeStyle = "#20140a"; ctx.lineWidth = 2; roundRect(ctx, 26, -74, 16, 50, 4); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = "#c8a862"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(26, -58); ctx.lineTo(42, -58); ctx.moveTo(26, -40); ctx.lineTo(42, -40); ctx.stroke();
    for (var q = 0; q < 3; q++) { var ax = 29 + q * 5; ctx.strokeStyle = "#20160c"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(ax, -74); ctx.lineTo(ax, -92); ctx.stroke(); ctx.fillStyle = "#7a1414"; ctx.beginPath(); ctx.moveTo(ax, -92); ctx.lineTo(ax - 4, -88); ctx.lineTo(ax, -84); ctx.lineTo(ax + 4, -88); ctx.closePath(); ctx.fill(); }
    ctx.restore();
    // ---- legs + boots ----
    capsule(ctx, -15, 66, -18, 132, 11, clothGrad(ctx, -26, 66, -8, 132, legsC));
    capsule(ctx, 15, 66, 18, 132, 11, clothGrad(ctx, 8, 66, 26, 132, legsC));
    plate(ctx, [[-27, 118], [-9, 118], [-8, 150], [-32, 152]], darken(legsC, .5), "#20140a");
    plate(ctx, [[9, 118], [27, 118], [32, 152], [8, 150]], darken(legsC, .5), "#20140a");
    ctx.strokeStyle = "#20140a"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-24, 108); ctx.lineTo(-8, 108); ctx.moveTo(8, 108); ctx.lineTo(24, 108); ctx.stroke();
    // ---- torso jerkin ----
    plate(ctx, [[-32, -34], [32, -34], [30, 20], [24, 58], [-24, 58], [-30, 20]], clothGrad(ctx, -30, -34, 30, 60, leather), "#241a10");
    ctx.strokeStyle = darken(leather, .55); ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(-26, -30); ctx.lineTo(24, 36); ctx.stroke();       // baldric
    ctx.strokeStyle = darken(leather, .35); ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-26, -30); ctx.lineTo(24, 36); ctx.stroke();
    ctx.strokeStyle = "rgba(230,215,180,.16)"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-28, -28); ctx.lineTo(-24, 54); ctx.moveTo(28, -28); ctx.lineTo(24, 54); ctx.stroke(); // stitching
    ctx.fillStyle = "#2a1c10"; ctx.fillRect(-28, 50, 56, 9); ctx.fillStyle = gold; ctx.fillRect(-6, 49, 12, 10);                              // belt
    ctx.fillStyle = "#3a2817"; roundRect(ctx, 13, 52, 14, 16, 3); ctx.fill();                                                                // pouch
    // shoulder mantle over the cloak
    ctx.fillStyle = clothGrad(ctx, -36, -44, 36, -20, darken(cloak, .12));
    ctx.beginPath(); ctx.moveTo(-38, -28); ctx.quadraticCurveTo(0, -48, 38, -28); ctx.quadraticCurveTo(20, -20, 0, -22); ctx.quadraticCurveTo(-20, -20, -38, -28); ctx.closePath(); ctx.fill();
    // ---- arms + bracers ----
    capsule(ctx, -34, -22, -48, 32, 10, clothGrad(ctx, -58, -22, -38, 32, leather));
    capsule(ctx, 34, -22, 48, 32, 10, clothGrad(ctx, 38, -22, 58, 32, leather));
    ctx.fillStyle = "#2a1c10"; roundRect(ctx, -54, 20, 15, 18, 3); ctx.fill(); roundRect(ctx, 39, 20, 15, 18, 3); ctx.fill();
    ctx.strokeStyle = toRGBA(gold, .4); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-52, 26); ctx.lineTo(-41, 26); ctx.moveTo(41, 26); ctx.lineTo(52, 26); ctx.stroke();
    // off-hand wand (if one is held in the left hand)
    if (C.offtype === "magic") drawOffhandWand(ctx, -52, 40, C.off);
    // ---- deep hood ----
    ctx.save(); ctx.translate(0, -62);
    ctx.fillStyle = clothGrad(ctx, -30, -38, 30, 26, cloak); ctx.strokeStyle = darken(cloak, .6); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-30, 26); ctx.quadraticCurveTo(-40, -32, -2, -42); ctx.quadraticCurveTo(6, -44, 12, -38); ctx.quadraticCurveTo(38, -28, 30, 26); ctx.quadraticCurveTo(0, 14, -30, 26); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = darken(cloak, .3); ctx.beginPath(); ctx.moveTo(8, -40); ctx.quadraticCurveTo(22, -48, 15, -30); ctx.closePath(); ctx.fill();                    // hood tip
    ctx.fillStyle = "#080a07"; ctx.beginPath(); ctx.ellipse(0, 4, 16, 19, 0, 0, TAU); ctx.fill();                                                                  // face void
    ctx.fillStyle = darken(leather, .25); ctx.beginPath(); ctx.moveTo(-13, 10); ctx.quadraticCurveTo(0, 22, 13, 10); ctx.quadraticCurveTo(0, 16, -13, 10); ctx.closePath(); ctx.fill(); // scarf
    glowEyes(ctx, 2, 7, 2.4, "#c9e37a");
    ctx.strokeStyle = "rgba(170,190,150,.3)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-30, 24); ctx.quadraticCurveTo(-38, -30, -4, -40); ctx.stroke();
    ctx.restore();
    // ---- bow in hand ----
    ctx.save(); ctx.translate(54, 18); ctx.scale(1.3, 1.3); drawBowPortrait(ctx, C.wtype === "ranged" ? C.wpn : "#8a6a3a"); ctx.restore();
  }

  // ---------- MAGE — fallen scholar ----------
  function drawMage(ctx, C) {
    var robe = (C.chest === "#6b6257") ? "#2f2a52" : C.chest;
    var hood = (C.helm !== "#6b6257") ? C.helm : darken(robe, .12);
    var glow = (C.wtype === "magic") ? C.wpn : "#8fd0ff";
    var gold = "#c8a862";
    // ---- arcane aura + ground rune circle (element colour) ----
    var ag = ctx.createRadialGradient(0, 20, 10, 0, 20, 150); ag.addColorStop(0, toRGBA(glow, .18)); ag.addColorStop(.6, toRGBA(glow, .05)); ag.addColorStop(1, toRGBA(glow, 0));
    ctx.fillStyle = ag; ctx.beginPath(); ctx.arc(0, 20, 150, 0, TAU); ctx.fill();
    ctx.strokeStyle = toRGBA(glow, .4); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(0, 158, 70, 16, 0, 0, TAU); ctx.stroke(); ctx.beginPath(); ctx.ellipse(0, 158, 54, 12, 0, 0, TAU); ctx.stroke();
    for (var k = 0; k < 8; k++) { var ka = k / 8 * TAU; ctx.fillStyle = toRGBA(glow, .5); ctx.beginPath(); ctx.arc(Math.cos(ka) * 62, 158 + Math.sin(ka) * 14, 1.8, 0, TAU); ctx.fill(); }
    // ---- robe (flared, tattered hem) ----
    drape(ctx, -30, 30, -40, 60, 156, 52, 9, 11);
    var rg = ctx.createLinearGradient(0, -40, 0, 156); rg.addColorStop(0, lighten(robe, .18)); rg.addColorStop(.5, robe); rg.addColorStop(1, darken(robe, .55));
    ctx.fillStyle = rg; ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,.32)"; ctx.lineWidth = 2; for (var f = -1; f <= 1; f++) { ctx.beginPath(); ctx.moveTo(f * 14, -6); ctx.quadraticCurveTo(f * 34, 80, f * 44, 150); ctx.stroke(); }
    ctx.strokeStyle = toRGBA(gold, .7); ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(-52, 150); ctx.quadraticCurveTo(0, 164, 52, 150); ctx.stroke();          // hem trim
    ctx.strokeStyle = toRGBA(glow, .5); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(0, -14); ctx.lineTo(0, 128); ctx.stroke();                                 // rune seam
    for (var e = 0; e < 5; e++) { ctx.fillStyle = toRGBA(glow, .6); ctx.beginPath(); ctx.arc(0, -10 + e * 30, 2.2, 0, TAU); ctx.fill(); }
    ctx.strokeStyle = toRGBA(lighten(glow, .3), .45); ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(30, -36); ctx.quadraticCurveTo(48, 50, 40, 140); ctx.stroke(); // rim light (staff side)
    // ---- wide sleeves ----
    ctx.fillStyle = clothGrad(ctx, -56, 0, -30, 60, darken(robe, .08)); ctx.beginPath(); ctx.moveTo(-28, -28); ctx.quadraticCurveTo(-60, 6, -46, 60); ctx.lineTo(-26, 44); ctx.quadraticCurveTo(-34, 4, -28, -28); ctx.closePath(); ctx.fill();
    ctx.fillStyle = clothGrad(ctx, 30, 0, 56, 60, darken(robe, .08)); ctx.beginPath(); ctx.moveTo(28, -28); ctx.quadraticCurveTo(60, 6, 46, 60); ctx.lineTo(26, 44); ctx.quadraticCurveTo(34, 4, 28, -28); ctx.closePath(); ctx.fill();
    // ---- sash / belt ----
    ctx.fillStyle = darken(robe, .3); ctx.beginPath(); ctx.moveTo(-30, 28); ctx.lineTo(30, 22); ctx.lineTo(30, 40); ctx.lineTo(-30, 46); ctx.closePath(); ctx.fill();
    ctx.fillStyle = gold; ctx.beginPath(); ctx.arc(-2, 36, 6, 0, TAU); ctx.fill();
    ctx.fillStyle = toRGBA(glow, .9); ctx.shadowColor = glow; ctx.shadowBlur = 8; ctx.beginPath(); ctx.arc(-2, 36, 2.6, 0, TAU); ctx.fill(); ctx.shadowBlur = 0;
    // ---- hood + void face, lit from below by the staff ----
    ctx.save(); ctx.translate(0, -58);
    ctx.fillStyle = clothGrad(ctx, -32, -40, 32, 26, hood); ctx.strokeStyle = darken(hood, .6); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-32, 26); ctx.quadraticCurveTo(-42, -42, 0, -46); ctx.quadraticCurveTo(42, -42, 32, 26); ctx.quadraticCurveTo(0, 14, -32, 26); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#05060c"; ctx.beginPath(); ctx.ellipse(0, 3, 17, 21, 0, 0, TAU); ctx.fill();
    var flg = ctx.createRadialGradient(0, 10, 1, 0, 10, 20); flg.addColorStop(0, toRGBA(glow, .5)); flg.addColorStop(1, toRGBA(glow, 0));
    ctx.fillStyle = flg; ctx.beginPath(); ctx.ellipse(0, 6, 16, 20, 0, 0, TAU); ctx.fill();
    glowEyes(ctx, 2, 7, 3, glow);
    ctx.strokeStyle = toRGBA(gold, .5); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-30, 24); ctx.quadraticCurveTo(0, 12, 30, 24); ctx.stroke();
    ctx.restore();
    // ---- left-hand conjured orb ----
    ctx.save(); ctx.translate(-46, 44);
    var og = ctx.createRadialGradient(0, 0, 1, 0, 0, 16); og.addColorStop(0, "#fff"); og.addColorStop(.4, lighten(glow, .3)); og.addColorStop(1, toRGBA(glow, 0));
    ctx.fillStyle = og; ctx.beginPath(); ctx.arc(0, 0, 16, 0, TAU); ctx.fill();
    ctx.fillStyle = toRGBA(glow, .9); ctx.beginPath(); ctx.arc(0, 0, 5, 0, TAU); ctx.fill();
    ctx.strokeStyle = toRGBA(glow, .5); ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(0, 0, 12, 5, 0.5, 0, TAU); ctx.stroke();
    ctx.restore();
    // ---- staff ----
    ctx.save(); ctx.translate(50, 24); ctx.scale(1.2, 1.2); drawStaffPortrait(ctx, glow); ctx.restore();
    // ---- floating runes ----
    var runes = [[-60, -24], [62, -46], [-66, 64], [70, 44], [-4, -100], [58, 86]];
    for (var i = 0; i < runes.length; i++) { ctx.fillStyle = toRGBA(glow, .85); ctx.shadowColor = glow; ctx.shadowBlur = 8; ctx.beginPath(); ctx.arc(runes[i][0], runes[i][1], 2.2, 0, TAU); ctx.fill(); }
    ctx.shadowBlur = 0;
  }

  // ============================================================
  // PIXEL SPRITES — upright chibi, flip L/R (heroes, enemies, bosses)
  // ============================================================
  function ringGlow(ctx, x, y, r, c) { var g = ctx.createRadialGradient(x, y, r * 0.4, x, y, r); g.addColorStop(0, c); g.addColorStop(1, "rgba(0,0,0,0)"); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); }
  G.ringGlow = ringGlow;

  var OL = "#0a0806";
  // detailed chibi pixel humanoid centred at (cx,cy); flips horizontally; tinted by opts.
  function pxHumanoid(ctx, cx, cy, r, flip, o) {
    o = o || {};
    var GW = 32, GH = 36, ps = r * (o.scale || 2.5) / GH;                 // 2x resolution grid
    var footY = cy + r * 0.92, ox = cx - GW * ps / 2, oy = footY - GH * ps;
    function P(gx, gy, w, h, col) { if (!col) return; var fx = flip ? (GW - gx - w) : gx; ctx.fillStyle = col; ctx.fillRect(Math.round(ox + fx * ps), Math.round(oy + gy * ps), Math.ceil(w * ps), Math.ceil(h * ps)); }
    function glow(gx, gy, w, h, col) { ctx.save(); ctx.shadowColor = col; ctx.shadowBlur = 8 * ps; P(gx, gy, w, h, col); ctx.restore(); }
    function fc(c) { return (o.flash && c) ? lighten(c, o.flash) : c; }
    var sk0 = o.skin || "#e6b892";
    var skin = fc(sk0), skinH = fc(lighten(sk0, .17)), skinS = fc(darken(sk0, .26)), skinD = fc(darken(sk0, .5));
    var A0 = o.armor || "#6b6257";
    var arm = fc(A0), armH = fc(lighten(A0, .36)), armS = fc(darken(A0, .4)), armD = fc(darken(A0, .62));
    var Pp = o.pants || darken(A0, .35);
    var pants = fc(Pp), pantsH = fc(lighten(Pp, .2)), pantsS = fc(darken(Pp, .32));
    var boots = fc(o.boots || "#241a10"), bootsH = fc(lighten(o.boots || "#241a10", .3));
    var T0 = o.trim || "#c8a862";
    var trim = fc(T0), trimH = fc(lighten(T0, .35)), trimS = fc(darken(T0, .35));
    var hair = fc(o.hair || "#5a3a22"), hairH = fc(lighten(o.hair || "#5a3a22", .3)), hairS = fc(darken(o.hair || "#5a3a22", .35));

    if (o.aura) ringGlow(ctx, cx, cy, r * (o.scale ? o.scale * 0.75 : 1.9), toRGBA(o.aura, .2));
    ctx.fillStyle = "rgba(0,0,0,.4)"; ctx.beginPath(); ctx.ellipse(cx, footY, r * 0.82, r * 0.3, 0, 0, TAU); ctx.fill();

    // ===== cape / wings (behind) =====
    if (o.cape) { var cp = fc(o.cape), cpS = darken(o.cape, .34), cpD = darken(o.cape, .55);
      P(7, 13, 18, 17, darken(cp, .16)); P(6, 15, 2, 15, cpS); P(24, 15, 2, 15, cpS);
      P(11, 16, 1, 13, cpD); P(20, 16, 1, 13, cpD);
      P(7, 29, 3, 2, cpS); P(13, 29, 3, 3, cpD); P(19, 29, 3, 2, cpS); P(9, 30, 1, 1, OL); P(22, 30, 1, 1, OL); }
    if (o.wings) { var wg = fc(o.wings); P(2, 9, 5, 13, toRGBA(wg, .5)); P(1, 12, 2, 7, toRGBA(wg, .6)); P(25, 9, 5, 13, toRGBA(wg, .5)); P(29, 12, 2, 7, toRGBA(wg, .6)); }

    // ===== legs =====
    P(10, 27, 6, 8, pants); P(10, 27, 1, 8, pantsH); P(15, 27, 1, 8, pantsS); P(9, 27, 1, 9, OL); P(16, 28, 1, 7, OL);
    P(10, 31, 6, 1, darken(Pp, .2));
    P(9, 33, 7, 3, boots); P(9, 33, 7, 1, bootsH); P(9, 35, 7, 1, OL);
    P(17, 27, 6, 8, pantsS); P(17, 27, 1, 8, pants); P(22, 27, 1, 8, OL);
    P(17, 31, 6, 1, darken(Pp, .26));
    P(16, 33, 7, 3, boots); P(16, 33, 7, 1, bootsH); P(16, 35, 7, 1, OL);

    // ===== back arm =====
    P(6, 16, 3, 10, armS); P(5, 16, 1, 10, OL); P(6, 26, 3, 2, skin); P(6, 26, 3, 1, skinH); P(6, 27, 3, 1, skinS);

    // ===== torso =====
    P(8, 15, 16, 12, arm); P(8, 15, 2, 12, armH); P(22, 15, 2, 12, armS); P(8, 14, 16, 1, OL); P(7, 15, 1, 12, OL); P(24, 15, 1, 12, OL); P(8, 27, 16, 1, OL);
    P(15, 16, 2, 10, darken(A0, .22)); P(16, 16, 1, 9, armH);            // central seam + gleam
    P(10, 16, 6, 1, lighten(A0, .16)); P(18, 16, 4, 1, lighten(A0, .16)); // upper-chest light
    P(10, 15, 1, 1, armD); P(21, 15, 1, 1, armD); P(10, 24, 1, 1, armD); P(21, 24, 1, 1, armD); // rivets
    P(11, 15, 10, 1, trim); P(11, 14, 10, 1, trimS);                     // collar
    P(8, 25, 16, 2, trim); P(8, 25, 16, 1, trimH); P(14, 25, 3, 2, trimS); P(15, 25, 1, 1, darken(T0, .55)); // belt + buckle
    if (o.emblem !== false) { P(14, 18, 4, 5, darken(T0, .18)); P(14, 18, 2, 5, trim); P(15, 19, 1, 3, trimH); }

    // ===== front arm + pauldrons =====
    P(23, 16, 3, 10, arm); P(25, 16, 1, 10, armS); P(26, 16, 1, 10, OL); P(23, 26, 3, 2, skin); P(23, 26, 3, 1, skinH); P(23, 27, 3, 1, skinS);
    if (o.pauldrons) {
      P(4, 13, 6, 5, lighten(A0, .2)); P(4, 13, 6, 1, lighten(A0, .42)); P(4, 13, 1, 5, OL); P(4, 12, 6, 1, OL); P(4, 18, 6, 1, OL); P(9, 14, 1, 3, armD);
      P(22, 13, 6, 5, lighten(A0, .2)); P(22, 13, 6, 1, lighten(A0, .42)); P(27, 13, 1, 5, OL); P(22, 12, 6, 1, OL); P(22, 18, 6, 1, OL); P(22, 14, 1, 3, armD);
    }

    // ===== head (cols 9-22) =====
    P(10, 2, 12, 12, skin); P(9, 3, 1, 10, skin); P(22, 3, 1, 10, skin);
    P(10, 2, 2, 11, skinH); P(20, 3, 2, 10, skinS);                      // light / shade sides
    P(10, 1, 12, 1, OL); P(9, 2, 1, 1, OL); P(22, 2, 1, 1, OL); P(8, 3, 1, 10, OL); P(23, 3, 1, 10, OL); P(9, 13, 1, 1, OL); P(22, 13, 1, 1, OL); P(10, 14, 12, 1, OL);
    var ht = o.headType || "hair";
    if (ht === "helm") {
      P(9, 1, 14, 8, arm); P(9, 1, 2, 8, armH); P(21, 1, 2, 8, armS); P(9, 0, 14, 1, OL); P(8, 1, 1, 9, OL); P(23, 1, 1, 9, OL);
      P(9, 8, 14, 1, armD); P(10, 9, 12, 2, "#050505"); P(10, 9, 12, 1, armD);   // brow + visor slit
      glow(12, 9, 3, 2, o.eye || "#e0402a"); glow(18, 9, 3, 2, o.eye || "#e0402a");
      P(9, 11, 14, 3, armS); P(9, 11, 2, 3, arm); P(9, 14, 14, 1, OL); P(15, 9, 2, 5, armD); // cheeks + nasal
      P(10, 2, 1, 1, armD); P(21, 2, 1, 1, armD);
      if (o.crest !== false) { P(14, -4, 4, 5, trim); P(14, -4, 2, 5, trimH); P(15, -5, 2, 1, trimS); }
    } else if (ht === "hood") {
      var hd = fc(o.headCol || "#3a3550");
      P(8, 0, 16, 12, hd); P(8, 0, 2, 12, lighten(o.headCol || "#3a3550", .14)); P(22, 0, 2, 12, darken(o.headCol || "#3a3550", .42));
      P(8, -1, 16, 1, OL); P(7, 0, 1, 12, OL); P(24, 0, 1, 12, OL); P(10, 1, 12, 1, darken(hd, .22));
      P(11, 3, 1, 8, darken(hd, .28)); P(20, 3, 1, 8, darken(hd, .4));
      P(11, 5, 10, 7, "#0b0a12");                                        // face void
      glow(12, 7, 2, 3, o.eye || "#c9e37a"); glow(18, 7, 2, 3, o.eye || "#c9e37a");
      P(9, 11, 14, 2, darken(hd, .32));
    } else if (ht === "skull") {
      P(11, 6, 4, 3, "#161210"); P(17, 6, 4, 3, "#161210"); glow(12, 7, 2, 2, o.eye || "#b9d24a"); glow(18, 7, 2, 2, o.eye || "#b9d24a");
      P(15, 9, 2, 2, "#161210"); P(11, 12, 10, 1, "#161210");
      P(12, 12, 1, 2, skin); P(14, 12, 1, 2, skin); P(16, 12, 1, 2, skin); P(18, 12, 1, 2, skin); P(20, 12, 1, 2, skin);
      if (o.hood) { var hh = fc(o.headCol || "#3a3a2a"); P(8, 0, 16, 3, hh); P(8, 0, 2, 8, hh); P(22, 0, 2, 8, hh); P(8, -1, 16, 1, OL); }
    } else {
      P(11, 6, 3, 3, "#f4efe4"); P(18, 6, 3, 3, "#f4efe4");             // eye whites
      P(12, 7, 2, 2, o.eye || "#4a3fa0"); P(19, 7, 2, 2, o.eye || "#4a3fa0"); P(12, 7, 1, 1, "#fff"); P(19, 7, 1, 1, "#fff");
      P(11, 5, 3, 1, skinD); P(18, 5, 3, 1, skinD);                     // brows
      P(15, 10, 2, 1, skinS); P(13, 12, 6, 1, skinS); P(14, 12, 4, 1, darken(sk0, .42)); // nose + mouth
      P(9, 0, 14, 3, hair); P(9, 0, 14, 1, hairH); P(9, 1, 2, 6, hair); P(21, 1, 2, 6, hair);
      P(11, 3, 4, 1, hair); P(17, 3, 4, 1, hair); P(12, 0, 1, 3, hairH); P(19, 0, 1, 3, hairH); P(9, -1, 14, 1, OL);
      if (o.longHair) { P(6, 3, 3, 15, hair); P(6, 3, 1, 15, hairH); P(8, 4, 1, 13, hairS); P(23, 3, 3, 13, hair); P(25, 3, 1, 13, hairS); P(7, 17, 2, 3, hair); }
    }
    if (o.horns) { P(6, -2, 3, 4, "#22170f"); P(5, -5, 2, 4, "#22170f"); P(4, -7, 2, 2, "#22170f"); P(23, -2, 3, 4, "#22170f"); P(25, -5, 2, 4, "#22170f"); P(26, -7, 2, 2, "#22170f"); }

    // ===== weapon (front hand) =====
    if (o.weapon && o.weapon.type && o.weapon.type !== "none") pxWeapon(P, glow, o.weapon, trim);
  }

  function pxWeapon(P, glow, w, trim) {
    var c = w.col || "#c3c8cf", cl = lighten(c, .55), cs = darken(c, .45), cd = darken(c, .65);
    var wood = "#5a4326", woodH = "#7c5e38", woodD = "#372716", trimH = lighten(trim, .35);
    if (w.type === "greatsword") {
      P(24, -5, 4, 23, c); P(24, -5, 1, 23, cl); P(27, -4, 1, 22, cs); P(25, -6, 2, 1, "#fff"); P(24, -6, 4, 1, OL); P(25, -4, 1, 21, lighten(c, .3)); // blade + fuller
      P(21, 18, 10, 2, trim); P(21, 18, 10, 1, trimH); P(20, 18, 1, 2, trimH); P(31, 18, 1, 2, trimH);   // crossguard
      P(24, 20, 4, 5, wood); P(24, 20, 1, 5, woodH); P(27, 20, 1, 5, woodD); P(23, 25, 6, 2, trim); P(24, 25, 4, 1, trimH); // grip + pommel
    } else if (w.type === "sword") {
      P(24, 2, 3, 16, c); P(24, 2, 1, 16, cl); P(26, 3, 1, 14, cs); P(24, 1, 3, 1, "#fff"); P(25, 2, 1, 15, lighten(c, .28));
      P(22, 18, 7, 2, trim); P(22, 18, 7, 1, trimH); P(24, 20, 3, 5, wood); P(24, 20, 1, 5, woodH); P(23, 25, 5, 2, trim);
    } else if (w.type === "dagger") {
      P(24, 9, 3, 10, c); P(24, 9, 1, 10, cl); P(26, 10, 1, 8, cs); P(24, 8, 3, 1, "#fff"); P(22, 19, 7, 1, trim); P(24, 20, 3, 4, wood); P(23, 24, 5, 1, trim);
    } else if (w.type === "bow") {
      P(28, 0, 2, 4, wood); P(26, 3, 2, 4, wood); P(24, 7, 2, 6, wood); P(26, 12, 2, 4, wood); P(28, 15, 2, 4, wood);
      P(28, 0, 1, 4, woodH); P(24, 7, 1, 6, woodH); P(24, 7, 2, 1, trim); P(24, 12, 2, 1, trim);         // grip binding
      P(30, 1, 1, 17, "#e6ddc4");                                                                          // string
      P(17, 9, 11, 1, wood); P(15, 9, 2, 1, cl); P(15, 8, 1, 3, cl); P(28, 8, 1, 1, cs); P(28, 10, 1, 1, cs); // nocked arrow + fletch
    } else if (w.type === "staff") {
      P(24, 4, 3, 22, wood); P(24, 4, 1, 22, woodH); P(26, 4, 1, 22, woodD); P(23, 25, 5, 2, trim);        // shaft + ferrule
      var g = w.col || "#8fd0ff", gl = lighten(g, .5);
      P(22, -2, 7, 3, trim); P(23, -4, 5, 2, trim); P(22, 0, 1, 3, trimH); P(28, 0, 1, 3, trimH);          // claw setting
      glow(23, -5, 5, 7, g); P(24, -4, 3, 5, gl); P(25, -3, 1, 1, "#fff"); P(24, -1, 3, 1, darken(g, .2)); // gem
    } else if (w.type === "club") {
      P(23, 3, 8, 15, wood); P(23, 3, 2, 15, woodH); P(29, 3, 2, 15, woodD); P(23, 2, 8, 1, OL); P(23, 18, 8, 1, OL);
      P(22, 6, 1, 2, woodD); P(31, 9, 1, 2, woodD); P(22, 13, 1, 2, woodD);                                // knots
      P(25, 3, 1, 1, "#2a1c10"); P(28, 6, 1, 1, "#2a1c10"); P(26, 11, 1, 1, "#2a1c10");                    // studs
      P(25, 18, 3, 8, wood); P(25, 18, 1, 8, woodH); P(24, 25, 5, 1, "#2a1c10");                            // handle
    } else if (w.type === "twin") {
      P(24, 2, 2, 14, c); P(24, 2, 1, 14, cl); P(25, 3, 1, 12, cs); P(24, 1, 2, 1, "#fff"); P(23, 16, 4, 1, trim); P(24, 17, 2, 4, wood);  // main
      P(20, 5, 2, 12, c); P(20, 5, 1, 12, cl); P(21, 6, 1, 10, cs); P(19, 17, 4, 1, trim); P(20, 18, 2, 3, wood);                          // off-hand
    }
  }
  G.pxHumanoid = pxHumanoid;

  // shared hero look (used by battle sprite AND home portrait) reflecting equipped gear
  function heroOpts(cls, chest, helm, wpnC, wtype) {
    var o = {};
    if (cls === "melee") {
      o.skin = "#f0c49a"; o.hair = "#d8353b"; o.longHair = true; o.eye = "#5a6fd0";
      o.armor = (chest === "#6b6257") ? "#cfd3db" : chest; o.pants = "#454a54"; o.trim = "#e6c464"; o.pauldrons = true; o.cape = "#7c1622";
      o.weapon = { type: wtype === "melee" ? "greatsword" : wtype === "ranged" ? "bow" : "staff", col: wpnC };
    } else if (cls === "ranged") {
      o.skin = "#ecbd90"; o.headType = "hood"; o.headCol = (helm && helm !== "#6b6257") ? helm : "#2c4a30";
      o.armor = (chest === "#6b6257") ? "#5a4326" : chest; o.pants = "#3a2f22"; o.trim = "#9a7a3a"; o.cape = "#27412c"; o.eye = "#c9e37a";
      o.weapon = { type: wtype === "ranged" ? "bow" : wtype === "magic" ? "staff" : "sword", col: wtype === "ranged" ? wpnC : "#8a6a3a" };
    } else {
      o.headType = "hood"; o.headCol = (helm && helm !== "#6b6257") ? helm : "#332e5e"; o.eye = (wtype === "magic") ? wpnC : "#8fd0ff";
      o.armor = (chest === "#6b6257") ? "#342f66" : chest; o.pants = o.armor; o.trim = "#c8a862";
      o.weapon = { type: wtype === "magic" ? "staff" : wtype === "ranged" ? "bow" : "sword", col: (wtype === "magic") ? wpnC : "#8fd0ff" };
    }
    return o;
  }
  // ---------- hero (player) ----------
  G.drawHeroTop = function (ctx, p) {
    var chest = eqColor("chest", "#6b6257"), helm = G.getEquipped("helmet") ? eqColor("helmet", null) : null;
    var rw = G.getEquipped("right"), wpnC = rw ? ITEMS[rw.id].color : "#c3c8cf", wtype = rw ? ITEMS[rw.id].type : "melee";
    var o = heroOpts(G.state.cls, chest, helm, wpnC, wtype); o.scale = 2.55;
    pxHumanoid(ctx, p.x, p.y, p.r, Math.cos(p.facing) < 0, o);
  };

  // ---------- enemies ----------
  var ENEMY_CFG = {
    soldier: { skin: "#9db07a", headType: "skull", armor: "#5f6a4a", pants: "#39402a", trim: "#7d5a2a", eye: "#c9e37a", weapon: { type: "sword", col: "#8f9480" } },
    archer:  { skin: "#9db0a0", headType: "skull", hood: true, headCol: "#38473f", armor: "#48584e", pants: "#29342e", trim: "#5a6a5a", eye: "#a8e0c0", weapon: { type: "bow", col: "#6a5a3a" } },
    knight:  { skin: "#c9ccd4", headType: "helm", pants: "#3a3f47", trim: "#8a7a4a", pauldrons: true, eye: "#e0402a", cape: "#38202e", weapon: { type: "sword", col: "#c2c8d2" } },
    giant:   { skin: "#8a7a62", headType: "hair", hair: "#463626", pants: "#463626", trim: "#6a4a2a", pauldrons: true, eye: "#e0a040", weapon: { type: "club", col: "#5a4326" }, scale: 3.05, emblem: false },
    cultist: { headType: "hood", trim: "#7a5ab0", eye: "#d060ff", weapon: { type: "staff", col: "#c07add" } }
  };
  G.drawEnemyTop = function (ctx, e) {
    var def = G.ENEMIES[e.type], rank = G.RANKS[e.rank];
    var flip = Math.cos(e.facing) < 0;
    var flash = e.hitT > 0 ? 0.55 : (e.windT > 0 ? 0.28 + 0.2 * Math.max(0, Math.sin(Date.now() / 55)) : 0);
    var o = {}, cfg = ENEMY_CFG[e.type] || ENEMY_CFG.soldier;
    for (var k in cfg) if (cfg.hasOwnProperty(k)) o[k] = cfg[k];
    o.flash = flash; o.scale = o.scale || 2.5;
    if (e.type === "knight") o.armor = def.color;
    if (e.type === "cultist") { o.headCol = def.color; o.armor = darken(def.color, .28); o.pants = darken(def.color, .4); }
    pxHumanoid(ctx, e.x, e.y, e.r, flip, o);
    // rank ring + pips
    ctx.strokeStyle = rank.ring; ctx.lineWidth = 2; ctx.globalAlpha = 0.8; ctx.beginPath(); ctx.ellipse(e.x, e.y + e.r * 0.9, e.r * 0.82, e.r * 0.3, 0, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1;
    for (var i = 0; i < e.rank; i++) { ctx.fillStyle = rank.ring; ctx.beginPath(); ctx.arc(e.x - (e.rank - 1) * 4 + i * 8, e.y - e.r * 1.7, 2.6, 0, TAU); ctx.fill(); }
    if (e.hp < e.maxHp) { var w = e.r * 2.0, hx = e.x - w / 2, hy = e.y - e.r * 1.95; ctx.fillStyle = "rgba(0,0,0,.6)"; ctx.fillRect(hx, hy, w, 4); ctx.fillStyle = "#c0392b"; ctx.fillRect(hx, hy, w * (e.hp / e.maxHp), 4); }
  };

  // ---------- bosses ----------
  var BOSS_CFG = {
    godrik:    { headType: "helm", pants: "#3a3f47", trim: "#c8a862", pauldrons: true, eye: "#e0402a", cape: "#3a2030", weapon: { type: "greatsword", col: "#dfe4ea" } },
    malenketh: { skin: "#e8d0a0", headType: "hair", hair: "#caa94a", longHair: true, pants: "#4a4020", trim: "#8fbf4a", eye: "#9fe04a", cape: "#3a4a1e", weapon: { type: "twin", col: "#e0d28a" } },
    radaghast: { headType: "hood", trim: "#c9c0f5", eye: "#c9c0f5", aura: "#8a7fd6", weapon: { type: "staff", col: "#b3a6ff" } },
    grafted:   { skin: "#8a7358", headType: "hair", hair: "#3a2c1c", pants: "#3a2c1c", trim: "#6a4a2a", pauldrons: true, eye: "#e0a040", weapon: { type: "club", col: "#5a4326" }, scale: 3.1, emblem: false },
    mohgwyn:   { skin: "#d8a0a0", headType: "hair", hair: "#3a1420", horns: true, pants: "#5a2030", trim: "#e0b040", eye: "#ff5a5a", aura: "#a03040", cape: "#7a1020", weapon: { type: "twin", col: "#e05a6a" } }
  };
  G.drawBossTop = function (ctx, b) {
    var flip = Math.cos(b.facing) < 0;
    var flash = b.hitT > 0 ? 0.55 : (b.windT > 0 ? 0.35 : 0);
    var o = {}, cfg = BOSS_CFG[b.id] || BOSS_CFG.godrik;
    for (var k in cfg) if (cfg.hasOwnProperty(k)) o[k] = cfg[k];
    o.flash = flash; o.scale = o.scale || 2.75; o.armor = o.armor || b.color;
    pxHumanoid(ctx, b.x, b.y, b.r, flip, o);
    if (b.hp / b.maxHp < 0.35) ringGlow(ctx, b.x, b.y, b.r * 1.9, "rgba(192,57,43,.2)");
    // boss name handled by HUD bar
  };

  // ============================================================
  // PROJECTILES & STRIKE FX
  // ============================================================
  G.drawProj = function (ctx, pr) {
    var vis = pr.vis || "orb", a = Math.atan2(pr.vy || 0, pr.vx || 0), col = pr.color || "#e7cf95";
    if (vis === "arrow") {
      ctx.save(); ctx.translate(pr.x, pr.y); ctx.rotate(a);
      var L = 20 + pr.r * 1.6;
      var tg = ctx.createLinearGradient(-L, 0, 0, 0); tg.addColorStop(0, toRGBA(col, 0)); tg.addColorStop(1, toRGBA(lighten(col, .3), .5));
      ctx.strokeStyle = tg; ctx.lineWidth = pr.r * 1.1; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(-L, 0); ctx.lineTo(-2, 0); ctx.stroke();
      ctx.strokeStyle = "#6a4a28"; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(-L * 0.5, 0); ctx.lineTo(L * 0.5, 0); ctx.stroke();
      ctx.fillStyle = lighten(col, .4); ctx.beginPath(); ctx.moveTo(L * 0.5 + 7, 0); ctx.lineTo(L * 0.5 - 4, -4.5); ctx.lineTo(L * 0.5 - 4, 4.5); ctx.closePath(); ctx.fill();
      ctx.fillStyle = toRGBA(col, .9); ctx.beginPath(); ctx.moveTo(-L * 0.5, 0); ctx.lineTo(-L * 0.5 - 7, -5); ctx.lineTo(-L * 0.5 - 2, 0); ctx.lineTo(-L * 0.5 - 7, 5); ctx.closePath(); ctx.fill();
      ctx.lineCap = "butt"; ctx.restore();
    } else if (vis === "magic" || vis === "fire" || vis === "ice" || vis === "bolt") {
      var glow = ctx.createRadialGradient(pr.x, pr.y, 1, pr.x, pr.y, pr.r * 3.2);
      glow.addColorStop(0, toRGBA(lighten(col, .5), .9)); glow.addColorStop(.45, toRGBA(col, .55)); glow.addColorStop(1, toRGBA(col, 0));
      ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(pr.x, pr.y, pr.r * 3.2, 0, TAU); ctx.fill();
      ctx.save(); ctx.translate(pr.x, pr.y); ctx.rotate(a);
      var st = ctx.createLinearGradient(-pr.r * 4.5, 0, 0, 0); st.addColorStop(0, toRGBA(col, 0)); st.addColorStop(1, toRGBA(lighten(col, .2), .55));
      ctx.fillStyle = st; ctx.beginPath(); ctx.moveTo(-pr.r * 4.5, 0); ctx.lineTo(0, -pr.r * 0.85); ctx.lineTo(0, pr.r * 0.85); ctx.closePath(); ctx.fill(); ctx.restore();
      ctx.fillStyle = toRGBA(lighten(col, .35), .6); ctx.beginPath(); ctx.arc(pr.x, pr.y, pr.r * 1.25, 0, TAU); ctx.fill();
      ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(pr.x, pr.y, pr.r * 0.65, 0, TAU); ctx.fill();
    } else {
      ctx.shadowColor = col; ctx.shadowBlur = 8; ctx.fillStyle = col; ctx.beginPath(); ctx.arc(pr.x, pr.y, pr.r, 0, TAU); ctx.fill(); ctx.shadowBlur = 0;
    }
  };

  // sword-strike crescent
  G.drawSlash = function (ctx, ef) {
    var f = ef.t / ef.dur, a = 1 - f, rOut = ef.range * 0.92, rIn = ef.range * 0.5, spin = f * 0.25;
    var a0 = ef.a - ef.arc / 2 + spin, a1 = ef.a + ef.arc / 2 + spin;
    ctx.save(); ctx.translate(ef.x, ef.y);
    ctx.beginPath(); ctx.arc(0, 0, rOut, a0, a1); ctx.arc(0, 0, rIn, a1, a0, true); ctx.closePath();
    var g = ctx.createRadialGradient(0, 0, rIn, 0, 0, rOut); g.addColorStop(0, toRGBA(ef.color, 0)); g.addColorStop(1, toRGBA(lighten(ef.color, .3), 0.45 * a));
    ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = toRGBA(ef.color, .7 * a); ctx.lineWidth = 6; ctx.lineCap = "round"; ctx.beginPath(); ctx.arc(0, 0, rOut * 0.97, a0, a1); ctx.stroke();
    ctx.strokeStyle = toRGBA("#ffffff", .9 * a); ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(0, 0, rOut, a0, a1); ctx.stroke();
    ctx.lineCap = "butt"; ctx.restore();
  };

  // ============================================================
  // ITEM ICONS (data URLs, cached)
  // ============================================================
  G._iconCache = {};
  // ---- pixel-art item icons (dark medieval, chunky pixels) ----
  var PX_G = 16, PX_S = 4, PX_SZ = PX_G * PX_S;                 // 16x16 logical grid -> 64px sprite
  function pcell(c, x, y, col) { if (!col || x < 0 || y < 0 || x >= PX_G || y >= PX_G) return; c.fillStyle = col; c.fillRect(x * PX_S, y * PX_S, PX_S, PX_S); }
  function ph(c, y, x0, x1, col) { for (var x = x0; x <= x1; x++) pcell(c, x, y, col); }
  function pv(c, x, y0, y1, col) { for (var y = y0; y <= y1; y++) pcell(c, x, y, col); }
  function pbox(c, x0, y0, x1, y1, col) { for (var y = y0; y <= y1; y++) for (var x = x0; x <= x1; x++) pcell(c, x, y, col); }
  function pdisc(c, cx, cy, rr, col) { for (var y = -rr; y <= rr; y++) for (var x = -rr; x <= rr; x++) if (x * x + y * y <= rr * rr + rr) pcell(c, cx + x, cy + y, col); }
  function pxPal(col, gem) {
    return { o: "#0a0806", m: col, l: lighten(col, .42), d: darken(col, .55),
      w: "#6a4a2a", W: "#38271a", g: "#c8a862", G: "#e9d29a", e: "#463322", E: "#241811",
      k: "#c3c8cf", K: "#70757c", s: "#e6ddc4", x: gem || col, X: lighten(gem || col, .55) };
  }
  function iconKind(def) {
    if (def.slot === "weapon") {
      if (def.type === "melee") return /katana|blood|curved/.test(def.id) ? "katana" : "sword";
      if (def.type === "ranged") return /pistol|gun|musket|cannon|ashen/.test(def.id) ? "pistol" : "bow";
      if (def.type === "magic") return /frost|ice|glacial/.test(def.id) ? "wandfrost" : "wand";
    }
    if (def.type === "shield") return /tome|book|grimoire/.test(def.id) ? "tome" : "shield";
    if (def.type === "ring") return "ring";
    if (def.type === "talisman") return "talisman";
    if (def.slot === "helmet") return "helm";
    if (def.slot === "chest") return "chest";
    if (def.slot === "legs") return "legs";
    return "chest";
  }

  function pxSword(c, P) {
    pcell(c, 7, 0, P.o); pcell(c, 8, 0, P.o);
    for (var y = 1; y <= 8; y++) { pcell(c, 6, y, P.o); pcell(c, 7, y, P.l); pcell(c, 8, y, P.d); pcell(c, 9, y, P.o); }
    ph(c, 9, 4, 11, P.g); pcell(c, 3, 9, P.o); pcell(c, 12, 9, P.o); pcell(c, 4, 10, P.g); pcell(c, 11, 10, P.g); // crossguard
    for (var gy = 10; gy <= 13; gy++) { pcell(c, 6, gy, P.o); pcell(c, 7, gy, P.e); pcell(c, 8, gy, P.e); pcell(c, 9, gy, P.o); } // grip
    pcell(c, 7, 11, P.w); pcell(c, 8, 12, P.w);
    pcell(c, 6, 14, P.o); pcell(c, 7, 14, P.g); pcell(c, 8, 14, P.g); pcell(c, 9, 14, P.o); pcell(c, 7, 15, P.G); // pommel
  }
  function pxBow(c, P) {
    var pts = [[7, 1], [5, 2], [4, 3], [3, 4], [3, 5], [3, 6], [3, 7], [3, 8], [3, 9], [3, 10], [4, 11], [5, 12], [7, 13]];
    for (var i = 0; i < pts.length; i++) { pcell(c, pts[i][0], pts[i][1], P.w); pcell(c, pts[i][0] - 1, pts[i][1], P.W); }
    pcell(c, 7, 1, P.o); pcell(c, 7, 13, P.o); // limb tips
    pv(c, 7, 2, 12, P.s); // string
    ph(c, 7, 4, 14, P.W); pcell(c, 13, 7, P.k); pcell(c, 14, 7, P.k); // arrow shaft is diagonal in reality; keep straight
    pcell(c, 13, 6, P.k); pcell(c, 13, 8, P.k); // head barbs
    pcell(c, 4, 6, P.x); pcell(c, 4, 8, P.x); // fletching
  }
  function pxPistol(c, P) {
    pbox(c, 4, 4, 13, 5, P.m); ph(c, 4, 4, 13, P.l); ph(c, 6, 4, 12, P.d); // barrel
    pcell(c, 14, 4, P.K); pcell(c, 14, 5, P.K); pcell(c, 13, 4, P.o); // muzzle
    pcell(c, 5, 3, P.k); pcell(c, 6, 3, P.k); // hammer
    var gp = [[6, 6], [6, 7], [5, 8], [5, 9], [4, 10], [4, 11], [4, 12]];
    for (var i = 0; i < gp.length; i++) { pcell(c, gp[i][0], gp[i][1], P.w); pcell(c, gp[i][0] + 1, gp[i][1], P.W); }
    pcell(c, 8, 7, P.g); pcell(c, 8, 8, P.d); // trigger
  }
  function pxWand(c, P) {
    pv(c, 8, 5, 14, P.w); pv(c, 9, 5, 14, P.W); pcell(c, 8, 15, P.W); // shaft
    pcell(c, 6, 4, P.g); pcell(c, 10, 4, P.g); pcell(c, 7, 3, P.g); pcell(c, 9, 3, P.g); // claw setting
    pdisc(c, 8, 3, 2, P.x); pcell(c, 7, 2, P.X); pcell(c, 8, 1, P.X); // gem
    pcell(c, 11, 2, P.X); pcell(c, 5, 6, P.X); // sparkles
  }
  function pxKatana(c, P) {
    var b = [[12, 1], [11, 2], [11, 3], [10, 4], [10, 5], [9, 6], [9, 7], [8, 8]];   // curved single-edge blade
    for (var i = 0; i < b.length; i++) { pcell(c, b[i][0] - 1, b[i][1], P.o); pcell(c, b[i][0], b[i][1], P.l); pcell(c, b[i][0] + 1, b[i][1], P.d); }
    pcell(c, 13, 0, P.l); pcell(c, 12, 0, P.o); pcell(c, 13, 1, P.d);                // tip
    pcell(c, 7, 8, P.g); pcell(c, 8, 9, P.g); pcell(c, 9, 8, P.g); pcell(c, 8, 7, P.g); pcell(c, 8, 8, P.G); // tsuba
    pcell(c, 6, 9, P.e); pcell(c, 6, 10, P.W); pcell(c, 5, 11, P.e); pcell(c, 5, 12, P.W); pcell(c, 4, 13, P.e); pcell(c, 3, 14, P.o); // handle
  }
  function pxWandFrost(c, P) {
    pv(c, 8, 6, 14, P.w); pv(c, 9, 6, 14, P.W); pcell(c, 8, 15, P.W);               // shaft
    pcell(c, 7, 5, P.g); pcell(c, 9, 5, P.g);                                        // setting
    pcell(c, 8, 0, P.X); pv(c, 8, 1, 4, P.x); pcell(c, 8, 2, P.X);                   // vertical shard
    pcell(c, 7, 3, P.x); pcell(c, 9, 3, P.x); pcell(c, 7, 4, P.x); pcell(c, 9, 4, P.x);
    pcell(c, 6, 4, P.x); pcell(c, 10, 4, P.x); pcell(c, 6, 3, P.X); pcell(c, 7, 2, P.X);
  }
  function pxShield(c, P) {
    ph(c, 1, 4, 11, P.o);
    for (var y = 2; y <= 8; y++) { pcell(c, 3, y, P.o); pcell(c, 4, y, P.l); pbox(c, 5, y, 10, y, P.m); pcell(c, 11, y, P.d); pcell(c, 12, y, P.o); }
    pcell(c, 3, 9, P.o); ph(c, 9, 4, 11, P.m); pcell(c, 4, 9, P.l); pcell(c, 11, 9, P.d); pcell(c, 12, 9, P.o);
    pcell(c, 4, 10, P.o); ph(c, 10, 5, 10, P.m); pcell(c, 5, 10, P.l); pcell(c, 10, 10, P.d); pcell(c, 11, 10, P.o);
    pcell(c, 5, 11, P.o); ph(c, 11, 6, 9, P.m); pcell(c, 10, 11, P.o);
    pcell(c, 6, 12, P.o); ph(c, 12, 7, 8, P.m); pcell(c, 9, 12, P.o);
    pcell(c, 7, 13, P.o); pcell(c, 8, 13, P.o);
    pv(c, 7, 3, 11, P.g); pv(c, 8, 3, 11, P.G); ph(c, 5, 5, 10, P.g); // cross boss
    pcell(c, 7, 5, P.G); pcell(c, 8, 5, P.G);
  }
  function pxTome(c, P) {
    pbox(c, 4, 2, 12, 13, P.m); // cover
    pv(c, 3, 2, 13, P.W); pv(c, 4, 2, 13, P.d); // spine
    pv(c, 12, 3, 12, P.s); pv(c, 11, 3, 12, P.l); ph(c, 13, 5, 12, P.s); // pages
    ph(c, 2, 4, 12, P.d);
    pdisc(c, 8, 7, 2, P.x); pcell(c, 8, 6, P.X); // gem clasp
    pcell(c, 6, 3, P.g); pcell(c, 11, 3, P.g); pcell(c, 6, 12, P.g); pcell(c, 11, 12, P.g); // corner studs
  }
  function pxHelm(c, P) {
    pcell(c, 7, 1, P.g); pcell(c, 8, 1, P.g); // crest knob
    ph(c, 2, 6, 9, P.o);
    for (var y = 3; y <= 11; y++) { pcell(c, 5, y, P.o); pcell(c, 6, y, P.l); pbox(c, 7, y, 8, y, P.m); pcell(c, 9, y, P.d); pcell(c, 10, y, P.o); }
    ph(c, 9, 6, 9, P.o); pv(c, 7, 7, 11, P.o); pv(c, 8, 7, 11, P.E); // T-visor
    ph(c, 12, 6, 9, P.o);
  }
  function pxCuirass(c, P) {
    ph(c, 2, 4, 11, P.o); // shoulders top
    for (var y = 3; y <= 10; y++) {
      var ins = y >= 9 ? 1 : 0;
      pcell(c, 4 + ins, y, P.o); pcell(c, 5 + ins, y, P.l); pbox(c, 6 + ins, y, 9 - ins, y, P.m); pcell(c, 10 - ins, y, P.d); pcell(c, 11 - ins, y, P.o);
    }
    ph(c, 11, 6, 9, P.o);
    pv(c, 7, 3, 10, P.d); pv(c, 8, 3, 10, P.l); // central ridge
    ph(c, 3, 5, 10, P.g); pcell(c, 7, 6, P.g); pcell(c, 8, 6, P.g); // collar + emblem
  }
  function pxLegs(c, P) {
    ph(c, 2, 4, 11, P.g); ph(c, 3, 4, 11, P.o); // belt
    for (var y = 4; y <= 12; y++) {
      pcell(c, 4, y, P.o); pcell(c, 5, y, P.l); pcell(c, 6, y, P.m); pcell(c, 7, y, P.o);   // left greave
      pcell(c, 8, y, P.o); pcell(c, 9, y, P.m); pcell(c, 10, y, P.d); pcell(c, 11, y, P.o); // right greave
    }
    ph(c, 8, 5, 6, P.G); ph(c, 8, 9, 10, P.G); // knees
    ph(c, 13, 4, 7, P.W); ph(c, 13, 8, 11, P.W); // boots
  }
  function pxRing(c, P) {
    for (var y = -4; y <= 4; y++) for (var x = -4; x <= 4; x++) { var dd = x * x + y * y; if (dd <= 17 && dd >= 6) pcell(c, 8 + x, 9 + y, x < 0 ? P.G : P.g); }
    pdisc(c, 8, 4, 1, P.x); pcell(c, 8, 3, P.X); pcell(c, 7, 3, P.g); pcell(c, 9, 3, P.g); // gem
  }
  function pxTalisman(c, P) {
    var ch = [[4, 2], [5, 3], [6, 4], [10, 4], [11, 3], [12, 2]];
    for (var i = 0; i < ch.length; i++) pcell(c, ch[i][0], ch[i][1], P.g); // chain
    pdisc(c, 8, 9, 4, P.g); pdisc(c, 8, 9, 3, P.o); // bezel
    pcell(c, 8, 6, P.x); ph(c, 7, 7, 9, P.x); ph(c, 8, 6, 10, P.x); ph(c, 9, 6, 10, P.x); ph(c, 10, 7, 9, P.x); pcell(c, 8, 11, P.x); // gem diamond
    pcell(c, 7, 8, P.X); pcell(c, 8, 7, P.X); // gem shine
  }

  G.itemIconURL = function (id) {
    if (G._iconCache[id]) return G._iconCache[id];
    var def = ITEMS[id]; if (!def) return "";
    var c = document.createElement("canvas"); c.width = PX_SZ; c.height = PX_SZ;
    var ctx = c.getContext("2d"); ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = "#0d0b09"; ctx.fillRect(0, 0, PX_SZ, PX_SZ);                 // dark stone backdrop
    ctx.fillStyle = "#12100c"; for (var i = 0; i < PX_G; i += 2) for (var j = 0; j < PX_G; j += 2) if ((i + j) % 4 === 0) pcell(ctx, i, j, "#100d0a"); // faint texture
    var col = def.color || "#c8b89a", kind = iconKind(def);
    var gem = (kind === "wand" || kind === "ring" || kind === "talisman") ? col : null;
    var P = pxPal(col, gem);
    if (kind === "sword") pxSword(ctx, P);
    else if (kind === "katana") pxKatana(ctx, P);
    else if (kind === "bow") pxBow(ctx, P);
    else if (kind === "pistol") pxPistol(ctx, P);
    else if (kind === "wand") pxWand(ctx, P);
    else if (kind === "wandfrost") pxWandFrost(ctx, P);
    else if (kind === "shield") pxShield(ctx, P);
    else if (kind === "tome") pxTome(ctx, P);
    else if (kind === "helm") pxHelm(ctx, P);
    else if (kind === "chest") pxCuirass(ctx, P);
    else if (kind === "legs") pxLegs(ctx, P);
    else if (kind === "ring") pxRing(ctx, P);
    else if (kind === "talisman") pxTalisman(ctx, P);
    else pxCuirass(ctx, P);
    var url = c.toDataURL(); G._iconCache[id] = url; return url;
  };

  // ============================================================
  // CHEST
  // ============================================================
  // pixel treasure chest (16x14 grid), closed or open with inner glow
  function pxChest(ctx, ox, oy, ps, open) {
    function P(gx, gy, w, h, col) { if (!col) return; ctx.fillStyle = col; ctx.fillRect(Math.round(ox + gx * ps), Math.round(oy + gy * ps), Math.ceil(w * ps), Math.ceil(h * ps)); }
    var wood = "#7a4a24", woodH = "#9c6a34", woodS = "#4a2c14", iron = "#39322e", ironH = "#5c524a", gold = "#c8a862", goldH = "#e9d29a", ol = "#160d07";
    // body
    P(3, 7, 10, 6, wood); P(3, 7, 10, 1, woodH); P(3, 12, 10, 1, woodS); P(3, 7, 1, 6, woodS); P(12, 7, 1, 6, woodH);
    P(2, 7, 1, 6, ol); P(13, 7, 1, 6, ol); P(3, 13, 10, 1, ol);
    P(5, 7, 1, 6, ironS(iron)); P(10, 7, 1, 6, iron); P(5, 7, 1, 1, ironH); P(10, 7, 1, 1, ironH);
    if (open) {
      var g = ctx.createRadialGradient(ox + 8 * ps, oy + 5 * ps, ps, ox + 8 * ps, oy + 5 * ps, 11 * ps);
      g.addColorStop(0, "rgba(233,207,149,.85)"); g.addColorStop(1, "rgba(233,207,149,0)");
      ctx.fillStyle = g; ctx.fillRect(ox - 2 * ps, oy - 5 * ps, 20 * ps, 14 * ps);
      P(4, 5, 8, 2, goldH); P(4, 6, 8, 1, gold);                                   // spilling treasure
      P(3, 0, 10, 2, wood); P(3, 0, 10, 1, woodH); P(2, 0, 1, 2, ol); P(13, 0, 1, 2, ol); P(3, 2, 10, 1, woodS); // open lid (back)
      P(5, 0, 1, 2, iron); P(10, 0, 1, 2, iron);
    } else {
      P(4, 2, 8, 1, ol); P(3, 3, 10, 4, wood); P(3, 3, 10, 1, woodH); P(2, 3, 1, 4, ol); P(13, 3, 1, 4, ol); // lid
      P(5, 3, 1, 4, iron); P(10, 3, 1, 4, iron); P(3, 6, 10, 1, woodS);
      P(7, 5, 2, 4, gold); P(7, 5, 2, 1, goldH); P(7, 7, 2, 1, woodS); P(8, 6, 1, 2, ol); // lock plate
    }
  }
  function ironS(c) { return darken(c, .25); }

  G.drawChest = function (canvas, open) {
    var ctx = canvas.getContext("2d"), W = canvas.width, H = canvas.height; ctx.clearRect(0, 0, W, H); ctx.imageSmoothingEnabled = false;
    var ps = Math.max(3, Math.floor(W / 20)), cw = 16 * ps, ch = 14 * ps;
    var ox = Math.round((W - cw) / 2), oy = Math.round((H - ch) / 2 + (open ? ps : 0));
    ctx.fillStyle = "rgba(0,0,0,.4)"; ctx.beginPath(); ctx.ellipse(W / 2, oy + 13 * ps, cw * 0.5, ps * 1.6, 0, 0, TAU); ctx.fill();
    pxChest(ctx, ox, oy, ps, open);
  };

  // in-world arena chest; t = time for the idle pulse
  G.drawChestWorld = function (ctx, x, y, r, open, t) {
    var ps = r / 7, ox = x - 8 * ps, oy = y - 8 * ps;
    ctx.fillStyle = "rgba(0,0,0,.4)"; ctx.beginPath(); ctx.ellipse(x, y + 5.5 * ps, r * 0.75, r * 0.28, 0, 0, TAU); ctx.fill();
    if (!open) {
      var f = 0.55 + 0.45 * Math.sin((t || 0) * 4);
      ringGlow(ctx, x, y, r * (1.5 + 0.25 * f), toRGBA("#e9cf95", 0.10 + 0.10 * f));
      var ay = y - 10 * ps - Math.abs(Math.sin((t || 0) * 3)) * 3 * ps;            // bobbing marker
      ctx.fillStyle = "#e9d29a"; ctx.beginPath(); ctx.moveTo(x, ay + 4); ctx.lineTo(x - 4, ay - 2); ctx.lineTo(x + 4, ay - 2); ctx.closePath(); ctx.fill();
    }
    pxChest(ctx, ox, oy, ps, open);
  };

})(window);
