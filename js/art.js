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
    ctx.save(); ctx.translate(cx, cy); ctx.scale(s, s);
    // ground shadow + plinth glow
    ctx.fillStyle = "rgba(0,0,0,.5)"; ctx.beginPath(); ctx.ellipse(0, 172, 88, 20, 0, 0, TAU); ctx.fill();
    if (cls === "melee") drawKnight(ctx, C);
    else if (cls === "ranged") drawRanger(ctx, C);
    else drawMage(ctx, C);
    ctx.restore();
  };

  // limb capsule
  function capsule(ctx, x0, y0, x1, y1, w, fill) {
    var a = Math.atan2(y1 - y0, x1 - x0);
    ctx.save(); ctx.fillStyle = fill;
    ctx.beginPath(); ctx.arc(x0, y0, w, a + Math.PI / 2, a - Math.PI / 2); ctx.arc(x1, y1, w, a - Math.PI / 2, a + Math.PI / 2); ctx.closePath(); ctx.fill(); ctx.restore();
  }
  function plate(ctx, pts, fill, stroke) { ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (var i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]); ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 2.5; ctx.stroke(); } }

  // ---------- KNIGHT (melee) ----------
  function drawKnight(ctx, C) {
    var steel = C.chest, edge = "#241d16", gold = "#c8a862";
    // cape behind
    ctx.fillStyle = "rgba(120,22,22,.92)";
    ctx.beginPath(); ctx.moveTo(-40, -46); ctx.quadraticCurveTo(-74, 40, -46, 150); ctx.lineTo(46, 150); ctx.quadraticCurveTo(74, 40, 40, -46); ctx.quadraticCurveTo(0, -30, -40, -46); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "rgba(60,10,10,.9)"; ctx.lineWidth = 2; // cape folds
    for (var f = -1; f <= 1; f++) { ctx.beginPath(); ctx.moveTo(f * 22, -30); ctx.quadraticCurveTo(f * 30, 60, f * 24, 146); ctx.stroke(); }
    // legs: greaves
    capsule(ctx, -18, 66, -22, 140, 15, shade(ctx, -20, 100, 40, lighten(C.legs, .22), darken(C.legs, .5)));
    capsule(ctx, 18, 66, 22, 140, 15, shade(ctx, 20, 100, 40, lighten(C.legs, .22), darken(C.legs, .5)));
    // knee plates
    ctx.fillStyle = lighten(C.legs, .3); ctx.beginPath(); ctx.arc(-21, 104, 10, 0, TAU); ctx.arc(22, 104, 10, 0, TAU); ctx.fill();
    // sabatons
    ctx.fillStyle = "#20190f"; plate(ctx, [[-34, 138], [-8, 138], [-10, 156], [-36, 156]], "#20190f"); plate(ctx, [[8, 138], [34, 138], [36, 156], [10, 156]], "#20190f");
    // torso cuirass
    var tg = shade(ctx, 0, -6, 60, lighten(steel, .28), darken(steel, .5));
    plate(ctx, [[-42, -34], [42, -34], [40, 46], [24, 74], [-24, 74], [-40, 46]], tg, edge);
    // central ridge + gold trim
    ctx.strokeStyle = "rgba(0,0,0,.35)"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, -30); ctx.lineTo(0, 70); ctx.stroke();
    ctx.strokeStyle = gold; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-30, -20); ctx.lineTo(0, -30); ctx.lineTo(30, -20); ctx.stroke();
    // faulds (skirt plates)
    ctx.fillStyle = darken(steel, .7); for (var i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(i * 15 - 8, 66); ctx.lineTo(i * 15 + 8, 66); ctx.lineTo(i * 15 + 6, 88); ctx.lineTo(i * 15 - 6, 88); ctx.closePath(); ctx.fill(); }
    // emblem
    ctx.fillStyle = toRGBA(gold, .55); ctx.beginPath(); ctx.moveTo(0, -14); ctx.lineTo(12, 8); ctx.lineTo(0, 30); ctx.lineTo(-12, 8); ctx.closePath(); ctx.fill();
    // arms
    capsule(ctx, -44, -22, -52, 40, 12, shade(ctx, -48, 0, 30, lighten(steel, .18), darken(steel, .55)));
    capsule(ctx, 44, -22, 52, 40, 12, shade(ctx, 48, 0, 30, lighten(steel, .18), darken(steel, .55)));
    // pauldrons
    ctx.fillStyle = shade(ctx, -46, -40, 24, lighten(steel, .35), darken(steel, .5)); ctx.beginPath(); ctx.arc(-44, -40, 22, 0, TAU); ctx.fill();
    ctx.fillStyle = shade(ctx, 46, -40, 24, lighten(steel, .35), darken(steel, .5)); ctx.beginPath(); ctx.arc(44, -40, 22, 0, TAU); ctx.fill();
    ctx.strokeStyle = gold; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(-44, -40, 22, 0.4, 2.2); ctx.moveTo(66, -40); ctx.arc(44, -40, 22, 0.9, 2.7); ctx.stroke();
    // gauntlets
    ctx.fillStyle = "#2a231b"; ctx.beginPath(); ctx.arc(-53, 44, 12, 0, TAU); ctx.arc(53, 44, 12, 0, TAU); ctx.fill();
    // offhand shield (left of screen)
    if (C.offtype === "shield") drawKiteShield(ctx, -62, 40, C.off);
    // head: great helm
    ctx.save(); ctx.translate(0, -64);
    ctx.fillStyle = shade(ctx, 0, 0, 30, lighten(C.helm, .3), darken(C.helm, .5)); ctx.strokeStyle = edge; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(0, 0, 27, Math.PI, TAU); ctx.lineTo(24, 22); ctx.quadraticCurveTo(0, 34, -24, 22); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = "#0a0806"; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(-17, 6); ctx.lineTo(17, 6); ctx.stroke();     // visor slit
    ctx.fillStyle = "#c53"; ctx.globalAlpha = .5; ctx.fillRect(-15, 4, 30, 4); ctx.globalAlpha = 1;                          // faint inner glow
    ctx.strokeStyle = gold; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, -26); ctx.lineTo(0, 14); ctx.stroke();          // nasal
    // plume
    ctx.fillStyle = "#7a1414"; ctx.beginPath(); ctx.moveTo(-4, -26); ctx.quadraticCurveTo(-22, -48, -6, -60); ctx.quadraticCurveTo(6, -44, 6, -26); ctx.closePath(); ctx.fill();
    ctx.restore();
    // sword in right hand
    drawSwordPortrait(ctx, 56, 30, C.wpn, C.wtype);
  }
  function drawKiteShield(ctx, x, y, col) {
    col = col || "#8a6a3a";
    ctx.save(); ctx.translate(x, y);
    ctx.fillStyle = shade(ctx, -4, -14, 40, lighten(col, .28), darken(col, .5)); ctx.strokeStyle = "#241810"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(0, -42); ctx.quadraticCurveTo(30, -34, 30, -6); ctx.quadraticCurveTo(30, 30, 0, 50); ctx.quadraticCurveTo(-30, 30, -30, -6); ctx.quadraticCurveTo(-30, -34, 0, -42); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = "#c8a862"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, -38); ctx.lineTo(0, 44); ctx.moveTo(-24, -6); ctx.lineTo(24, -6); ctx.stroke();
    ctx.fillStyle = "#c8a862"; ctx.beginPath(); ctx.arc(0, -6, 6, 0, TAU); ctx.fill();
    ctx.restore();
  }
  function drawSwordPortrait(ctx, x, y, col, wtype) {
    ctx.save(); ctx.translate(x, y);
    if (wtype === "ranged") { drawBowPortrait(ctx, col); ctx.restore(); return; }
    if (wtype === "magic") { drawStaffPortrait(ctx, col); ctx.restore(); return; }
    // hilt
    ctx.strokeStyle = "#3a2f22"; ctx.lineWidth = 6; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(0, 34); ctx.lineTo(0, 14); ctx.stroke();
    ctx.fillStyle = "#c8a862"; ctx.beginPath(); ctx.arc(0, 38, 5, 0, TAU); ctx.fill();                                        // pommel
    ctx.strokeStyle = "#8a6d33"; ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(-14, 14); ctx.lineTo(14, 14); ctx.stroke();    // crossguard
    // blade
    var g = ctx.createLinearGradient(-7, -86, 7, 14); g.addColorStop(0, lighten(col, .55)); g.addColorStop(.5, col); g.addColorStop(1, darken(col, .6));
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(-7, 12); ctx.lineTo(7, 12); ctx.lineTo(7, -74); ctx.lineTo(0, -90); ctx.lineTo(-7, -74); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,.4)"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(0, -84); ctx.lineTo(0, 10); ctx.stroke();  // fuller gleam
    ctx.lineCap = "butt"; ctx.restore();
  }
  function drawBowPortrait(ctx, col) {
    ctx.strokeStyle = col; ctx.lineWidth = 6; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(6, -60); ctx.quadraticCurveTo(-30, -20, 6, 24); ctx.stroke();                                  // recurve limb
    ctx.strokeStyle = lighten(col, .3); ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(6, -60); ctx.quadraticCurveTo(24, -50, 20, -40); ctx.moveTo(6, 24); ctx.quadraticCurveTo(24, 14, 20, 4); ctx.stroke();
    ctx.strokeStyle = "#e9e2cf"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(6, -60); ctx.lineTo(6, 24); ctx.stroke();      // string
    ctx.strokeStyle = "#8a6d33"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-24, -18); ctx.lineTo(30, -18); ctx.stroke();   // arrow
    ctx.fillStyle = "#cfd4da"; ctx.beginPath(); ctx.moveTo(36, -18); ctx.lineTo(28, -22); ctx.lineTo(28, -14); ctx.closePath(); ctx.fill();
    ctx.lineCap = "butt";
  }
  function drawStaffPortrait(ctx, col) {
    ctx.strokeStyle = "#3a2f22"; ctx.lineWidth = 6; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(4, 46); ctx.lineTo(-8, -58); ctx.stroke();
    ctx.strokeStyle = "#5a4a30"; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(-10, -60, 12, -0.6, Math.PI + 0.6); ctx.stroke();  // claw holder
    var g = ctx.createRadialGradient(-10, -62, 2, -10, -62, 16); g.addColorStop(0, "#fff"); g.addColorStop(.4, lighten(col, .3)); g.addColorStop(1, toRGBA(col, 0));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(-10, -62, 16, 0, TAU); ctx.fill();
    ctx.fillStyle = col; ctx.beginPath(); ctx.arc(-10, -62, 7, 0, TAU); ctx.fill();
    ctx.lineCap = "butt";
  }

  // ---------- RANGER ----------
  function drawRanger(ctx, C) {
    var cloth = C.chest, cloak = "#2f5a34", gold = "#c8a862";
    // cloak behind
    ctx.fillStyle = shade(ctx, 0, 40, 120, lighten(cloak, .1), darken(cloak, .5));
    ctx.beginPath(); ctx.moveTo(-30, -58); ctx.quadraticCurveTo(-70, 50, -40, 156); ctx.lineTo(44, 156); ctx.quadraticCurveTo(70, 40, 34, -52); ctx.quadraticCurveTo(0, -40, -30, -58); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "rgba(20,40,20,.8)"; ctx.lineWidth = 2; for (var f = -1; f <= 1; f++) { ctx.beginPath(); ctx.moveTo(f * 24, -20); ctx.quadraticCurveTo(f * 32, 70, f * 26, 150); ctx.stroke(); }
    // quiver on back with arrows
    ctx.save(); ctx.rotate(0.25); ctx.fillStyle = "#4a3420"; ctx.fillRect(30, -70, 16, 46); ctx.strokeStyle = "#2a1c10"; ctx.lineWidth = 2; ctx.strokeRect(30, -70, 16, 46);
    for (var q = 0; q < 3; q++) { ctx.strokeStyle = "#8a6d33"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(33 + q * 5, -70); ctx.lineTo(33 + q * 5, -84); ctx.stroke(); ctx.fillStyle = "#c9b06a"; ctx.beginPath(); ctx.arc(33 + q * 5, -86, 3, 0, TAU); ctx.fill(); }
    ctx.restore();
    // legs
    capsule(ctx, -16, 70, -20, 138, 12, shade(ctx, -18, 100, 34, lighten(C.legs, .18), darken(C.legs, .5)));
    capsule(ctx, 16, 70, 20, 138, 12, shade(ctx, 18, 100, 34, lighten(C.legs, .18), darken(C.legs, .5)));
    ctx.fillStyle = "#241a10"; plate(ctx, [[-30, 132], [-8, 132], [-10, 152], [-32, 152]], "#241a10"); plate(ctx, [[8, 132], [30, 132], [32, 152], [10, 152]], "#241a10"); // boots
    // torso: leather jerkin
    var tg = shade(ctx, 0, 0, 52, lighten(cloth, .22), darken(cloth, .5));
    plate(ctx, [[-34, -34], [34, -34], [30, 58], [-30, 58]], tg, "#241d16");
    // straps
    ctx.strokeStyle = darken(cloth, .5); ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(-28, -30); ctx.lineTo(26, 40); ctx.stroke();
    ctx.strokeStyle = "#3a2a18"; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(-30, 50); ctx.lineTo(30, 50); ctx.stroke();   // belt
    ctx.fillStyle = gold; ctx.fillRect(-6, 46, 12, 9);
    // arms
    capsule(ctx, -34, -24, -46, 34, 10, shade(ctx, -40, 0, 26, lighten(cloth, .12), darken(cloth, .55)));
    capsule(ctx, 34, -24, 46, 34, 10, shade(ctx, 40, 0, 26, lighten(cloth, .12), darken(cloth, .55)));
    ctx.fillStyle = "#3a2a18"; ctx.fillRect(-52, 24, 14, 16); ctx.fillRect(38, 24, 14, 16); // bracers
    // head: hood
    ctx.save(); ctx.translate(0, -60);
    ctx.fillStyle = shade(ctx, 0, 0, 34, lighten(cloak, .18), darken(cloak, .55));
    ctx.beginPath(); ctx.moveTo(-30, 22); ctx.quadraticCurveTo(-36, -34, 0, -38); ctx.quadraticCurveTo(36, -34, 30, 22); ctx.quadraticCurveTo(0, 12, -30, 22); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#0b0e0a"; ctx.beginPath(); ctx.ellipse(0, 2, 17, 20, 0, 0, TAU); ctx.fill();                             // face shadow
    ctx.fillStyle = "#d9c37a"; ctx.shadowColor = "#d9c37a"; ctx.shadowBlur = 6; ctx.beginPath(); ctx.arc(-7, 2, 2.6, 0, TAU); ctx.arc(7, 2, 2.6, 0, TAU); ctx.fill(); ctx.shadowBlur = 0;
    ctx.restore();
    // bow held out (right)
    ctx.save(); ctx.translate(50, 20); ctx.scale(1.25, 1.25); drawBowPortrait(ctx, C.wtype === "ranged" ? C.wpn : "#b79a6a"); ctx.restore();
  }

  // ---------- MAGE ----------
  function drawMage(ctx, C) {
    var robe = C.chest, glow = "#7fb0e6", accent = "#8a7fd6", gold = "#c8a862";
    // ambient arcane aura
    var ag = ctx.createRadialGradient(0, 10, 20, 0, 10, 150); ag.addColorStop(0, toRGBA(accent, .16)); ag.addColorStop(1, toRGBA(accent, 0));
    ctx.fillStyle = ag; ctx.beginPath(); ctx.arc(0, 10, 150, 0, TAU); ctx.fill();
    // robe (full length, flared hem)
    var rg = shade(ctx, 0, 40, 120, lighten(robe, .18), darken(robe, .55));
    ctx.fillStyle = rg;
    ctx.beginPath(); ctx.moveTo(-30, -40); ctx.quadraticCurveTo(-36, 40, -56, 150); ctx.quadraticCurveTo(0, 168, 56, 150); ctx.quadraticCurveTo(36, 40, 30, -40); ctx.quadraticCurveTo(0, -30, -30, -40); ctx.closePath(); ctx.fill();
    // hem trim + folds
    ctx.strokeStyle = toRGBA(gold, .6); ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-56, 150); ctx.quadraticCurveTo(0, 166, 56, 150); ctx.stroke();
    ctx.strokeStyle = "rgba(0,0,0,.3)"; ctx.lineWidth = 2; for (var f = -1; f <= 1; f++) { ctx.beginPath(); ctx.moveTo(f * 16, 0); ctx.quadraticCurveTo(f * 30, 80, f * 40, 150); ctx.stroke(); }
    // sash
    ctx.fillStyle = accent; ctx.beginPath(); ctx.moveTo(-30, 30); ctx.lineTo(30, 24); ctx.lineTo(30, 40); ctx.lineTo(-30, 46); ctx.closePath(); ctx.fill();
    ctx.fillStyle = gold; ctx.beginPath(); ctx.arc(0, 36, 6, 0, TAU); ctx.fill();
    // wide sleeves / arms
    ctx.fillStyle = shade(ctx, -40, 10, 40, lighten(robe, .1), darken(robe, .6)); ctx.beginPath(); ctx.moveTo(-30, -30); ctx.quadraticCurveTo(-58, 10, -46, 56); ctx.lineTo(-30, 40); ctx.closePath(); ctx.fill();
    ctx.fillStyle = shade(ctx, 40, 10, 40, lighten(robe, .1), darken(robe, .6)); ctx.beginPath(); ctx.moveTo(30, -30); ctx.quadraticCurveTo(58, 10, 46, 56); ctx.lineTo(30, 40); ctx.closePath(); ctx.fill();
    // hood + shadowed face
    ctx.save(); ctx.translate(0, -58);
    ctx.fillStyle = shade(ctx, 0, 0, 36, lighten(C.helm !== "#6b6257" ? C.helm : robe, .14), darken(robe, .6));
    ctx.beginPath(); ctx.moveTo(-32, 26); ctx.quadraticCurveTo(-40, -40, 0, -42); ctx.quadraticCurveTo(40, -40, 32, 26); ctx.quadraticCurveTo(0, 14, -32, 26); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#07080e"; ctx.beginPath(); ctx.ellipse(0, 2, 18, 22, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = glow; ctx.shadowColor = glow; ctx.shadowBlur = 10; ctx.beginPath(); ctx.arc(-7, 3, 3, 0, TAU); ctx.arc(7, 3, 3, 0, TAU); ctx.fill(); ctx.shadowBlur = 0;
    ctx.restore();
    // staff (right hand)
    ctx.save(); ctx.translate(52, 28); ctx.scale(1.15, 1.15); drawStaffPortrait(ctx, C.wtype === "magic" ? C.wpn : "#7fc7e6"); ctx.restore();
    // floating rune particles
    var runes = [[-58, -20], [60, -40], [-64, 60], [66, 40], [0, -96]];
    for (var i = 0; i < runes.length; i++) { ctx.fillStyle = toRGBA(accent, .8); ctx.shadowColor = accent; ctx.shadowBlur = 8; ctx.beginPath(); ctx.arc(runes[i][0], runes[i][1], 2.4, 0, TAU); ctx.fill(); }
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
    var cls = G.state.cls, body = eqColor("chest", "#6b6257"), accent = eqColor("helmet", "#8a8f9a");
    var rw = G.getEquipped("right"), wpnC = rw ? ITEMS[rw.id].color : "#c8b89a", wpnType = rw ? ITEMS[rw.id].type : "melee";
    var swing = p.swingT || 0;
    // trailing cloak/robe for flavor
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.facing);
    var cloakC = cls === "melee" ? "#7a1414" : cls === "ranged" ? "#2f5a34" : "#4a3f7a";
    ctx.fillStyle = toRGBA(cloakC, .8); ctx.beginPath(); ctx.moveTo(-p.r * 0.2, -p.r * 0.8); ctx.quadraticCurveTo(-p.r * 1.6, 0, -p.r * 0.2, p.r * 0.8); ctx.quadraticCurveTo(-p.r * 0.6, 0, -p.r * 0.2, -p.r * 0.8); ctx.fill();
    ctx.restore();
    humanoidTop(ctx, p.x, p.y, p.r, p.facing, body, accent, {
      walk: p.walkPhase, weapon: function (ctx, r) {
        ctx.save(); if (swing > 0) ctx.rotate((1 - swing) * 1.6 - 0.8);
        if (wpnType === "melee") { var g = ctx.createLinearGradient(r * 0.6, 0, r * 2.0, 0); g.addColorStop(0, lighten(wpnC, .5)); g.addColorStop(1, darken(wpnC, .5)); ctx.strokeStyle = g; ctx.lineWidth = 5; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(r * 0.6, r * 0.2); ctx.lineTo(r * 2.0, r * 0.2); ctx.stroke(); ctx.strokeStyle = "rgba(255,255,255,.5)"; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(r * 0.7, r * 0.2); ctx.lineTo(r * 1.9, r * 0.2); ctx.stroke(); ctx.lineCap = "butt"; }
        else if (wpnType === "ranged") { ctx.strokeStyle = wpnC; ctx.lineWidth = 4; ctx.lineCap = "round"; ctx.beginPath(); ctx.arc(r * 0.9, 0, r * 0.75, -1.1, 1.1); ctx.stroke(); ctx.strokeStyle = "#e9e2cf"; ctx.lineWidth = 1.2; var yy = Math.sin(1.1) * r * 0.75, xx = Math.cos(1.1) * r * 0.75; ctx.beginPath(); ctx.moveTo(r * 0.9 + xx, -yy); ctx.lineTo(r * 0.9 + xx, yy); ctx.stroke(); ctx.lineCap = "butt"; }
        else { ctx.strokeStyle = "#3a2f22"; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(r * 0.5, r * 0.2); ctx.lineTo(r * 1.5, r * 0.2); ctx.stroke(); ctx.fillStyle = wpnC; ctx.shadowColor = wpnC; ctx.shadowBlur = 12; ctx.beginPath(); ctx.arc(r * 1.6, r * 0.2, r * 0.3, 0, TAU); ctx.fill(); ctx.shadowBlur = 0; }
        ctx.restore();
      }
    });
    if (cls === "mage") ringGlow(ctx, p.x, p.y, p.r * 1.7, "rgba(127,199,230,.12)");
  };

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
