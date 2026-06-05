// ═══════════════════════════════════════
// 百层塔 · 肉鸽爬塔网页游戏
// 月影出品 · 为小口木宝打造 v1.0
// ═══════════════════════════════════════

// ─── 玩家状态 ───
let player = {
  floor: 1,
  hp: 5, maxHp: 5,
  atk: 1,
  gold: 0,
  blessing: null,
  curse: null,
  inventory: [],       // 背包（药水/道具/钥匙）
  treasures: [],       // 宝物（被动效果）
  towerOutside: false, // 是否在塔外
  towerOutsideFloors: 0,
  weather: null,
  fateCards: [],
  killedBosses: [],
  eventsSeen: [],
  shopAppeared: false,
  deaths: 0
};

// ─── 渲染函数 ───
function updateStatus() {
  document.getElementById('hp').textContent = player.hp + '/' + player.maxHp;
  document.getElementById('atk').textContent = player.atk;
  document.getElementById('gold').textContent = player.gold;
  document.getElementById('bless').textContent = player.blessing || '无';
  document.getElementById('curse').textContent = player.curse || '无';
}

function setFloorDisplay() {
  if (player.towerOutside) {
    document.getElementById('floor-display').textContent = '塔外 · ???';
    document.getElementById('floor-name').textContent = '（你在塔的外壁上，不知道到了第几层）';
  } else {
    document.getElementById('floor-display').textContent = '第 ' + player.floor + ' 层';
    let name = '';
    if (player.floor === 25) name = '· BOSS层';
    else if (player.floor === 50) name = '· BOSS层';
    else if (player.floor === 75) name = '· BOSS层';
    else if (player.floor === 95) name = '· 奖励之间';
    else if (player.floor === 96) name = '· 迷宫';
    else if (player.floor === 97) name = '· 机关之地';
    else if (player.floor === 98) name = '· 魔龙巢穴';
    else if (player.floor === 99) name = '· 知识之间';
    else if (player.floor === 100) name = '· 魔王之间';
    else if (player.floor === 101) name = '· 真·魔王之间';
    document.getElementById('floor-name').textContent = name;
  }
}

function showNarrative(text) {
  document.getElementById('narrative').textContent = text;
  document.getElementById('narrative').scrollTop = 0;
}

function showChoices(choices) {
  const container = document.getElementById('choices');
  container.innerHTML = '';
  choices.forEach((c, i) => {
    const btn = document.createElement('button');
    btn.className = 'choice-btn';
    btn.innerHTML = '<span class="choice-label">' + String.fromCharCode(65+i) + '</span>' + c.label;
    btn.addEventListener('click', () => handleChoice(c, i));
    container.appendChild(btn);
  });
}

function addBackpackButton() {
  let btn = document.getElementById('backpack-btn');
  if (!btn) {
    btn = document.createElement('button');
    btn.id = 'backpack-btn';
    btn.textContent = '🎒 背包';
    btn.style.cssText = 'position:fixed;top:10px;right:10px;background:#1a1a2e;border:1px solid #f0c060;border-radius:8px;padding:8px 14px;color:#f0c060;cursor:pointer;z-index:100;font-size:13px;';
    btn.addEventListener('click', openBackpack);
    document.body.appendChild(btn);
  }
}

function openBackpack() {
  if (player.inventory.length === 0) {
    showNarrative('背包空空如也……');
    return;
  }
  let list = '【背包物品】\n';
  player.inventory.forEach((item, i) => {
    list += (i+1) + '. ' + item.name + ' - ' + item.desc + '\n';
  });
  list += '\n点击下方选项使用物品：';
  showNarrative(list);
  const choices = player.inventory.map((item, i) => ({
    label: '使用「' + item.name + '」',
    action: () => useItem(i)
  }));
  choices.push({ label: '关闭背包', action: () => {} });
  showChoices(choices);
}

function useItem(index) {
  const item = player.inventory[index];
  if (!item) return;
  if (item.type === 'potion') {
    player.hp = Math.min(player.maxHp, player.hp + item.value);
    showNarrative('使用了「' + item.name + '」，回复了 ' + item.value + ' 点生命！❤️');
  } else if (item.type === 'atkUp') {
    player.atk += item.value;
    showNarrative('使用了「' + item.name + '」，攻击力 +' + item.value + '！⚔️');
  } else if (item.type === 'key') {
    showNarrative('这是一把钥匙，在遇到宝箱时会自动使用。🔑');
  }
  player.inventory.splice(index, 1);
  updateStatus();
  setTimeout(advanceFloor, 1200);
}

// ─── 宝物被动效果 ───
function applyTreasurePassive() {
  player.maxHp = 5;
  player.atk = 1;
  player.treasures.forEach(t => {
    if (t.effect === 'maxHpUp') player.maxHp += t.value;
    if (t.effect === 'atkUp') player.atk += t.value;
  });
  if (player.hp > player.maxHp) player.hp = player.maxHp;
}

function hasTreasure(id) { return player.treasures.some(t => t.id === id); }

// ─── 天气系统 ───
const weathers = ['晴空', '浓雾', '暴雨', '月光', '雷暴', '血月', '微风'];
function rollWeather() {
  if (Math.random() < 0.3) {
    player.weather = weathers[Math.floor(Math.random() * weathers.length)];
    showNarrative('【天气变化】当前塔内天气：' + player.weather + '\n\n' + (document.getElementById('narrative').textContent || ''));
  } else {
    player.weather = null;
  }
}
function weatherMod(chance) {
  if (player.weather === '浓雾') return chance * 0.7;
  if (player.weather === '月光') return chance * 1.2;
  if (player.weather === '雷暴') return chance * 0.6;
  if (player.weather === '血月') return chance * 0.5;
  return chance;
}

// =========================================
// 第二批：小怪属性数据（70种）+ 事件池
// =========================================

