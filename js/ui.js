/* ============================================================
   Fall of the Foul — UI (menus, gear, spells, item detail modal)
   ============================================================ */
(function (G) {
  "use strict";
  var ITEMS = G.ITEMS, SETS = G.SETS, SKILLS = G.SKILLS, SPELLS = G.SPELLS, STATS = G.STATS,
      STAT_NAME = G.STAT_NAME, STAT_DESC = G.STAT_DESC, CLASS_NAME = G.CLASS_NAME;

  function el(id) { return document.getElementById(id); }
  function esc(s) { return String(s).replace(/</g, "&lt;"); }
  var SLOT_NAME = { right:"Right Hand", left:"Left Hand", ring:"Ring", talisman1:"Talisman I", talisman2:"Talisman II", helmet:"Helmet", chest:"Chestplate", legs:"Leggings" };
  var UI = {};
  G.UI = UI;

  UI.showScreen = function (name) {
    closeModal();
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
    var box = c.getBoundingClientRect();
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    c.width = Math.max(200, Math.round(box.width * dpr)); c.height = c.width;
    G.drawPortrait(c);
  };

  // ---------------- helpers ----------------
  function iconBg(id, size) { return 'style="width:' + size + 'px;height:' + size + 'px;flex:none;border-radius:7px;background:#0d0b09 url(' + G.itemIconURL(id) + ') center/cover;border:1px solid var(--edge)"'; }
  function typeTag(def) { return (def.slot === "weapon") ? '<span class="tag ' + def.type + '">' + def.type + "</span>" : ""; }

  function abilityMeta(a) {
    var parts = [];
    if (a.cd) parts.push("CD " + a.cd + "s");
    if (a.mana) parts.push(a.mana + " MP");
    if (a.stam) parts.push(a.stam + " ST");
    return parts.join(" · ");
  }

  // ---------------- GEAR ----------------
  UI.renderGear = function () {
    var d = G.derived(), s = G.state, html = "";

    // class
    html += '<div class="card"><div class="card-title">Class</div><div class="seg" id="cls-seg">';
    G.CLASSES.forEach(function (cl) { html += '<div class="opt ' + (s.cls === cl ? "sel" : "") + '" data-cls="' + cl + '">' + CLASS_NAME[cl] + "</div>"; });
    html += "</div><div class=\"buffline\">Tap a slot to see everything you can put in it. Weapons match your class for full power.</div></div>";

    // equipment
    html += '<div class="card"><div class="card-title">Equipment</div><div class="slots">';
    G.EQ_SLOTS.forEach(function (slot) { html += slotCell(slot); });
    html += "</div></div>";

    // spells
    var spells = G.getSpells();
    html += '<div class="card"><div class="card-title">Spells (' + spells.length + ' slots)</div><div class="slots">';
    for (var i = 0; i < spells.length; i++) {
      var sid = spells[i], sp = sid ? SPELLS[sid] : null;
      html += '<div class="slot ' + (sp ? "" : "empty") + '" data-spell="' + i + '">' +
        '<div class="icn rune">' + (sp ? "✦" : "+") + '</div>' +
        '<div class="meta"><div class="nm">' + (sp ? sp.name : "— Empty —") + '</div>' +
        '<div class="sub">' + (sp ? abilityMeta(sp) : "Spell slot " + (i + 1)) + '</div></div></div>';
    }
    html += "</div><div class=\"buffline\">Cast these from the left side in battle. Talismans can add more slots.</div></div>";

    // attributes
    html += '<div class="card"><div class="card-title">Attributes</div><div class="statgrid">';
    STATS.forEach(function (st) { html += '<div class="statrow"><span class="k">' + STAT_NAME[st] + '</span><span class="v">' + Math.floor(d[st]) + "</span></div>"; });
    html += "</div><div class=\"statgrid\" style=\"margin-top:8px\">" +
      '<div class="statrow"><span class="k">Max HP</span><span class="v">' + d.maxHp + "</span></div>" +
      '<div class="statrow"><span class="k">Max Mana</span><span class="v">' + d.maxMana + "</span></div>" +
      '<div class="statrow"><span class="k">Damage</span><span class="v">+' + Math.round((d.dmgMult - 1) * 100) + "%</span></div>" +
      '<div class="statrow"><span class="k">Crit</span><span class="v">' + Math.round(d.critChance * 100) + "%</span></div>" +
      '<div class="statrow"><span class="k">Dmg Taken</span><span class="v">' + Math.round(d.dmgTakenMult * 100) + "%</span></div>" +
      '<div class="statrow"><span class="k">Spell Slots</span><span class="v">' + d.maxSpellSlots + "</span></div></div>";
    for (var sid2 in SETS) if (SETS.hasOwnProperty(sid2)) {
      var active = d.sets.indexOf(sid2) >= 0;
      html += '<div class="setline ' + (active ? "active" : "") + '">' + (active ? "◆ " : "◇ ") + SETS[sid2].name + " Set — " + SETS[sid2].bonusDesc + (active ? " (active)" : "") + "</div>";
    }
    html += "</div>";

    el("gear-body").innerHTML = html;
    bindGear();
  };

  function slotCell(slot) {
    var inst = G.getEquipped(slot);
    if (inst) {
      var def = ITEMS[inst.id];
      return '<div class="slot" data-slot="' + slot + '"><div class="icn" style="background-image:url(' + G.itemIconURL(inst.id) + ');background-size:cover"></div>' +
        '<div class="meta"><div class="nm">' + def.name + '</div><div class="sub">' + SLOT_NAME[slot] + '</div><div class="lv">Lv ' + inst.level + '</div></div></div>';
    }
    return '<div class="slot empty" data-slot="' + slot + '"><div class="icn"></div><div class="meta"><div class="nm">— Empty —</div><div class="sub">' + SLOT_NAME[slot] + '</div></div></div>';
  }

  function bindGear() {
    var body = el("gear-body");
    var seg = el("cls-seg");
    if (seg) seg.addEventListener("click", function (e) { var t = e.target.closest("[data-cls]"); if (t) { G.setClass(t.getAttribute("data-cls")); UI.renderGear(); } });
    body.addEventListener("click", function (e) {
      var slotEl = e.target.closest("[data-slot]");
      if (slotEl) { openSlot(slotEl.getAttribute("data-slot")); return; }
      var sp = e.target.closest("[data-spell]");
      if (sp) { openSpellPicker(parseInt(sp.getAttribute("data-spell"), 10)); return; }
    });
  }

  // ---------------- modal ----------------
  function openModal(html) {
    var m = el("menu-modal");
    m.innerHTML = '<div class="modal-panel">' + html + "</div>";
    m.classList.add("active");
    m.onclick = function (e) { if (e.target === m) closeModal(); };
  }
  function closeModal() { var m = el("menu-modal"); if (m) { m.classList.remove("active"); m.innerHTML = ""; } }
  UI.closeModal = closeModal;

  function modalHead(title) {
    return '<div class="modal-head"><div class="h">' + esc(title) + '</div><button class="btn ghost" data-close>✕</button></div>';
  }
  function bindClose(m) { var b = m.querySelector("[data-close]"); if (b) b.addEventListener("click", closeModal); }

  // tap a slot: if filled -> item detail; if empty -> picker
  function openSlot(slot) {
    var inst = G.getEquipped(slot);
    if (inst) openItemDetail(inst.uid, slot);
    else openPicker(slot);
  }

  // list every owned item that fits a slot
  function openPicker(slot) {
    var opts = G.state.inv.filter(function (it) { return G.itemFitsSlot(it.id, slot); });
    var html = modalHead("Equip · " + SLOT_NAME[slot]);
    if (!opts.length) html += '<div class="buffline" style="padding:8px">You own nothing that fits here. Win fights to find gear.</div>';
    html += '<div class="scroll modal-scroll">';
    opts.forEach(function (it) {
      var def = ITEMS[it.id];
      var equippedHere = G.state.eq[slot] === it.uid;
      html += '<div class="inv-item ' + (equippedHere ? "equipped" : "") + '" data-detail="' + it.uid + '" data-slot="' + slot + '">' +
        '<div class="icn" ' + iconBg(it.id, 38) + '></div>' +
        '<div class="grow"><div class="nm">' + def.name + " " + typeTag(def) + (equippedHere ? ' <span class="tag on">equipped</span>' : "") + '</div>' +
        '<div class="sub">Lv ' + it.level + (def.buff ? " · " + def.buff.desc : "") + '</div></div><div class="chev">›</div></div>';
    });
    html += "</div>";
    openModal(html);
    var m = el("menu-modal"); bindClose(m);
    m.querySelectorAll("[data-detail]").forEach(function (row) {
      row.addEventListener("click", function () { openItemDetail(row.getAttribute("data-detail"), row.getAttribute("data-slot")); });
    });
  }

  function openItemDetail(uid, slot) {
    var inst = G.findInst(uid); if (!inst) { closeModal(); return; }
    var def = ITEMS[inst.id];
    var equippedHere = slot && G.state.eq[slot] === uid;
    var st = G.itemStats(inst);
    var html = modalHead(def.name);
    html += '<div class="detail-top"><div class="icn-lg" style="background:#0d0b09 url(' + G.itemIconURL(inst.id) + ') center/cover"></div>' +
      '<div class="detail-info"><div class="dt-type">' + (def.type) + (slot ? " · " + SLOT_NAME[slot] : "") + '</div>' +
      '<div class="dt-lv">Level ' + inst.level + (inst.level >= 99 ? " (MAX)" : "") + '</div></div></div>';
    html += '<div class="dt-desc">' + esc(def.desc || "") + "</div>";

    // stats
    var statLines = "";
    for (var k in st) if (st.hasOwnProperty(k)) statLines += '<div class="statrow"><span class="k">' + STAT_NAME[k] + '</span><span class="v">+' + Math.round(st[k]) + "</span></div>";
    if (def.spellSlots) statLines += '<div class="statrow"><span class="k">Spell Slots</span><span class="v">+' + def.spellSlots + "</span></div>";
    if (statLines) html += '<div class="statgrid" style="margin:8px 0">' + statLines + "</div>";
    if (def.buff) html += '<div class="buffline"><b>Effect:</b> ' + def.buff.desc + "</div>";

    // weapon skill slot
    if (def.slot === "weapon" && def.type !== "magic") {
      var cur = inst.skillSlot ? SKILLS[inst.skillSlot] : null;
      html += '<div class="card-title" style="margin-top:12px">Skill</div>' +
        '<div class="inv-item" data-skillslot="' + uid + '"><div class="icn rune">' + (cur ? "⚔" : "+") + '</div>' +
        '<div class="grow"><div class="nm">' + (cur ? cur.name : "— No skill —") + '</div><div class="sub">' + (cur ? abilityMeta(cur) : "Tap to slot a " + def.type + " skill") + '</div></div><div class="chev">›</div></div>';
    } else if (def.type === "magic") {
      html += '<div class="buffline" style="margin-top:10px">Basic attacks cost <b>' + (def.manaCost || 0) + ' mana</b>. Magic weapons channel <b>spells</b> (set under Equipment), not weapon skills.</div>';
    }

    // action buttons
    html += '<div class="detail-actions">';
    if (inst.level < 99) html += '<button class="btn gold" data-up="' + uid + '">Upgrade · ' + G.equipUpgradeCost(inst) + "◈</button>";
    else html += '<span class="tag">MAX LEVEL</span>';
    if (slot) {
      if (equippedHere) html += '<button class="btn ghost" data-unequip="' + slot + '">Unequip</button>';
      else html += '<button class="btn" data-equip="' + uid + '" data-slot="' + slot + '">Equip</button>';
      html += '<button class="btn ghost" data-pick="' + slot + '">Choose another</button>';
    }
    html += "</div>";

    openModal(html);
    var m = el("menu-modal"); bindClose(m);
    var up = m.querySelector("[data-up]");
    if (up) up.addEventListener("click", function () { var ok = G.upgradeItem(uid); UI.toast(ok ? "Upgraded to Lv " + G.findInst(uid).level : "Not enough souls"); openItemDetail(uid, slot); UI.renderGear(); });
    var eq = m.querySelector("[data-equip]"); if (eq) eq.addEventListener("click", function () { G.equip(uid, slot); UI.renderGear(); closeModal(); });
    var un = m.querySelector("[data-unequip]"); if (un) un.addEventListener("click", function () { G.unequip(slot); UI.renderGear(); closeModal(); });
    var pk = m.querySelector("[data-pick]"); if (pk) pk.addEventListener("click", function () { openPicker(slot); });
    var ss = m.querySelector("[data-skillslot]"); if (ss) ss.addEventListener("click", function () { openSkillPicker(uid, slot); });
  }

  function openSkillPicker(weaponUid, slot) {
    var inst = G.findInst(weaponUid); if (!inst) return;
    var learned = G.weaponSkills(inst);
    var html = modalHead("Skill · " + ITEMS[inst.id].name);
    html += '<div class="scroll modal-scroll">';
    html += abilityRow(null, inst.skillSlot === null || !inst.skillSlot, "clear", "— No skill —", "Leave the slot empty");
    if (!learned.length) html += '<div class="buffline" style="padding:8px">No matching skills learned yet. Skills drop after waves and bosses.</div>';
    learned.forEach(function (id) { var a = SKILLS[id]; html += abilityRow(id, inst.skillSlot === id, id, a.name, a.desc + " — " + abilityMeta(a)); });
    html += "</div>";
    openModal(html); var m = el("menu-modal"); bindClose(m);
    m.querySelectorAll("[data-ability]").forEach(function (row) {
      row.addEventListener("click", function () {
        var id = row.getAttribute("data-ability"); G.setWeaponSkill(weaponUid, id === "clear" ? null : id);
        openItemDetail(weaponUid, slot); UI.renderGear();
      });
    });
  }

  function openSpellPicker(index) {
    var learned = G.state.learnedSpells, cur = (G.state.spells || [])[index] || null;
    var html = modalHead("Spell · Slot " + (index + 1));
    html += '<div class="scroll modal-scroll">';
    html += abilityRow(null, !cur, "clear", "— Empty —", "Leave the slot empty");
    if (!learned.length) html += '<div class="buffline" style="padding:8px">No spells learned yet. Spells drop after waves and bosses.</div>';
    learned.forEach(function (id) { var a = SPELLS[id]; html += abilityRow(id, cur === id, id, a.name, a.desc + " — " + abilityMeta(a)); });
    html += "</div>";
    openModal(html); var m = el("menu-modal"); bindClose(m);
    m.querySelectorAll("[data-ability]").forEach(function (row) {
      row.addEventListener("click", function () { var id = row.getAttribute("data-ability"); G.setSpellSlot(index, id === "clear" ? null : id); UI.renderGear(); closeModal(); });
    });
  }

  function abilityRow(id, on, dataId, name, sub) {
    return '<div class="inv-item ' + (on ? "equipped" : "") + '" data-ability="' + dataId + '">' +
      '<div class="icn rune">' + (dataId === "clear" ? "∅" : "✦") + '</div>' +
      '<div class="grow"><div class="nm">' + esc(name) + (on ? ' <span class="tag on">active</span>' : "") + '</div><div class="sub">' + esc(sub) + '</div></div></div>';
  }

  // ---------------- LEVEL UP ----------------
  UI.renderLevelUp = function () {
    el("lv-souls").textContent = G.state.souls;
    var d = G.derived(), html = "";
    html += '<div class="card"><div class="card-title">Spend Souls on Attributes (+1 each)</div>';
    STATS.forEach(function (st) {
      var v = G.state.base[st], cost = G.statUpgradeCost(v), can = G.state.souls >= cost;
      html += '<div class="lvrow"><div class="val">' + v + "</div>" +
        '<div class="info"><div class="nm">' + STAT_NAME[st] + '</div><div class="ds">' + STAT_DESC[st] + '</div></div>' +
        '<div style="text-align:center"><button class="plus" data-stat="' + st + '" ' + (can ? "" : "disabled") + ">+1</button><div class=\"cost\">" + cost + "◈</div></div></div>";
    });
    html += "</div>";
    html += '<div class="card"><div class="card-title">Character</div>' +
      '<div class="statrow"><span class="k">Level</span><span class="v">' + G.state.level + "</span></div>" +
      '<div class="statrow"><span class="k">Max HP</span><span class="v">' + d.maxHp + "</span></div>" +
      '<div class="statrow"><span class="k">Max Mana</span><span class="v">' + d.maxMana + "</span></div>" +
      '<div class="statrow"><span class="k">Highest Stage Cleared</span><span class="v">' + G.state.stageCleared + "</span></div></div>";
    html += '<div class="foot-actions" style="margin-top:12px"><button class="btn danger" id="reset-btn">⟳ Abandon & Start Anew</button></div>';
    el("lv-body").innerHTML = html;
    el("lv-body").addEventListener("click", function (e) {
      var p = e.target.closest("[data-stat]");
      if (p) { if (!G.levelUpStat(p.getAttribute("data-stat"))) UI.toast("Not enough souls"); UI.renderLevelUp(); return; }
      if (e.target.id === "reset-btn") { if (window.confirm("Abandon this character and start a new game?")) { G.resetGame(); UI.showScreen("home"); UI.toast("A new journey begins."); } }
    });
  };

  UI.init = function () {
    el("nav-gear").addEventListener("click", function () { UI.showScreen("gear"); });
    el("nav-levelup").addEventListener("click", function () { UI.showScreen("levelup"); });
    el("nav-fight").addEventListener("click", function () { G.startFight(); });
    el("gear-back").addEventListener("click", function () { UI.showScreen("home"); });
    el("lv-back").addEventListener("click", function () { UI.showScreen("home"); });
  };

})(window);
