/* ============================================================
   Fall of the Foul — STATE
   Player data, local save/load, derived stats, economy.
   ============================================================ */
(function (G) {
  "use strict";
  var STATS = G.STATS, ITEMS = G.ITEMS, SETS = G.SETS, SKILLS = G.SKILLS, CLASS_WEAPON = G.CLASS_WEAPON;
  var SAVE_KEY = "fotf_save_v1";

  G.state = null;

  function uid() { G.state.uidSeq += 1; return "i" + G.state.uidSeq; }

  // add an item instance to inventory; auto-learn its skills[0]
  G.addItem = function (baseId, level) {
    var def = ITEMS[baseId]; if (!def) return null;
    var inst = { uid: uid(), id: baseId, level: level || 1 };
    if (def.slot === "weapon") {
      inst.activeSkill = (def.skills && def.skills.length) ? def.skills[0] : null;
      if (inst.activeSkill) G.learnSkill(inst.activeSkill);
    }
    G.state.inv.push(inst);
    return inst;
  };

  G.learnSkill = function (id) {
    if (!id) return;
    if (G.state.skills.indexOf(id) < 0) G.state.skills.push(id);
  };

  G.findInst = function (uid) {
    var inv = G.state.inv;
    for (var i = 0; i < inv.length; i++) if (inv[i].uid === uid) return inv[i];
    return null;
  };

  G.getEquipped = function (slot) { return G.findInst(G.state.eq[slot]); };

  G.getAllEquipped = function () {
    var out = [], slots = ["right", "left", "ring", "helmet", "chest", "legs"];
    for (var i = 0; i < slots.length; i++) { var it = G.getEquipped(slots[i]); if (it) out.push(it); }
    return out;
  };

  G.rightWeapon = function () {
    var it = G.getEquipped("right");
    if (it && ITEMS[it.id].slot === "weapon") return it;
    return null;
  };

  // equip an instance into a slot (handles swapping)
  G.equip = function (uid, slot) {
    var inst = G.findInst(uid); if (!inst) return;
    if (!G.itemFitsSlot(inst.id, slot)) return;
    var eq = G.state.eq;
    // if this instance is currently equipped elsewhere, clear that slot
    var slots = ["right", "left", "ring", "helmet", "chest", "legs"];
    for (var i = 0; i < slots.length; i++) if (eq[slots[i]] === uid) eq[slots[i]] = null;
    // a two-handed-ish rule: weapons can go right or left; shields only left
    eq[slot] = uid;
    G.save();
  };

  G.unequip = function (slot) { G.state.eq[slot] = null; G.save(); };

  G.setClass = function (cls) {
    if (G.CLASSES.indexOf(cls) < 0) return;
    G.state.cls = cls; G.save();
  };

  G.setActiveSkill = function (weaponUid, skillId) {
    var inst = G.findInst(weaponUid); if (!inst) return;
    var def = ITEMS[inst.id]; if (!def || !def.skills) return;
    if (def.skills.indexOf(skillId) < 0) return;      // must be a skill this weapon supports
    if (G.state.skills.indexOf(skillId) < 0) return;  // must be learned
    inst.activeSkill = skillId; G.save();
  };

  // ---- scaled stats for one item instance ---------------------
  G.itemStats = function (inst) {
    var def = ITEMS[inst.id]; var out = {};
    if (!def || !def.stats) return out;
    var mult = 1 + 0.035 * (inst.level - 1);
    for (var k in def.stats) if (def.stats.hasOwnProperty(k)) out[k] = def.stats[k] * mult;
    return out;
  };

  // ---- active armor sets --------------------------------------
  G.activeSets = function () {
    var counts = {}, out = [];
    var eqs = G.getAllEquipped();
    for (var i = 0; i < eqs.length; i++) {
      var def = ITEMS[eqs[i].id];
      if (def.set) counts[def.set] = (counts[def.set] || 0) + 1;
    }
    for (var sid in counts) if (counts.hasOwnProperty(sid)) {
      if (counts[sid] >= SETS[sid].pieces.length) out.push(sid);
    }
    return out;
  };

  // ---- derived totals -----------------------------------------
  G.derived = function () {
    var d = {}; var i;
    for (i = 0; i < STATS.length; i++) d[STATS[i]] = G.state.base[STATS[i]];

    var eqs = G.getAllEquipped();
    for (i = 0; i < eqs.length; i++) {
      var st = G.itemStats(eqs[i]);
      for (var s in st) if (st.hasOwnProperty(s)) d[s] += st[s];
    }

    var pct = { str:0, mana:0, magic:0, def:0, vit:0, luck:0 };
    var mod = { hpPct:0, atkSpeed:0, skillDmg:0, crit:0, soulPct:0, hpregen:0 };
    var flags = { lifesteal:0, burn:0, slow:0, thorns:0 };
    function applyEffect(e) {
      if (e.type === "statPct") pct[e.stat] += e.val;
      else if (e.type === "hpPct") mod.hpPct += e.val;
      else if (e.type === "atkSpeed") mod.atkSpeed += e.val;
      else if (e.type === "skillDmg") mod.skillDmg += e.val;
      else if (e.type === "critPct") mod.crit += e.val;
      else if (e.type === "soulPct") mod.soulPct += e.val;
      else if (e.type === "hpregen") mod.hpregen += e.val;
      else if (e.type === "lifesteal") flags.lifesteal = Math.max(flags.lifesteal, e.val);
      else if (e.type === "burn") flags.burn = Math.max(flags.burn, e.val);
      else if (e.type === "slow") flags.slow = Math.max(flags.slow, e.val);
      else if (e.type === "thorns") flags.thorns += e.val;
    }
    for (i = 0; i < eqs.length; i++) { var bdef = ITEMS[eqs[i].id]; if (bdef.buff) applyEffect(bdef.buff); }
    var sets = G.activeSets();
    for (i = 0; i < sets.length; i++) { var eff = SETS[sets[i]].effects; for (var j = 0; j < eff.length; j++) applyEffect(eff[j]); }

    for (i = 0; i < STATS.length; i++) { var key = STATS[i]; d[key] = d[key] * (1 + pct[key]); }

    var lvl = G.state.level;
    d.maxHp = Math.round((100 + d.vit * 12 + lvl * 5) * (1 + mod.hpPct));
    d.maxMana = Math.round(30 + d.mana * 6);
    d.hpRegen = 0.6 + d.vit * 0.12 + mod.hpregen;
    d.manaRegen = 1.2 + d.mana * 0.18;
    d.dmgTakenMult = 120 / (120 + d.def * 2);
    d.atkSpeedMult = 1 + mod.atkSpeed;
    d.skillDmgMult = 1 + mod.skillDmg;
    d.critChance = Math.min(0.75, 0.05 + mod.crit + d.luck * 0.004);
    d.soulMult = 1 + d.luck * 0.03 + mod.soulPct;
    d.flags = flags;
    d.sets = sets;
    return d;
  };

  // effective basic-attack profile from the equipped right-hand weapon
  G.attackProfile = function (d) {
    var inst = G.rightWeapon();
    if (!inst) {
      return { dmg: 8 * (1 + d.str * 0.06), type:"melee", range:70, arc:1.4, rate:0.5, projSpeed:0, manaCost:0, name:"Fists", color:"#c8b89a" };
    }
    var def = ITEMS[inst.id];
    var type = def.type;
    var primary = (type === "magic") ? d.magic : d.str;
    var classMatch = (CLASS_WEAPON[G.state.cls] === type) ? 1.0 : 0.6;
    var base = def.dmg * (1 + 0.04 * (inst.level - 1));
    var dmg = base * (1 + primary * 0.06) * classMatch;
    return {
      dmg: dmg, type: type, range: def.range, arc: def.arc || 1.4,
      rate: (def.rate || 0.5) / d.atkSpeedMult, projSpeed: def.projSpeed || 0,
      manaCost: def.manaCost || 0, classMatch: classMatch, inst: inst, def: def,
      name: def.name, color: def.color
    };
  };

  G.activeSkill = function () {
    var inst = G.rightWeapon(); if (!inst || !inst.activeSkill) return null;
    var sk = SKILLS[inst.activeSkill]; if (!sk) return null;
    return sk;
  };

  // ---- economy ------------------------------------------------
  G.statUpgradeCost = function (v) { return Math.round(18 + v * v * 2.2); };
  G.levelUpStat = function (stat) {
    var v = G.state.base[stat];
    var cost = G.statUpgradeCost(v);
    if (G.state.souls < cost) return false;
    G.state.souls -= cost;
    G.state.base[stat] += 1;
    G.state.statsBought += 1;
    G.state.level = 1 + G.state.statsBought + G.state.stageCleared; // level from investment + progress
    G.save();
    return true;
  };

  G.equipUpgradeCost = function (inst) {
    return Math.round(30 * inst.level * (1 + 0.06 * inst.level));
  };
  G.upgradeItem = function (uid) {
    var inst = G.findInst(uid); if (!inst) return false;
    if (inst.level >= 99) return false;
    var cost = G.equipUpgradeCost(inst);
    if (G.state.souls < cost) return false;
    G.state.souls -= cost; inst.level += 1; G.save();
    return true;
  };

  // ---- save / load --------------------------------------------
  G.save = function () {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(G.state)); } catch (e) {}
  };
  G.hasSave = function () {
    try { return !!localStorage.getItem(SAVE_KEY); } catch (e) { return false; }
  };
  G.load = function () {
    try {
      var raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return false;
      var s = JSON.parse(raw);
      if (!s || !s.base) return false;
      G.state = s;
      // forward-compat defaults
      if (typeof G.state.stageCleared !== "number") G.state.stageCleared = 0;
      if (typeof G.state.stage !== "number") G.state.stage = 1;
      return true;
    } catch (e) { return false; }
  };

  G.resetGame = function () {
    try { localStorage.removeItem(SAVE_KEY); } catch (e) {}
    G.newGame();
  };

  G.newGame = function () {
    G.state = {
      uidSeq: 0,
      cls: "melee",
      base: { str:5, mana:5, magic:5, def:5, vit:5, luck:5 },
      souls: 120,
      level: 1,
      statsBought: 0,
      stage: 1,          // current stage to attempt
      stageCleared: 0,   // highest stage cleared
      inv: [],
      eq: { right:null, left:null, ring:null, helmet:null, chest:null, legs:null },
      skills: []
    };
    // starting gear (one of each weapon family so classes are playable immediately)
    var sword = G.addItem("sword_iron", 1);
    var shield = G.addItem("shield_oak", 1);
    var helm = G.addItem("helm_worn", 1);
    var chest = G.addItem("chest_worn", 1);
    var legs = G.addItem("legs_worn", 1);
    G.addItem("bow_hunter", 1);
    G.addItem("wand_ember", 1);
    G.state.eq.right = sword.uid;
    G.state.eq.left = shield.uid;
    G.state.eq.helmet = helm.uid;
    G.state.eq.chest = chest.uid;
    G.state.eq.legs = legs.uid;
    G.save();
  };

})(window);