// ─── 小怪数据（70种） ───
const MONSTERS = {
  '骷髅兵':     {hp:2, atk:1, gold:8,  tier:1},
  '史莱姆':     {hp:1, atk:1, gold:5,  tier:1},
  '蝙蝠':       {hp:1, atk:1, gold:4,  tier:1},
  '哥布林':     {hp:2, atk:2, gold:10, tier:1},
  '幽灵':       {hp:2, atk:1, gold:6,  tier:1, effect:'闪避'},
  '石像鬼':     {hp:3, atk:2, gold:12, tier:2},
  '火焰精灵':   {hp:2, atk:3, gold:15, tier:2},
  '冰霜蜥蜴':   {hp:3, atk:2, gold:12, tier:2},
  '暗影触手':   {hp:2, atk:2, gold:10, tier:2},
  '毒蝎':       {hp:2, atk:2, gold:10, tier:2, effect:'中毒'},
  '食人花':     {hp:3, atk:2, gold:12, tier:2},
  '诅咒娃娃':   {hp:2, atk:1, gold:8,  tier:2, effect:'诅咒'},
  '雷电之魂':   {hp:3, atk:3, gold:16, tier:2},
  '血蝙蝠':     {hp:2, atk:2, gold:10, tier:2, effect:'吸血'},
  '岩石魔像':   {hp:4, atk:2, gold:14, tier:3},
  '怨灵':       {hp:3, atk:3, gold:13, tier:3},
  '荆棘藤蔓':   {hp:3, atk:2, gold:11, tier:3, effect:'反伤'},
  '镜中幻影':   {hp:3, atk:3, gold:15, tier:3, effect:'复制'},
  '时空裂虫':   {hp:4, atk:3, gold:18, tier:3},
  '熔岩蜗牛':   {hp:5, atk:3, gold:16, tier:3},
  '水晶蜘蛛':   {hp:3, atk:3, gold:15, tier:3, effect:'减速'},
  '诅咒之眼':   {hp:4, atk:3, gold:17, tier:3, effect:'诅咒'},
  '镜中魅影':   {hp:3, atk:4, gold:18, tier:3},
  '时之沙虫':   {hp:5, atk:3, gold:20, tier:3},
  '奇美拉':     {hp:6, atk:4, gold:22, tier:4},
  '石像鬼王':   {hp:5, atk:4, gold:20, tier:4},
  '时间窃贼':   {hp:4, atk:4, gold:18, tier:4, effect:'降攻'},
  '火焰史莱姆王':{hp:6, atk:3, gold:20, tier:4},
  '雷鸟':       {hp:5, atk:5, gold:25, tier:4},
  '沙虫':       {hp:7, atk:3, gold:22, tier:4},
  '暗影刺客学徒':{hp:4, atk:5, gold:20, tier:4},
  '荆棘女王':   {hp:5, atk:4, gold:22, tier:4, effect:'反伤'},
  '毒液飞龙':   {hp:7, atk:5, gold:28, tier:4, effect:'中毒'},
  '暗影猎犬':   {hp:4, atk:4, gold:18, tier:4},
  '冰晶凤凰幼体':{hp:6, atk:4, gold:24, tier:4},
  '虚空触须':   {hp:5, atk:4, gold:20, tier:4},
  '血月狼人':   {hp:7, atk:5, gold:26, tier:4},
  '贪食之蛆':   {hp:8, atk:3, gold:20, tier:4},
  '镜面分身':   {hp:4, atk:4, gold:18, tier:4, effect:'复制'},
  '锈蚀骑士':   {hp:6, atk:5, gold:24, tier:4},
  '深渊之瞳':   {hp:5, atk:5, gold:22, tier:4, effect:'诅咒'},
  '雷暴之核':   {hp:6, atk:6, gold:28, tier:4},
  '毒雾之母':   {hp:7, atk:4, gold:25, tier:4, effect:'中毒'},
  '黄金史莱姆': {hp:5, atk:2, gold:40, tier:4},
  '暗影主教':   {hp:6, atk:5, gold:26, tier:5},
  '时光残渣':   {hp:5, atk:4, gold:22, tier:5, effect:'减速'},
  '冰封巨人':   {hp:8, atk:5, gold:30, tier:5},
  '熔岩核心':   {hp:7, atk:6, gold:28, tier:5},
  '雷霆之鹰':   {hp:6, atk:6, gold:30, tier:5},
  '虚空之种':   {hp:7, atk:6, gold:32, tier:5},
  '深渊之口':   {hp:8, atk:7, gold:35, tier:5},
  '火元素长老': {hp:7, atk:7, gold:33, tier:5},
  '冰霜巨虫':   {hp:9, atk:5, gold:30, tier:5},
  '暗影蝙蝠王': {hp:6, atk:6, gold:28, tier:5},
  '毒液触手':   {hp:7, atk:5, gold:28, tier:5, effect:'中毒'},
  '熔岩晶蝎':   {hp:8, atk:6, gold:32, tier:5},
  '虚空海星':   {hp:7, atk:6, gold:30, tier:5},
  '时间蠕虫':   {hp:8, atk:5, gold:28, tier:5, effect:'减速'},
  '血月蜘蛛':   {hp:6, atk:6, gold:28, tier:5},
  '腐蚀蝇群':   {hp:5, atk:5, gold:25, tier:5, effect:'中毒'},
  '雷电之核':   {hp:7, atk:7, gold:32, tier:5},
  '骨龙幼崽':   {hp:10, atk:6, gold:35, tier:5},
  '荆棘巨兽':   {hp:9, atk:6, gold:32, tier:5, effect:'反伤'},
  '幽灵船残骸': {hp:7, atk:6, gold:30, tier:5},
  '暗影泥怪':   {hp:8, atk:5, gold:28, tier:5},
  '镜之鬣狗':   {hp:6, atk:7, gold:30, tier:5},
  '空间裂缝':   {hp:8, atk:7, gold:35, tier:5},
  '毒雾妖花':   {hp:7, atk:6, gold:30, tier:5, effect:'中毒'},
  '风暴之眼':   {hp:9, atk:7, gold:35, tier:5},
  '诅咒铠甲':   {hp:8, atk:7, gold:33, tier:5, effect:'诅咒'},
};

// ─── 根据难度抽取小怪 ───
function getMonster(floor) {
  let tier = floor < 20 ? 1 : floor < 40 ? 2 : floor < 60 ? 3 : floor < 90 ? 4 : 5;
  if (player.towerOutside) tier = Math.min(tier, 4);
  let pool = Object.entries(MONSTERS).filter(([k,v]) => v.tier <= tier+1 && v.tier >= tier-1);
  if (pool.length === 0) pool = Object.entries(MONSTERS);
  let [name, data] = pool[Math.floor(Math.random() * pool.length)];
  return { name, ...data };
}

// ─── 战斗函数 ───
function battleMonster(monster) {
  let m = {...monster};
  let battleLog = [];
  let round = 0;
  while (m.hp > 0 && player.hp > 0) {
    round++;
    // 玩家攻击
    let pAtk = player.atk;
    if (player.weather === '雷暴') pAtk = Math.floor(pAtk * 1.3);
    if (m.effect === '闪避' && Math.random() < 0.3) {
      battleLog.push(`第${round}回合：${m.name}闪避了攻击！`);
    } else {
      m.hp -= pAtk;
      battleLog.push(`第${round}回合：你对${m.name}造成${pAtk}点伤害`);
    }
    if (m.hp <= 0) {
      battleLog.push(`${m.name}被击败！获得${m.gold}金币`);
      player.gold += m.gold;
      break;
    }
    // 怪物攻击
    let mAtk = m.atk;
    if (m.effect === '中毒' && round > 1) {
      player.hp -= 1;
      battleLog.push(`${m.name}的毒素造成1点伤害`);
    }
    if (m.effect === '反伤' && round === 1) {
      player.hp -= Math.floor(mAtk * 0.5);
      battleLog.push(`${m.name}的反伤造成${Math.floor(mAtk*0.5)}点伤害`);
    }
    if (m.effect === '吸血' && round > 1) {
      m.hp += 1;
      battleLog.push(`${m.name}吸取了1点生命`);
    }
    player.hp -= mAtk;
    battleLog.push(`${m.name}对你造成${mAtk}点伤害`);
    if (player.hp <= 0) {
      battleLog.push('你倒下了……');
      break;
    }
  }
  return battleLog;
}


