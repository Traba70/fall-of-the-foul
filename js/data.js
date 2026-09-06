/* ============================================================
   Fall of the Foul — DATA
   All static definitions: stats, items, sets, skills, enemies, bosses.
   ============================================================ */
(function (G) {
  "use strict";

  // ---- Stats ---------------------------------------------------
  G.STATS = ["str", "mana", "magic", "def", "vit", "luck"];
  G.STAT_NAME = { str:"Strength", mana:"Mana", magic:"Magic", def:"Defense", vit:"Vitality", luck:"Luck" };
  G.STAT_DESC = {
    str:  "Physical damage (swords, bows, guns)",
    mana: "Max mana & regen speed",
    magic:"Spell damage",
    def:  "Damage negation",
    vit:  "Max health & health regen",
    luck: "Soul gain & chest fortune"
  };

  // ---- Classes -------------------------------------------------
  G.CLASSES = ["melee", "ranged", "mage"];
  G.CLASS_NAME = { melee:"Melee", ranged:"Ranger", mage:"Mage" };
  // which weapon type a class masters
  G.CLASS_WEAPON = { melee:"melee", ranged:"ranged", mage:"magic" };

  // ---- Armor sets ---------------------------------------------
  G.SETS = {
    vigil: {
      name:"Knight's Vigil",
      pieces:["helm_kv","chest_kv","legs_kv"],
      bonusDesc:"+12% Max HP, +12% Defense",
      effects:[ {type:"hpPct",val:0.12}, {type:"statPct",stat:"def",val:0.12} ]
    },
    shadow: {
      name:"Shadow Weave",
      pieces:["helm_sw","chest_sw","legs_sw"],
      bonusDesc:"+14% Attack Speed, +12% Skill Damage",
      effects:[ {type:"atkSpeed",val:0.14}, {type:"skillDmg",val:0.12} ]
    }
  };

  // ---- Items ---------------------------------------------------
  // slot: right/left = weapon hands, plus ring/helmet/chest/legs
  // type: melee/ranged/magic/shield/armor/ring
  // buff types read by state.js: statPct, hpPct, hpregen, soulPct, critPct, atkSpeed, skillDmg, lifesteal, burn, slow, thorns
  G.ITEMS = {
    // ---- Melee weapons
    sword_iron: { id:"sword_iron", name:"Iron Longsword", slot:"weapon", type:"melee",
      dmg:20, range:96, arc:1.5, rate:0.55, color:"#c3c8cf",
      stats:{str:2,def:1}, skills:["guard_slash","whirlwind"],
      buff:{type:"statPct",stat:"str",val:0.05,desc:"+5% Strength"},
      desc:"A dependable knight's blade." },
    katana_blood: { id:"katana_blood", name:"Bloodfang Katana", slot:"weapon", type:"melee",
      dmg:16, range:92, arc:1.3, rate:0.40, color:"#d98a8a",
      stats:{str:3,luck:1}, skills:["crimson_rush","quickstep"],
      buff:{type:"lifesteal",val:0.07,desc:"Heal 7% of melee damage dealt"},
      desc:"Thirsts for the blood of the foul." },

    // ---- Ranged weapons
    bow_hunter: { id:"bow_hunter", name:"Hunter's Bow", slot:"weapon", type:"ranged",
      dmg:15, range:560, rate:0.60, projSpeed:640, color:"#b79a6a",
      stats:{str:2,luck:1}, skills:["piercing_shot","arrow_rain"],
      buff:{type:"statPct",stat:"luck",val:0.08,desc:"+8% Luck"},
      desc:"Silent, patient, lethal." },
    pistol_ashen: { id:"pistol_ashen", name:"Ashen Pistol", slot:"weapon", type:"ranged",
      dmg:12, range:540, rate:0.34, projSpeed:820, color:"#9aa0a8",
      stats:{str:2}, skills:["fan_fire","explosive_round"],
      buff:{type:"critPct",val:0.10,desc:"+10% Critical chance"},
      desc:"Relic of a forgotten war." },

    // ---- Magic weapons
    wand_ember: { id:"wand_ember", name:"Emberwand", slot:"weapon", type:"magic",
      dmg:26, range:560, rate:0.70, projSpeed:560, manaCost:8, color:"#e6883a",
      stats:{magic:3,mana:2}, skills:["fireball","flame_nova"],
      buff:{type:"burn",val:0.35,desc:"Attacks set enemies aflame"},
      desc:"Kindled with everburning coals." },
    wand_frost: { id:"wand_frost", name:"Frostwand", slot:"weapon", type:"magic",
      dmg:22, range:560, rate:0.62, projSpeed:600, manaCost:7, color:"#7fc7e6",
      stats:{magic:2,mana:3}, skills:["ice_shard","frost_storm"],
      buff:{type:"slow",val:0.35,desc:"Attacks chill and slow enemies"},
      desc:"Whispers of the frozen north." },

    // ---- Offhand
    shield_oak: { id:"shield_oak", name:"Oaken Shield", slot:"left", type:"shield",
      color:"#8a6a3a", stats:{def:3,vit:2},
      buff:{type:"statPct",stat:"def",val:0.10,desc:"+10% Defense"},
      desc:"Banded oak, scarred by many blows." },
    tome_arcane: { id:"tome_arcane", name:"Arcane Tome", slot:"left", type:"shield",
      color:"#5a6ea8", stats:{mana:3,magic:1},
      buff:{type:"skillDmg",val:0.08,desc:"+8% Skill damage"},
      desc:"Pages that turn on their own." },

    // ---- Armor: Worn (starter, no set)
    helm_worn:  { id:"helm_worn",  name:"Worn Helm",     slot:"helmet", type:"armor", color:"#6b6257", stats:{def:1}, buff:{type:"statPct",stat:"def",val:0.03,desc:"+3% Defense"}, desc:"Rusted but serviceable." },
    chest_worn: { id:"chest_worn", name:"Worn Tunic",    slot:"chest",  type:"armor", color:"#6b6257", stats:{def:1,vit:1}, buff:{type:"hpregen",val:0.5,desc:"+0.5 HP/s regen"}, desc:"Padded cloth and old leather." },
    legs_worn:  { id:"legs_worn",  name:"Worn Trousers", slot:"legs",   type:"armor", color:"#6b6257", stats:{def:1}, buff:{type:"statPct",stat:"vit",val:0.03,desc:"+3% Vitality"}, desc:"Travel-stained wool." },

    // ---- Armor: Knight's Vigil (tank set)
    helm_kv:  { id:"helm_kv",  name:"Vigil Helm",    slot:"helmet", type:"armor", set:"vigil", color:"#9aa4b0", stats:{def:2,vit:1}, buff:{type:"hpregen",val:1.0,desc:"+1 HP/s regen"}, desc:"Cold steel, unblinking." },
    chest_kv: { id:"chest_kv", name:"Vigil Cuirass", slot:"chest",  type:"armor", set:"vigil", color:"#9aa4b0", stats:{def:4,vit:2}, buff:{type:"thorns",val:0.15,desc:"Reflect 15% of melee damage taken"}, desc:"Forged for the last watch." },
    legs_kv:  { id:"legs_kv",  name:"Vigil Greaves", slot:"legs",   type:"armor", set:"vigil", color:"#9aa4b0", stats:{def:2,vit:2}, buff:{type:"statPct",stat:"def",val:0.06,desc:"+6% Defense"}, desc:"Greaves that never buckle." },

    // ---- Armor: Shadow Weave (agile set)
    helm_sw:  { id:"helm_sw",  name:"Shadow Hood",   slot:"helmet", type:"armor", set:"shadow", color:"#4a4658", stats:{luck:2,mana:1}, buff:{type:"statPct",stat:"luck",val:0.06,desc:"+6% Luck"}, desc:"Woven from dusk itself." },
    chest_sw: { id:"chest_sw", name:"Shadow Garb",   slot:"chest",  type:"armor", set:"shadow", color:"#4a4658", stats:{mana:3,magic:2,luck:1}, buff:{type:"skillDmg",val:0.06,desc:"+6% Skill damage"}, desc:"Light as a held breath." },
    legs_sw:  { id:"legs_sw",  name:"Shadow Treads", slot:"legs",   type:"armor", set:"shadow", color:"#4a4658", stats:{luck:2,mana:1}, buff:{type:"atkSpeed",val:0.06,desc:"+6% Attack speed"}, desc:"Leave no footprint." },

    // ---- Rings
    ring_vigor:   { id:"ring_vigor",   name:"Band of Vigor",   slot:"ring", type:"ring", color:"#c0392b", stats:{vit:3}, buff:{type:"hpregen",val:1.5,desc:"+1.5 HP/s regen"}, desc:"A heart that will not stop." },
    ring_magi:    { id:"ring_magi",    name:"Ring of the Magi", slot:"ring", type:"ring", color:"#3b6fb0", stats:{mana:2,magic:2}, buff:{type:"statPct",stat:"magic",val:0.08,desc:"+8% Magic"}, desc:"Hums with stored spellcraft." },
    ring_fortune: { id:"ring_fortune", name:"Fortune Ring",    slot:"ring", type:"ring", color:"#d9c37a", stats:{luck:4}, buff:{type:"soulPct",val:0.15,desc:"+15% Souls gained"}, desc:"Fate leans a little your way." },
    ring_titan:   { id:"ring_titan",   name:"Titan's Signet",  slot:"ring", type:"ring", color:"#b0722a", stats:{str:3,def:1}, buff:{type:"statPct",stat:"str",val:0.08,desc:"+8% Strength"}, desc:"Heavy with old power." }
  };

  // slot a weapon can occupy = "right" (or "left" if it is an offhand)
  G.itemFitsSlot = function (id, slot) {
    var it = G.ITEMS[id]; if (!it) return false;
    if (it.slot === "weapon") return slot === "right" || slot === "left";
    return it.slot === slot;
  };

  // ---- Skills / Spells ----------------------------------------
  // wtype = which weapon family can slot it. kind read by arena.js
  G.SKILLS = {
    // Melee
    guard_slash: { id:"guard_slash", name:"Guard Slash", wtype:"melee", cd:2.6, mana:0, mult:2.4, kind:"arc", arc:2.0, range:150, knock:220, desc:"A wide, staggering sweep." },
    whirlwind:   { id:"whirlwind",   name:"Whirlwind",   wtype:"melee", cd:6, mana:0, mult:1.5, kind:"spin", radius:150, ticks:5, desc:"Spin, striking all around you." },
    crimson_rush:{ id:"crimson_rush",name:"Crimson Rush",wtype:"melee", cd:5, mana:0, mult:2.6, kind:"dash", dist:280, lifesteal:0.4, desc:"Dash through foes, drinking blood." },
    quickstep:   { id:"quickstep",   name:"Quickstep",   wtype:"melee", cd:4, mana:0, mult:2.2, kind:"blink", dist:220, iframe:0.5, desc:"Blink behind and strike." },
    // Ranged
    piercing_shot:{ id:"piercing_shot", name:"Piercing Shot", wtype:"ranged", cd:4, mana:0, mult:3.2, kind:"pierce", pierce:99, speed:1000, desc:"A shot that runs through all." },
    arrow_rain:  { id:"arrow_rain",  name:"Arrow Rain",  wtype:"ranged", cd:7, mana:0, mult:0.9, kind:"rain", radius:150, count:14, desc:"Call arrows down on a mark." },
    fan_fire:    { id:"fan_fire",    name:"Fan Fire",    wtype:"ranged", cd:5, mana:0, mult:1.1, kind:"fan", count:5, spread:0.5, desc:"Unload a spread of shots." },
    explosive_round:{ id:"explosive_round", name:"Explosive Round", wtype:"ranged", cd:6, mana:0, mult:2.2, kind:"boom", radius:130, speed:560, desc:"A round that bursts on impact." },
    // Magic
    fireball:    { id:"fireball",    name:"Fireball",    wtype:"magic", cd:3.5, mana:16, mult:3.0, kind:"boom", radius:130, speed:460, burn:true, desc:"Hurl a bursting ball of flame." },
    flame_nova:  { id:"flame_nova",  name:"Flame Nova",  wtype:"magic", cd:6, mana:26, mult:2.4, kind:"nova", radius:190, burn:true, desc:"Erupt in a ring of fire." },
    ice_shard:   { id:"ice_shard",   name:"Ice Shard",   wtype:"magic", cd:4, mana:13, mult:1.4, kind:"fan", count:3, spread:0.28, slow:true, speed:720, desc:"Loose splintering shards of ice." },
    frost_storm: { id:"frost_storm", name:"Frost Storm", wtype:"magic", cd:8, mana:32, mult:0.5, kind:"field", radius:170, dur:4, slow:true, desc:"A creeping storm that chills and rends." }
  };

  // ---- Enemy types --------------------------------------------
  // role: melee / ranged / heavy / mage
  G.ENEMIES = {
    soldier: { id:"soldier", name:"Foul Soldier", role:"melee", hp:38, dmg:7, speed:98, range:46, radius:15, windup:0.5, color:"#7d8a6a" },
    archer:  { id:"archer",  name:"Foul Archer",  role:"ranged", hp:30, dmg:9, speed:82, range:430, radius:14, windup:0.7, projSpeed:420, color:"#6a8a7d" },
    knight:  { id:"knight",  name:"Fallen Knight",role:"melee", hp:82, dmg:12, speed:72, range:54, radius:20, windup:0.75, color:"#8a8f9a" },
    giant:   { id:"giant",   name:"Grave Giant",  role:"heavy", hp:190, dmg:20, speed:46, range:96, radius:34, windup:1.05, slamR:150, color:"#7a6a55" },
    cultist: { id:"cultist", name:"Rot Cultist",  role:"mage",  hp:44, dmg:11, speed:70, range:390, radius:16, windup:0.9, projSpeed:300, color:"#8a6a9a" }
  };

  G.RANKS = {
    1: { hpM:1.0, dmgM:1.0, spdM:1.0, soul:1.0, ring:"#8f8571" },
    2: { hpM:1.9, dmgM:1.35, spdM:1.08, soul:2.4, ring:"#cfa04a" },
    3: { hpM:3.4, dmgM:1.8, spdM:1.16, soul:4.4, ring:"#c0392b" }
  };

  // ---- Bosses (5) ---------------------------------------------
  // behavior implemented in arena.js keyed by id
  G.BOSSES = [
    { id:"godrik",   name:"Godrik, the Fallen Knight", hp:900,  dmg:24, speed:74,  radius:40, color:"#b6bcc6",
      blurb:"A grafted lord who would be king." },
    { id:"malenketh",name:"Malenketh, Blade of Rot",   hp:820,  dmg:20, speed:128, radius:32, color:"#c9b06a",
      blurb:"Her every step blooms with rot." },
    { id:"radaghast",name:"Radaghast, the Star-Caller", hp:860, dmg:18, speed:60,  radius:36, color:"#8a7fd6",
      blurb:"He pulls the stars down as weapons." },
    { id:"grafted",  name:"The Grafted Giant",          hp:1300, dmg:28, speed:42,  radius:54, color:"#8a6f52",
      blurb:"A mountain of stolen limbs." },
    { id:"mohgwyn",  name:"Mohgwyn, the Blood Sovereign", hp:980, dmg:22, speed:100, radius:38, color:"#a03040",
      blurb:"Sovereign of a cursed dynasty of blood." }
  ];

  // ---- Wave composition ---------------------------------------
  // Returns spawn list [{type, rank}] for a given stage + wave index (0..3).
  // Interpretation note: higher rank = stronger. Early waves start easy and escalate.
  G.buildWave = function (stage, waveIdx) {
    var list = [];
    function add(type, rank, n) { for (var i = 0; i < n; i++) list.push({ type:type, rank:rank }); }
    // baseline pressure grows slowly with stage
    var s = stage - 1;
    if (waveIdx === 0) {            // opener: gentle
      add("soldier", 1, 3 + Math.min(2, s));
      add("archer", 1, 1);
      if (s >= 1) add("soldier", 2, 1);
    } else if (waveIdx === 1) {     // mixed
      add("soldier", 1, 3);
      add("archer", 1, 1 + Math.min(1, s));
      add("soldier", 2, 1 + Math.min(2, s));
      if (s >= 2) add("knight", 1, 1);
    } else if (waveIdx === 2) {     // ranged + elite
      add("soldier", 1, 2);
      add("archer", 2, 1 + Math.min(1, s));
      add("cultist", 1, 1 + Math.min(1, s));
      add("knight", 1, 1 + Math.min(1, s));
      if (s >= 1) add("soldier", 2, 2);
    } else {                         // pre-boss surge
      add("soldier", 2, 2);
      add("knight", 2, 1 + Math.min(1, s));
      add("archer", 2, 1);
      add("cultist", 2, 1);
      add("giant", 1 + Math.min(2, s >= 3 ? 2 : 1), 1);
      if (s >= 2) add("knight", 3, 1);
    }
    return list;
  };

})(window);
