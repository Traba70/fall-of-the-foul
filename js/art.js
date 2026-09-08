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
    ctx.clearRect(0, 0, W, H);
    var s = W / 360, cx = W / 2, cy = H * 0.5, cls = G.state.cls;
    var rw = G.getEquipped("right"), lw = G.getEquipped("left");
    var C = {
      helm: eqColor("helmet", "#6b6257"), chest: eqColor("chest", "#6b6257"), legs: eqColor("legs", "#574f45"),
      wpn: rw ? ITEMS[rw.id].color : "#c8b89a", wtype: rw ? ITEMS[rw.id].type : "melee",
      off: lw ? ITEMS[lw.id].color : null, offtype: lw ? ITEMS[lw.id].type : null
    };
    var mood = PORTRAIT_MOOD[cls] || PORTRAIT_MOOD.melee;
    ctx.save(); ctx.translate(cx, cy); ctx.scale(s, s);
    // backlight halo (colour of the class's element)
    var bl = ctx.createRadialGradient(0, 0, 8, 0, 8, 198); bl.addColorStop(0, toRGBA(mood.back, .30)); bl.addColorStop(.45, toRGBA(mood.back, .08)); bl.addColorStop(1, toRGBA(mood.back, 0));
    ctx.fillStyle = bl; ctx.beginPath(); ctx.arc(0, 4, 198, 0, TAU); ctx.fill();
    // ground shadow
    ctx.fillStyle = "rgba(0,0,0,.55)"; ctx.beginPath(); ctx.ellipse(0, 171, 90, 19, 0, 0, TAU); ctx.fill();
    if (cls === "melee") drawKnight(ctx, C);
    else if (cls === "ranged") drawRanger(ctx, C);
    else drawMage(ctx, C);
    groundMist(ctx, mood.fog);
    motes(ctx, 0, 18, 214, 252, mood.moteN, mood.mote, mood.moteSeed, 1.7);
    ctx.restore();
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
  // TOP-DOWN humanoid (player + enemies)
  // ============================================================
  function humanoidTop(ctx, x, y, r, facing, body, accent, opts) {
    opts = opts || {};
    ctx.save(); ctx.translate(x, y); ctx.rotate(facing);
    ctx.fillStyle = "rgba(0,0,0,.4)"; ctx.beginPath(); ctx.ellipse(0, r * 0.5, r * 1.05, r * 0.55, 0, 0, TAU); ctx.fill();
    var bob = opts.walk ? Math.sin(opts.walk) * r * 0.35 : 0;
    ctx.fillStyle = darken(body, .5); ctx.beginPath(); ctx.arc(-r * 0.4, bob, r * 0.34, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.arc(r * 0.4, -bob, r * 0.34, 0, TAU); ctx.fill();
    ctx.fillStyle = shade(ctx, 0, 0, r, lighten(body, .2), darken(body, .45)); ctx.strokeStyle = "rgba(0,0,0,.5)"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.fillStyle = darken(body, .75); ctx.beginPath(); ctx.arc(0, -r * 0.7, r * 0.42, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.arc(0, r * 0.7, r * 0.42, 0, TAU); ctx.fill();
    ctx.fillStyle = shade(ctx, r * 0.4, 0, r * 0.5, lighten(accent, .25), darken(accent, .4)); ctx.beginPath(); ctx.arc(r * 0.42, 0, r * 0.42, 0, TAU); ctx.fill();
    if (opts.weapon) opts.weapon(ctx, r);
    ctx.restore();
  }
  G.humanoidTop = humanoidTop;

  G.drawHeroTop = function (ctx, p) {
    var cls = G.state.cls, r = p.r;
    var body = eqColor("chest", "#6b6257");
    var rw = G.getEquipped("right"), wpnC = rw ? ITEMS[rw.id].color : "#c8b89a", wpnType = rw ? ITEMS[rw.id].type : "melee";
    var swing = p.swingT || 0, walk = p.walkPhase || 0;
    ctx.fillStyle = "rgba(0,0,0,.4)"; ctx.beginPath(); ctx.ellipse(p.x, p.y + r * 0.55, r * 1.05, r * 0.5, 0, 0, TAU); ctx.fill();
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.facing);
    if (cls === "melee") drawKnightTop(ctx, r, body, wpnC, wpnType, swing, walk);
    else if (cls === "ranged") drawRangerTop(ctx, r, body, wpnC, wpnType, swing, walk);
    else drawMageTop(ctx, r, body, wpnC, wpnType, swing, walk);
    ctx.restore();
  };
  function weaponTop(ctx, r, wpnC, wpnType, swing) {
    ctx.save(); if (swing > 0) ctx.rotate((1 - swing) * 1.6 - 0.8);
    if (wpnType === "melee") { var g = ctx.createLinearGradient(r * 0.6, 0, r * 2.0, 0); g.addColorStop(0, lighten(wpnC, .5)); g.addColorStop(1, darken(wpnC, .5)); ctx.strokeStyle = g; ctx.lineWidth = 5; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(r * 0.6, r * 0.25); ctx.lineTo(r * 2.05, r * 0.25); ctx.stroke(); ctx.strokeStyle = "rgba(255,255,255,.55)"; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(r * 0.7, r * 0.25); ctx.lineTo(r * 1.95, r * 0.25); ctx.stroke(); ctx.lineCap = "butt"; }
    else if (wpnType === "ranged") { ctx.strokeStyle = wpnC; ctx.lineWidth = 4; ctx.lineCap = "round"; ctx.beginPath(); ctx.arc(r * 0.95, 0, r * 0.75, -1.1, 1.1); ctx.stroke(); ctx.strokeStyle = "#e9e2cf"; ctx.lineWidth = 1.2; var yy = Math.sin(1.1) * r * 0.75, xx = Math.cos(1.1) * r * 0.75; ctx.beginPath(); ctx.moveTo(r * 0.95 + xx, -yy); ctx.lineTo(r * 0.95 + xx, yy); ctx.stroke(); ctx.lineCap = "butt"; }
    else { ctx.strokeStyle = "#3a2f22"; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(r * 0.5, r * 0.2); ctx.lineTo(r * 1.5, r * 0.2); ctx.stroke(); ctx.fillStyle = wpnC; ctx.shadowColor = wpnC; ctx.shadowBlur = 12; ctx.beginPath(); ctx.arc(r * 1.6, r * 0.2, r * 0.3, 0, TAU); ctx.fill(); ctx.shadowBlur = 0; }
    ctx.restore();
  }
  function drawKnightTop(ctx, r, body, wpnC, wpnType, swing, walk) {
    var steel = (body === "#6b6257") ? "#4a515b" : body, cloakC = "#6e1414";
    var bob = Math.sin(walk) * r * 0.22;
    ctx.fillStyle = toRGBA(cloakC, .85); ctx.beginPath(); ctx.moveTo(-r * 0.2, -r * 0.72); ctx.quadraticCurveTo(-r * 1.7, 0, -r * 0.2, r * 0.72); ctx.quadraticCurveTo(-r * 0.7, 0, -r * 0.2, -r * 0.72); ctx.fill();
    ctx.fillStyle = darken(steel, .5); ctx.beginPath(); ctx.arc(-r * 0.15, -r * 0.5 + bob, r * 0.3, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.arc(-r * 0.15, r * 0.5 - bob, r * 0.3, 0, TAU); ctx.fill();
    ctx.fillStyle = shade(ctx, 0, 0, r, lighten(steel, .2), darken(steel, .45)); ctx.strokeStyle = "rgba(0,0,0,.5)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.fillStyle = darken(steel, .28); ctx.beginPath(); ctx.arc(0, -r * 0.85, r * 0.42, 0, TAU); ctx.arc(0, r * 0.85, r * 0.42, 0, TAU); ctx.fill();     // pauldrons
    ctx.fillStyle = metalGrad(ctx, r * 0.1, -r * 0.4, r * 0.7, r * 0.4, steel); ctx.beginPath(); ctx.arc(r * 0.42, 0, r * 0.44, 0, TAU); ctx.fill();       // helm
    ctx.strokeStyle = "#111"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(r * 0.5, -r * 0.28); ctx.lineTo(r * 0.5, r * 0.28); ctx.stroke();
    ctx.fillStyle = "#e0402a"; ctx.shadowColor = "#e0402a"; ctx.shadowBlur = 6; ctx.fillRect(r * 0.56, -r * 0.2, r * 0.12, r * 0.4); ctx.shadowBlur = 0;  // visor glow
    ctx.strokeStyle = "#c8a862"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-r * 0.3, 0); ctx.lineTo(r * 0.28, 0); ctx.stroke();
    weaponTop(ctx, r, wpnC, wpnType, swing);
  }
  function drawRangerTop(ctx, r, body, wpnC, wpnType, swing, walk) {
    var leather = (body === "#6b6257") ? "#5a4326" : body, cloakC = "#26402b";
    ctx.fillStyle = toRGBA(cloakC, .85); ctx.beginPath(); ctx.moveTo(-r * 0.1, -r * 0.75); ctx.quadraticCurveTo(-r * 1.5, 0, -r * 0.1, r * 0.75); ctx.quadraticCurveTo(-r * 0.5, 0, -r * 0.1, -r * 0.75); ctx.fill();
    ctx.fillStyle = shade(ctx, 0, 0, r, lighten(leather, .18), darken(leather, .5)); ctx.strokeStyle = "rgba(0,0,0,.5)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, r * 0.92, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.fillStyle = darken(cloakC, .2); ctx.beginPath(); ctx.moveTo(r * 0.95, 0); ctx.lineTo(-r * 0.1, -r * 0.5); ctx.lineTo(-r * 0.1, r * 0.5); ctx.closePath(); ctx.fill();    // hood
    ctx.fillStyle = "#0a0d08"; ctx.beginPath(); ctx.arc(r * 0.36, 0, r * 0.28, 0, TAU); ctx.fill();
    ctx.fillStyle = "#c9e37a"; ctx.shadowColor = "#c9e37a"; ctx.shadowBlur = 5; ctx.beginPath(); ctx.arc(r * 0.44, -r * 0.12, r * 0.07, 0, TAU); ctx.arc(r * 0.44, r * 0.12, r * 0.07, 0, TAU); ctx.fill(); ctx.shadowBlur = 0;
    weaponTop(ctx, r, wpnType === "ranged" ? wpnC : "#8a6a3a", wpnType, swing);
  }
  function drawMageTop(ctx, r, body, wpnC, wpnType, swing, walk) {
    var robe = (body === "#6b6257") ? "#2f2a52" : body, glow = (wpnType === "magic") ? wpnC : "#8fd0ff";
    ringGlow(ctx, 0, 0, r * 1.9, toRGBA(glow, .16));
    ctx.fillStyle = shade(ctx, 0, 0, r, lighten(robe, .2), darken(robe, .5)); ctx.strokeStyle = "rgba(0,0,0,.5)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.fillStyle = darken(robe, .28); ctx.beginPath(); ctx.moveTo(r * 0.95, 0); ctx.lineTo(-r * 0.05, -r * 0.55); ctx.lineTo(-r * 0.05, r * 0.55); ctx.closePath(); ctx.fill();     // hood
    ctx.fillStyle = "#06060c"; ctx.beginPath(); ctx.arc(r * 0.36, 0, r * 0.3, 0, TAU); ctx.fill();
    ctx.fillStyle = glow; ctx.shadowColor = glow; ctx.shadowBlur = 6; ctx.beginPath(); ctx.arc(r * 0.44, -r * 0.12, r * 0.08, 0, TAU); ctx.arc(r * 0.44, r * 0.12, r * 0.08, 0, TAU); ctx.fill(); ctx.shadowBlur = 0;
    if (wpnType === "magic") { ctx.strokeStyle = "#3a2f22"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(r * 0.4, r * 0.3); ctx.lineTo(r * 1.5, r * 0.3); ctx.stroke(); ctx.fillStyle = glow; ctx.shadowColor = glow; ctx.shadowBlur = 12; ctx.beginPath(); ctx.arc(r * 1.62, r * 0.3, r * 0.28, 0, TAU); ctx.fill(); ctx.shadowBlur = 0; }
    else weaponTop(ctx, r, wpnC, wpnType, swing);
  }

  function ringGlow(ctx, x, y, r, c) { var g = ctx.createRadialGradient(x, y, r * 0.4, x, y, r); g.addColorStop(0, c); g.addColorStop(1, "rgba(0,0,0,0)"); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); }
  G.ringGlow = ringGlow;

  G.drawEnemyTop = function (ctx, e) {
    var def = G.ENEMIES[e.type], rank = G.RANKS[e.rank], body = def.color;
    if (e.windT > 0) body = lighten(def.color, 0.35 + 0.3 * Math.sin(Date.now() / 60));
    humanoidTop(ctx, e.x, e.y, e.r, e.facing, body, darken(def.color, .8), {
      walk: e.walkPhase, weapon: function (ctx, r) {
        if (def.role === "melee" || def.role === "heavy") { ctx.strokeStyle = lighten(body, .3); ctx.lineWidth = Math.max(3, r * 0.22); ctx.lineCap = "round"; var reach = (def.role === "heavy") ? r * 1.4 : r * 1.7; if (e.windT > 0) reach *= 1.15; ctx.beginPath(); ctx.moveTo(r * 0.5, r * 0.2); ctx.lineTo(reach, r * 0.2); ctx.stroke(); ctx.lineCap = "butt"; }
        else { ctx.strokeStyle = lighten(body, .3); ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(r * 0.8, 0, r * 0.6, -0.9, 0.9); ctx.stroke(); }
      }
    });
    ctx.strokeStyle = rank.ring; ctx.lineWidth = 2; ctx.globalAlpha = 0.9; ctx.beginPath(); ctx.arc(e.x, e.y, e.r + 4, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1;
    for (var i = 0; i < e.rank; i++) { ctx.fillStyle = rank.ring; ctx.beginPath(); ctx.arc(e.x - (e.rank - 1) * 4 + i * 8, e.y - e.r - 12, 2.6, 0, TAU); ctx.fill(); }
    if (e.hp < e.maxHp) { var w = e.r * 2.2, hx = e.x - w / 2, hy = e.y - e.r - 8; ctx.fillStyle = "rgba(0,0,0,.6)"; ctx.fillRect(hx, hy, w, 4); ctx.fillStyle = "#c0392b"; ctx.fillRect(hx, hy, w * (e.hp / e.maxHp), 4); }
  };

  G.drawBossTop = function (ctx, b) {
    var r = b.r, x = b.x, y = b.y;
    ctx.fillStyle = "rgba(0,0,0,.5)"; ctx.beginPath(); ctx.ellipse(x, y + r * 0.5, r * 1.15, r * 0.6, 0, 0, TAU); ctx.fill();
    var flash = b.hitT > 0 ? lighten(b.color, .5) : b.color;
    ctx.save(); ctx.translate(x, y); ctx.rotate(b.facing);
    ctx.fillStyle = shade(ctx, 0, 0, r, lighten(flash, .2), darken(flash, .5)); ctx.strokeStyle = "rgba(0,0,0,.6)"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill(); ctx.stroke();
    if (b.id === "godrik" || b.id === "grafted") { ctx.fillStyle = darken(flash, .7); ctx.beginPath(); ctx.arc(0, -r * 0.8, r * 0.5, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.arc(0, r * 0.8, r * 0.5, 0, TAU); ctx.fill(); ctx.strokeStyle = "#cfd4da"; ctx.lineWidth = r * 0.28; ctx.lineCap = "round"; var reach = r * (b.windT > 0 ? 2.4 : 2.0); ctx.beginPath(); ctx.moveTo(r * 0.6, r * 0.3); ctx.lineTo(reach, r * 0.3); ctx.stroke(); ctx.lineCap = "butt"; }
    else if (b.id === "malenketh") { ctx.strokeStyle = "#e0d28a"; ctx.lineWidth = r * 0.16; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(r * 0.4, -r * 0.2); ctx.lineTo(r * 2.1, -r * 0.4); ctx.stroke(); ctx.strokeStyle = "rgba(150,200,80,.5)"; ctx.beginPath(); ctx.moveTo(r * 0.4, r * 0.2); ctx.lineTo(r * 2.0, r * 0.5); ctx.stroke(); ctx.lineCap = "butt"; }
    else if (b.id === "radaghast") { ctx.fillStyle = "rgba(138,127,214,.35)"; ctx.shadowColor = "#8a7fd6"; ctx.shadowBlur = 24; ctx.beginPath(); ctx.arc(r * 0.9, 0, r * 0.4, 0, TAU); ctx.fill(); ctx.shadowBlur = 0; for (var i = 0; i < 4; i++) { var a = i / 4 * TAU + Date.now() / 800; ctx.fillStyle = "#c9c0f5"; ctx.beginPath(); ctx.arc(Math.cos(a) * r * 1.3, Math.sin(a) * r * 1.3, 3, 0, TAU); ctx.fill(); } }
    else { ctx.strokeStyle = "#e05a6a"; ctx.lineWidth = r * 0.18; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(r * 0.5, 0); ctx.lineTo(r * 2.1, 0); ctx.stroke(); ctx.lineCap = "butt"; ctx.fillStyle = "rgba(160,48,64,.3)"; ctx.beginPath(); ctx.arc(0, 0, r * 1.3, 0, TAU); ctx.fill(); }
    ctx.fillStyle = "#e7cf95"; ctx.beginPath(); ctx.arc(r * 0.5, -r * 0.18, 3.4, 0, TAU); ctx.arc(r * 0.5, r * 0.18, 3.4, 0, TAU); ctx.fill();
    ctx.restore();
    if (b.hp / b.maxHp < 0.35) ringGlow(ctx, x, y, r * 2, "rgba(192,57,43,.18)");
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
  G.itemIconURL = function (id) {
    if (G._iconCache[id]) return G._iconCache[id];
    var def = ITEMS[id]; if (!def) return "";
    var c = document.createElement("canvas"); c.width = 44; c.height = 44; var ctx = c.getContext("2d");
    ctx.fillStyle = "#0d0b09"; ctx.fillRect(0, 0, 44, 44); var col = def.color || "#c8b89a";
    ctx.save(); ctx.translate(22, 22);
    if (def.slot === "weapon" && def.type === "melee") { ctx.strokeStyle = "#8a6d33"; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(-8, 8); ctx.lineTo(8, -8); ctx.stroke(); ctx.strokeStyle = col; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(-2, 14); ctx.lineTo(14, -14); ctx.stroke(); ctx.strokeStyle = "#8a6d33"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-10, 2); ctx.lineTo(-2, 10); ctx.stroke(); }
    else if (def.slot === "weapon" && def.type === "ranged") { ctx.strokeStyle = col; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(-2, 0, 13, -1.1, 1.1); ctx.stroke(); ctx.strokeStyle = "#e9e2cf"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(3, -11); ctx.lineTo(3, 11); ctx.stroke(); ctx.strokeStyle = "#8a6d33"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-12, 0); ctx.lineTo(14, 0); ctx.stroke(); }
    else if (def.slot === "weapon" && def.type === "magic") { ctx.strokeStyle = "#3a2f22"; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(-10, 12); ctx.lineTo(6, -8); ctx.stroke(); ctx.fillStyle = col; ctx.shadowColor = col; ctx.shadowBlur = 10; ctx.beginPath(); ctx.arc(8, -11, 7, 0, TAU); ctx.fill(); ctx.shadowBlur = 0; }
    else if (def.type === "shield") { ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(0, -14); ctx.lineTo(13, -7); ctx.lineTo(13, 8); ctx.lineTo(0, 16); ctx.lineTo(-13, 8); ctx.lineTo(-13, -7); ctx.closePath(); ctx.fill(); ctx.fillStyle = "#c8a862"; ctx.beginPath(); ctx.arc(0, 0, 3.5, 0, TAU); ctx.fill(); }
    else if (def.type === "ring") { ctx.strokeStyle = "#c8a862"; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(0, 3, 9, 0, TAU); ctx.stroke(); ctx.fillStyle = col; ctx.shadowColor = col; ctx.shadowBlur = 8; ctx.beginPath(); ctx.arc(0, -8, 5, 0, TAU); ctx.fill(); ctx.shadowBlur = 0; }
    else if (def.type === "talisman") { ctx.strokeStyle = "#c8a862"; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(-11, -14); ctx.quadraticCurveTo(0, -3, 11, -14); ctx.stroke(); ctx.fillStyle = col; ctx.shadowColor = col; ctx.shadowBlur = 10; ctx.beginPath(); ctx.moveTo(0, -3); ctx.lineTo(9, 6); ctx.lineTo(0, 17); ctx.lineTo(-9, 6); ctx.closePath(); ctx.fill(); ctx.shadowBlur = 0; ctx.strokeStyle = "#e7cf95"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(0, -3); ctx.lineTo(0, 17); ctx.stroke(); }
    else if (def.slot === "helmet") { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(0, -2, 12, Math.PI, TAU); ctx.lineTo(11, 10); ctx.quadraticCurveTo(0, 16, -11, 10); ctx.closePath(); ctx.fill(); ctx.strokeStyle = "#100c08"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-7, 2); ctx.lineTo(7, 2); ctx.stroke(); }
    else if (def.slot === "chest") { ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(-13, -12); ctx.quadraticCurveTo(0, -18, 13, -12); ctx.lineTo(10, 15); ctx.lineTo(-10, 15); ctx.closePath(); ctx.fill(); ctx.fillStyle = "rgba(200,168,98,.4)"; ctx.beginPath(); ctx.moveTo(0, -6); ctx.lineTo(6, 4); ctx.lineTo(0, 12); ctx.lineTo(-6, 4); ctx.closePath(); ctx.fill(); }
    else { ctx.fillStyle = col; ctx.fillRect(-11, -13, 8, 26); ctx.fillRect(3, -13, 8, 26); }
    ctx.restore();
    ctx.strokeStyle = "#3a3226"; ctx.lineWidth = 2; ctx.strokeRect(1, 1, 42, 42);
    var url = c.toDataURL(); G._iconCache[id] = url; return url;
  };

  // ============================================================
  // CHEST
  // ============================================================
  G.drawChest = function (canvas, open) {
    var ctx = canvas.getContext("2d"), W = canvas.width, H = canvas.height; ctx.clearRect(0, 0, W, H);
    var cx = W / 2, cy = H * 0.62, s = W / 150; ctx.save(); ctx.translate(cx, cy); ctx.scale(s, s);
    ctx.fillStyle = "rgba(0,0,0,.4)"; ctx.beginPath(); ctx.ellipse(0, 44, 52, 12, 0, 0, TAU); ctx.fill();
    if (open) { var g = ctx.createRadialGradient(0, -6, 6, 0, -6, 70); g.addColorStop(0, "rgba(233,207,149,.9)"); g.addColorStop(1, "rgba(233,207,149,0)"); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, -6, 70, 0, TAU); ctx.fill(); }
    ctx.fillStyle = "#5a3f22"; ctx.strokeStyle = "#2a1c10"; ctx.lineWidth = 3; ctx.beginPath(); ctx.rect(-46, -4, 92, 46); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = "#c8a862"; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(0, -4); ctx.lineTo(0, 42); ctx.stroke(); ctx.strokeRect(-46, -4, 92, 46);
    ctx.save(); ctx.translate(0, -4); if (open) ctx.rotate(-0.6);
    ctx.fillStyle = "#6b4a28"; ctx.strokeStyle = "#2a1c10"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-46, 0); ctx.lineTo(-46, -18); ctx.quadraticCurveTo(0, -40, 46, -18); ctx.lineTo(46, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = "#c8a862"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-46, -8); ctx.quadraticCurveTo(0, -30, 46, -8); ctx.stroke(); ctx.restore();
    ctx.fillStyle = "#c8a862"; ctx.fillRect(-7, 2, 14, 12); ctx.restore();
  };

})(window);