// ─── 事件池：按难度分五档，每档含普通事件 ───
const EVENT_POOL = {
  // 1-20层 基础事件
  tier1: [
    {type:'monster', text:'一只{name}拦住了你的去路！',  weight:35},
    {type:'treasure', text:'你发现了一个破旧的宝箱', weight:15, rarity:'white'},
    {type:'treasure', text:'角落里藏着一个木箱', weight:10, rarity:'white'},
    {type:'gold', text:'地上散落着几枚金币', gold:[3,8], weight:10},
    {type:'gold', text:'你在墙缝里发现了一些金币', gold:[5,12], weight:8},
    {type:'heal', text:'你找到了一小瓶恢复药水', heal:[1,2], weight:8},
    {type:'trap', text:'触发了一个毒箭陷阱！', dmg:[1,2], weight:5},
    {type:'nothing', text:'这层空空荡荡，什么也没有', weight:5},
    {type:'altar', text:'一座古老的祭坛散发着微光', weight:2},
    {type:'card', text:'一张命运卡牌悬浮在空中', weight:2},
  ],
  // 21-40层
  tier2: [
    {type:'monster', text:'{name}发出一声嘶吼冲了过来！', weight:30},
    {type:'treasure', text:'一个银色的宝箱被锁链缠绕', weight:15, rarity:'blue'},
    {type:'treasure', text:'墙上的暗格里塞着一个宝箱', weight:12, rarity:'blue'},
    {type:'gold', text:'一堆金币散落在角落', gold:[8,18], weight:10},
    {type:'gold', text:'你发现了一个钱袋', gold:[10,22], weight:8},
    {type:'heal', text:'一瓶泛着荧光的恢复药', heal:[2,3], weight:8},
    {type:'trap', text:'地面突然塌陷！', dmg:[2,3], weight:6},
    {type:'trap', text:'滚石从上方砸下！', dmg:[2,4], weight:5},
    {type:'nothing', text:'一阵阴风吹过，什么都没有', weight:4},
    {type:'altar', text:'一座远古祭坛浮现出来', weight:2},
    {type:'card', text:'命运卡牌翻转在空中', weight:2},
    {type:'shop', text:'一个流浪商人在这里歇脚', weight:2},
  ],
  // 41-60层
  tier3: [
    {type:'monster', text='{name}从阴影中缓缓现身', weight:28},
    {type:'treasure', text:'黄金宝箱散发着诱人的光芒', weight:15, rarity:'purple'},
    {type:'treasure', text:'被魔法封印的宝箱', weight:10, rarity:'purple'},
    {type:'gold', text:'成堆的金币铺满地面', gold:[15,35], weight:10},
    {type:'heal', text:'一瓶强效恢复药剂', heal:[3,5], weight:8},
    {type:'trap', text:'魔法符文闪烁！', dmg:[3,5], weight:7},
    {type:'trap', text:'黑暗能量吞噬了你', dmg:[3,5], weight:6},
    {type:'nothing', text:'这层的空气异常沉重', weight:5},
    {type:'altar', text:'一座被诅咒的祭坛', weight:4},
    {type:'card', text:'命运之轮在转动', weight:3},
    {type:'shop', text:'一个神秘商人向你招呼', weight:3},
    {type:'hidden', text:'墙壁上有一道暗门...', weight:1},
  ],
  // 61-90层
  tier4: [
    {type:'monster', text='{name}从虚空中撕裂而出！', weight:26},
    {type:'treasure', text:'传说级的宝箱被藤蔓包裹', weight:15, rarity:'gold'},
    {type:'treasure', text:'一个发出嗡鸣声的宝箱', weight:12, rarity:'gold'},
    {type:'gold', text:'一座小金山！', gold:[25,55], weight:10},
    {type:'heal', text:'一瓶散发着金光的圣药', heal:[4,7], weight:8},
    {type:'trap', text:'时空裂缝在身边裂开！', dmg:[4,7], weight:7},
    {type:'trap', text:'深渊的低语撕扯灵魂', dmg:[5,8], weight:6},
    {type:'nothing', text:'虚空吞噬了这层的一切', weight:5},
    {type:'altar', text:'一座散发着邪气的祭坛', weight:4},
    {type:'card', text:'命运在此刻凝结', weight:3},
    {type:'shop', text:'一个半透明的商人凭空出现', weight:3},
    {type:'hidden', text:'空气中有一道裂缝...', weight:1},
  ],
  // 91+ 高阶事件
  tier5: [
    {type:'monster', text='{name}——深渊的守卫出现了！', weight:25},
    {type:'treasure', text:'神话级宝箱在黑暗中发光', weight:15, rarity:'gold'},
    {type:'treasure', text:'被诸神遗落的宝箱', weight:10, rarity:'gold'},
    {type:'gold', text:'满地都是闪闪发光的金币', gold:[40,80], weight:10},
    {type:'heal', text:'远古神殿的圣水', heal:[5,10], weight:8},
    {type:'trap', text:'空间崩坏！', dmg:[6,10], weight:8},
    {type:'trap', text:'因果律武器启动！', dmg:[7,12], weight:6},
    {type:'nothing', text:'绝对的虚无笼罩着你', weight:4},
    {type:'altar', text:'黑暗祭坛呼唤着你', weight:4},
    {type:'card', text:'命运在此交错', weight:4},
    {type:'hidden', text:'空间扭曲中藏着一道门...', weight:2},
  ],
};

// ─── 根据楼层抽取事件 ───
function getEvent(floor) {
  let tierKey = floor < 20 ? 'tier1' : floor < 40 ? 'tier2' : floor < 60 ? 'tier3' : floor < 90 ? 'tier4' : 'tier5';
  let pool = EVENT_POOL[tierKey];
  // 加权随机
  let totalWeight = pool.reduce((s, e) => s + e.weight, 0);
  let roll = Math.random() * totalWeight;
  let cumulative = 0;
  for (let e of pool) {
    cumulative += e.weight;
    if (roll <= cumulative) return {...e};
  }
  return pool[0];
}


