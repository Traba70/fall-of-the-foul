/* ============================================================
   Fall of the Foul — UI (menus, gear, level-up, overlays)
   ============================================================ */
(function (G) {
  "use strict";
  var ITEMS = G.ITEMS, SETS = G.SETS, SKILLS = G.SKILLS, STATS = G.STATS,
      STAT_NAME = G.STAT_NAME, STAT_DESC = G.STAT_DESC,
      CLASS_NAME = G.CLASS_NAME, CLASS_WEAPON = G.CLASS_WEAPON;

  function el(id) { return document.getElementById(id); }
  var SLOT_NAME = { right:"Right Hand", left:"Left Hand", ring:"Ring", helmet:"Helmet", chest:"Chestplate", legs:"Leggings" };
  var UI = { _slot: "right" };
  G.UI = UI;

  UI.showScreen = function (name) {
    var scr = document.querySelectorAll(".screen");
    for (var i = 0; i < scr.length; i++) scr[i].classList.remove("active");
    el("s-" + name).classList.add("active");
    if (name === "home") UI.renderHome();
    else if (name === "gear") UI.renderGear();
    else if (name === "levelup") UI.renderLevelUp();
  };

  var toastT = null;
  UI.toast = function (msg) {
    var t = el("toast"); t.textContent = msg; t.classList.add("show");
    if (toastT) clearTimeout(toastT);
    toastT = setTimeout(function () { t.classList.remove("show"); }, 1600);
  };

  // ---------------- HOME ----------------
  UI.renderHome = function () {
    el("home-level").textContent = G.state.level;
    el("home-stage").textContent = G.state.stage;
    el("home-souls").textContent = G.state.souls;
    el("home-class").textContent = CLASS_NAME[G.state.cls];
    var c = el("portrait");
    // fit to CSS box with DPR
    var box = c.getBoundingClientRect();
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    c.width = Math.max(200, Math.round(box.width * dpr));
    c.height = c.width;
    G.drawPortrait(c);
  };

  // ---------------- GEAR ----------------
  UI.renderGear = function () {
    var d = G.derived();
    var s = G.state;
    var html = "";

    // class
    html += '<div class="card"><div class="card-title">Class</div><div class="seg" id="cls-seg">';
    G.CLASSES.forEach(function (cl) {
      html += '<div class="opt ' + (s.cls === cl ? "sel" : "") + '" data-cls="' + cl + '">' + CLASS_NAME[cl] + "</div>";
    });
    html += "</div><div class=\"buffline\">Weapons match your class for full power; off-class weapons deal reduced damage.</div></div>";

    // slots
    html += '<div class="card"><div class="card-title">Equipment</div><div class="slots">';
    ["right", "left", "ring", "helmet", "chest", "legs"].forEach(function (slot) {
      var inst = G.getEquipped(slot);
      var sel = UI._slot === slot ? "style=\"border-color:var(--gold)\"" : "";
      if (inst) {
        var def = ITEMS[inst.id];
        html += '<div class="slot" data-slot="' + slot + '" ' + sel + '>' +
          '<div class="icn" style="background-image:url(' + G.itemIconURL(inst.id) + ');background-size:cover"></div>' +
          '<div class="meta"><div class="nm">' + def.name + '</div><div class="sub">' + SLOT_NAME[slot] + '</div><div class="lv">Lv ' + inst.level + '</div></div></div>';
      } else {
        html += '<div class="slot empty" data-slot="' + slot + '" ' + sel + '>' +
          '<div class="icn"></div><div class="meta"><div class="nm">— Empty —</div><div class="sub">' + SLOT_NAME[slot] + '</div></div></div>';
      }
    });
    html += "</div></div>";

    // stats
    html += '<div class="card"><div class="card-title">Attributes</div><div class="statgrid">';
    STATS.forEach(function (st) {
      html += '<div class="statrow"><span class="k">' + STAT_NAME[st] + '</span><span class="v">' + Math.floor(d[st]) + "</span></div>";
    });
    html += "</div>";
    html += '<div class="statgrid" style="margin-top:8px">' +
      '<div class="statrow"><span class="k">Max HP</span><span class="v">' + d.maxHp + "</span></div>" +
      '<div class="statrow"><span class="k">Max Mana</span><span class="v">' + d.maxMana + "</span></div>" +
      '<div class="statrow"><span class="k">Crit</span><span class="v">' + Math.round(d.critChance * 100) + "%</span></div>" +
      '<div class="statrow"><span class="k">Dmg Taken</span><span class="v">' + Math.round(d.dmgTakenMult * 100) + "%</span></div>" +
      "</div>";
    // set bonuses
    for (var sid in SETS) if (SETS.hasOwnProperty(sid)) {
      var active = d.sets.indexOf(sid) >= 0;
      html += '<div class="setline ' + (active ? "active" : "") + '">' + (active ? "◆ " : "◇ ") + SETS[sid].name + " Set — " + SETS[sid].bonusDesc + (active ? " (active)" : "") + "</div>";
    }
    // active buffs
    var eqs = G.getAllEquipped();
    if (eqs.length) {
      html += '<div style="margin-top:8px">';
      eqs.forEach(function (inst) { var b = ITEMS[inst.id].buff; if (b) html += '<div class="buffline"><b>' + ITEMS[inst.id].name + ":</b> " + b.desc + "</div>"; });
      html += "</div>";
    }
    html += "</div>";

    // manage selected slot
    html += UI._manageCard();

    // full inventory
    html += '<div class="card"><div class="card-title">Inventory & Upgrades</div><div class="inv" id="inv-list">';
    s.inv.forEach(function (inst) {
      var def = ITEMS[inst.id];
      var equipped = false, slots = ["right", "left", "ring", "helmet", "chest", "legs"];
      for (var k = 0; k < slots.length; k++) if (s.eq[slots[k]] === inst.uid) equipped = true;
      var typeTag = (def.slot === "weapon") ? '<span class="tag ' + def.type + '">' + def.type + "</span>" : "";
      var cost = G.equipUpgradeCost(inst);
      html += '<div class="inv-item ' + (equipped ? "equipped" : "") + '">' +
        '<div class="icn" style="width:38px;height:38px;flex:none;border-radius:7px;background:#0d0b09 url(' + G.itemIconURL(inst.id) + ') center/cover;border:1px solid var(--edge)"></div>' +
        '<div class="grow"><div class="nm">' + def.name + " " + typeTag + (equipped ? ' <span class="tag on">equipped</span>' : "") + '</div>' +
        '<div class="sub">Lv ' + inst.level + (def.buff ? " · " + def.buff.desc : "") + "</div></div>" +
        (inst.level < 99 ? '<button class="btn" style="padding:8px 10px;font-size:12px" data-up="' + inst.uid + '">▲ ' + cost + "◈</button>" : '<span class="tag">MAX</span>') +
        "</div>";
    });
    html += "</div></div>";

    el("gear-body").innerHTML = html;
    UI._bindGear();
  };

  UI._manageCard = function () {
    var slot = UI._slot;
    var inst = G.getEquipped(slot);
    var s = G.state;
    var html = '<div class="card"><div class="card-title">' + SLOT_NAME[slot] + "</div>";

    if (inst) {
      var def = ITEMS[inst.id];
      html += '<div class="inv-item equipped"><div class="icn" style="width:38px;height:38px;flex:none;border-radius:7px;background:#0d0b09 url(' + G.itemIconURL(inst.id) + ') center/cover;border:1px solid var(--edge)"></div>' +
        '<div class="grow"><div class="nm">' + def.name + '</div><div class="sub">Lv ' + inst.level + (def.buff ? " · " + def.buff.desc : "") + '</div></div>' +
        '<button class="btn ghost" style="padding:8px 10px;font-size:12px" data-unequip="' + slot + '">Unequip</button></div>';

      // skill chooser for weapons
      if (def.slot === "weapon" && def.skills && def.skills.length) {
        html += '<div class="card-title" style="margin-top:12px">Skill / Spell</div><div class="seg" id="skill-seg">';
        def.skills.forEach(function (sk) {
          var learned = s.skills.indexOf(sk) >= 0;
          var on = inst.activeSkill === sk;
          var name = SKILLS[sk] ? SKILLS[sk].name : sk;
          html += '<div class="opt ' + (on ? "sel" : "") + '" data-skill="' + sk + '" style="' + (learned ? "" : "opacity:.4") + '">' + name + (learned ? "" : " 🔒") + "</div>";
        });
        html += "</div>";
        if (inst.activeSkill && SKILLS[inst.activeSkill]) {
          var sd = SKILLS[inst.activeSkill];
          html += '<div class="buffline" style="margin-top:6px">' + sd.desc + ' — CD ' + sd.cd + "s" + (sd.mana ? ", " + sd.mana + " MP" : "") + "</div>";
        }
      }
    } else {
      html += '<div class="buffline">Nothing equipped. Choose an item below.</div>';
    }

    // equip options
    var opts = s.inv.filter(function (it) {
      if (!G.itemFitsSlot(it.id, slot)) return false;
      return s.eq[slot] !== it.uid;
    });
    if (opts.length) {
      html += '<div class="card-title" style="margin-top:12px">Equip in ' + SLOT_NAME[slot] + "</div>";
      opts.forEach(function (it) {
        var def2 = ITEMS[it.id];
        var typeTag = (def2.slot === "weapon") ? '<span class="tag ' + def2.type + '">' + def2.type + "</span>" : "";
        html += '<div class="inv-item"><div class="icn" style="width:34px;height:34px;flex:none;border-radius:7px;background:#0d0b09 url(' + G.itemIconURL(it.id) + ') center/cover;border:1px solid var(--edge)"></div>' +
          '<div class="grow"><div class="nm">' + def2.name + " " + typeTag + '</div><div class="sub">Lv ' + it.level + "</div></div>" +
          '<button class="btn gold" style="padding:8px 12px;font-size:12px" data-equip="' + it.uid + '">Equip</button></div>';
      });
    }
    html += "</div>";
    return html;
  };

  UI._bindGear = function () {
    var body = el("gear-body");
    // class
    var seg = el("cls-seg");
    if (seg) seg.addEventListener("click", function (e) {
      var t = e.target.closest("[data-cls]"); if (!t) return;
      G.setClass(t.getAttribute("data-cls")); UI.renderGear();
    });
    // slot select
    body.addEventListener("click", function (e) {
      var slotEl = e.target.closest("[data-slot]");
      if (slotEl && !e.target.closest("[data-equip],[data-unequip],[data-up]")) { UI._slot = slotEl.getAttribute("data-slot"); UI.renderGear(); return; }
      var eq = e.target.closest("[data-equip]"); if (eq) { G.equip(eq.getAttribute("data-equip"), UI._slot); UI.renderGear(); return; }
      var un = e.target.closest("[data-unequip]"); if (un) { G.unequip(un.getAttribute("data-unequip")); UI.renderGear(); return; }
      var up = e.target.closest("[data-up]"); if (up) {
        var ok = G.upgradeItem(up.getAttribute("data-up"));
        UI.toast(ok ? "Upgraded!" : "Not enough souls");
        UI.renderGear(); return;
      }
      var sk = e.target.closest("[data-skill]"); if (sk) {
        var id = sk.getAttribute("data-skill");
        if (G.state.skills.indexOf(id) < 0) { UI.toast("Skill not learned — find it in the arena"); return; }
        var w = G.getEquipped(UI._slot); if (w) { G.setActiveSkill(w.uid, id); UI.renderGear(); }
        return;
      }
    });
  };

  // ---------------- LEVEL UP ----------------
  UI.renderLevelUp = function () {
    el("lv-souls").textContent = G.state.souls;
    var d = G.derived();
    var html = "";
    html += '<div class="card"><div class="card-title">Spend Souls on Attributes</div>';
    STATS.forEach(function (st) {
      var v = G.state.base[st];
      var cost = G.statUpgradeCost(v);
      var can = G.state.souls >= cost;
      html += '<div class="lvrow"><div class="val">' + v + "</div>" +
        '<div class="info"><div class="nm">' + STAT_NAME[st] + '</div><div class="ds">' + STAT_DESC[st] + '</div></div>' +
        '<div style="text-align:center"><button class="plus" data-stat="' + st + '" ' + (can ? "" : "disabled") + ">+</button>" +
        '<div class="cost">' + cost + "◈</div></div></div>";
    });
    html += "</div>";
    html += '<div class="card"><div class="card-title">Character</div>' +
      '<div class="statrow"><span class="k">Level</span><span class="v">' + G.state.level + "</span></div>" +
      '<div class="statrow"><span class="k">Max HP</span><span class="v">' + d.maxHp + "</span></div>" +
      '<div class="statrow"><span class="k">Max Mana</span><span class="v">' + d.maxMana + "</span></div>" +
      '<div class="statrow"><span class="k">Highest Stage Cleared</span><span class="v">' + G.state.stageCleared + "</span></div>" +
      "</div>";
    html += '<div class="foot-actions" style="margin-top:12px"><button class="btn danger" id="reset-btn">⟳ Abandon & Start Anew</button></div>';

    el("lv-body").innerHTML = html;

    el("lv-body").addEventListener("click", function (e) {
      var p = e.target.closest("[data-stat]");
      if (p) {
        var ok = G.levelUpStat(p.getAttribute("data-stat"));
        if (!ok) UI.toast("Not enough souls");
        UI.renderLevelUp();
        return;
      }
      if (e.target.id === "reset-btn") {
        if (window.confirm("Abandon this character and start a new game? This cannot be undone.")) {
          G.resetGame(); UI.showScreen("home"); UI.toast("A new journey begins.");
        }
      }
    });
  };

  // ---------------- init ----------------
  UI.init = function () {
    el("nav-gear").addEventListener("click", function () { UI.showScreen("gear"); });
    el("nav-levelup").addEventListener("click", function () { UI.showScreen("levelup"); });
    el("nav-fight").addEventListener("click", function () { G.startFight(); });
    el("gear-back").addEventListener("click", function () { UI.showScreen("home"); });
    el("lv-back").addEventListener("click", function () { UI.showScreen("home"); });
  };

})(window);
