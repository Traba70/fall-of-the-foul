/* ============================================================
   Fall of the Foul — ARENA (real-time top-down combat engine)
   ============================================================ */
(function (G) {
  "use strict";
  var ITEMS = G.ITEMS, SKILLS = G.SKILLS, SPELLS = G.SPELLS, ENEMIES = G.ENEMIES, RANKS = G.RANKS, BOSSES = G.BOSSES;
  var TAU = Math.PI * 2;
  var DMG_GLOBAL = 0.85, SOUL_BASE = 9, STAM_REGEN = 28;

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function len(x, y) { return Math.sqrt(x * x + y * y); }
  function ang(dx, dy) { return Math.atan2(dy, dx); }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function ri(a, b) { return Math.floor(rnd(a, b + 1)); }
  function nowT() { return performance.now ? performance.now() : Date.now(); }
  function angDiff(a, b) { var d = a - b; while (d > Math.PI) d -= TAU; while (d < -Math.PI) d += TAU; return d; }

  var canvas, ctx, dpr = 1;
  var VIEW = { w: 0, h: 0 };
  var WORLD = { w: 1180, h: 1560, margin: 90 };
  var cam = { x: 0, y: 0 };
  var A = null, raf = null, lastT = 0;
  var input = { dir: { x: 0, y: 0 }, mag: 0, active: false, ox: 0, oy: 0, cx: 0, cy: 0, id: null, keys: {} };

  // ---------- lifecycle ----------
  G.startFight = function () {
    canvas = document.getElementById("game");
    ctx = canvas.getContext("2d");
    G.UI.showScreen("arena");
    resize(); setupInputOnce();
    var d = G.derived();
    A = { phase: "fighting", stage: G.state.stage, waveIdx: 0,
      enemies: [], pProj: [], eProj: [], hazards: [], particles: [], effects: [],
      spawnQ: [], boss: null, runSouls: 0, shake: 0, breather: 0, time: 0, pendingChest: null };
    A.player = makePlayer(d);
    buildSpellButtons();
    hideOverlays(); startWave();
    lastT = nowT(); if (raf) cancelAnimationFrame(raf); loop();
  };

  function makePlayer(d) {
    var spells = G.getSpells();
    var scd = [], scm = []; for (var i = 0; i < spells.length; i++) { scd.push(0); scm.push(SPELLS[spells[i]] ? SPELLS[spells[i]].cd : 1); }
    return {
      x: WORLD.w / 2, y: WORLD.h - WORLD.margin - 120, r: 17, facing: -Math.PI / 2,
      hp: d.maxHp, maxHp: d.maxHp, mana: d.maxMana, maxMana: d.maxMana,
      stam: 100, maxStam: 100, speed: 212, walkPhase: 0, swingT: 0,
      atkCd: 0, skillCd: 0, skillCdMax: 1, dodgeCd: 0, dodgeCdMax: 1, iframe: 0, dashT: 0, dvx: 0, dvy: 0,
      d: d, atk: G.attackProfile(d), skill: G.activeSkill(),
      spells: spells, spellCd: scd, spellCdMax: scm
    };
  }

  function resize() {
    var box = canvas.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    VIEW.w = box.width; VIEW.h = box.height;
    canvas.width = Math.round(box.width * dpr); canvas.height = Math.round(box.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  window.addEventListener("resize", function () { if (A) resize(); });
  window.addEventListener("orientationchange", function () { if (A) setTimeout(resize, 250); });

  function scaleMult(stage) { return (1 + 0.16 * (stage - 1)) * (1 + 0.015 * (G.state.level - 1)); }
  function spellPower(d) { return (14 + d.magic * 1.4) * d.dmgMult; }

  // ---------- waves ----------
  function startWave() {
    A.phase = "fighting"; A.boss = null;
    document.getElementById("boss-bar").style.display = "none";
    if (A.waveIdx >= 4) { spawnBoss(); updateWaveLabel(); return; }
    var list = G.buildWave(A.stage, A.waveIdx); A.spawnQ = [];
    for (var i = 0; i < list.length; i++) A.spawnQ.push({ type: list[i].type, rank: list[i].rank, t: 0.25 + i * 0.35 });
    updateWaveLabel(); toast("Wave " + (A.waveIdx + 1));
  }
  function updateWaveLabel() {
    var lbl = A.waveIdx >= 4 ? "Boss" : "Wave " + (A.waveIdx + 1) + " / 5";
    document.getElementById("wave-lbl").textContent = "Stage " + A.stage + " · " + lbl;
  }
  function spawnEnemy(type, rank) {
    var def = ENEMIES[type], rk = RANKS[rank], m = scaleMult(A.stage), p = A.player, x, y, tries = 0;
    do {
      var a = rnd(0, TAU), rad = Math.min(WORLD.w, WORLD.h) / 2 - WORLD.margin - 20;
      x = clamp(WORLD.w / 2 + Math.cos(a) * rad * rnd(0.55, 1), WORLD.margin, WORLD.w - WORLD.margin);
      y = clamp(WORLD.h / 2 + Math.sin(a) * rad * rnd(0.55, 1), WORLD.margin, WORLD.h - WORLD.margin);
      tries++;
    } while (len(x - p.x, y - p.y) < 260 && tries < 12);
    A.enemies.push({ type: type, rank: rank, role: def.role, x: x, y: y, r: def.radius + (rank - 1) * 2,
      facing: 0, maxHp: Math.round(def.hp * rk.hpM * m), hp: Math.round(def.hp * rk.hpM * m),
      dmg: def.dmg * rk.dmgM * m * DMG_GLOBAL, speed: def.speed * rk.spdM, range: def.range, windup: def.windup,
      windT: 0, atkCd: rnd(0.3, 1.1), walkPhase: 0, hitT: 0, slowT: 0, burnT: 0, burnDmg: 0, kx: 0, ky: 0,
      projSpeed: def.projSpeed || 0, slamR: def.slamR || 0, def: def, soul: rk.soul });
  }
  function spawnBoss() {
    var pick = BOSSES[ri(0, BOSSES.length - 1)], m = scaleMult(A.stage) * (1 + 0.05 * (A.stage - 1));
    A.boss = { id: pick.id, name: pick.name, x: WORLD.w / 2, y: WORLD.margin + 140, r: pick.radius,
      facing: Math.PI / 2, maxHp: Math.round(pick.hp * m), hp: Math.round(pick.hp * m),
      dmg: pick.dmg * m * DMG_GLOBAL, speed: pick.speed, color: pick.color,
      windT: 0, atkT: 2.0, attackKind: null, hitT: 0, slowT: 0, burnT: 0, burnDmg: 0, dvx: 0, dvy: 0, dashT: 0, chain: 0 };
    var bb = document.getElementById("boss-bar"); bb.style.display = "block";
    document.getElementById("boss-nm").textContent = pick.name; toast(pick.name);
  }

  // ---------- input ----------
  var inputBound = false;
  function setupInputOnce() {
    if (inputBound) return; inputBound = true;
    var joy = document.getElementById("joy-zone");
    function startJoy(cx, cy, id) { input.active = true; input.ox = cx; input.oy = cy; input.cx = cx; input.cy = cy; input.id = id; }
    function moveJoy(cx, cy) {
      if (!input.active) return; input.cx = cx; input.cy = cy;
      var dx = cx - input.ox, dy = cy - input.oy, m = len(dx, dy), R = 66;
      if (m > R) { input.ox = cx - dx / m * R; dx = cx - input.ox; dy = cy - input.oy; m = R; }
      input.mag = clamp(m / R, 0, 1);
      if (m > 6) { input.dir.x = dx / (m || 1); input.dir.y = dy / (m || 1); } else input.mag = 0;
    }
    function endJoy() { input.active = false; input.mag = 0; input.id = null; }
    joy.addEventListener("touchstart", function (e) { e.preventDefault(); var t = e.changedTouches[0]; startJoy(t.clientX, t.clientY, t.identifier); }, { passive: false });
    joy.addEventListener("touchmove", function (e) { e.preventDefault(); for (var i = 0; i < e.changedTouches.length; i++) { var t = e.changedTouches[i]; if (t.identifier === input.id) moveJoy(t.clientX, t.clientY); } }, { passive: false });
    joy.addEventListener("touchend", function (e) { for (var i = 0; i < e.changedTouches.length; i++) if (e.changedTouches[i].identifier === input.id) endJoy(); });
    joy.addEventListener("touchcancel", endJoy);
    joy.addEventListener("mousedown", function (e) { startJoy(e.clientX, e.clientY, "m"); });
    window.addEventListener("mousemove", function (e) { if (input.id === "m") moveJoy(e.clientX, e.clientY); });
    window.addEventListener("mouseup", function () { if (input.id === "m") endJoy(); });

    bindBtn("btn-attack", doAttack);
    bindBtn("btn-skill", doSkill);
    bindBtn("btn-dodge", doDodge);
    document.getElementById("pause-btn").addEventListener("click", function () { togglePause(true); });
    document.getElementById("pz-resume").addEventListener("click", function () { togglePause(false); });
    document.getElementById("pz-quit").addEventListener("click", function () { exitToMenu(); });

    window.addEventListener("keydown", function (e) {
      input.keys[e.key.toLowerCase()] = true; var k = e.key.toLowerCase();
      if (k === "j") doAttack(); else if (k === "k") doSkill();
      else if (k === "l" || k === " ") { doDodge(); e.preventDefault(); }
      else if (k >= "1" && k <= "5") { castSpell(parseInt(k, 10) - 1); }
      else if (k === "escape") togglePause(A && A.phase !== "paused");
    });
    window.addEventListener("keyup", function (e) { input.keys[e.key.toLowerCase()] = false; });
  }
  function bindBtn(id, fn) {
    var b = document.getElementById(id); if (!b) return;
    b.addEventListener("touchstart", function (e) { e.preventDefault(); e.stopPropagation(); fn(); }, { passive: false });
    b.addEventListener("mousedown", function (e) { e.preventDefault(); e.stopPropagation(); fn(); });
  }
  function buildSpellButtons() {
    var pad = document.getElementById("spellpad"); if (!pad) return;
    pad.innerHTML = "";
    var spells = A.player.spells;
    for (var i = 0; i < spells.length; i++) {
      if (!spells[i]) continue;
      var sp = SPELLS[spells[i]];
      var b = document.createElement("button");
      b.className = "act spell-cast"; b.id = "spell-btn-" + i;
      b.innerHTML = '<span class="lbl">' + sp.name + '</span>' +
        '<svg class="cdring" viewBox="0 0 100 100"><circle id="cd-spell-' + i + '" cx="50" cy="50" r="48" fill="none" stroke="#c9a6ea" stroke-width="4" stroke-dasharray="301.6" stroke-dashoffset="0" transform="rotate(-90 50 50)"/></svg>';
      (function (idx) {
        b.addEventListener("touchstart", function (e) { e.preventDefault(); e.stopPropagation(); castSpell(idx); }, { passive: false });
        b.addEventListener("mousedown", function (e) { e.preventDefault(); e.stopPropagation(); castSpell(idx); });
      })(i);
      pad.appendChild(b);
    }
  }
  function keyboardDir() { var x = 0, y = 0, k = input.keys; if (k["a"] || k["arrowleft"]) x -= 1; if (k["d"] || k["arrowright"]) x += 1; if (k["w"] || k["arrowup"]) y -= 1; if (k["s"] || k["arrowdown"]) y += 1; var m = len(x, y); return m > 0 ? { x: x / m, y: y / m } : null; }
  function currentMoveDir() { if (input.active && input.mag > 0.05) return { x: input.dir.x, y: input.dir.y }; var kd = keyboardDir(); return kd || null; }

  // ---------- targeting ----------
  function targets() { var t = A.enemies.slice(); if (A.boss) t.push(A.boss); return t; }
  function nearest(x, y, maxR) { var best = null, bd = maxR || 1e9, ts = targets(); for (var i = 0; i < ts.length; i++) { var dd = len(ts[i].x - x, ts[i].y - y); if (dd < bd) { bd = dd; best = ts[i]; } } return best; }
  function aimAngle(p) { var t = nearest(p.x, p.y, 800); return t ? ang(t.x - p.x, t.y - p.y) : p.facing; }

  // ---------- player actions ----------
  function doAttack() {
    if (!A || A.phase !== "fighting") return;
    var p = A.player, atk = p.atk; if (p.atkCd > 0 || p.hp <= 0 || p.stam < atk.stam) return;
    var a = aimAngle(p); p.facing = a; p.swingT = 1; p.atkCd = atk.rate; p.stam -= atk.stam;
    var d = p.d, fl = d.flags;
    if (atk.type === "melee") { meleeHit(p.x, p.y, a, atk.arc, atk.range, atk.dmg, { crit: d.critChance, lifesteal: fl.lifesteal, burn: fl.burn, slow: fl.slow }); slashFX(p, a, atk.range, atk.arc, atk.color); }
    else if (atk.type === "ranged") { fireProj(p.x, p.y, a, atk.projSpeed, atk.dmg, { color: atk.color, crit: d.critChance }); }
    else { fireProj(p.x, p.y, a, atk.projSpeed, atk.dmg, { color: atk.color, crit: d.critChance, burn: fl.burn, slow: fl.slow, r: 8, glow: true }); }
  }

  function doSkill() {
    if (!A || A.phase !== "fighting") return;
    var p = A.player, sk = p.skill; if (!sk) return;
    if (p.skillCd > 0 || p.hp <= 0) return;
    if (p.stam < sk.stam) { toast("Not enough stamina"); return; }
    p.stam -= sk.stam; p.skillCd = sk.cd; p.skillCdMax = sk.cd;
    var base = p.atk.dmg;
    execAbility(sk, base, false);
  }

  function castSpell(i) {
    if (!A || A.phase !== "fighting") return;
    var p = A.player; if (i < 0 || i >= p.spells.length || !p.spells[i]) return;
    var sp = SPELLS[p.spells[i]]; if (!sp) return;
    if (p.spellCd[i] > 0 || p.hp <= 0) return;
    if (p.mana < sp.mana) { toast("Not enough mana"); return; }
    if (p.stam < sp.stam) { toast("Not enough stamina"); return; }
    p.mana -= sp.mana; p.stam -= sp.stam; p.spellCd[i] = sp.cd; p.spellCdMax[i] = sp.cd;
    execAbility(sp, spellPower(p.d), true);
  }

  // unified skill/spell effect
  function execAbility(a, base, isSpell) {
    var p = A.player, d = p.d, mult = a.mult * d.skillDmgMult, aim = aimAngle(p); p.facing = aim;
    var fl = d.flags;
    if (a.kind === "arc") { p.swingT = 1; meleeHit(p.x, p.y, aim, a.arc, a.range, base * mult, { crit: d.critChance, knock: a.knock, lifesteal: fl.lifesteal }); slashFX(p, aim, a.range, a.arc, "#e7cf95"); }
    else if (a.kind === "spin") { A.effects.push({ kind: "spin", x: p.x, y: p.y, r: a.radius, t: 0, dur: 0.55, ticks: a.ticks, tickT: 0, dmg: base * mult, done: 0, follow: p }); }
    else if (a.kind === "dash") { p.dashT = 0.22; p.dvx = Math.cos(aim) * 1400; p.dvy = Math.sin(aim) * 1400; p.iframe = Math.max(p.iframe, 0.3); A.effects.push({ kind: "dashHit", x: p.x, y: p.y, dmg: base * mult, hitSet: {}, lifesteal: a.lifesteal, follow: p, t: 0, dur: 0.22 }); }
    else if (a.kind === "blink") { var t2 = nearest(p.x, p.y, 600); if (t2) { var an = ang(t2.x - p.x, t2.y - p.y); p.x = clamp(t2.x - Math.cos(an) * (t2.r + 24), WORLD.margin, WORLD.w - WORLD.margin); p.y = clamp(t2.y - Math.sin(an) * (t2.r + 24), WORLD.margin, WORLD.h - WORLD.margin); } else { p.x = clamp(p.x + Math.cos(aim) * a.dist, WORLD.margin, WORLD.w - WORLD.margin); p.y = clamp(p.y + Math.sin(aim) * a.dist, WORLD.margin, WORLD.h - WORLD.margin); } p.iframe = Math.max(p.iframe, a.iframe || 0.4); p.swingT = 1; meleeHit(p.x, p.y, aim, 2.2, 130, base * mult, { crit: d.critChance }); slashFX(p, aim, 130, 2.2, "#e7cf95"); }
    else if (a.kind === "pierce") { fireProj(p.x, p.y, aim, a.speed, base * mult, { color: a.color || "#ffe08a", pierce: a.pierce, r: 7, glow: true, crit: d.critChance, burn: a.burn, slow: a.slow }); }
    else if (a.kind === "fan") { for (var i = 0; i < a.count; i++) { var off = (i - (a.count - 1) / 2) * a.spread; fireProj(p.x, p.y, aim + off, a.speed || 700, base * mult, { color: a.color || (a.slow ? "#7fc7e6" : (isSpell ? "#e6883a" : p.atk.color)), slow: a.slow, burn: a.burn || fl.burn, r: 6, glow: isSpell || !!a.slow, crit: d.critChance }); } }
    else if (a.kind === "boom") { fireProj(p.x, p.y, aim, a.speed, base * mult, { color: a.burn ? "#ff8a3a" : "#ffd08a", r: 10, glow: true, boom: a.radius, burn: a.burn, crit: d.critChance }); }
    else if (a.kind === "nova") { addHazard({ x: p.x, y: p.y, r: a.radius, warn: 0, dur: 0.25, dmg: base * mult, owner: "player", tickRate: 0.25, burn: a.burn, color: "#ff8a3a", kind: "burst" }); }
    else if (a.kind === "rain") { var tg = nearest(p.x, p.y, 700), tx = tg ? tg.x : p.x + Math.cos(aim) * 180, ty = tg ? tg.y : p.y + Math.sin(aim) * 180; addHazard({ x: tx, y: ty, r: a.radius, warn: 0.7, dur: 0.5, dmg: base * mult, owner: "player", tickRate: 0.25, color: a.burn ? "#ff8a3a" : "#d9c37a", kind: "rain", count: a.count, burn: a.burn }); }
    else if (a.kind === "field") { var fg = nearest(p.x, p.y, 700), fx = fg ? fg.x : p.x + Math.cos(aim) * 160, fy = fg ? fg.y : p.y + Math.sin(aim) * 160; addHazard({ x: fx, y: fy, r: a.radius, warn: 0.3, dur: a.dur, dmg: base * mult, owner: "player", tickRate: 0.5, slow: a.slow, color: "#7fc7e6", kind: "field" }); }
    else if (a.kind === "heal") { var amt = a.heal * p.maxHp; p.hp = Math.min(p.maxHp, p.hp + amt); dmgNumber(p.x, p.y - p.r, "+" + Math.round(amt), false, "#8fe37a"); for (var h = 0; h < 12; h++) A.particles.push({ x: p.x + rnd(-14, 14), y: p.y + rnd(-14, 14), vx: 0, vy: -60, life: 0.7, max: 0.7, color: "rgba(150,230,140,.8)", size: 3 }); }
  }

  function doDodge() {
    if (!A || A.phase !== "fighting") return;
    var p = A.player; if (p.dodgeCd > 0 || p.stam < G.STAM_DODGE || p.hp <= 0) return;
    var dir = currentMoveDir(); if (!dir) dir = { x: Math.cos(p.facing), y: Math.sin(p.facing) };
    p.stam -= G.STAM_DODGE; p.dodgeCd = 0.55; p.dodgeCdMax = 0.55; p.iframe = 0.42;   // i-frames cover the whole roll
    p.dashT = 0.18; p.dvx = dir.x * 1050; p.dvy = dir.y * 1050;
    for (var i = 0; i < 6; i++) A.particles.push({ x: p.x, y: p.y, vx: rnd(-40, 40), vy: rnd(-40, 40), life: 0.3, max: 0.3, color: "rgba(200,200,210,.5)", size: 3 });
  }

  // ---------- combat helpers ----------
  function meleeHit(x, y, a, arc, range, dmg, opts) {
    opts = opts || {}; var ts = targets();
    for (var i = 0; i < ts.length; i++) {
      var e = ts[i], dd = len(e.x - x, e.y - y);
      if (dd > range + e.r) continue;
      if (Math.abs(angDiff(ang(e.x - x, e.y - y), a)) > arc / 2) continue;
      var dm = rollCrit(dmg, opts.crit); hurtEnemy(e, dm.dmg, dm.crit, opts);
      if (opts.knock) { var ka = ang(e.x - x, e.y - y); e.kx += Math.cos(ka) * opts.knock; e.ky += Math.sin(ka) * opts.knock; }
      if (opts.lifesteal) healPlayer(dm.dmg * opts.lifesteal);
    }
  }
  function rollCrit(dmg, chance) { return (chance && Math.random() < chance) ? { dmg: dmg * 1.7, crit: true } : { dmg: dmg, crit: false }; }
  function fireProj(x, y, a, speed, dmg, o) {
    o = o || {};
    A.pProj.push({ x: x, y: y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, r: o.r || 5, dmg: dmg,
      pierce: o.pierce || 0, life: 1.8, color: o.color || "#e7cf95", glow: !!o.glow, boom: o.boom || 0,
      burn: !!o.burn, slow: !!o.slow, crit: o.crit || 0, hitSet: {} });
  }
  function hurtEnemy(e, dmg, crit, o) {
    e.hp -= dmg; e.hitT = 0.12;
    if (o && o.burn) { e.burnT = 2.4; e.burnDmg = dmg * 0.12; }
    if (o && o.slow) e.slowT = 1.6;
    dmgNumber(e.x, e.y - e.r, Math.round(dmg), crit);
    for (var i = 0; i < (crit ? 5 : 3); i++) A.particles.push({ x: e.x, y: e.y, vx: rnd(-90, 90), vy: rnd(-90, 90), life: 0.3, max: 0.3, color: crit ? "#ffd873" : "#c0392b", size: crit ? 3 : 2 });
  }
  function healPlayer(v) { var p = A.player; p.hp = Math.min(p.maxHp, p.hp + v); }
  function dmgNumber(x, y, v, crit, color) { A.particles.push({ x: x, y: y, vx: rnd(-10, 10), vy: -46, life: 0.7, max: 0.7, text: "" + v, color: color || (crit ? "#ffd873" : "#f0e6cf"), size: crit ? 17 : 13 }); }
  function addHazard(h) { h.t = 0; h._lt = null; if (h.tickRate == null) h.tickRate = 0.4; A.hazards.push(h); }
  function slashFX(p, a, range, arc, color) { A.effects.push({ kind: "slash", x: p.x, y: p.y, a: a, range: range, arc: arc, color: color, t: 0, dur: 0.18, follow: p }); }
  function damagePlayer(dmg, srcE) {
    var p = A.player; if (p.iframe > 0 || p.hp <= 0) return;          // dodge i-frames block ALL damage
    var real = dmg * p.d.dmgTakenMult; p.hp -= real; A.shake = Math.min(16, A.shake + Math.min(10, real * 0.4));
    for (var i = 0; i < 6; i++) A.particles.push({ x: p.x, y: p.y, vx: rnd(-70, 70), vy: rnd(-70, 70), life: 0.3, max: 0.3, color: "rgba(200,40,40,.8)", size: 3 });
    if (srcE && p.d.flags.thorns && len(srcE.x - p.x, srcE.y - p.y) < p.r + srcE.r + 20) hurtEnemy(srcE, real * p.d.flags.thorns, false, {});
    if (p.hp <= 0) { p.hp = 0; onDeath(); }
  }

  // ---------- loop / update ----------
  function loop() { raf = requestAnimationFrame(loop); var t = nowT(), dt = Math.min(0.033, (t - lastT) / 1000); lastT = t; if (A && A.phase === "fighting") update(dt); if (A) render(); }

  function update(dt) {
    A.time += dt; var p = A.player, d = p.d, i;
    for (i = A.spawnQ.length - 1; i >= 0; i--) { A.spawnQ[i].t -= dt; if (A.spawnQ[i].t <= 0) { spawnEnemy(A.spawnQ[i].type, A.spawnQ[i].rank); A.spawnQ.splice(i, 1); } }

    p.atkCd = Math.max(0, p.atkCd - dt); p.skillCd = Math.max(0, p.skillCd - dt); p.dodgeCd = Math.max(0, p.dodgeCd - dt);
    for (i = 0; i < p.spellCd.length; i++) p.spellCd[i] = Math.max(0, p.spellCd[i] - dt);
    p.iframe = Math.max(0, p.iframe - dt); p.swingT = Math.max(0, p.swingT - dt * 6);
    p.stam = Math.min(p.maxStam, p.stam + STAM_REGEN * dt);
    p.hp = Math.min(p.maxHp, p.hp + d.hpRegen * dt); p.mana = Math.min(p.maxMana, p.mana + d.manaRegen * dt);

    var mv = currentMoveDir(), moving = false;
    if (p.dashT > 0) { p.dashT -= dt; p.x += p.dvx * dt; p.y += p.dvy * dt; p.dvx *= 0.86; p.dvy *= 0.86; moving = true; }
    else if (mv) { var spd = p.speed * (input.active ? Math.max(0.35, input.mag) : 1); p.x += mv.x * spd * dt; p.y += mv.y * spd * dt; p.facing = ang(mv.x, mv.y); moving = true; }
    p.x = clamp(p.x, WORLD.margin, WORLD.w - WORLD.margin); p.y = clamp(p.y, WORLD.margin, WORLD.h - WORLD.margin);
    if (moving) p.walkPhase += dt * 12;

    for (i = 0; i < A.enemies.length; i++) updateEnemy(A.enemies[i], dt, p);
    separate();
    if (A.boss) updateBoss(A.boss, dt, p);
    updateProjectiles(dt); updateHazards(dt); updateEffects(dt); updateParticles(dt);

    for (i = A.enemies.length - 1; i >= 0; i--) if (A.enemies[i].hp <= 0) { killEnemy(A.enemies[i]); A.enemies.splice(i, 1); }
    if (A.boss && A.boss.hp <= 0) onBossDead();

    A.shake *= 0.86;
    if (A.breather > 0) { A.breather -= dt; if (A.breather <= 0) advanceWave(); }
    if (A.phase === "fighting" && A.waveIdx < 4 && A.breather <= 0 && A.enemies.length === 0 && A.spawnQ.length === 0) onWaveClear();
    updateHUD(); updateCamera();
  }
  function updateCamera() { var p = A.player; cam.x = WORLD.w > VIEW.w ? clamp(p.x, VIEW.w / 2, WORLD.w - VIEW.w / 2) : WORLD.w / 2; cam.y = WORLD.h > VIEW.h ? clamp(p.y, VIEW.h / 2, WORLD.h - VIEW.h / 2) : WORLD.h / 2; }
  function separate() { var es = A.enemies; for (var i = 0; i < es.length; i++) for (var j = i + 1; j < es.length; j++) { var a = es[i], b = es[j], dx = b.x - a.x, dy = b.y - a.y, dd = len(dx, dy), mn = a.r + b.r; if (dd > 0 && dd < mn) { var pu = (mn - dd) / 2, nx = dx / dd, ny = dy / dd; a.x -= nx * pu; a.y -= ny * pu; b.x += nx * pu; b.y += ny * pu; } } }

  function updateEnemy(e, dt, p) {
    e.hitT = Math.max(0, e.hitT - dt);
    if (e.burnT > 0) { e.burnT -= dt; e.hp -= e.burnDmg * dt * 4; }
    var slowF = e.slowT > 0 ? 0.5 : 1; if (e.slowT > 0) e.slowT -= dt;
    if (Math.abs(e.kx) + Math.abs(e.ky) > 1) { e.x += e.kx * dt; e.y += e.ky * dt; e.kx *= 0.8; e.ky *= 0.8; }
    var dd = len(p.x - e.x, p.y - e.y), toP = ang(p.x - e.x, p.y - e.y); e.facing = toP; e.atkCd = Math.max(0, e.atkCd - dt);
    if (e.role === "ranged" || e.role === "mage") {
      var pref = e.range * 0.7;
      if (e.windT > 0) { e.windT -= dt; if (e.windT <= 0) { enemyShoot(e, p); e.atkCd = rnd(1.4, 2.4); } }
      else { if (dd > pref + 40) moveTowards(e, p.x, p.y, e.speed * slowF, dt); else if (dd < pref - 40) moveTowards(e, e.x - (p.x - e.x), e.y - (p.y - e.y), e.speed * slowF * 0.9, dt); else e.walkPhase += dt * 4; if (e.atkCd <= 0 && dd < e.range) e.windT = e.windup; }
    } else {
      if (e.windT > 0) { e.windT -= dt; if (e.windT <= 0) { if (e.role === "heavy") addHazard({ x: e.x + Math.cos(toP) * e.r, y: e.y + Math.sin(toP) * e.r, r: e.slamR, warn: 0, dur: 0.2, dmg: e.dmg, owner: "enemy", tickRate: 0.2, color: "#c98a3a", kind: "burst" }); else if (dd < e.range + p.r + 8) damagePlayer(e.dmg, e); e.atkCd = rnd(0.8, 1.5); } }
      else { if (dd > e.range) moveTowards(e, p.x, p.y, e.speed * slowF, dt); else if (e.atkCd <= 0) e.windT = e.windup; else e.walkPhase += dt * 6; }
    }
  }
  function moveTowards(e, tx, ty, spd, dt) { var a = ang(tx - e.x, ty - e.y); e.x = clamp(e.x + Math.cos(a) * spd * dt, WORLD.margin, WORLD.w - WORLD.margin); e.y = clamp(e.y + Math.sin(a) * spd * dt, WORLD.margin, WORLD.h - WORLD.margin); e.walkPhase += dt * 8; }
  function enemyShoot(e, p) { var a = ang(p.x - e.x, p.y - e.y); A.eProj.push({ x: e.x, y: e.y, vx: Math.cos(a) * e.projSpeed, vy: Math.sin(a) * e.projSpeed, r: 7, dmg: e.dmg, life: 3, color: e.role === "mage" ? "#c07add" : "#d0c090", home: e.role === "mage" ? 0.8 : 0 }); }

  function updateProjectiles(dt) {
    var p = A.player, i, pr;
    for (i = A.pProj.length - 1; i >= 0; i--) {
      pr = A.pProj[i]; pr.x += pr.vx * dt; pr.y += pr.vy * dt; pr.life -= dt;
      var gone = pr.life <= 0 || pr.x < 20 || pr.x > WORLD.w - 20 || pr.y < 20 || pr.y > WORLD.h - 20, ts = targets(), hit = false;
      for (var j = 0; j < ts.length; j++) {
        var e = ts[j], key = e === A.boss ? "boss" : (e.__id || (e.__id = "e" + Math.random()));
        if (pr.hitSet[key]) continue;
        if (len(e.x - pr.x, e.y - pr.y) < e.r + pr.r) {
          var dm = rollCrit(pr.dmg, pr.crit); hurtEnemy(e, dm.dmg, dm.crit, { burn: pr.burn, slow: pr.slow }); pr.hitSet[key] = 1;
          if (pr.boom) addHazard({ x: pr.x, y: pr.y, r: pr.boom, warn: 0, dur: 0.2, dmg: pr.dmg, owner: "player", tickRate: 0.2, burn: pr.burn, color: pr.burn ? "#ff8a3a" : "#ffd08a", kind: "burst" });
          if (pr.pierce > 0) pr.pierce--; else { hit = true; break; }
        }
      }
      if (hit || gone) A.pProj.splice(i, 1);
    }
    for (i = A.eProj.length - 1; i >= 0; i--) {
      pr = A.eProj[i];
      if (pr.home && p.hp > 0) { var sp = len(pr.vx, pr.vy), na = ang(p.y - pr.y, p.x - pr.x); pr.vx += (Math.cos(na) * sp - pr.vx) * pr.home * dt * 3; pr.vy += (Math.sin(na) * sp - pr.vy) * pr.home * dt * 3; }
      pr.x += pr.vx * dt; pr.y += pr.vy * dt; pr.life -= dt;
      if (len(p.x - pr.x, p.y - pr.y) < p.r + pr.r) { damagePlayer(pr.dmg, null); A.eProj.splice(i, 1); continue; }
      if (pr.life <= 0 || pr.x < 10 || pr.x > WORLD.w - 10 || pr.y < 10 || pr.y > WORLD.h - 10) A.eProj.splice(i, 1);
    }
  }
  function updateHazards(dt) {
    var p = A.player;
    for (var i = A.hazards.length - 1; i >= 0; i--) {
      var h = A.hazards[i]; h.t += dt; if (h.t < h.warn) continue;
      if (h.t - h.warn <= h.dur) {
        if (h._lt == null || h.t - h._lt >= h.tickRate) {
          h._lt = h.t;
          if (h.owner === "enemy") { if (len(p.x - h.x, p.y - h.y) < p.r + h.r) damagePlayer(h.dmg, null); }
          else { var ts = targets(); for (var j = 0; j < ts.length; j++) { var e = ts[j]; if (len(e.x - h.x, e.y - h.y) < e.r + h.r) hurtEnemy(e, h.dmg, false, { burn: h.burn, slow: h.slow }); } }
        }
      }
      if (h.t >= h.warn + h.dur) A.hazards.splice(i, 1);
    }
  }
  function updateEffects(dt) {
    for (var i = A.effects.length - 1; i >= 0; i--) {
      var ef = A.effects[i]; ef.t += dt; if (ef.follow) { ef.x = ef.follow.x; ef.y = ef.follow.y; }
      if (ef.kind === "spin") { ef.tickT += dt; if (ef.tickT >= ef.dur / ef.ticks && ef.done < ef.ticks) { ef.tickT = 0; ef.done++; var ts = targets(); for (var j = 0; j < ts.length; j++) { var e = ts[j]; if (len(e.x - ef.x, e.y - ef.y) < e.r + ef.r) hurtEnemy(e, ef.dmg, false, {}); } } }
      else if (ef.kind === "dashHit") { var ts2 = targets(); for (var k = 0; k < ts2.length; k++) { var e2 = ts2[k], idk = e2 === A.boss ? "boss" : (e2.__id || (e2.__id = "e" + Math.random())); if (ef.hitSet[idk]) continue; if (len(e2.x - ef.x, e2.y - ef.y) < e2.r + 30) { ef.hitSet[idk] = 1; hurtEnemy(e2, ef.dmg, false, {}); if (ef.lifesteal) healPlayer(ef.dmg * ef.lifesteal); } } }
      if (ef.t >= ef.dur) A.effects.splice(i, 1);
    }
  }
  function updateParticles(dt) { for (var i = A.particles.length - 1; i >= 0; i--) { var pt = A.particles[i]; pt.x += pt.vx * dt; pt.y += pt.vy * dt; pt.vy += (pt.text ? 0 : 120) * dt; pt.life -= dt; if (pt.life <= 0) A.particles.splice(i, 1); } }

  // ---------- boss AI ----------
  function updateBoss(b, dt, p) {
    b.hitT = Math.max(0, b.hitT - dt);
    if (b.burnT > 0) { b.burnT -= dt; b.hp -= b.burnDmg * dt * 4; }
    var slowF = b.slowT > 0 ? 0.6 : 1; if (b.slowT > 0) b.slowT -= dt;
    var dd = len(p.x - b.x, p.y - b.y); b.facing = ang(p.x - b.x, p.y - b.y);
    if (b.dashT > 0) { b.dashT -= dt; b.x = clamp(b.x + b.dvx * dt, WORLD.margin, WORLD.w - WORLD.margin); b.y = clamp(b.y + b.dvy * dt, WORLD.margin, WORLD.h - WORLD.margin); b.dvx *= 0.9; b.dvy *= 0.9; if (len(p.x - b.x, p.y - b.y) < p.r + b.r) damagePlayer(b.dmg * 0.8, b); return; }
    if (b.windT > 0) { b.windT -= dt; if (b.windT <= 0) execBossAttack(b, p); return; }
    b.atkT -= dt;
    var keep = (b.id === "radaghast") ? 340 : 120;
    if (b.id === "radaghast" && dd < keep) moveTowards(b, b.x - (p.x - b.x), b.y - (p.y - b.y), b.speed * slowF, dt);
    else if (dd > keep) moveTowards(b, p.x, p.y, b.speed * slowF, dt);
    if (b.atkT <= 0) chooseBossAttack(b, p, dd);
  }
  function chooseBossAttack(b, p, dd) {
    var enraged = b.hp / b.maxHp < 0.4, pool;
    if (b.id === "godrik") pool = dd < 160 ? ["sweep", "slam"] : ["charge", "slam"];
    else if (b.id === "malenketh") pool = ["dashslash", "flurry", "rot"];
    else if (b.id === "radaghast") pool = ["orbs", "meteor", "beam"];
    else if (b.id === "grafted") pool = dd < 180 ? ["grab", "stomp"] : ["boulder", "stomp"];
    else pool = ["spears", "novaB", "teleport"];
    b.attackKind = pool[ri(0, pool.length - 1)]; b.windT = enraged ? 0.5 : 0.75;
  }
  function execBossAttack(b, p) {
    var k = b.attackKind, cd = 1.6, i;
    if (k === "sweep") { meleeBoss(b, p, 2.2, b.r + 150, b.dmg); cd = 1.4; }
    else if (k === "charge") { var a = ang(p.x - b.x, p.y - b.y); b.dashT = 0.4; b.dvx = Math.cos(a) * 1500; b.dvy = Math.sin(a) * 1500; cd = 1.8; }
    else if (k === "slam" || k === "stomp") { for (i = 1; i <= 3; i++) addHazard({ x: b.x, y: b.y, r: 70 * i + 40, warn: 0.15 * i, dur: 0.2, dmg: b.dmg * 0.7, owner: "enemy", tickRate: 0.2, color: "#c98a3a", kind: "ring" }); cd = 2.0; }
    else if (k === "dashslash") { var a2 = ang(p.x - b.x, p.y - b.y); b.dashT = 0.3; b.dvx = Math.cos(a2) * 1400; b.dvy = Math.sin(a2) * 1400; cd = 1.4; }
    else if (k === "flurry") { addHazard({ x: b.x, y: b.y, r: b.r + 120, warn: 0, dur: 0.6, dmg: b.dmg * 0.5, owner: "enemy", tickRate: 0.18, color: "#c9b06a", kind: "burst" }); cd = 1.8; }
    else if (k === "rot") { for (i = 0; i < 4; i++) addHazard({ x: clamp(p.x + rnd(-140, 140), WORLD.margin, WORLD.w - WORLD.margin), y: clamp(p.y + rnd(-140, 140), WORLD.margin, WORLD.h - WORLD.margin), r: 70, warn: 0.5, dur: 3.5, dmg: b.dmg * 0.25, owner: "enemy", tickRate: 0.5, slow: true, color: "#8fbf4a", kind: "field" }); cd = 2.4; }
    else if (k === "orbs") { for (i = 0; i < 6; i++) { var aa = ang(p.x - b.x, p.y - b.y) + (i - 2.5) * 0.16; A.eProj.push({ x: b.x, y: b.y, vx: Math.cos(aa) * 300, vy: Math.sin(aa) * 300, r: 8, dmg: b.dmg * 0.6, life: 4, color: "#c9c0f5", home: 0.5 }); } cd = 1.8; }
    else if (k === "meteor") { for (i = 0; i < 5; i++) addHazard({ x: clamp(p.x + rnd(-200, 200), WORLD.margin, WORLD.w - WORLD.margin), y: clamp(p.y + rnd(-200, 200), WORLD.margin, WORLD.h - WORLD.margin), r: 80, warn: 0.9, dur: 0.3, dmg: b.dmg * 0.8, owner: "enemy", tickRate: 0.3, color: "#8a7fd6", kind: "meteor" }); cd = 2.2; }
    else if (k === "beam") { var ba = ang(p.x - b.x, p.y - b.y); for (i = 1; i <= 6; i++) addHazard({ x: b.x + Math.cos(ba) * i * 90, y: b.y + Math.sin(ba) * i * 90, r: 55, warn: 0.5, dur: 0.25, dmg: b.dmg * 0.7, owner: "enemy", tickRate: 0.25, color: "#b3a6ff", kind: "burst" }); cd = 2.0; }
    else if (k === "boulder") { addHazard({ x: p.x, y: p.y, r: 90, warn: 0.9, dur: 0.3, dmg: b.dmg, owner: "enemy", tickRate: 0.3, color: "#8a6f52", kind: "meteor" }); cd = 2.0; }
    else if (k === "grab") { var ga = ang(p.x - b.x, p.y - b.y); b.dashT = 0.35; b.dvx = Math.cos(ga) * 1300; b.dvy = Math.sin(ga) * 1300; cd = 2.2; }
    else if (k === "spears") { for (i = 0; i < 7; i++) { var sa = ang(p.x - b.x, p.y - b.y) + (i - 3) * 0.14; A.eProj.push({ x: b.x, y: b.y, vx: Math.cos(sa) * 520, vy: Math.sin(sa) * 520, r: 6, dmg: b.dmg * 0.5, life: 3, color: "#e05a6a" }); } cd = 1.6; }
    else if (k === "novaB") { addHazard({ x: b.x, y: b.y, r: 220, warn: 0.7, dur: 0.3, dmg: b.dmg, owner: "enemy", tickRate: 0.3, color: "#a03040", kind: "ring" }); cd = 2.0; }
    else if (k === "teleport") { var t2a = ang(p.x - b.x, p.y - b.y); b.x = clamp(p.x - Math.cos(t2a) * 60, WORLD.margin, WORLD.w - WORLD.margin); b.y = clamp(p.y - Math.sin(t2a) * 60, WORLD.margin, WORLD.h - WORLD.margin); b.windT = 0.35; b.attackKind = "sweep2"; return; }
    else if (k === "sweep2") { meleeBoss(b, p, 2.4, b.r + 130, b.dmg); cd = 1.4; }
    b.atkT = cd;
  }
  function meleeBoss(b, p, arc, range, dmg) { if (len(p.x - b.x, p.y - b.y) < range && Math.abs(angDiff(ang(p.x - b.x, p.y - b.y), b.facing)) < arc / 2) damagePlayer(dmg, b); A.effects.push({ kind: "slash", x: b.x, y: b.y, a: b.facing, range: range, arc: arc, color: "#e0b0b0", t: 0, dur: 0.2 }); }

  // ---------- deaths / rewards / flow ----------
  function killEnemy(e) {
    var gain = Math.round(SOUL_BASE * e.soul * scaleMult(A.stage) * A.player.d.soulMult);
    A.runSouls += gain; G.state.souls += gain;
    A.particles.push({ x: e.x, y: e.y - 6, vx: 0, vy: -30, life: 0.8, max: 0.8, text: "+" + gain, color: "#d9c37a", size: 12 });
    for (var i = 0; i < 8; i++) A.particles.push({ x: e.x, y: e.y, vx: rnd(-80, 80), vy: rnd(-120, -20), life: 0.5, max: 0.5, color: "#c0392b", size: 2 });
  }
  function onWaveClear() {
    A.phase = "clearing"; A.waveIdx++;
    var luck = A.player.d.luck, chance = Math.min(0.85, 0.35 + luck * 0.008);
    if (Math.random() < chance) { A.pendingChest = genReward(luck, A.stage, false); showChest(A.pendingChest, false); }
    else { toast("Wave Cleared"); A.breather = 1.2; A.phase = "fighting"; }
  }
  function advanceWave() { if (A.phase === "fighting") startWave(); }
  function onBossDead() {
    var b = A.boss; killBossFX(b);
    var gain = Math.round(SOUL_BASE * 20 * scaleMult(A.stage) * A.player.d.soulMult); A.runSouls += gain; G.state.souls += gain;
    A.boss = null; document.getElementById("boss-bar").style.display = "none";
    G.state.stageCleared = Math.max(G.state.stageCleared, A.stage); G.state.stage = A.stage + 1;
    G.state.level = 1 + G.state.statsBought + G.state.stageCleared; G.save();
    A.phase = "bossreward"; A.pendingChest = genReward(A.player.d.luck, A.stage, true); showChest(A.pendingChest, true);
  }
  function killBossFX(b) { A.shake = 20; for (var i = 0; i < 40; i++) A.particles.push({ x: b.x, y: b.y, vx: rnd(-200, 200), vy: rnd(-260, 40), life: rnd(0.6, 1.2), max: 1.2, color: i % 2 ? "#e7cf95" : "#c0392b", size: rnd(2, 4) }); }

  function genReward(luck, stage, boss) {
    var unlearned = [], id;
    for (id in SKILLS) if (SKILLS.hasOwnProperty(id) && G.state.learnedSkills.indexOf(id) < 0) unlearned.push(id);
    for (id in SPELLS) if (SPELLS.hasOwnProperty(id) && G.state.learnedSpells.indexOf(id) < 0) unlearned.push(id);
    var abilityChance = boss ? 0.9 : 0.34;
    if (unlearned.length && Math.random() < abilityChance) {
      var aid = unlearned[ri(0, unlearned.length - 1)]; G.learn(aid); G.save();
      var a = G.getAbility(aid), isSp = G.isSpell(aid);
      return { kind: "ability", name: a.name, sub: (isSp ? "Spell — slot it under Equipment in Gear." : "Weapon skill — slot it on a matching weapon in Gear.") };
    }
    var pool = ["katana_blood", "bow_hunter", "pistol_ashen", "wand_ember", "wand_frost", "shield_oak", "tome_arcane",
      "helm_kv", "chest_kv", "legs_kv", "helm_sw", "chest_sw", "legs_sw", "ring_vigor", "ring_magi", "ring_fortune", "ring_titan",
      "tal_wrath", "tal_ruin", "tal_scholar", "tal_archive", "tal_titan", "tal_fortune"];
    if (Math.random() < (boss ? 0.85 : 0.62)) {
      var pid = pool[ri(0, pool.length - 1)], lvl = clamp(stage + ri(-1, 2) + Math.floor(luck / 12), 1, 99);
      G.addItem(pid, lvl); G.save(); var def = ITEMS[pid];
      return { kind: "item", name: def.name + " · Lv " + lvl, sub: (def.buff ? def.buff.desc : def.desc) + " — manage it in Gear." };
    }
    var souls = Math.round((40 + stage * 16) * (1 + luck * 0.03)); G.state.souls += souls; G.save();
    return { kind: "souls", name: souls + " Souls", sub: "Spend them on attributes or upgrades." };
  }

  function hideOverlays() { ["ov-result", "ov-chest", "ov-pause"].forEach(function (id) { document.getElementById(id).classList.remove("active"); }); }
  function showChest(reward, boss) {
    A.phase = "chest";
    var art = document.getElementById("chest-art"); art.width = 150; art.height = 150; G.drawChest(art, false);
    document.getElementById("chest-head").textContent = boss ? "The Boss Falls — Spoils Await" : "A Chest Appears";
    document.getElementById("reward-name").textContent = ""; document.getElementById("reward-sub").textContent = "";
    var btns = document.getElementById("chest-btns"); btns.innerHTML = '<button class="btn gold" id="chest-open">Open</button>';
    document.getElementById("ov-chest").classList.add("active");
    document.getElementById("chest-open").onclick = function () {
      G.drawChest(art, true);
      document.getElementById("reward-name").textContent = reward.name;
      document.getElementById("reward-sub").textContent = reward.sub;
      document.getElementById("chest-head").textContent = reward.kind === "ability" ? "Learned!" : "Acquired";
      btns.innerHTML = '<button class="btn gold" id="chest-cont">Continue</button>';
      document.getElementById("chest-cont").onclick = function () { document.getElementById("ov-chest").classList.remove("active"); if (boss) stageCleared(); else { A.breather = 0.4; A.phase = "fighting"; } };
    };
  }
  function stageCleared() {
    A.phase = "result"; var p = A.player; p.hp = p.maxHp; p.mana = p.maxMana;
    document.getElementById("ov-title").className = "cleared"; document.getElementById("ov-title").textContent = "Stage " + A.stage + " Cleared";
    document.getElementById("ov-sub").textContent = "You gathered " + A.runSouls + " souls this run. The foul grow stronger beyond.";
    var btns = document.getElementById("ov-btns"); btns.innerHTML = '<button class="btn gold" id="r-next">Next Stage ›</button><button class="btn ghost" id="r-menu">Return to Menu</button>';
    document.getElementById("ov-result").classList.add("active");
    document.getElementById("r-next").onclick = function () {
      document.getElementById("ov-result").classList.remove("active");
      A.stage = G.state.stage; A.waveIdx = 0; A.player = makePlayer(G.derived()); buildSpellButtons();
      A.enemies = []; A.pProj = []; A.eProj = []; A.hazards = []; A.effects = []; A.phase = "fighting"; startWave();
    };
    document.getElementById("r-menu").onclick = exitToMenu;
  }
  function onDeath() {
    A.phase = "result";
    document.getElementById("ov-title").className = "died"; document.getElementById("ov-title").textContent = "You Died";
    document.getElementById("ov-sub").textContent = "You fell on Stage " + A.stage + ", Wave " + Math.min(A.waveIdx + 1, 5) + ". Souls gathered are kept.";
    document.getElementById("ov-btns").innerHTML = '<button class="btn gold" id="r-menu2">Return to Menu</button>';
    document.getElementById("ov-result").classList.add("active"); document.getElementById("r-menu2").onclick = exitToMenu; G.save();
  }
  function togglePause(on) { if (!A) return; if (on && A.phase === "fighting") { A.phase = "paused"; document.getElementById("ov-pause").classList.add("active"); } else if (!on && A.phase === "paused") { A.phase = "fighting"; document.getElementById("ov-pause").classList.remove("active"); lastT = nowT(); } }
  function exitToMenu() { hideOverlays(); if (raf) cancelAnimationFrame(raf); raf = null; A = null; G.save(); G.UI.showScreen("home"); }

  // ---------- HUD ----------
  function updateHUD() {
    var p = A.player, circ = 301.6;
    document.getElementById("bar-hp").style.transform = "scaleX(" + clamp(p.hp / p.maxHp, 0, 1) + ")";
    document.getElementById("bar-mana").style.transform = "scaleX(" + clamp(p.mana / p.maxMana, 0, 1) + ")";
    document.getElementById("bar-stam").style.transform = "scaleX(" + clamp(p.stam / p.maxStam, 0, 1) + ")";
    document.getElementById("txt-hp").textContent = Math.ceil(p.hp) + " / " + p.maxHp;
    document.getElementById("txt-mana").textContent = Math.ceil(p.mana) + " / " + p.maxMana;
    document.getElementById("run-souls").textContent = A.runSouls;
    if (A.boss) document.getElementById("bar-boss").style.transform = "scaleX(" + clamp(A.boss.hp / A.boss.maxHp, 0, 1) + ")";
    var skBtn = document.getElementById("btn-skill");
    if (p.skill) { skBtn.style.display = "flex"; document.getElementById("skill-name").textContent = p.skill.name; setRing("cd-skill", p.skillCdMax ? p.skillCd / p.skillCdMax : 0, circ); skBtn.classList.toggle("disabled", p.skillCd > 0 || p.stam < p.skill.stam); }
    else skBtn.style.display = "none";
    setRing("cd-dodge", p.dodgeCdMax ? p.dodgeCd / p.dodgeCdMax : 0, circ);
    document.getElementById("btn-dodge").classList.toggle("disabled", p.dodgeCd > 0 || p.stam < G.STAM_DODGE);
    for (var i = 0; i < p.spells.length; i++) {
      if (!p.spells[i]) continue; var sp = SPELLS[p.spells[i]], btn = document.getElementById("spell-btn-" + i); if (!btn) continue;
      setRing("cd-spell-" + i, p.spellCdMax[i] ? p.spellCd[i] / p.spellCdMax[i] : 0, circ);
      btn.classList.toggle("disabled", p.spellCd[i] > 0 || p.mana < sp.mana || p.stam < sp.stam);
    }
  }
  function setRing(id, frac, circ) { var c = document.getElementById(id); if (c) c.style.strokeDashoffset = (circ * clamp(frac, 0, 1)).toFixed(1); }

  // ---------- render ----------
  function render() {
    ctx.clearRect(0, 0, VIEW.w, VIEW.h);
    var sx = (Math.random() - 0.5) * A.shake, sy = (Math.random() - 0.5) * A.shake;
    ctx.save(); ctx.translate(Math.round(-cam.x + VIEW.w / 2 + sx), Math.round(-cam.y + VIEW.h / 2 + sy));
    drawEnvironment(); drawHazards();
    var ents = A.enemies.slice(); if (A.boss) ents.push(A.boss); ents.push(A.player); ents.sort(function (a, b) { return a.y - b.y; });
    for (var i = 0; i < ents.length; i++) { var e = ents[i]; if (e === A.player) drawPlayer(e); else if (e === A.boss) G.drawBossTop(ctx, e); else G.drawEnemyTop(ctx, e); }
    drawProjectiles(); drawEffects(); drawParticles(); ctx.restore();
    drawVignette(); if (input.active && input.mag > 0) drawJoystick();
  }
  function drawEnvironment() {
    var g = ctx.createRadialGradient(WORLD.w / 2, WORLD.h / 2, 100, WORLD.w / 2, WORLD.h / 2, WORLD.w * 0.7);
    g.addColorStop(0, "#20211d"); g.addColorStop(1, "#101010"); ctx.fillStyle = g;
    roundRect(WORLD.margin - 40, WORLD.margin - 40, WORLD.w - 2 * (WORLD.margin - 40), WORLD.h - 2 * (WORLD.margin - 40), 60); ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,.35)"; ctx.lineWidth = 2; ctx.beginPath();
    for (var i = 0; i < CRACKS.length; i++) { var c = CRACKS[i]; ctx.moveTo(c[0], c[1]); ctx.lineTo(c[2], c[3]); } ctx.stroke();
    ctx.strokeStyle = "#07070a"; ctx.lineWidth = 46; roundRect(WORLD.margin - 40, WORLD.margin - 40, WORLD.w - 2 * (WORLD.margin - 40), WORLD.h - 2 * (WORLD.margin - 40), 60); ctx.stroke();
    ctx.strokeStyle = "#2b2820"; ctx.lineWidth = 4; roundRect(WORLD.margin - 20, WORLD.margin - 20, WORLD.w - 2 * (WORLD.margin - 20), WORLD.h - 2 * (WORLD.margin - 20), 46); ctx.stroke();
    for (i = 0; i < PILLARS.length; i++) drawPillar(PILLARS[i][0], PILLARS[i][1]);
    for (i = 0; i < TORCHES.length; i++) drawTorch(TORCHES[i][0], TORCHES[i][1]);
  }
  function drawPillar(x, y) { ctx.fillStyle = "rgba(0,0,0,.45)"; ctx.beginPath(); ctx.ellipse(x, y + 6, 30, 12, 0, 0, TAU); ctx.fill(); ctx.fillStyle = "#2a2620"; ctx.beginPath(); ctx.arc(x, y, 24, 0, TAU); ctx.fill(); ctx.fillStyle = "#38332a"; ctx.beginPath(); ctx.arc(x - 4, y - 4, 18, 0, TAU); ctx.fill(); ctx.strokeStyle = "#151009"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, 24, 0, TAU); ctx.stroke(); }
  function drawTorch(x, y) { var f = 0.7 + 0.3 * Math.sin(A.time * 8 + x); var g = ctx.createRadialGradient(x, y, 4, x, y, 90 * f); g.addColorStop(0, "rgba(240,170,70,.5)"); g.addColorStop(1, "rgba(240,170,70,0)"); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 90 * f, 0, TAU); ctx.fill(); ctx.fillStyle = "#ffcf7a"; ctx.beginPath(); ctx.arc(x, y, 5, 0, TAU); ctx.fill(); }
  function roundRect(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  function drawPlayer(p) { if (p.iframe > 0) ctx.globalAlpha = 0.55 + 0.45 * Math.sin(A.time * 40); G.drawHeroTop(ctx, p); ctx.globalAlpha = 1; }
  function drawHazards() {
    for (var i = 0; i < A.hazards.length; i++) { var h = A.hazards[i];
      if (h.t < h.warn) { var f = h.t / h.warn; ctx.strokeStyle = h.owner === "enemy" ? "rgba(200,60,50," + (0.4 + 0.4 * f) + ")" : "rgba(230,207,149,.6)"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(h.x, h.y, h.r * (0.5 + 0.5 * f), 0, TAU); ctx.stroke(); ctx.fillStyle = h.owner === "enemy" ? "rgba(200,60,50,.10)" : "rgba(230,207,149,.10)"; ctx.beginPath(); ctx.arc(h.x, h.y, h.r * (0.5 + 0.5 * f), 0, TAU); ctx.fill(); }
      else { var a = 1 - (h.t - h.warn) / h.dur; ctx.fillStyle = h.color || "#c98a3a"; ctx.globalAlpha = 0.3 * a + (h.kind === "field" ? 0.15 : 0); ctx.beginPath(); ctx.arc(h.x, h.y, h.r, 0, TAU); ctx.fill(); ctx.globalAlpha = a; ctx.strokeStyle = h.color || "#c98a3a"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(h.x, h.y, h.r, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1; } }
  }
  function drawProjectiles() { var i, pr; for (i = 0; i < A.pProj.length; i++) { pr = A.pProj[i]; if (pr.glow) { ctx.shadowColor = pr.color; ctx.shadowBlur = 12; } ctx.fillStyle = pr.color; ctx.beginPath(); ctx.arc(pr.x, pr.y, pr.r, 0, TAU); ctx.fill(); ctx.shadowBlur = 0; } for (i = 0; i < A.eProj.length; i++) { pr = A.eProj[i]; ctx.shadowColor = pr.color; ctx.shadowBlur = 8; ctx.fillStyle = pr.color; ctx.beginPath(); ctx.arc(pr.x, pr.y, pr.r, 0, TAU); ctx.fill(); ctx.shadowBlur = 0; } }
  function drawEffects() {
    for (var i = 0; i < A.effects.length; i++) { var ef = A.effects[i];
      if (ef.kind === "slash") { var f = ef.t / ef.dur; ctx.strokeStyle = ef.color; ctx.globalAlpha = (1 - f) * 0.9; ctx.lineWidth = 6; ctx.lineCap = "round"; ctx.beginPath(); ctx.arc(ef.x, ef.y, ef.range * 0.8, ef.a - ef.arc / 2, ef.a + ef.arc / 2); ctx.stroke(); ctx.globalAlpha = 1; ctx.lineCap = "butt"; }
      else if (ef.kind === "spin") { ctx.strokeStyle = "rgba(231,207,149," + (0.7 * (1 - ef.t / ef.dur)) + ")"; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(ef.x, ef.y, ef.r * (0.6 + 0.4 * (ef.t / ef.dur)), 0, TAU); ctx.stroke(); } }
  }
  function drawParticles() { for (var i = 0; i < A.particles.length; i++) { var pt = A.particles[i], a = clamp(pt.life / pt.max, 0, 1); if (pt.text) { ctx.globalAlpha = a; ctx.fillStyle = pt.color; ctx.font = "bold " + pt.size + "px Georgia,serif"; ctx.textAlign = "center"; ctx.fillText(pt.text, pt.x, pt.y); ctx.globalAlpha = 1; ctx.textAlign = "left"; } else { ctx.globalAlpha = a; ctx.fillStyle = pt.color; ctx.fillRect(pt.x - pt.size / 2, pt.y - pt.size / 2, pt.size, pt.size); ctx.globalAlpha = 1; } } }
  function drawVignette() { var g = ctx.createRadialGradient(VIEW.w / 2, VIEW.h / 2, VIEW.h * 0.35, VIEW.w / 2, VIEW.h / 2, VIEW.h * 0.75); g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(1, "rgba(0,0,0,.6)"); ctx.fillStyle = g; ctx.fillRect(0, 0, VIEW.w, VIEW.h); }
  function drawJoystick() { ctx.strokeStyle = "rgba(230,207,149,.35)"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(input.ox, input.oy, 66, 0, TAU); ctx.stroke(); ctx.fillStyle = "rgba(230,207,149,.25)"; ctx.beginPath(); ctx.arc(input.ox + input.dir.x * 66 * input.mag, input.oy + input.dir.y * 66 * input.mag, 26, 0, TAU); ctx.fill(); }
  function toast(m) { G.UI.toast(m); }

  var PILLARS = [[WORLD.w * 0.22, WORLD.h * 0.28], [WORLD.w * 0.78, WORLD.h * 0.28], [WORLD.w * 0.22, WORLD.h * 0.72], [WORLD.w * 0.78, WORLD.h * 0.72], [WORLD.w * 0.5, WORLD.h * 0.5]];
  var TORCHES = [[WORLD.margin + 10, WORLD.h * 0.35], [WORLD.w - WORLD.margin - 10, WORLD.h * 0.35], [WORLD.margin + 10, WORLD.h * 0.65], [WORLD.w - WORLD.margin - 10, WORLD.h * 0.65], [WORLD.w * 0.5, WORLD.margin + 10]];
  var CRACKS = [[WORLD.w * 0.3, WORLD.h * 0.4, WORLD.w * 0.45, WORLD.h * 0.55], [WORLD.w * 0.6, WORLD.h * 0.3, WORLD.w * 0.7, WORLD.h * 0.5], [WORLD.w * 0.4, WORLD.h * 0.7, WORLD.w * 0.55, WORLD.h * 0.62], [WORLD.w * 0.5, WORLD.h * 0.5, WORLD.w * 0.6, WORLD.h * 0.68]];

})(window);