// ─── 宝物数据（50种） ───
const TREASURES = {
  // 白色（普通）- 15种
  '生锈的剑':       {rarity:'white', effect:'atk', value:1, desc:'攻击+1'},
  '木盾':           {rarity:'white', effect:'hp', value:2, desc:'生命+2'},
  '幸运硬币':       {rarity:'white', effect:'gold', value:5, desc:'获得5金币'},
  '破旧的戒指':     {rarity:'white', effect:'atk', value:1, desc:'攻击+1'},
  '羽毛护符':       {rarity:'white', effect:'hp', value:1, desc:'生命+1'},
  '铜质勋章':       {rarity:'white', effect:'atk', value:1, desc:'攻击+1'},
  '小瓶药剂':       {rarity:'white', effect:'heal', value:2, desc:'恢复2生命'},
  '打火石':         {rarity:'white', effect:'crit', value:0.05, desc:'暴击率+5%'},
  '皮革护腕':       {rarity:'white', effect:'hp', value:2, desc:'生命+2'},
  '铜币袋':         {rarity:'white', effect:'gold', value:8, desc:'获得8金币'},
  '短刃':           {rarity:'white', effect:'atk', value:2, desc:'攻击+2'},
  '布甲':           {rarity:'white', effect:'hp', value:1, desc:'生命+1'},
  '蜡烛':           {rarity:'white', effect:'dodge', value:0.05, desc:'闪避+5%'},
  '旧怀表':         {rarity:'white', effect:'crit', value:0.03, desc:'暴击+3%'},
  '草药包':         {rarity:'white', effect:'heal', value:3, desc:'恢复3生命'},
  // 蓝色（稀有）- 12种
  '精钢长剑':       {rarity:'blue', effect:'atk', value:3, desc:'攻击+3'},
  '骑士盾':         {rarity:'blue', effect:'hp', value:4, desc:'生命+4'},
  '幸运护符':       {rarity:'blue', effect:'crit', value:0.1, desc:'暴击+10%'},
  '银戒指':         {rarity:'blue', effect:'atk', value:2, desc:'攻击+2'},
  '治疗石':         {rarity:'blue', effect:'heal', value:5, desc:'恢复5生命'},
  '暗影斗篷':       {rarity:'blue', effect:'dodge', value:0.1, desc:'闪避+10%'},
  '魔法卷轴':       {rarity:'blue', effect:'atk', value:3, desc:'攻击+3'},
  '精灵之泪':       {rarity:'blue', effect:'hp', value:3, desc:'生命+3'},
  '暴风之靴':       {rarity:'blue', effect:'dodge', value:0.08, desc:'闪避+8%'},
  '红宝石':         {rarity:'blue', effect:'atk', value:2, desc:'攻击+2'},
  '生命之种':       {rarity:'blue', effect:'hp', value:5, desc:'生命+5'},
  '贤者笔记':       {rarity:'blue', effect:'crit', value:0.08, desc:'暴击+8%'},
  // 紫色（史诗）- 12种
  '龙鳞甲':         {rarity:'purple', effect:'hp', value:8, desc:'生命+8'},
  '噬魂之刃':       {rarity:'purple', effect:'atk', value:5, desc:'攻击+5'},
  '圣光之盾':       {rarity:'purple', effect:'hp', value:6, desc:'生命+6'},
  '凤凰羽毛':       {rarity:'purple', effect:'revive', value:1, desc:'死亡时复活1次'},
  '时光沙漏':       {rarity:'purple', effect:'crit', value:0.15, desc:'暴击+15%'},
  '暗月之戒':       {rarity:'purple', effect:'atk', value:4, desc:'攻击+4'},
  '星界斗篷':       {rarity:'purple', effect:'dodge', value:0.15, desc:'闪避+15%'},
  '龙血药剂':       {rarity:'purple', effect:'hp', value:7, desc:'生命+7'},
  '雷霆之锤':       {rarity:'purple', effect:'atk', value:6, desc:'攻击+6'},
  '虚空之种':       {rarity:'purple', effect:'hp', value:5, desc:'生命+5'},
  '贤者之石':       {rarity:'purple', effect:'atk', value:4, desc:'攻击+4'},
  '命运之骰':       {rarity:'purple', effect:'crit', value:0.12, desc:'暴击+12%'},
  // 金色（传说）- 11种
  '王者之剑':       {rarity:'gold', effect:'atk', value:10, desc:'攻击+10'},
  '不死鸟之眼':     {rarity:'gold', effect:'revive', value:2, desc:'复活2次'},
  '宙斯之盾':       {rarity:'gold', effect:'hp', value:15, desc:'生命+15'},
  '命运之轮':       {rarity:'gold', effect:'crit', value:0.25, desc:'暴击+25%'},
  '星云法袍':       {rarity:'gold', effect:'dodge', value:0.2, desc:'闪避+20%'},
  '混沌之刃':       {rarity:'gold', effect:'atk', value:8, desc:'攻击+8'},
  '世界树之叶':     {rarity:'gold', effect:'hp', value:12, desc:'生命+12'},
  '时之沙漏':       {rarity:'gold', effect:'crit', value:0.2, desc:'暴击+20%'},
  '诸神的遗产':     {rarity:'gold', effect:'atk', value:7, desc:'攻击+7'},
  '深渊之心':       {rarity:'gold', effect:'hp', value:10, desc:'生命+10'},
  '无尽之袋':       {rarity:'gold', effect:'gold', value:100, desc:'获得100金币'},
};

// ─── 获取宝物 ───
function getTreasure(rarity) {
  let pool = Object.entries(TREASURES).filter(([k,v]) => v.rarity === rarity);
  if (pool.length === 0) pool = Object.entries(TREASURES).filter(([k,v]) => v.rarity === 'white');
  let [name, data] = pool[Math.floor(Math.random() * pool.length)];
  return { name, ...data };
}

// ─── 祭坛（6种） ───
const ALTARS = {
  '力量祭坛': {text:'力量祭坛散发着红光——献祭3金币换取攻击+2', cost:{gold:3}, reward:{atk:2}},
  '智慧祭坛': {text:'智慧祭坛闪烁着蓝光——支付3攻击换取金币翻倍', cost:{atk:3}, reward:{goldMult:1}},
  '贪婪祭坛': {text:'贪婪祭坛金光灿烂——支付当前一半金币换取全属性+1', cost:{goldHalf:true}, reward:{atk:1, hp:1}},
  '生命祭坛': {text:'生命祭坛涌出温暖光芒——献祭2攻击换取生命+5', cost:{atk:2}, reward:{hp:5}},
  '命运祭坛': {text:'命运祭坛旋转着——50%概率攻击+5，50%概率生命-3', cost:{risk:true}, reward:{atk5or:{hp:-3}}},
  '暗影祭坛': {text:'暗影祭坛低语着——献祭3生命换取暴击率+15%', cost:{hp:3}, reward:{crit:0.15}},
};

