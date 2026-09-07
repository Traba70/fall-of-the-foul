/* ============================================================
   Fall of the Foul — STATE
   Player data, save/load (+migration), derived stats, economy.
   ============================================================ */
(function (G) {
  "use strict";
  var STATS = G.STATS, ITEMS = G.ITEMS, SETS = G.SETS, SKILLS = G.SKILLS, SPELLS = G.SPELLS,
      CLASS_WEAPON = G.CLASS_WEAPON;
  var SAVE_KEY = "fotf_save_v1";
  var EQ_SLOTS = ["right", "left", "ring", "talisman1", "talisman2", "helmet", "chest", "legs"];
  G.EQ_SLOTS = EQ_SLOTS;

  // action stamina costs (basic attacks); skills/spells carry their own .stam
  G.STAM_ATTACK = { melee: 8, ranged: 6, magic: 7 };
  G.STAM_DODGE = 30;

  G.state = null;

  function uid() { G.state.uidSeq += 1; return "i" + G.state.uidSeq; }

  G.learn = function (id) {
    if (!id) return;
    if (SPELLS[id]) { if (G.state.learnedSpells.indexOf(id) < 0) G.state.learnedSpells.push(id); }
    else if (SKILLS[id]) { if (G.state.learnedSkills.indexOf(id) < 0) G.state.learnedSkills.push(id); }
  };

  // add an item instance to inventory
  G.addItem = function (baseId, level) {
    var def = ITEMS[baseId]; if (!def) return null;
    var inst = { uid: uid(), id: baseId, level: level || 1 };
    if (def.slot === "weapon" && def.type !== "magic") {
      inst.skillSlot = firstLearnedSkillFor(def.type) || null; // auto-fit a matching skill if any
    }
    G.state.inv.push(inst);
    return inst;
  };

  function firstLearnedSkillFor(wtype) {
    var ls = G.state.learnedSkills;
    for (var i = 0; i < ls.length; i++) if (SKILLS[ls[i]] && SKILLS[ls[i]].wtype === wtype) return ls[i];
    return null;
  }

  G.findInst = function (u) { var inv = G.state.inv; for (var i = 0; i < inv.length; i++) if (inv[i].uid === u) return inv[i]; return null; };
  G.getEquipped = function (slot) { return G.findInst(G.state.eq[slot]); };
  G.getAllEquipped = function () {
    var out = [];
    for (var i = 0; i < EQ_SLOTS.length; i++) { var it = G.getEquipped(EQ_SLOTS[i]); if (it) out.push(it); }
    return out;
  };
  G.rightWeapon = function () {
    var it = G.getEquipped("right");
    if (it && ITEMS[it.id].slot === "weapon") return it;
    return null;
  };

  G.equip = function (u, slot) {
    var inst = G.findInst(u); if (!inst) return;
    if (!G.itemFitsSlot(inst.id, slot)) return;
    var eq = G.state.eq;
    for (var i = 0; i < EQ_SLOTS.length; i++) if (eq[EQ_SLOTS[i]] === u) eq[EQ_SLOTS[i]] = null;
    eq[slot] = u;
    clampSpells();
    G.save();
  };
  G.unequip = function (slot) { G.state.eq[slot] = null; clampSpells(); G.save(); };

  function copyEq(eq) { var o = {}; for (var i = 0; i < EQ_SLOTS.length; i++) o[EQ_SLOTS[i]] = (eq && eq[EQ_SLOTS[i]]) || null; return o; }
  // Each class remembers its own loadout (equipment + spell slots). Switching class
  // snapshots the current setup and restores the target class's saved one (if any).
  G.setClass = function (cls) {
    if (G.CLASSES.indexOf(cls) < 0 || cls === G.state.cls) return;
    if (!G.state.setups) G.state.setups = {};
    G.state.setups[G.state.cls] = { eq: copyEq(G.state.eq), spells: (G.state.spells || []).slice() };
    G.state.cls = cls;
    var saved = G.state.setups[cls];
    if (saved) {
      var neweq = {};
      for (var i = 0; i < EQ_SLOTS.length; i++) { var u = saved.eq ? saved.eq[EQ_SLOTS[i]] : null; neweq[EQ_SLOTS[i]] = (u && G.findInst(u)) ? u : null; }
      G.state.eq = neweq; G.state.spells = (saved.spells || []).slice(); clampSpells();
    }
    G.save();
  };

  // ---- weapon skill slot --------------------------------------
  G.weaponSkills = function (inst) {
    // learned skills that match this weapon's type (melee/ranged). Magic weapons: none.
    var def = ITEMS[inst.id]; if (!def || def.slot !== "weapon" || def.type === "magic") return [];
    var out = [], ls = G.state.learnedSkills;
    for (var i = 0; i < ls.length; i++) if (SKILLS[ls[i]] && SKILLS[ls[i]].wtype === def.type) out.push(ls[i]);
    return out;
  };
  G.setWeaponSkill = function (u, skillId) {
    var inst = G.findInst(u); if (!inst) return;
    var def = ITEMS[inst.id]; if (!def || def.type === "magic") return;
    if (skillId && (!SKILLS[skillId] || SKILLS[skillId].wtype !== def.type)) return;
    if (skillId && G.state.learnedSkills.indexOf(skillId) < 0) return;
    inst.skillSlot = skillId || null; G.save();
  };

  // ---- spell slots (global) -----------------------------------
  G.maxSpellSlots = function () {
    var n = G.BASE_SPELL_SLOTS, eqs = G.getAllEquipped();
    for (var i = 0; i < eqs.length; i++) { var def = ITEMS[eqs[i].id]; if (def.spellSlots) n += def.spellSlots; }
    return n;
  };
  function clampSpells() {
    var max = G.maxSpellSlots();
    if (!G.state.spells) G.state.spells = [];
    G.state.spells.length = Math.max(G.state.spells.length, 0);
    if (G.state.spells.length > max) G.state.spells.length = max;
  }
  G.getSpells = function () {
    var max = G.maxSpellSlots(), out = [];
    for (var i = 0; i < max; i++) out.push((G.state.spells && G.state.spells[i]) || null);
    return out;
  };
  G.setSpellSlot = function (index, spellId) {
    var max = G.maxSpellSlots(); if (index < 0 || index >= max) return;
    if (spellId && !SPELLS[spellId]) return;
    if (spellId && G.state.learnedSpells.indexOf(spellId) < 0) return;
    if (!G.state.spells) G.state.spells = [];
    while (G.state.spells.length <= index) G.state.spells.push(null);
    // prevent the same spell in two slots
    if (spellId) for (var i = 0; i < G.state.spells.length; i++) if (G.state.spells[i] === spellId) G.state.spells[i] = null;
    G.state.spells[index] = spellId || null; G.save();
  };

  // ---- scaled stats -------------------------------------------
  G.itemStats = function (inst) {
    var def = ITEMS[inst.id]; var out = {};
    if (!def || !def.stats) return out;
    var mult = 1 + 0.035 * (inst.level - 1);
    for (var k in def.stats) if (def.stats.hasOwnProperty(k)) out[k] = def.stats[k] * mult;
    return out;
  };

  G.activeSets = function () {
    var counts = {}, out = [], eqs = G.getAllEquipped();
    for (var i = 0; i < eqs.length; i++) { var def = ITEMS[eqs[i].id]; if (def.set) counts[def.set] = (counts[def.set] || 0) + 1; }
    for (var sid in counts) if (counts.hasOwnProperty(sid)) if (counts[sid] >= SETS[sid].pieces.length) out.push(sid);
    return out;
  };

  G.derived = function () {
    var d = {}, i;
    for (i = 0; i < STATS.length; i++) d[STATS[i]] = G.state.base[STATS[i]];
    var eqs = G.getAllEquipped();
    for (i = 0; i < eqs.length; i++) { var st = G.itemStats(eqs[i]); for (var s in st) if (st.hasOwnProperty(s)) d[s] += st[s]; }

    var pct = { str:0, mana:0, magic:0, def:0, vit:0, luck:0 };
    var mod = { hpPct:0, atkSpeed:0, skillDmg:0, crit:0, soulPct:0, hpregen:0, dmgPct:0 };
    var flags = { lifesteal:0, burn:0, slow:0, thorns:0 };
    function apply(e) {
      if (e.type === "statPct") pct[e.stat] += e.val;
      else if (e.type === "hpPct") mod.hpPct += e.val;
      else if (e.type === "atkSpeed") mod.atkSpeed += e.val;
      else if (e.type === "skillDmg") mod.skillDmg += e.val;
      else if (e.type === "critPct") mod.crit += e.val;
      else if (e.type === "soulPct") mod.soulPct += e.val;
      else if (e.type === "hpregen") mod.hpregen += e.val;
      else if (e.type === "dmgPct") mod.dmgPct += e.val;
      else if (e.type === "lifesteal") flags.lifesteal = Math.max(flags.lifesteal, e.val);
      else if (e.type === "burn") flags.burn = Math.max(flags.burn, e.val);
      else if (e.type === "slow") flags.slow = Math.max(flags.slow, e.val);
      else if (e.type === "thorns") flags.thorns += e.val;
    }
    for (i = 0; i < eqs.length; i++) { var bdef = ITEMS[eqs[i].id]; if (bdef.buff) apply(bdef.buff); }
    var sets = G.activeSets();
    for (i = 0; i < sets.length; i++) { var eff = SETS[sets[i]].effects; for (var j = 0; j < eff.length; j++) apply(eff[j]); }

    for (i = 0; i < STATS.length; i++) { var key = STATS[i]; d[key] = d[key] * (1 + pct[key]); }

    var lvl = G.state.level;
    d.maxHp = Math.round((100 + d.vit * 12 + lvl * 5) * (1 + mod.hpPct));
    d.maxMana = Math.round(30 + d.mana * 6);
    d.hpRegen = 0.6 + d.vit * 0.12 + mod.hpregen;
    d.manaRegen = 1.2 + d.mana * 0.18;
    d.dmgTakenMult = 120 / (120 + d.def * 2);
    d.atkSpeedMult = 1 + mod.atkSpeed;
    d.skillDmgMult = 1 + mod.skillDmg;
    d.dmgMult = 1 + mod.dmgPct;
    d.critChance = Math.min(0.75, 0.05 + mod.crit + d.luck * 0.004);
    d.soulMult = 1 + d.luck * 0.03 + mod.soulPct;
    d.flags = flags; d.sets = sets;
    d.maxSpellSlots = G.maxSpellSlots();
    return d;
  };

  // basic-attack profile from the equipped right-hand weapon
  G.attackProfile = function (d) {
    var inst = G.rightWeapon();
    if (!inst) return { dmg: 8 * (1 + d.str * 0.06) * d.dmgMult, type:"melee", range:70, arc:1.4, rate:0.5, projSpeed:0, stam:G.STAM_ATTACK.melee, name:"Fists", color:"#c8b89a", inst:null, def:null };
    var def = ITEMS[inst.id], type = def.type;
    var primary = (type === "magic") ? d.magic : d.str;
    var classMatch = (CLASS_WEAPON[G.state.cls] === type) ? 1.0 : 0.6;
    var base = def.dmg * (1 + 0.04 * (inst.level - 1));
    var dmg = base * (1 + primary * 0.06) * classMatch * d.dmgMult;
    return {
      dmg: dmg, type: type, range: def.range, arc: def.arc || 1.4,
      rate: (def.rate || 0.5) / d.atkSpeedMult, projSpeed: def.projSpeed || 0,
      stam: G.STAM_ATTACK[type] || 8, manaCost: def.manaCost || 0,
      classMatch: classMatch, inst: inst, def: def, name: def.name, color: def.color
    };
  };

  // the equipped right-hand weapon's slotted skill (melee/ranged only)
  G.activeSkill = function () {
    var inst = G.rightWeapon(); if (!inst || !inst.skillSlot) return null;
    return SKILLS[inst.skillSlot] || null;
  };

  // ---- economy ------------------------------------------------
  G.statUpgradeCost = function (v) { return Math.round(20 + v * 10); }; // clear, gentle, +1 per click
  G.levelUpStat = function (stat) {
    var v = G.state.base[stat], cost = G.statUpgradeCost(v);
    if (G.state.souls < cost) return false;
    G.state.souls -= cost; G.state.base[stat] += 1; G.state.statsBought += 1;
    G.state.level = 1 + G.state.statsBought + G.state.stageCleared;
    G.save(); return true;
  };
  G.equipUpgradeCost = function (inst) { return Math.round(30 * inst.level * (1 + 0.06 * inst.level)); };
  G.upgradeItem = function (u) {
    var inst = G.findInst(u); if (!inst || inst.level >= 99) return false;
    var cost = G.equipUpgradeCost(inst);
    if (G.state.souls < cost) return false;
    G.state.souls -= cost; inst.level += 1; G.save(); return true;
  };

  // ---- save / load / migrate ----------------------------------
  G.save = function () { try { localStorage.setItem(SAVE_KEY, JSON.stringify(G.state)); } catch (e) {} };
  G.hasSave = function () { try { return !!localStorage.getItem(SAVE_KEY); } catch (e) { return false; } };

  function normalize(s) {
    if (typeof s.stageCleared !== "number") s.stageCleared = 0;
    if (typeof s.stage !== "number") s.stage = 1;
    if (!s.eq) s.eq = {};
    for (var i = 0; i < EQ_SLOTS.length; i++) if (!(EQ_SLOTS[i] in s.eq)) s.eq[EQ_SLOTS[i]] = null;
    // learned pools (migrate old combined s.skills)
    if (!s.learnedSkills || !s.learnedSpells) {
      s.learnedSkills = s.learnedSkills || [];
      s.learnedSpells = s.learnedSpells || [];
      if (s.skills && s.skills.length) {
        for (var k = 0; k < s.skills.length; k++) {
          var id = s.skills[k];
          if (SPELLS[id]) { if (s.learnedSpells.indexOf(id) < 0) s.learnedSpells.push(id); }
          else if (SKILLS[id]) { if (s.learnedSkills.indexOf(id) < 0) s.learnedSkills.push(id); }
        }
      }
    }
    delete s.skills;
    // weapon instances: activeSkill -> skillSlot
    for (var w = 0; w < (s.inv || []).length; w++) {
      var inst = s.inv[w], def = ITEMS[inst.id]; if (!def) continue;
      if (def.slot === "weapon" && def.type !== "magic") {
        if (typeof inst.skillSlot === "undefined") {
          var old = inst.activeSkill;
          inst.skillSlot = (old && SKILLS[old] && SKILLS[old].wtype === def.type) ? old : null;
        }
      } else { delete inst.skillSlot; }
      delete inst.activeSkill;
    }
    if (!s.setups) s.setups = {};
    if (!s.spells) s.spells = [];
    // auto-slot learned spells into empty default slots on first migration
    if (s.spells.length === 0 && s.learnedSpells.length) {
      for (var q = 0; q < Math.min(G.BASE_SPELL_SLOTS, s.learnedSpells.length); q++) s.spells.push(s.learnedSpells[q]);
    }
    return s;
  }

  G.load = function () {
    try {
      var raw = localStorage.getItem(SAVE_KEY); if (!raw) return false;
      var s = JSON.parse(raw); if (!s || !s.base) return false;
      G.state = normalize(s); return true;
    } catch (e) { return false; }
  };

  G.resetGame = function () { try { localStorage.removeItem(SAVE_KEY); } catch (e) {} G.newGame(); };

  G.newGame = function () {
    G.state = {
      uidSeq: 0, cls: "melee",
      base: { str:5, mana:5, magic:5, def:5, vit:5, luck:5 },
      souls: 120, level: 1, statsBought: 0, stage: 1, stageCleared: 0,
      inv: [],
      eq: { right:null, left:null, ring:null, talisman1:null, talisman2:null, helmet:null, chest:null, legs:null },
      learnedSkills: [], learnedSpells: [], spells: [], setups: {}
    };
    // starting known abilities
    G.learn("guard_slash"); G.learn("piercing_shot"); G.learn("fireball");
    // starting gear
    var sword = G.addItem("sword_iron", 1);
    var shield = G.addItem("shield_oak", 1);
    var helm = G.addItem("helm_worn", 1);
    var chest = G.addItem("chest_worn", 1);
    var legs = G.addItem("legs_worn", 1);
    G.addItem("bow_hunter", 1);
    G.addItem("wand_ember", 1);
    G.addItem("tal_wrath", 1);          // one starter talisman to show the system
    sword.skillSlot = "guard_slash";
    G.state.eq.right = sword.uid; G.state.eq.left = shield.uid;
    G.state.eq.helmet = helm.uid; G.state.eq.chest = chest.uid; G.state.eq.legs = legs.uid;
    G.state.spells = ["fireball"];      // slot the starting spell
    G.save();
  };

})(window);
