/* ============================================================
   Fall of the Foul — ART (procedural, no image assets)
   ============================================================ */
(function (G) {
  "use strict";
  var ITEMS = G.ITEMS;
  var TAU = Math.PI * 2;

  function shade(ctx, x, y, r, c1, c2) {
    var g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.4, r * 0.2, x, y, r);
    g.addColorStop(0, c1); g.addColorStop(1, c2); return g;
  }
  function darken(hex, f) {
    var c = parseInt(hex.slice(1), 16);
    var r = (c >> 16) & 255, g = (c >> 8) & 255, b = c & 255;
    r = Math.round(r * f); g = Math.round(g * f); b = Math.round(b * f);
    return "rgb(" + r + "," + g + "," + b + ")";
  }
  function lighten(hex, f) {
    var c = parseInt(hex.slice(1), 16);
    var r = (c >> 16) & 255, g = (c >> 8) & 255, b = c & 255;
    r = Math.min(255, Math.round(r + (255 - r) * f));
    g = Math.min(255, Math.round(g + (255 - g) * f));
    b = Math.min(255, Math.round(b + (255 - b) * f));
    return "rgb(" + r + "," + g + "," + b + ")";
  }
  G.darken = darken; G.lighten = lighten;

  function eqColor(slot, fb) { var it = G.getEquipped(slot); return it ? ITEMS[it.id].color : fb; }

  // ------------------------------------------------------------
  // HOME PORTRAIT (front-facing hero, reflects class + gear)
  // ------------------------------------------------------------
  G.drawPortrait = function (canvas) {
    var ctx = canvas.getContext("2d");
    var W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);
    var cx = W / 2, cy = H * 0.52, s = W / 360; // scale factor
    var cls = G.state.cls;
    var helmC = eqColor("helmet", "#6b6257");
    var chestC = eqColor("chest", "#6b6257");
    var legsC = eqColor("legs", "#5a5348");
    var rw = G.getEquipped("right"), lw = G.getEquipped("left");
    var wpnC = rw ? ITEMS[rw.id].color : "#c8b89a";
    var wpnType = rw ? ITEMS[rw.id].type : "melee";

    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(s, s);

    // ground shadow
    ctx.fillStyle = "rgba(0,0,0,.45)";
    ctx.beginPath(); ctx.ellipse(0, 150, 78, 20, 0, 0, TAU); ctx.fill();

    // ---- offhand behind (shield / tome) for melee/mage
    if (lw) {
      var lc = ITEMS[lw.id].color;
      ctx.save(); ctx.translate(-58, 34);
      if (ITEMS[lw.id].type === "shield") {
        ctx.fillStyle = shade(ctx, -6, -10, 42, lighten(lc, .25), darken(lc, .5));
        ctx.strokeStyle = "#2a2118"; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(0, -40); ctx.lineTo(28, -24); ctx.lineTo(28, 22); ctx.lineTo(0, 44); ctx.lineTo(-28, 22); ctx.lineTo(-28, -24); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle = "#c8a862"; ctx.beginPath(); ctx.arc(0, 2, 6, 0, TAU); ctx.fill();
      } else {
        ctx.fillStyle = darken(lc, .8); ctx.fillRect(-20, -26, 40, 52);
        ctx.fillStyle = lighten(lc, .3); ctx.fillRect(-20, -26, 8, 52);
      }
      ctx.restore();
    }

    // ---- legs
    ctx.fillStyle = shade(ctx, 0, 90, 40, lighten(legsC, .18), darken(legsC, .55));
    roundLimb(ctx, -20, 60, 16, 78);
    roundLimb(ctx, 20, 60, 16, 78);
    ctx.fillStyle = "#241d16";
    roundLimb(ctx, -20, 128, 18, 18); roundLimb(ctx, 20, 128, 18, 18); // boots

    // ---- cape (melee only) behind torso
    if (cls === "melee") {
      ctx.fillStyle = "rgba(120,25,25,.9)";
      ctx.beginPath(); ctx.moveTo(-34, -30); ctx.quadraticCurveTo(-58, 60, -30, 120);
      ctx.lineTo(30, 120); ctx.quadraticCurveTo(58, 60, 34, -30); ctx.closePath();
      ctx.globalAlpha = .5; ctx.fill(); ctx.globalAlpha = 1;
    }

    // ---- torso (chest armor)
    ctx.fillStyle = shade(ctx, 0, -6, 56, lighten(chestC, .22), darken(chestC, .5));
    ctx.strokeStyle = "#241d16"; ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-40, -34); ctx.quadraticCurveTo(-46, 30, -30, 66);
    ctx.lineTo(30, 66); ctx.quadraticCurveTo(46, 30, 40, -34);
    ctx.quadraticCurveTo(0, -52, -40, -34); ctx.closePath(); ctx.fill(); ctx.stroke();
    // chest emblem
    ctx.fillStyle = "rgba(200,168,98,.5)";
    ctx.beginPath(); ctx.moveTo(0, -18); ctx.lineTo(10, 6); ctx.lineTo(0, 24); ctx.lineTo(-10, 6); ctx.closePath(); ctx.fill();

    // robe skirt for mage
    if (cls === "mage") {
      ctx.fillStyle = shade(ctx, 0, 96, 60, lighten(chestC, .1), darken(chestC, .6));
      ctx.beginPath(); ctx.moveTo(-30, 56); ctx.lineTo(-46, 132); ctx.lineTo(46, 132); ctx.lineTo(30, 56); ctx.closePath(); ctx.fill();
    }

    // ---- arms
    ctx.fillStyle = shade(ctx, 0, 0, 30, lighten(chestC, .12), darken(chestC, .6));
    roundLimb(ctx, -48, -20, 14, 70);
    roundLimb(ctx, 48, -20, 14, 70);
    ctx.fillStyle = "#2a231b"; // gloves
    roundLimb(ctx, -48, 44, 15, 16); roundLimb(ctx, 48, 44, 15, 16);

    // ---- head / helm
    ctx.save(); ctx.translate(0, -62);
    if (cls === "mage" || cls === "ranged") {
      // hood
      ctx.fillStyle = shade(ctx, 0, 0, 34, lighten(helmC, .2), darken(helmC, .55));
      ctx.beginPath(); ctx.moveTo(-30, 20); ctx.quadraticCurveTo(-34, -34, 0, -36);
      ctx.quadraticCurveTo(34, -34, 30, 20); ctx.closePath(); ctx.fill();
      // face shadow
      ctx.fillStyle = "#0c0a08"; ctx.beginPath(); ctx.ellipse(0, 2, 17, 20, 0, 0, TAU); ctx.fill();
      // eyes
      ctx.fillStyle = (cls === "mage") ? "#7fc7e6" : "#d9c37a";
      ctx.beginPath(); ctx.arc(-7, 2, 2.6, 0, TAU); ctx.arc(7, 2, 2.6, 0, TAU); ctx.fill();
    } else {
      // knight helm
      ctx.fillStyle = shade(ctx, 0, 0, 30, lighten(helmC, .3), darken(helmC, .5));
      ctx.strokeStyle = "#201a13"; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(0, 0, 26, Math.PI, TAU); ctx.lineTo(24, 20);
      ctx.quadraticCurveTo(0, 30, -24, 20); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = "#100c08"; ctx.lineWidth = 4; // visor slit
      ctx.beginPath(); ctx.moveTo(-16, 6); ctx.lineTo(16, 6); ctx.stroke();
      ctx.strokeStyle = "#c8a862"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(0, -24); ctx.lineTo(0, 12); ctx.stroke();
    }
    ctx.restore();

    // ---- weapon in right hand (drawn in front)
    ctx.save(); ctx.translate(52, 26);
    drawPortraitWeapon(ctx, wpnType, wpnC);
    ctx.restore();

    ctx.restore();
  };

  function roundLimb(ctx, x, y, w, h) {
    ctx.beginPath();
    var r = w;
    ctx.moveTo(x - w, y); ctx.lineTo(x - w, y + h - r);
    ctx.quadraticCurveTo(x - w, y + h, x, y + h);
    ctx.quadraticCurveTo(x + w, y + h, x + w, y + h - r);
    ctx.lineTo(x + w, y); ctx.quadraticCurveTo(x, y - r * 0.6, x - w, y); ctx.closePath(); ctx.fill();
  }

  function drawPortraitWeapon(ctx, type, c) {
    if (type === "melee") {
      ctx.strokeStyle = "#3a2f22"; ctx.lineWidth = 6; // handle
      ctx.beginPath(); ctx.moveTo(0, 30); ctx.lineTo(0, 14); ctx.stroke();
      ctx.strokeStyle = "#8a6d33"; ctx.lineWidth = 8;   // guard
      ctx.beginPath(); ctx.moveTo(-12, 14); ctx.lineTo(12, 14); ctx.stroke();
      var g = ctx.createLinearGradient(-6, -80, 6, 14);
      g.addColorStop(0, lighten(c, .5)); g.addColorStop(.5, c); g.addColorStop(1, darken(c, .6));
      ctx.fillStyle = g; ctx.beginPath();
      ctx.moveTo(-6, 12); ctx.lineTo(6, 12); ctx.lineTo(6, -70); ctx.lineTo(0, -84); ctx.lineTo(-6, -70); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,.35)"; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(0, -78); ctx.lineTo(0, 10); ctx.stroke();
    } else if (type === "ranged") {
      ctx.strokeStyle = c; ctx.lineWidth = 6; ctx.lineCap = "round";
      ctx.beginPath(); ctx.arc(0, -20, 52, -1.15, 1.15); ctx.stroke();
      ctx.strokeStyle = "#e9e2cf"; ctx.lineWidth = 1.5; // string
      var y1 = -20 + Math.sin(-1.15) * 52, y2 = -20 + Math.sin(1.15) * 52, x1 = Math.cos(-1.15) * 52, x2 = Math.cos(1.15) * 52;
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      ctx.strokeStyle = "#8a6d33"; ctx.lineWidth = 3; // arrow
      ctx.beginPath(); ctx.moveTo(x1 * 0.1 - 40, -20); ctx.lineTo(30, -20); ctx.stroke();
      ctx.lineCap = "butt";
    } else { // magic wand
      ctx.strokeStyle = "#3a2f22"; ctx.lineWidth = 6; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(0, 34); ctx.lineTo(-6, -54); ctx.stroke();
      ctx.fillStyle = c; ctx.shadowColor = c; ctx.shadowBlur = 20;
      ctx.beginPath(); ctx.arc(-8, -60, 11, 0, TAU); ctx.fill();
      ctx.shadowBlur = 0; ctx.fillStyle = lighten(c, .5);
      ctx.beginPath(); ctx.arc(-11, -63, 4, 0, TAU); ctx.fill();
      ctx.lineCap = "butt";
    }
  }

  // ------------------------------------------------------------
  // TOP-DOWN humanoid (player + enemies share this)
  // ------------------------------------------------------------
  function humanoidTop(ctx, x, y, r, facing, body, accent, opts) {
    opts = opts || {};
    ctx.save(); ctx.translate(x, y); ctx.rotate(facing);
    // shadow
    ctx.fillStyle = "rgba(0,0,0,.4)"; ctx.beginPath(); ctx.ellipse(0, r * 0.5, r * 1.05, r * 0.55, 0, 0, TAU); ctx.fill();
    // legs bob
    var bob = opts.walk ? Math.sin(opts.walk) * r * 0.35 : 0;
    ctx.fillStyle = darken(body, .5);
    ctx.beginPath(); ctx.arc(-r * 0.4, bob, r * 0.34, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(r * 0.4, -bob, r * 0.34, 0, TAU); ctx.fill();
    // body
    ctx.fillStyle = shade(ctx, 0, 0, r, lighten(body, .2), darken(body, .45));
    ctx.strokeStyle = "rgba(0,0,0,.5)"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill(); ctx.stroke();
    // shoulders
    ctx.fillStyle = darken(body, .75);
    ctx.beginPath(); ctx.arc(0, -r * 0.7, r * 0.42, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(0, r * 0.7, r * 0.42, 0, TAU); ctx.fill();
    // head toward facing
    ctx.fillStyle = shade(ctx, r * 0.4, 0, r * 0.5, lighten(accent, .25), darken(accent, .4));
    ctx.beginPath(); ctx.arc(r * 0.42, 0, r * 0.42, 0, TAU); ctx.fill();
    // facing nub / weapon
    if (opts.weapon) { opts.weapon(ctx, r); }
    ctx.restore();
  }
  G.humanoidTop = humanoidTop;

  G.drawHeroTop = function (ctx, p) {
    var cls = G.state.cls;
    var body = eqColor("chest", "#6b6257");
    var accent = eqColor("helmet", "#8a8f9a");
    var rw = G.getEquipped("right");
    var wpnC = rw ? ITEMS[rw.id].color : "#c8b89a";
    var wpnType = rw ? ITEMS[rw.id].type : "melee";
    var swing = p.swingT || 0;
    humanoidTop(ctx, p.x, p.y, p.r, p.facing, body, accent, {
      walk: p.walkPhase,
      weapon: function (ctx, r) {
        ctx.save();
        if (swing > 0) ctx.rotate((1 - swing) * 1.6 - 0.8);
        if (wpnType === "melee") {
          var g = ctx.createLinearGradient(r * 0.6, 0, r * 1.9, 0);
          g.addColorStop(0, lighten(wpnC, .4)); g.addColorStop(1, darken(wpnC, .5));
          ctx.strokeStyle = g; ctx.lineWidth = 5; ctx.lineCap = "round";
          ctx.beginPath(); ctx.moveTo(r * 0.6, r * 0.2); ctx.lineTo(r * 1.9, r * 0.2); ctx.stroke();
          ctx.lineCap = "butt";
        } else if (wpnType === "ranged") {
          ctx.strokeStyle = wpnC; ctx.lineWidth = 4; ctx.lineCap = "round";
          ctx.beginPath(); ctx.arc(r * 0.9, 0, r * 0.7, -1, 1); ctx.stroke(); ctx.lineCap = "butt";
        } else {
          ctx.strokeStyle = "#3a2f22"; ctx.lineWidth = 4;
          ctx.beginPath(); ctx.moveTo(r * 0.5, r * 0.2); ctx.lineTo(r * 1.5, r * 0.2); ctx.stroke();
          ctx.fillStyle = wpnC; ctx.shadowColor = wpnC; ctx.shadowBlur = 10;
          ctx.beginPath(); ctx.arc(r * 1.6, r * 0.2, r * 0.28, 0, TAU); ctx.fill(); ctx.shadowBlur = 0;
        }
        ctx.restore();
      }
    });
    // class aura
    if (cls === "mage") ringGlow(ctx, p.x, p.y, p.r * 1.6, "rgba(127,199,230,.10)");
  };

  function ringGlow(ctx, x, y, r, c) {
    var g = ctx.createRadialGradient(x, y, r * 0.4, x, y, r);
    g.addColorStop(0, c); g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
  }
  G.ringGlow = ringGlow;

  // ------------------------------------------------------------
  // ENEMIES top-down
  // ------------------------------------------------------------
  G.drawEnemyTop = function (ctx, e) {
    var def = G.ENEMIES[e.type];
    var rank = G.RANKS[e.rank];
    var body = def.color;
    var telegraph = e.windT > 0 ? 1 : 0;
    if (telegraph) body = G.lighten(def.color, 0.35 + 0.3 * Math.sin(Date.now() / 60));

    humanoidTop(ctx, e.x, e.y, e.r, e.facing, body, G.darken(def.color, .8), {
      walk: e.walkPhase,
      weapon: function (ctx, r) {
        if (def.role === "melee" || def.role === "heavy") {
          ctx.strokeStyle = G.lighten(body, .3); ctx.lineWidth = Math.max(3, r * 0.22); ctx.lineCap = "round";
          var reach = (def.role === "heavy") ? r * 1.4 : r * 1.7;
          if (e.windT > 0) reach *= 1.15;
          ctx.beginPath(); ctx.moveTo(r * 0.5, r * 0.2); ctx.lineTo(reach, r * 0.2); ctx.stroke(); ctx.lineCap = "butt";
        } else {
          ctx.strokeStyle = G.lighten(body, .3); ctx.lineWidth = 3;
          ctx.beginPath(); ctx.arc(r * 0.8, 0, r * 0.6, -0.9, 0.9); ctx.stroke();
        }
      }
    });
    // rank ring
    ctx.strokeStyle = rank.ring; ctx.lineWidth = 2; ctx.globalAlpha = 0.9;
    ctx.beginPath(); ctx.arc(e.x, e.y, e.r + 4, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1;
    // rank pips
    for (var i = 0; i < e.rank; i++) {
      ctx.fillStyle = rank.ring;
      ctx.beginPath(); ctx.arc(e.x - (e.rank - 1) * 4 + i * 8, e.y - e.r - 12, 2.6, 0, TAU); ctx.fill();
    }
    // hp bar
    if (e.hp < e.maxHp) {
      var w = e.r * 2.2, hx = e.x - w / 2, hy = e.y - e.r - 8;
      ctx.fillStyle = "rgba(0,0,0,.6)"; ctx.fillRect(hx, hy, w, 4);
      ctx.fillStyle = "#c0392b"; ctx.fillRect(hx, hy, w * (e.hp / e.maxHp), 4);
    }
  };

  // ------------------------------------------------------------
  // BOSS top-down (distinct silhouettes)
  // ------------------------------------------------------------
  G.drawBossTop = function (ctx, b) {
    var r = b.r, x = b.x, y = b.y;
    ctx.fillStyle = "rgba(0,0,0,.5)"; ctx.beginPath(); ctx.ellipse(x, y + r * 0.5, r * 1.15, r * 0.6, 0, 0, TAU); ctx.fill();
    var flash = b.hitT > 0 ? G.lighten(b.color, .5) : b.color;
    ctx.save(); ctx.translate(x, y); ctx.rotate(b.facing);
    ctx.fillStyle = shade(ctx, 0, 0, r, G.lighten(flash, .2), G.darken(flash, .5));
    ctx.strokeStyle = "rgba(0,0,0,.6)"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill(); ctx.stroke();

    if (b.id === "godrik" || b.id === "grafted") {
      // pauldrons + huge blade
      ctx.fillStyle = G.darken(flash, .7);
      ctx.beginPath(); ctx.arc(0, -r * 0.8, r * 0.5, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(0, r * 0.8, r * 0.5, 0, TAU); ctx.fill();
      ctx.strokeStyle = "#cfd4da"; ctx.lineWidth = r * 0.28; ctx.lineCap = "round";
      var reach = r * (b.windT > 0 ? 2.4 : 2.0);
      ctx.beginPath(); ctx.moveTo(r * 0.6, r * 0.3); ctx.lineTo(reach, r * 0.3); ctx.stroke(); ctx.lineCap = "butt";
    } else if (b.id === "malenketh") {
      ctx.strokeStyle = "#e0d28a"; ctx.lineWidth = r * 0.16; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(r * 0.4, -r * 0.2); ctx.lineTo(r * 2.1, -r * 0.4); ctx.stroke();
      ctx.strokeStyle = "rgba(150,200,80,.5)";
      ctx.beginPath(); ctx.moveTo(r * 0.4, r * 0.2); ctx.lineTo(r * 2.0, r * 0.5); ctx.stroke(); ctx.lineCap = "butt";
    } else if (b.id === "radaghast") {
      ctx.fillStyle = "rgba(138,127,214,.35)"; ctx.shadowColor = "#8a7fd6"; ctx.shadowBlur = 24;
      ctx.beginPath(); ctx.arc(r * 0.9, 0, r * 0.4, 0, TAU); ctx.fill(); ctx.shadowBlur = 0;
      for (var i = 0; i < 4; i++) { var a = i / 4 * TAU + Date.now() / 800; ctx.fillStyle = "#c9c0f5"; ctx.beginPath(); ctx.arc(Math.cos(a) * r * 1.3, Math.sin(a) * r * 1.3, 3, 0, TAU); ctx.fill(); }
    } else { // mohgwyn
      ctx.strokeStyle = "#e05a6a"; ctx.lineWidth = r * 0.18; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(r * 0.5, 0); ctx.lineTo(r * 2.1, 0); ctx.stroke(); ctx.lineCap = "butt";
      ctx.fillStyle = "rgba(160,48,64,.3)"; ctx.beginPath(); ctx.arc(0, 0, r * 1.3, 0, TAU); ctx.fill();
    }
    // crown/eyes
    ctx.fillStyle = "#e7cf95"; ctx.beginPath(); ctx.arc(r * 0.5, -r * 0.18, 3.4, 0, TAU); ctx.arc(r * 0.5, r * 0.18, 3.4, 0, TAU); ctx.fill();
    ctx.restore();

    // enrage aura when low
    if (b.hp / b.maxHp < 0.35) ringGlow(ctx, x, y, r * 2, "rgba(192,57,43,.18)");
  };

  // ------------------------------------------------------------
  // ITEM ICONS (data URLs, cached)
  // ------------------------------------------------------------
  G._iconCache = {};
  G.itemIconURL = function (id) {
    if (G._iconCache[id]) return G._iconCache[id];
    var def = ITEMS[id]; if (!def) return "";
    var c = document.createElement("canvas"); c.width = 44; c.height = 44;
    var ctx = c.getContext("2d");
    ctx.fillStyle = "#0d0b09"; ctx.fillRect(0, 0, 44, 44);
    var col = def.color || "#c8b89a";
    ctx.save(); ctx.translate(22, 22);
    if (def.slot === "weapon" && def.type === "melee") {
      ctx.strokeStyle = "#8a6d33"; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(-8, 8); ctx.lineTo(8, -8); ctx.stroke();
      ctx.strokeStyle = col; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(-2, 14); ctx.lineTo(14, -14); ctx.stroke();
      ctx.strokeStyle = "#8a6d33"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-10, 2); ctx.lineTo(-2, 10); ctx.stroke();
    } else if (def.slot === "weapon" && def.type === "ranged") {
      ctx.strokeStyle = col; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(-2, 0, 13, -1.1, 1.1); ctx.stroke();
      ctx.strokeStyle = "#e9e2cf"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(3, -11); ctx.lineTo(3, 11); ctx.stroke();
      ctx.strokeStyle = "#8a6d33"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-12, 0); ctx.lineTo(14, 0); ctx.stroke();
    } else if (def.slot === "weapon" && def.type === "magic") {
      ctx.strokeStyle = "#3a2f22"; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(-10, 12); ctx.lineTo(6, -8); ctx.stroke();
      ctx.fillStyle = col; ctx.shadowColor = col; ctx.shadowBlur = 10; ctx.beginPath(); ctx.arc(8, -11, 7, 0, TAU); ctx.fill(); ctx.shadowBlur = 0;
    } else if (def.type === "shield") {
      ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(0, -14); ctx.lineTo(13, -7); ctx.lineTo(13, 8); ctx.lineTo(0, 16); ctx.lineTo(-13, 8); ctx.lineTo(-13, -7); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#c8a862"; ctx.beginPath(); ctx.arc(0, 0, 3.5, 0, TAU); ctx.fill();
    } else if (def.type === "ring") {
      ctx.strokeStyle = "#c8a862"; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(0, 3, 9, 0, TAU); ctx.stroke();
      ctx.fillStyle = col; ctx.shadowColor = col; ctx.shadowBlur = 8; ctx.beginPath(); ctx.arc(0, -8, 5, 0, TAU); ctx.fill(); ctx.shadowBlur = 0;
    } else if (def.slot === "helmet") {
      ctx.fillStyle = col; ctx.beginPath(); ctx.arc(0, -2, 12, Math.PI, TAU); ctx.lineTo(11, 10); ctx.quadraticCurveTo(0, 16, -11, 10); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = "#100c08"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-7, 2); ctx.lineTo(7, 2); ctx.stroke();
    } else if (def.slot === "chest") {
      ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(-13, -12); ctx.quadraticCurveTo(0, -18, 13, -12); ctx.lineTo(10, 15); ctx.lineTo(-10, 15); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "rgba(200,168,98,.4)"; ctx.beginPath(); ctx.moveTo(0, -6); ctx.lineTo(6, 4); ctx.lineTo(0, 12); ctx.lineTo(-6, 4); ctx.closePath(); ctx.fill();
    } else { // legs
      ctx.fillStyle = col; ctx.fillRect(-11, -13, 8, 26); ctx.fillRect(3, -13, 8, 26);
    }
    ctx.restore();
    // frame
    ctx.strokeStyle = "#3a3226"; ctx.lineWidth = 2; ctx.strokeRect(1, 1, 42, 42);
    var url = c.toDataURL();
    G._iconCache[id] = url; return url;
  };

  // ------------------------------------------------------------
  // CHEST
  // ------------------------------------------------------------
  G.drawChest = function (canvas, open) {
    var ctx = canvas.getContext("2d"); var W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);
    var cx = W / 2, cy = H * 0.62, s = W / 150;
    ctx.save(); ctx.translate(cx, cy); ctx.scale(s, s);
    ctx.fillStyle = "rgba(0,0,0,.4)"; ctx.beginPath(); ctx.ellipse(0, 44, 52, 12, 0, 0, TAU); ctx.fill();
    // glow
    if (open) { var g = ctx.createRadialGradient(0, -6, 6, 0, -6, 70); g.addColorStop(0, "rgba(233,207,149,.9)"); g.addColorStop(1, "rgba(233,207,149,0)"); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, -6, 70, 0, TAU); ctx.fill(); }
    // base
    ctx.fillStyle = "#5a3f22"; ctx.strokeStyle = "#2a1c10"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.rect(-46, -4, 92, 46); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = "#c8a862"; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(0, -4); ctx.lineTo(0, 42); ctx.stroke();
    ctx.strokeRect(-46, -4, 92, 46);
    // lid
    ctx.save(); ctx.translate(0, -4);
    if (open) ctx.rotate(-0.6);
    ctx.fillStyle = "#6b4a28"; ctx.strokeStyle = "#2a1c10"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(-46, 0); ctx.lineTo(-46, -18); ctx.quadraticCurveTo(0, -40, 46, -18); ctx.lineTo(46, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = "#c8a862"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-46, -8); ctx.quadraticCurveTo(0, -30, 46, -8); ctx.stroke();
    ctx.restore();
    // lock
    ctx.fillStyle = "#c8a862"; ctx.fillRect(-7, 2, 14, 12);
    ctx.restore();
  };

})(window);