// ─── 命运卡牌（塔罗，10张） ───
const TAROT_CARDS = {
  '命运之轮': {text_upright:'命运之轮正位：攻击+3', text_reverse:'命运之轮逆位：生命-2', upright:{atk:3}, reverse:{hp:-2}},
  '星星':     {text_upright:'星星正位：生命+4', text_reverse:'星星逆位：攻击-1', upright:{hp:4}, reverse:{atk:-1}},
  '塔':       {text_upright:'塔正位：暴击+15%', text_reverse:'塔逆位：生命-3', upright:{crit:0.15}, reverse:{hp:-3}},
  '死神':     {text_upright:'死神正位：攻击+5但生命-2', text_reverse:'死神逆位：无事发生', upright:{atk:5,hp:-2}, reverse:{}},
  '月亮':     {text_upright:'月亮正位：闪避+15%', text_reverse:'月亮逆位：暴击-5%', upright:{dodge:0.15}, reverse:{crit:-0.05}},
  '太阳':     {text_upright:'太阳正位：全属性+2', text_reverse:'太阳逆位：攻击-2', upright:{atk:2,hp:2}, reverse:{atk:-2}},
  '审判':     {text_upright:'审判正位：复活+1', text_reverse:'审判逆位：生命-4', upright:{revive:1}, reverse:{hp:-4}},
  '魔术师':   {text_upright:'魔术师正位：获得50金币', text_reverse:'魔术师逆位：失去20金币', upright:{gold:50}, reverse:{gold:-20}},
  '女祭司':   {text_upright:'女祭司正位：生命+6', text_reverse:'女祭司逆位：攻击-2', upright:{hp:6}, reverse:{atk:-2}},
  '愚者':     {text_upright:'愚者正位：随机获得一件金色宝物', text_reverse:'愚者逆位：随机失去一件宝物', upright:{randomTreasure:'gold'}, reverse:{loseTreasure:true}},
};

// ─── 隐藏房间（5种） ───
const HIDDEN_ROOMS = {
  '钥匙房': {text:'你用钥匙打开了隐藏房间，里面全是金币！', reward:{gold:30}},
  '暗影房': {text:'暗影能量涌入，你的攻击力被强化了', reward:{atk:3}},
  '星光房': {text:'星光洒落，伤势痊愈', reward:{heal:5}},
  '代价房': {text:'墙壁上刻着——"拿一件宝物，或失去3点生命"', choice:{treasure:true, cost:{hp:3}}},
  '传说房': {text:'传说级的宝箱在黑暗中闪闪发光！', reward:{treasure:'gold'}},
};

// ─── 塔外事件（40种） ───
const OUTSIDE_EVENTS = [
  {text:'你攀爬藤蔓时发现了一个鸟巢，里面有闪闪发光的东西', type:'gold', gold:[5,15]},
  {text:'一阵狂风袭来，你紧紧抓住墙壁', type:'nothing', desc:'有惊无险'},
  {text:'你发现墙砖松动了，里面塞着一个小宝箱', type:'treasure', rarity:'white'},
  {text:'一只蝙蝠从你头顶飞过，吓得你差点松手', type:'trap', dmg:[1,1]},
  {text:'藤蔓上结着奇异的果实，散发着甜香', type:'heal', heal:[1,2]},
  {text:'你在外墙上发现了一条狭窄的石缝，可以钻进去', type:'hidden'},
  {text:'一只石像鬼从塔外飞来，发现了你！', type:'monster'},
  {text:'阳光照在一处凹陷中，里面有一枚古钱币', type:'gold', gold:[10,20]},
  {text:'你的手指被尖锐的石头划破了', type:'trap', dmg:[1,2]},
  {text:'一阵暖风送来了一朵会发光的蒲公英', type:'heal', heal:[2,3]},
  {text:'墙壁上刻着古老的符文，你感到力量涌动', type:'buff', atk:1},
  {text:'塔外忽然下起了小雨，藤蔓变得湿滑', type:'nothing', desc:'小心前行'},
  {text:'你发现了一扇被藤蔓遮盖的窗户，可以爬进去', type:'window'},
  {text:'一只猫头鹰落在你肩膀上，留下一片羽毛后飞走了', type:'treasure', rarity:'blue'},
  {text:'墙壁开始震动，碎石纷纷落下！', type:'trap', dmg:[2,3]},
  {text:'你发现墙壁上有一处可以歇脚的平台', type:'rest', heal:[1,2]},
  {text:'月光照亮了一块松动的砖，后面藏着金币', type:'gold', gold:[12,25]},
  {text:'一只阴影生物从塔内钻出，扑向你！', type:'monster'},
  {text:'塔壁上流下一道细细的蜂蜜，可以收集起来', type:'heal', heal:[2,4]},
  {text:'你听到了塔内传来的歌声，令人毛骨悚然', type:'nothing', desc:'加快速度爬过去'},
  {text:'一块砖头被你碰掉了，下方传来遥远的撞击声', type:'trap', dmg:[1,1]},
  {text:'藤蔓间缠绕着一具骷髅，手里握着一件宝物', type:'treasure', rarity:'purple'},
  {text:'风吹来一张古老的羊皮纸，上面写着祝福咒语', type:'buff', hp:2},
  {text:'你发现了一条隐藏的绳索，可以更快攀爬', type:'skip', floors:2},
  {text:'一只巨大的飞蛾扑向你，翅膀上有眼睛般的图案', type:'monster'},
  {text:'墙缝里长着发光的蘑菇，吃下去暖洋洋的', type:'heal', heal:[3,5]},
  {text:'天色忽然暗了下来，暴风雨要来了', type:'nothing', desc:'赶紧找入口回去'},
  {text:'塔壁上镶嵌着一颗蓝宝石，你小心翼翼地撬了下来', type:'gold', gold:[30,50]},
  {text:'一只幽灵从墙壁中穿出，冷冷地注视着你', type:'monster'},
  {text:'你发现墙壁上有人用炭笔写的字——"回头吧"', type:'nothing'},
  {text:'脚下的砖头碎裂了，你差点掉下去', type:'trap', dmg:[2,4]},
  {text:'塔壁上长着一株奇异的药草', type:'heal', heal:[3,4]},
  {text:'一阵光芒闪过，一个宝箱凭空出现在你面前', type:'treasure', rarity:'blue'},
  {text:'雷声轰鸣，一道闪电劈在你不远处', type:'trap', dmg:[3,5]},
  {text:'你发现了一块嵌在墙上的水晶，可以取下来', type:'treasure', rarity:'purple'},
  {text:'塔壁上渗出了一种粘稠的液体，你小心地绕过了', type:'nothing'},
  {text:'你爬到了一处特别温暖的区域，塔壁微微发光', type:'heal', heal:[4,6]},
  {text:'深渊中伸出一只巨大的触手，向你抓来！', type:'monster'},
  {text:'墙壁上突然打开了一扇门，里面是温暖的房间', type:'window'},
  {text:'你在塔壁上发现了一枚金色的徽章', type:'treasure', rarity:'gold'},
];

// ─── BOSS数据（3个BOSS，随机抽） ───
const BOSS_POOLS = {
  25: [
    {name:'石像鬼领主', hp:15, atk:6, gold:50, special:'石化凝视', effect:'每3回合固定伤害2'},
    {name:'幻影法师', hp:12, atk:8, gold:45, special:'镜像分身', effect:'50%概率闪避'},
  ],
  50: [
    {name:'炎魔', hp:25, atk:10, gold:80, special:'烈焰风暴', effect:'每回合额外灼烧1点'},
    {name:'冰霜巨人', hp:30, atk:8, gold:75, special:'冰封', effect:'玩家攻击减半2回合'},
    {name:'暗影领主', hp:22, atk:12, gold:85, special:'暗影爆破', effect:'暴击率+30%'},
  ],
  75: [
    {name:'虚空之龙', hp:40, atk:15, gold:120, special:'虚空吐息', effect:'无视护甲'},
    {name:'时光守护者', hp:35, atk:12, gold:110, special:'时间回溯', effect:'每5回合恢复5HP'},
    {name:'堕落天使', hp:38, atk:14, gold:130, special:'审判之剑', effect:'50%概率双倍伤害'},
  ],
};

// ─── 获取BOSS ───
function getBoss(floor) {
  let pool = BOSS_POOLS[floor];
  if (!pool) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}


// =========================================
// 第三批：特殊楼层 + 楼层选择 + 掉落 + 塔外探索 + 主循环
// =========================================

// ─── 楼层选择系统 ───
function getFloorChoices(floor) {
  let choices = [];
  // 金光：通往奖励层（宝箱/金币/治疗）
  choices.push({label:'A. 一道金光闪过', type:'reward'});
  // 叫卖声：通往商店
  choices.push({label:'B. 远处传来叫卖声', type:'shop'});
  // 风声：通往战斗/陷阱
  choices.push({label:'C. 一阵腥风扑面', type:'danger'});
  // 塔外：60层前可出现
  if (floor < 60 && Math.random() < 0.25) {
    choices.push({label:'D. 窗外有藤蔓垂落', type:'outside'});
  } else {
    choices.push({label:'D. 一扇紧闭的铁门', type:'mystery'});
  }
  return choices;
}

// ─── 掉落事件 ───
function triggerFall() {
  let fallFloors = Math.floor(Math.random() * 8) + 3; // 掉落3-10层
  player.floor = Math.max(1, player.floor - fallFloors);
  return `脚下一空！你坠落了${fallFloors}层，摔回了第${player.floor}层...`;
}

// ─── 塔外探索主循环 ───
function startOutsideExploration() {
  player.towerOutside = true;
  player.outsideSteps = 0;
  player.outsideMax = Math.floor(Math.random() * 15) + 6; // 6-20步
  player.outsideFloorHidden = player.floor;
  return '你翻出窗外，抓住了藤蔓...塔外世界在你面前展开。';
}

function outsideStep() {
  if (!player.towerOutside) return null;
  player.outsideSteps++;
  let event = OUTSIDE_EVENTS[Math.floor(Math.random() * OUTSIDE_EVENTS.length)];
  let result = {text: event.text, log:[]};

  if (event.type === 'monster') {
    let m = getMonster(player.floor);
    result.log = battleMonster(m);
  } else if (event.type === 'gold') {
    let g = Math.floor(Math.random() * (event.gold[1]-event.gold[0]+1)) + event.gold[0];
    player.gold += g;
    result.log.push(`获得${g}金币`);
  } else if (event.type === 'treasure') {
    let t = getTreasure(event.rarity || 'white');
    player.treasures.push(t);
    result.log.push(`获得宝物：${t.name} - ${t.desc}`);
  } else if (event.type === 'heal') {
    let h = Math.floor(Math.random() * (event.heal[1]-event.heal[0]+1)) + event.heal[0];
    player.hp += h;
    result.log.push(`恢复${h}点生命`);
  } else if (event.type === 'trap') {
    let d = Math.floor(Math.random() * (event.dmg[1]-event.dmg[0]+1)) + event.dmg[0];
    player.hp -= d;
    result.log.push(`受到${d}点伤害`);
  } else if (event.type === 'buff') {
    if (event.atk) { player.atk += event.atk; result.log.push(`攻击+${event.atk}`); }
    if (event.hp) { player.hp += event.hp; result.log.push(`生命+${event.hp}`); }
  } else if (event.type === 'hidden') {
    let room = HIDDEN_ROOMS[Object.keys(HIDDEN_ROOMS)[Math.floor(Math.random()*5)]];
    result.log.push(room.text);
    if (room.reward) {
      if (room.reward.gold) player.gold += room.reward.gold;
      if (room.reward.atk) player.atk += room.reward.atk;
      if (room.reward.heal) player.hp += room.reward.heal;
    }
  } else if (event.type === 'window') {
    player.towerOutside = false;
    player.floor += player.outsideSteps;
    result.log.push('你从窗户爬回了塔内！');
    return {...result, endOutside: true};
  } else if (event.type === 'rest') {
    let h = Math.floor(Math.random() * (event.heal[1]-event.heal[0]+1)) + event.heal[0];
    player.hp += h;
    result.log.push(`在平台上休息了一会，恢复${h}生命`);
  } else if (event.type === 'skip') {
    player.outsideSteps += event.floors - 1;
    result.log.push(`借助隐藏绳索快速攀升了${event.floors}层`);
  }

  if (player.outsideSteps >= player.outsideMax) {
    player.towerOutside = false;
    player.floor += player.outsideSteps;
    result.log.push('你找到了一个入口，回到了塔内！');
    return {...result, endOutside: true};
  }
  return result;
}

// ─── 特殊楼层处理 ───
function handleSpecialFloor(floor) {
  if (floor === 25 || floor === 50 || floor === 75) {
    let boss = getBoss(floor);
    return {
      type:'boss',
      boss,
      text:`第${floor}层——BOSS战！${boss.name}出现了！\n${boss.special}: ${boss.effect}`,
    };
  }
  if (floor === 95) {
    return {type:'reward', text:'第95层：命运之厅——必定获得一件金色宝物！', treasure:'gold'};
  }
  if (floor === 96) {
    return {
      type:'maze',
      text:'第96层：无尽迷宫——选择方向...',
      choices:[
        {text:'A. 左转', result:'correct', msg:'你找到了正确的路！'},
        {text:'B. 右转', result:'wrong', msg:'你绕了一圈又回到了原地', dmg:2},
        {text:'C. 直走', result:'wrong', msg:'陷阱！尖刺从墙壁中弹出', dmg:3},
        {text:'D. 回头', result:'wrong', msg:'你撞上了一堵墙', dmg:1},
      ],
    };
  }
  if (floor === 97) {
    return {
      type:'trap',
      text:'第97层：死亡机关——滚石、毒箭、地刺同时启动！',
      dmg:[5,10],
    };
  }
  if (floor === 98) {
    let dragon = {name:'魔龙·焚世者', hp:50, atk:18, gold:200, special:'龙息', effect:'每回合灼烧3点'};
    return {type:'boss', boss:dragon, text:'第98层——魔龙·焚世者盘踞于此！'};
  }
  if (floor === 99) {
    let questions = [
      {q:'什么东西越洗越脏？', a:'水'},
      {q:'什么东西你越拿越多却越来越轻？', a:'洞'},
      {q:'什么东西打破了所有人都叫好？', a:'记录'},
      {q:'什么东西白天看不见晚上看得见？', a:'星星'},
      {q:'什么东西借了不用还？', a:'光'},
    ];
    let q = questions[Math.floor(Math.random()*questions.length)];
    return {type:'riddle', text:`第99层：知识恶魔——"回答我：${q.q}"`, answer:q.a};
  }
  if (floor === 100) {
    return {
      type:'fake_end',
      text:'第100层：魔王端坐在王座上——"你已到达塔顶，如何选择？"',
      choices:[
        {label:'A. "我已胜利！"', result:'death', msg:'魔王大笑着将你碾碎...你死了。'},
        {label:'B. "这不是终点。"', result:'continue', msg:'魔王的面具碎裂，露出了通往101层的阶梯...'},
      ],
    };
  }
  if (floor === 101) {
    let finalBoss = {name:'真·魔王·虚空之主', hp:80, atk:25, gold:500, special:'虚空吞噬', effect:'每回合恢复5HP'};
    return {
      type:'final_boss',
      boss:finalBoss,
      text:'第101层——虚空之主在无尽的黑暗中等待着...这是真正的最终之战！',
    };
  }
  return null;
}

// ─── 商店系统 ───
function generateShopItems(floor) {
  let items = [];
  let tier = floor < 30 ? 1 : floor < 60 ? 2 : floor < 90 ? 3 : 4;
  items.push({name:'生命药水', cost:10 + tier*5, effect:{heal:3+tier*2}, desc:`恢复${3+tier*2}生命`});
  items.push({name:'攻击卷轴', cost:15 + tier*5, effect:{atk:1+tier}, desc:`攻击+${1+tier}`});
  items.push({name:'护盾符文', cost:12 + tier*5, effect:{hp:2+tier*2}, desc:`生命上限+${2+tier*2}`});
  if (Math.random() < 0.3) {
    let rarity = tier >= 4 ? 'purple' : tier >= 2 ? 'blue' : 'white';
    let t = getTreasure(rarity);
    items.push({name:t.name, cost:20 + tier*10, effect:{treasure:t}, desc:t.desc});
  }
  return items;
}

// ─── 主游戏循环 ───
function gameLoop() {
  if (player.hp <= 0) {
    renderGame('你已死亡...游戏结束。', true);
    return;
  }
  if (player.floor > 101) {
    renderGame('你击败了虚空之主！塔崩毁了...你成为了新的传说。', true);
    return;
  }

  renderGame();
}

// ─── 处理玩家选择 ───
function processChoice(choiceIndex) {
  if (player.towerOutside) {
    let result = outsideStep();
    if (result) {
      player.log = result.log;
      if (result.endOutside) {
        player.towerOutside = false;
      }
      renderGame();
      return;
    }
  }

  // 特殊楼层优先
  let special = handleSpecialFloor(player.floor);
  if (special) {
    processSpecial(special);
    return;
  }

  let choices = getFloorChoices(player.floor);
  let chosen = choices[choiceIndex];

  switch(chosen.type) {
    case 'reward': {
      let gold = Math.floor(Math.random()*20)+10 + player.floor;
      player.gold += gold;
      player.log = [`金光中你获得了${gold}金币！`];
      break;
    }
    case 'shop': {
      let items = generateShopItems(player.floor);
      player.shopItems = items;
      player.showingShop = true;
      player.log = ['流浪商人出现了——'];
      return;
    }
    case 'danger': {
      if (Math.random() < 0.7) {
        let m = getMonster(player.floor);
        player.log = battleMonster({...m});
      } else {
        let trapDmg = Math.floor(Math.random()*4)+2;
        player.hp -= trapDmg;
        player.log = [`陷阱触发！受到${trapDmg}点伤害`];
      }
      break;
    }
    case 'outside': {
      player.log = [startOutsideExploration()];
      return;
    }
    case 'mystery': {
      let roll = Math.random();
      if (roll < 0.3) {
        let t = getTreasure('blue');
        player.treasures.push(t);
        player.log = [`铁门后藏着宝物：${t.name}！`];
      } else if (roll < 0.6) {
        player.log = ['铁门后空空如也...'];
      } else {
        player.hp -= 2;
        player.log = ['铁门后窜出一只怪物！受到2点伤害'];
      }
      break;
    }
  }

  player.floor++;
  gameLoop();
}

// ─── 处理特殊楼层 ───
function processSpecial(special) {
  if (special.type === 'boss' || special.type === 'final_boss') {
    player.log = battleMonster({...special.boss});
    if (player.hp > 0) {
      player.floor++;
      player.log.push(`${special.boss.name}被击败！获得${special.boss.gold}金币`);
      player.gold += special.boss.gold;
      if (special.type === 'final_boss') player.floor++;
    }
  } else if (special.type === 'reward') {
    let t = getTreasure(special.treasure || 'gold');
    player.treasures.push(t);
    player.log = [special.text, `获得：${t.name} - ${t.desc}`];
    player.floor++;
  } else if (special.type === 'trap') {
    let d = Math.floor(Math.random()*(special.dmg[1]-special.dmg[0]+1)) + special.dmg[0];
    player.hp -= d;
    player.log = [special.text, `受到${d}点伤害！`];
    player.floor++;
  } else if (special.type === 'maze') {
    player.mazeChoices = special.choices;
    player.showingMaze = true;
    player.log = [special.text];
    return;
  } else if (special.type === 'riddle') {
    player.riddle = special;
    player.showingRiddle = true;
    player.log = [special.text];
    return;
  } else if (special.type === 'fake_end') {
    player.fakeEndChoices = special.choices;
    player.showingFakeEnd = true;
    player.log = [special.text];
    return;
  }
  renderGame();
}

// ─── 商店购买 ───
function buyShopItem(index) {
  let item = player.shopItems[index];
  if (!item) return '商品不存在';
  if (player.gold < item.cost) return '金币不足！';
  player.gold -= item.cost;
  if (item.effect.heal) player.hp += item.effect.heal;
  if (item.effect.atk) player.atk += item.effect.atk;
  if (item.effect.hp) player.maxHp += item.effect.hp;
  if (item.effect.treasure) player.treasures.push(item.effect.treasure);
  player.showingShop = false;
  player.floor++;
  renderGame();
  return `购买了${item.name}！`;
}

// ─── 谜题回答 ───
function answerRiddle(answer) {
  if (!player.riddle) return;
  if (answer.trim() === player.riddle.answer) {
    player.log = ['知识恶魔满意地点了点头——"你通过了。"'];
    player.atk += 3;
    player.hp += 5;
    player.log.push('获得：攻击+3，生命+5');
  } else {
    player.log = ['知识恶魔摇了摇头——"愚蠢。"'];
    player.hp -= 5;
    player.log.push('受到5点伤害');
  }
  player.showingRiddle = false;
  player.riddle = null;
  player.floor++;
  renderGame();
}

// ─── 处理100层选择 ───
function handleFakeEndChoice(index) {
  let choice = player.fakeEndChoices[index];
  player.log = [choice.msg];
  if (choice.result === 'death') {
    player.hp = 0;
  } else {
    player.floor = 101;
  }
  player.showingFakeEnd = false;
  player.fakeEndChoices = null;
  gameLoop();
}

// ─── 处理迷宫选择 ───
function handleMazeChoice(index) {
  let choice = player.mazeChoices[index];
  player.log = [choice.msg];
  if (choice.result === 'wrong' && choice.dmg) {
    player.hp -= choice.dmg;
    player.log.push(`受到${choice.dmg}点伤害`);
  }
  player.showingMaze = false;
  player.mazeChoices = null;
  player.floor++;
  renderGame();
}

// ─── 初始化新游戏 ───
function startNewGame() {
  player.hp = 5;
  player.maxHp = 5;
  player.atk = 1;
  player.gold = 0;
  player.floor = 1;
  player.treasures = [];
  player.log = ['你踏入了百层塔...'];
  player.towerOutside = false;
  player.outsideSteps = 0;
  player.outsideMax = 0;
  player.weather = '晴朗';
  player.showingShop = false;
  player.shopItems = [];
  player.showingMaze = false;
  player.showingRiddle = false;
  player.showingFakeEnd = false;
  renderGame();
}

// ─── 使用宝物 ───
function useTreasure(index) {
  let t = player.treasures[index];
  if (!t) return;
  if (t.effect === 'heal') {
    player.hp = Math.min(player.maxHp, player.hp + t.value);
    logEvent(`使用${t.name}，恢复${t.value}生命`);
  }
  player.treasures.splice(index, 1);
  renderGame();
}

console.log('[百层塔] 第三批加载完成——游戏引擎就绪');


// ─── 核心渲染函数 ───
function renderGame(msg, gameOver) {
  updateStatus();
  setFloorDisplay();
  addBackpackButton();

  if (gameOver) {
    showNarrative(msg || '游戏结束');
    document.getElementById('choices').innerHTML = '<button class="choice-btn" onclick="startNewGame()"><span class="choice-label">R</span>重新开始</button>';
    return;
  }

  // 构建叙事文本
  let text = msg || '';
  if (player.log && player.log.length > 0) {
    text = player.log.join('\n');
  }
  if (!text) {
    text = '第' + player.floor + '层——前方出现了岔路...';
  }
  showNarrative(text);

  // 特殊界面：商店
  if (player.showingShop) {
    let shopHTML = '<div style="margin-bottom:8px;color:#f0c060;">🏪 流浪商人的商品：</div>';
    player.shopItems.forEach((item, i) => {
      shopHTML += `<button class="choice-btn" onclick="buyShopItem(${i})"><span class="choice-label">${String.fromCharCode(65+i)}</span>${item.name} - ${item.desc}（${item.cost}金币）</button>`;
    });
    shopHTML += '<button class="choice-btn" onclick="player.showingShop=false;player.floor++;renderGame();"><span class="choice-label">X</span>离开商店</button>';
    document.getElementById('choices').innerHTML = shopHTML;
    return;
  }

  // 特殊界面：迷宫
  if (player.showingMaze) {
    let mazeHTML = '';
    player.mazeChoices.forEach((c, i) => {
      mazeHTML += `<button class="choice-btn" onclick="handleMazeChoice(${i})"><span class="choice-label">${String.fromCharCode(65+i)}</span>${c.text}</button>`;
    });
    document.getElementById('choices').innerHTML = mazeHTML;
    return;
  }

  // 特殊界面：谜题
  if (player.showingRiddle) {
    document.getElementById('choices').innerHTML = `
      <input id="riddle-input" type="text" placeholder="输入你的答案..." style="width:100%;padding:12px;background:#1a1a2e;border:1px solid #3a3a4a;border-radius:8px;color:#c8b888;font-size:14px;margin-bottom:8px;">
      <button class="choice-btn" onclick="answerRiddle(document.getElementById('riddle-input').value)"><span class="choice-label">✓</span>提交答案</button>
    `;
    return;
  }

  // 特殊界面：100层假结局
  if (player.showingFakeEnd) {
    let html = '';
    player.fakeEndChoices.forEach((c, i) => {
      html += `<button class="choice-btn" onclick="handleFakeEndChoice(${i})"><span class="choice-label">${String.fromCharCode(65+i)}</span>${c.label}</button>`;
    });
    document.getElementById('choices').innerHTML = html;
    return;
  }

  // 死亡检查
  if (player.hp <= 0) {
    showNarrative('你倒在了第' + player.floor + '层...\n死亡次数：' + (player.deaths + 1));
    document.getElementById('choices').innerHTML = '<button class="choice-btn" onclick="startNewGame()"><span class="choice-label">R</span>重新挑战</button>';
    return;
  }

  // 正常楼层：显示ABCD选项
  let choices = getFloorChoices(player.floor);
  showChoices(choices);
}

// ─── 处理选项点击 ───
function handleChoice(choice, index) {
  processChoice(index);
}

// ─── 页面初始化 ───
window.addEventListener('DOMContentLoaded', function() {
  console.log('[百层塔] 页面加载完成，初始化游戏...');
  startNewGame();
});

console.log('[百层塔] 修复补丁加载完成——renderGame + 页面初始化就绪');
