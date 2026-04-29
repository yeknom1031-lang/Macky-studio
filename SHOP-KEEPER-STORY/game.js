const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
ctx.imageSmoothingEnabled = false;

const moneyValue = document.getElementById("moneyValue");
const dayValue = document.getElementById("dayValue");
const customerValue = document.getElementById("customerValue");
const salesValue = document.getElementById("salesValue");
const lotsPanel = document.getElementById("lotsPanel");
const logList = document.getElementById("logList");
const appRoot = document.getElementById("appRoot");
const hudToggle = document.getElementById("hudToggle");

const SHOP_TYPES = {
  grocery: {
    label: "雑貨店",
    item: "生活雑貨",
    buildCost: 300,
    basePrice: 36,
    restockCost: 70,
    restockAmount: 12,
    color: "#f2cc4d"
  },
  bakery: {
    label: "パン屋",
    item: "焼きたてパン",
    buildCost: 340,
    basePrice: 42,
    restockCost: 84,
    restockAmount: 11,
    color: "#d88d5b"
  },
  bookstore: {
    label: "本屋",
    item: "本",
    buildCost: 320,
    basePrice: 40,
    restockCost: 76,
    restockAmount: 10,
    color: "#82abcf"
  },
  flower: {
    label: "花屋",
    item: "花",
    buildCost: 310,
    basePrice: 38,
    restockCost: 72,
    restockAmount: 14,
    color: "#e58ec2"
  }
};

const OWNER_SPRITE = [
  "....1111....",
  "...122221...",
  "...122221...",
  "...122221...",
  "..12333221..",
  "..44333344..",
  "..44333344..",
  "...455554...",
  "...45..54...",
  "...45..54...",
  "...5....5...",
  "..66....66.."
];

const CUSTOMER_SPRITE = [
  "....1111....",
  "...122221...",
  "...122221...",
  "...122221...",
  "..12333221..",
  "..44333344..",
  "..44333344..",
  "...455554...",
  "...45..54...",
  "...45..54...",
  "...5....5...",
  "..66....66.."
];

const HOME_LOT_ID = 1;
const INTERIOR_EXIT = { x: canvas.width / 2 - 44, y: canvas.height - 30, w: 88, h: 16 };
const INTERIOR_BOUNDS = { left: 28, right: canvas.width - 28, top: 96, bottom: canvas.height - 20 };
const INTERIOR_REGISTER_SERVICE_SPOT = { x: 444, y: 286 };
const INTERIOR_REGISTER_QUEUE_SPOTS = [
  { x: INTERIOR_REGISTER_SERVICE_SPOT.x, y: INTERIOR_REGISTER_SERVICE_SPOT.y },
  { x: 488, y: 304 },
  { x: 532, y: 322 },
  { x: 576, y: 340 }
];
const SHIRT_COLORS = ["#5c8df7", "#f06f6f", "#59b279", "#f4b04d", "#9b79d8"];
const INTERIOR_BROWSE_SPOTS = [
  { x: 190, y: 286 },
  { x: 270, y: 286 },
  { x: 350, y: 286 },
  { x: 430, y: 286 },
  { x: 510, y: 286 },
  { x: 590, y: 286 }
];

const state = {
  money: 260,
  day: 1,
  timeInDay: 0,
  dayLength: 46,
  customersServed: 0,
  totalSales: 0,
  spawnTimer: 0,
  spawnInterval: 2.8,
  interiorSpawnTimer: 0,
  interiorSpawnInterval: 2.35,
  scene: "town",
  interiorLotId: null,
  lots: [],
  customers: [],
  interiorCustomers: [],
  pendingInteriorByLot: {},
  backgroundServiceProgressByLot: {},
  nextInteriorCustomerId: 1,
  nextRegisterToken: 1,
  keys: {},
  lastTs: 0,
  uiTimer: 0,
  owner: {
    x: 212,
    y: 332,
    speed: 148
  }
};

function createHomeShop() {
  return {
    type: "grocery",
    level: 1,
    stock: 18,
    capacity: 18,
    price: 32,
    attractiveness: 1.15,
    sales: 0,
    isHome: true
  };
}

function initLots() {
  const baseY = 188;
  state.lots = [
    { id: HOME_LOT_ID, x: 132, y: baseY, w: 164, h: 104, shop: createHomeShop(), ui: null },
    { id: 2, x: 312, y: baseY, w: 164, h: 104, shop: null, ui: null },
    { id: 3, x: 492, y: baseY, w: 164, h: 104, shop: null, ui: null }
  ];
  state.pendingInteriorByLot = {};
  state.backgroundServiceProgressByLot = {};
  for (const lot of state.lots) {
    state.pendingInteriorByLot[lot.id] = [];
    state.backgroundServiceProgressByLot[lot.id] = 0;
  }
}

function getLotDoorPosition(lot) {
  return {
    x: lot.x + lot.w / 2,
    y: lot.y + lot.h - 4
  };
}

function isOwnerNearLotDoor(lot, maxDistance = 96) {
  const door = getLotDoorPosition(lot);
  return Math.hypot(state.owner.x - door.x, state.owner.y - door.y) <= maxDistance;
}

function findNearbyShopForEntry() {
  return state.lots.find((lot) => {
    if (!lot.shop) return false;
    const door = getLotDoorPosition(lot);
    return Math.hypot(state.owner.x - door.x, state.owner.y - door.y) <= 42;
  });
}

function getCurrentInteriorLot() {
  if (!state.interiorLotId) return null;
  return state.lots.find((lot) => lot.id === state.interiorLotId) || null;
}

function randomShirtColor() {
  return SHIRT_COLORS[Math.floor(Math.random() * SHIRT_COLORS.length)];
}

function queueInteriorArrival(lotId, customer) {
  if (!state.pendingInteriorByLot[lotId]) {
    state.pendingInteriorByLot[lotId] = [];
  }

  const queue = state.pendingInteriorByLot[lotId];
  queue.push({
    shirt: customer.shirt,
    speed: customer.speed,
    patience: customer.patience
  });

  if (queue.length > 24) {
    queue.shift();
  }

  return queue.length;
}

function enterShop(lot) {
  state.scene = "interior";
  state.interiorLotId = lot.id;
  state.interiorCustomers = [];
  state.interiorSpawnTimer = 0;
  state.owner.x = canvas.width / 2;
  state.owner.y = canvas.height - 70;
  spawnInteriorCustomer(true);
  addLog(`${lot.shop.isHome ? "自宅ショップ" : SHOP_TYPES[lot.shop.type].label}の店内に入りました。`);
}

function exitShop() {
  const lot = getCurrentInteriorLot();

  if (lot) {
    for (const customer of state.interiorCustomers) {
      if (customer.state === "leaving") continue;
      queueInteriorArrival(lot.id, customer);
    }
  }

  state.scene = "town";
  state.interiorLotId = null;
  state.interiorCustomers = [];

  if (lot) {
    const door = getLotDoorPosition(lot);
    state.owner.x = clamp(door.x, 24, canvas.width - 24);
    state.owner.y = clamp(lot.y + lot.h + 32, 110, canvas.height - 22);
    addLog(`${lot.shop.isHome ? "自宅ショップ" : SHOP_TYPES[lot.shop.type].label}の外に出ました。`);
  }
}

function handleInteract() {
  if (state.scene === "town") {
    const nearby = findNearbyShopForEntry();
    if (!nearby) return;
    enterShop(nearby);
    return;
  }

  if (tryProcessRegisterCheckout()) {
    addLog("店長がレジで会計対応しました。", "good");
    return;
  }

  const centerX = INTERIOR_EXIT.x + INTERIOR_EXIT.w / 2;
  const centerY = INTERIOR_EXIT.y + INTERIOR_EXIT.h / 2;
  const distanceToExit = Math.hypot(state.owner.x - centerX, state.owner.y - centerY);
  if (distanceToExit <= 60) {
    exitShop();
  }
}

function formatMoney(value) {
  return `${Math.max(0, Math.floor(value)).toLocaleString()}G`;
}

function addLog(message, type = "") {
  const item = document.createElement("li");
  if (type === "good") item.classList.add("good-text");
  if (type === "bad") item.classList.add("bad-text");
  item.textContent = `${state.day}日目: ${message}`;
  logList.prepend(item);
  while (logList.children.length > 30) {
    logList.removeChild(logList.lastChild);
  }
}

function createLotControls() {
  lotsPanel.innerHTML = "";

  for (const lot of state.lots) {
    const card = document.createElement("article");
    card.className = "lot-card";

    const header = document.createElement("div");
    header.className = "lot-header";
    const title = document.createElement("strong");
    title.textContent = `区画 ${lot.id}`;
    const lotLabel = document.createElement("span");
    lotLabel.textContent = `#${lot.id}`;
    header.append(title, lotLabel);

    const status = document.createElement("div");
    status.className = "lot-status";

    const select = document.createElement("select");
    Object.entries(SHOP_TYPES).forEach(([key, type]) => {
      const option = document.createElement("option");
      option.value = key;
      option.textContent = `${type.label} (${type.buildCost}G)`;
      select.appendChild(option);
    });

    const actions = document.createElement("div");
    actions.className = "lot-actions";

    const buildBtn = document.createElement("button");
    buildBtn.className = "primary";
    buildBtn.textContent = "建築";
    buildBtn.addEventListener("click", () => {
      buildShop(lot.id, select.value);
    });

    const stockBtn = document.createElement("button");
    stockBtn.className = "good";
    stockBtn.textContent = "仕入れ";
    stockBtn.addEventListener("click", () => {
      restockShop(lot.id);
    });

    const expandBtn = document.createElement("button");
    expandBtn.className = "subtle";
    expandBtn.textContent = "拡張";
    expandBtn.addEventListener("click", () => {
      expandShop(lot.id);
    });

    actions.append(buildBtn, stockBtn, expandBtn);

    if (lot.shop && lot.shop.isHome) {
      select.disabled = true;
      buildBtn.disabled = true;
      buildBtn.title = "自宅はすでに営業中です";
    }

    card.append(header, status, select, actions);
    lotsPanel.appendChild(card);

    lot.ui = { status, select };
  }

  updateLotStatuses();
}

function updateLotStatuses() {
  for (const lot of state.lots) {
    if (!lot.ui) continue;

    if (!lot.shop) {
      lot.ui.status.innerHTML = "空き地です。好きな店を建てて営業開始。";
      continue;
    }

    const type = SHOP_TYPES[lot.shop.type];
    const nextExpandCost = 220 * lot.shop.level;
    const nextRestockCost = type.restockCost + lot.shop.level * 8;
    const shopName = lot.shop.isHome ? "自宅ショップ" : type.label;
    const badge = lot.shop.isHome ? " (自宅)" : "";

    lot.ui.status.innerHTML = [
      `${shopName} Lv.${lot.shop.level}${badge}`,
      `在庫: ${lot.shop.stock}/${lot.shop.capacity}`,
      `商品: ${type.item}`,
      `次の仕入れ: ${nextRestockCost}G`,
      `次の拡張: ${lot.shop.level >= 5 ? "最大" : `${nextExpandCost}G`}`
    ].join("<br>");
  }
}

function buildShop(lotId, typeKey) {
  const lot = state.lots.find((entry) => entry.id === lotId);
  const type = SHOP_TYPES[typeKey];
  if (!lot || !type) return;

  if (lot.shop) {
    addLog(`区画${lotId}にはすでに店があります。`, "bad");
    return;
  }

  if (state.money < type.buildCost) {
    addLog(`${type.label}を建てるお金が足りません。`, "bad");
    return;
  }

  state.money -= type.buildCost;
  lot.shop = {
    type: typeKey,
    level: 1,
    stock: 20,
    capacity: 20,
    price: type.basePrice,
    attractiveness: 1,
    sales: 0,
    isHome: false
  };

  addLog(`区画${lotId}に${type.label}を建てました。`, "good");
  refreshStats();
  updateLotStatuses();
}

function restockShop(lotId) {
  const lot = state.lots.find((entry) => entry.id === lotId);
  if (!lot || !lot.shop) {
    addLog(`区画${lotId}にはまだ店がありません。`, "bad");
    return;
  }

  const type = SHOP_TYPES[lot.shop.type];
  const cost = type.restockCost + lot.shop.level * 8;
  if (lot.shop.stock >= lot.shop.capacity) {
    addLog(`区画${lotId}は在庫が満タンです。`);
    return;
  }

  if (state.money < cost) {
    addLog(`区画${lotId}の仕入れ費用が足りません。`, "bad");
    return;
  }

  const amount = Math.min(type.restockAmount + lot.shop.level, lot.shop.capacity - lot.shop.stock);
  lot.shop.stock += amount;
  state.money -= cost;

  addLog(`区画${lotId}で${amount}個仕入れました。`, "good");
  refreshStats();
  updateLotStatuses();
}

function expandShop(lotId) {
  const lot = state.lots.find((entry) => entry.id === lotId);
  if (!lot || !lot.shop) {
    addLog(`区画${lotId}にはまだ店がありません。`, "bad");
    return;
  }

  if (lot.shop.level >= 5) {
    addLog(`区画${lotId}は最大まで拡張済みです。`);
    return;
  }

  const cost = 220 * lot.shop.level;
  if (state.money < cost) {
    addLog(`区画${lotId}の拡張費用が足りません。`, "bad");
    return;
  }

  lot.shop.level += 1;
  lot.shop.capacity += 12;
  lot.shop.price += 4;
  lot.shop.attractiveness += 0.28;
  state.money -= cost;

  addLog(`区画${lotId}を拡張しました。`, "good");
  refreshStats();
  updateLotStatuses();
}

function chooseTargetLot() {
  const candidates = state.lots.filter((lot) => lot.shop && lot.shop.stock > 0);
  if (candidates.length === 0) return null;

  const weighted = candidates.map((lot) => {
    const stockRatio = lot.shop.stock / lot.shop.capacity;
    const weight = lot.shop.attractiveness * (0.45 + stockRatio) * (1 + lot.shop.level * 0.12);
    return { lot, weight };
  });

  const totalWeight = weighted.reduce((sum, item) => sum + item.weight, 0);
  let random = Math.random() * totalWeight;
  for (const item of weighted) {
    random -= item.weight;
    if (random <= 0) {
      return item.lot;
    }
  }
  return weighted[weighted.length - 1].lot;
}

function spawnCustomer() {
  const targetLot = chooseTargetLot();
  if (!targetLot) return;

  state.customers.push({
    x: -16,
    y: 335 + (Math.random() * 14 - 7),
    speed: 42 + Math.random() * 18,
    state: "toShop",
    targetId: targetLot.id,
    wait: 0,
    patience: 2.2 + Math.random() * 2,
    shirt: randomShirtColor(),
    mood: "normal"
  });
}

function spawnInteriorCustomer(preferLatest = false) {
  const lot = getCurrentInteriorLot();
  if (!lot || !lot.shop || lot.shop.stock <= 0) return false;
  if (state.interiorCustomers.length >= 6) return false;

  const queue = state.pendingInteriorByLot[lot.id];
  if (!queue || queue.length === 0) return false;

  const arrival = preferLatest ? queue.pop() : queue.shift();
  if (!arrival) return false;
  const spot = INTERIOR_BROWSE_SPOTS[Math.floor(Math.random() * INTERIOR_BROWSE_SPOTS.length)];
  state.interiorCustomers.push({
    id: state.nextInteriorCustomerId++,
    x: canvas.width / 2 + (Math.random() * 22 - 11),
    y: canvas.height + 12,
    speed: clamp(arrival.speed + (Math.random() * 8 - 4), 32, 64),
    state: "entering",
    targetX: spot.x + (Math.random() * 10 - 5),
    targetY: spot.y + (Math.random() * 8 - 4),
    wait: 0,
    patience: clamp(arrival.patience + (Math.random() * 0.5 - 0.25), 1.4, 4.6),
    browseDuration: 1.2 + Math.random() * 1.6,
    checkoutDuration: 0.8 + Math.random() * 1.2,
    registerToken: null,
    shirt: arrival.shirt,
    mood: "normal"
  });
  return true;
}

function getInteriorRegisterTarget(customer) {
  if (customer.registerToken === null) return null;

  const queue = state.interiorCustomers
    .filter(
      (entry) =>
        (entry.state === "toRegister" || entry.state === "checkout") &&
        entry.registerToken !== null
    )
    .sort((a, b) => a.registerToken - b.registerToken);

  const index = queue.findIndex((entry) => entry.id === customer.id);
  if (index === -1) return null;

  if (index < INTERIOR_REGISTER_QUEUE_SPOTS.length) {
    const spot = INTERIOR_REGISTER_QUEUE_SPOTS[index];
    return { x: spot.x, y: spot.y, isFront: index === 0 };
  }

  const tail = INTERIOR_REGISTER_QUEUE_SPOTS[INTERIOR_REGISTER_QUEUE_SPOTS.length - 1];
  const offset = (index - (INTERIOR_REGISTER_QUEUE_SPOTS.length - 1)) * 18;
  return {
    x: tail.x,
    y: tail.y + offset,
    isFront: false
  };
}

function getFrontRegisterCustomer() {
  return state.interiorCustomers
    .filter(
      (entry) =>
        (entry.state === "toRegister" || entry.state === "checkout") &&
        entry.registerToken !== null
    )
    .sort((a, b) => a.registerToken - b.registerToken)[0] || null;
}

function isOwnerNearRegister(maxDistance = 64) {
  return (
    Math.hypot(
      state.owner.x - INTERIOR_REGISTER_SERVICE_SPOT.x,
      state.owner.y - INTERIOR_REGISTER_SERVICE_SPOT.y
    ) <= maxDistance
  );
}

function tryProcessRegisterCheckout() {
  if (state.scene !== "interior") return false;
  if (!isOwnerNearRegister(64)) return false;

  const front = getFrontRegisterCustomer();
  if (!front || front.state !== "checkout") return false;

  front.wait = front.checkoutDuration;
  return true;
}

function moveTowards(entity, tx, ty, speed, dt) {
  const dx = tx - entity.x;
  const dy = ty - entity.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 0.001) return dist;
  const step = Math.min(dist, speed * dt);
  entity.x += (dx / dist) * step;
  entity.y += (dy / dist) * step;
  return dist;
}

function performSaleForLot(lot) {
  if (!lot || !lot.shop || lot.shop.stock <= 0) return null;

  lot.shop.stock -= 1;
  lot.shop.sales += 1;

  const sale = lot.shop.price + Math.floor(Math.random() * 8) + lot.shop.level * 2;
  state.money += sale;
  state.totalSales += sale;
  state.customersServed += 1;
  return sale;
}

function serviceCustomer(customer) {
  const lot = state.lots.find((entry) => entry.id === customer.targetId);
  if (!lot || !lot.shop) {
    customer.state = "leaving";
    customer.mood = "sad";
    return;
  }

  if (lot.shop.stock <= 0) {
    customer.state = "leaving";
    customer.mood = "sad";
    addLog(`${SHOP_TYPES[lot.shop.type].label}は売り切れで販売できませんでした。`, "bad");
    return;
  }

  const sale = performSaleForLot(lot);
  if (sale === null) {
    customer.state = "leaving";
    customer.mood = "sad";
    return;
  }

  customer.state = "leaving";
  customer.mood = "happy";

  if (Math.random() < 0.4) {
    const type = SHOP_TYPES[lot.shop.type];
    addLog(`${type.label}で${type.item}が売れて +${sale}G。`, "good");
  }

  if (lot.shop.stock === 0) {
    addLog(`${SHOP_TYPES[lot.shop.type].label}の在庫が0になりました。`, "bad");
  }
}

function serviceInteriorCustomer(customer) {
  const lot = getCurrentInteriorLot();
  if (!lot || !lot.shop) {
    customer.state = "leaving";
    customer.mood = "sad";
    return;
  }

  const type = SHOP_TYPES[lot.shop.type];
  const shopName = lot.shop.isHome ? "自宅ショップ" : type.label;
  const sale = performSaleForLot(lot);
  if (sale === null) {
    customer.state = "leaving";
    customer.mood = "sad";
    if (Math.random() < 0.3) {
      addLog(`${shopName}の店内で売り切れが発生しました。`, "bad");
    }
    return;
  }

  customer.state = "leaving";
  customer.mood = "happy";

  if (Math.random() < 0.5) {
    addLog(`${shopName}の店内販売で +${sale}G。`, "good");
  }

  if (lot.shop.stock === 0) {
    addLog(`${shopName}の在庫が0になりました。`, "bad");
  }
}

function updateCustomers(dt) {
  const roadY = 336;

  for (let i = state.customers.length - 1; i >= 0; i -= 1) {
    const customer = state.customers[i];
    const lot = state.lots.find((entry) => entry.id === customer.targetId);

    if (customer.state === "toShop") {
      if (!lot || !lot.shop) {
        customer.state = "leaving";
      } else {
        const targetX = lot.x + lot.w / 2;
        const targetY = lot.y + lot.h + 6;
        const dist = moveTowards(customer, targetX, targetY, customer.speed, dt);
        if (dist < 3) {
          queueInteriorArrival(customer.targetId, customer);
          if (state.scene === "interior" && customer.targetId === state.interiorLotId) {
            spawnInteriorCustomer(true);
          }
          state.customers.splice(i, 1);
          continue;
        }
      }
    }

    if (customer.state === "buying") {
      let boost = 1;
      if (state.scene === "town") {
        const ownerBoostDist = Math.hypot(state.owner.x - customer.x, state.owner.y - customer.y);
        boost = ownerBoostDist < 80 ? 1.75 : 1;
      }
      customer.wait += dt * boost;

      if (customer.wait >= customer.patience) {
        serviceCustomer(customer);
      }
    }

    if (customer.state === "leaving") {
      moveTowards(customer, canvas.width + 40, roadY, customer.speed + 22, dt);
      if (customer.x > canvas.width + 35) {
        state.customers.splice(i, 1);
      }
    }
  }
}

function updateInteriorCustomers(dt) {
  const exitX = INTERIOR_EXIT.x + INTERIOR_EXIT.w / 2;
  const exitY = INTERIOR_EXIT.y + INTERIOR_EXIT.h / 2;

  for (let i = state.interiorCustomers.length - 1; i >= 0; i -= 1) {
    const customer = state.interiorCustomers[i];

    if (customer.state === "entering") {
      const dist = moveTowards(customer, customer.targetX, customer.targetY, customer.speed, dt);
      if (dist < 3) {
        customer.state = "browsing";
        customer.wait = 0;
      }
    }

    if (customer.state === "browsing") {
      const ownerBoostDist = Math.hypot(state.owner.x - customer.x, state.owner.y - customer.y);
      const boost = ownerBoostDist < 72 ? 1.45 : 1;
      customer.wait += dt * boost;

      if (customer.wait >= customer.browseDuration) {
        customer.state = "toRegister";
        customer.wait = 0;
        customer.registerToken = state.nextRegisterToken++;
      }
    }

    if (customer.state === "toRegister") {
      const registerTarget = getInteriorRegisterTarget(customer);
      if (registerTarget) {
        const dist = moveTowards(customer, registerTarget.x, registerTarget.y, customer.speed, dt);
        if (registerTarget.isFront && dist < 4) {
          customer.state = "checkout";
          customer.wait = 0;
        }
      }
    }

    if (customer.state === "checkout") {
      const registerTarget = getInteriorRegisterTarget(customer);
      if (registerTarget) {
        moveTowards(customer, registerTarget.x, registerTarget.y, customer.speed, dt);
      }
      const ownerBoostDist = Math.hypot(state.owner.x - customer.x, state.owner.y - customer.y);
      const registerBoost = isOwnerNearRegister(72) ? 2.2 : 1;
      const proximityBoost = ownerBoostDist < 70 ? 1.5 : 1;
      const boost = Math.max(registerBoost, proximityBoost);
      customer.wait += dt * boost;

      if (customer.wait >= customer.checkoutDuration) {
        serviceInteriorCustomer(customer);
      }
    }

    if (customer.state === "leaving") {
      moveTowards(customer, exitX, exitY + 64, customer.speed + 18, dt);
      if (customer.y > canvas.height + 36) {
        state.interiorCustomers.splice(i, 1);
      }
    }
  }
}

function processBackgroundInteriorTraffic(dt) {
  const serviceInterval = 2.15;

  for (const lot of state.lots) {
    if (!lot.shop) continue;
    if (state.scene === "interior" && state.interiorLotId === lot.id) continue;
    if (state.scene === "town" && isOwnerNearLotDoor(lot, 96)) continue;

    const queue = state.pendingInteriorByLot[lot.id];
    if (!queue || queue.length === 0) continue;

    const levelBonus = 1 + lot.shop.level * 0.08;
    state.backgroundServiceProgressByLot[lot.id] += dt * levelBonus;

    while (queue.length > 0 && state.backgroundServiceProgressByLot[lot.id] >= serviceInterval) {
      state.backgroundServiceProgressByLot[lot.id] -= serviceInterval;
      const arriving = queue.shift();
      if (!arriving) break;

      if (lot.shop.stock <= 0) {
        if (Math.random() < 0.2) {
          const type = SHOP_TYPES[lot.shop.type];
          addLog(`${lot.shop.isHome ? "自宅ショップ" : type.label}は店内で売り切れです。`, "bad");
        }
        continue;
      }

      const sale = performSaleForLot(lot);
      if (sale !== null && Math.random() < 0.18) {
        const type = SHOP_TYPES[lot.shop.type];
        addLog(`${lot.shop.isHome ? "自宅ショップ" : type.label}でレジ会計 +${sale}G。`, "good");
      }
    }
  }
}

function updateOwner(dt) {
  let xAxis = 0;
  let yAxis = 0;

  if (state.keys.ArrowLeft || state.keys.a) xAxis -= 1;
  if (state.keys.ArrowRight || state.keys.d) xAxis += 1;
  if (state.keys.ArrowUp || state.keys.w) yAxis -= 1;
  if (state.keys.ArrowDown || state.keys.s) yAxis += 1;

  const length = Math.hypot(xAxis, yAxis) || 1;
  const moveX = (xAxis / length) * state.owner.speed * dt;
  const moveY = (yAxis / length) * state.owner.speed * dt;

  if (state.scene === "interior") {
    state.owner.x = clamp(state.owner.x + moveX, INTERIOR_BOUNDS.left, INTERIOR_BOUNDS.right);
    state.owner.y = clamp(state.owner.y + moveY, INTERIOR_BOUNDS.top, INTERIOR_BOUNDS.bottom);
    return;
  }

  state.owner.x = clamp(state.owner.x + moveX, 24, canvas.width - 24);
  state.owner.y = clamp(state.owner.y + moveY, 110, canvas.height - 22);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function updateDay(dt) {
  state.timeInDay += dt;
  if (state.timeInDay < state.dayLength) return;

  state.timeInDay -= state.dayLength;
  state.day += 1;
  state.spawnInterval = Math.max(1.25, state.spawnInterval - 0.06);

  let upkeep = 0;
  for (const lot of state.lots) {
    if (!lot.shop) continue;
    upkeep += 24 + lot.shop.level * 11;
  }

  if (upkeep > 0) {
    state.money -= upkeep;
    addLog(`固定費として${upkeep}Gを支払いました。`, upkeep < 120 ? "" : "bad");
  }

  if (state.money < 0) {
    state.money = 0;
    addLog("赤字になったため、所持金は0Gにリセットされました。", "bad");
  }

  refreshStats();
  updateLotStatuses();
}

function update(dt) {
  updateOwner(dt);

  state.spawnTimer += dt;
  if (state.spawnTimer >= state.spawnInterval) {
    state.spawnTimer = 0;
    spawnCustomer();
  }
  updateCustomers(dt);

  if (state.scene === "interior") {
    state.interiorSpawnTimer += dt;
    if (state.interiorSpawnTimer >= state.interiorSpawnInterval) {
      state.interiorSpawnTimer = 0;
      spawnInteriorCustomer();
    }
    updateInteriorCustomers(dt);
  }

  processBackgroundInteriorTraffic(dt);
  updateDay(dt);

  state.uiTimer += dt;
  if (state.uiTimer >= 0.25) {
    state.uiTimer = 0;
    refreshStats();
    updateLotStatuses();
  }
}

function drawScene() {
  if (state.scene === "interior") {
    drawInterior();
    drawInteriorCustomers();
  } else {
    drawBackground();
    drawLots();
    drawRoad();
    drawCustomers();
    drawTownInteractionHint();
  }

  drawOwner();
  drawTopBanner();
  if (state.scene === "interior") {
    drawInteriorHint();
  }
}

function drawBackground() {
  ctx.fillStyle = "#8ec9ff";
  ctx.fillRect(0, 0, canvas.width, 128);

  ctx.fillStyle = "#78bb63";
  ctx.fillRect(0, 128, canvas.width, canvas.height - 128);

  ctx.fillStyle = "#f3e286";
  ctx.fillRect(590, 18, 28, 28);

  for (let i = 0; i < 7; i += 1) {
    const x = 24 + i * 112;
    drawTree(x, 116 + (i % 2 ? 4 : 0));
  }
}

function drawRoad() {
  const y = 302;
  ctx.fillStyle = "#55585e";
  ctx.fillRect(0, y, canvas.width, 88);

  ctx.fillStyle = "#dcdcdc";
  for (let x = 12; x < canvas.width; x += 40) {
    ctx.fillRect(x, y + 40, 20, 4);
  }

  ctx.fillStyle = "#4f9f58";
  ctx.fillRect(0, y - 8, canvas.width, 8);
}

function drawTree(x, y) {
  ctx.fillStyle = "#7b553a";
  ctx.fillRect(x + 8, y + 24, 8, 16);

  ctx.fillStyle = "#2f8a3d";
  ctx.fillRect(x, y, 24, 24);
  ctx.fillRect(x + 4, y - 6, 16, 8);
}

function drawLots() {
  for (const lot of state.lots) {
    ctx.fillStyle = "#caa77c";
    ctx.fillRect(lot.x, lot.y + lot.h - 6, lot.w, 6);

    ctx.strokeStyle = "#3f3f3f";
    ctx.lineWidth = 2;
    ctx.strokeRect(lot.x, lot.y, lot.w, lot.h);

    if (!lot.shop) {
      ctx.fillStyle = "#94b07a";
      ctx.fillRect(lot.x + 2, lot.y + 2, lot.w - 4, lot.h - 8);
      ctx.fillStyle = "#2f2f2f";
      ctx.font = "10px 'Press Start 2P', 'Courier New', monospace";
      ctx.fillText("EMPTY", lot.x + 48, lot.y + 55);
      continue;
    }

    const type = SHOP_TYPES[lot.shop.type];
    const shopLabel = lot.shop.isHome ? "自宅ショップ" : type.label;
    const bScale = 0.84 + lot.shop.level * 0.07;
    const buildingW = Math.floor(lot.w * bScale);
    const buildingH = Math.floor(lot.h * (0.68 + lot.shop.level * 0.06));
    const bx = Math.floor(lot.x + (lot.w - buildingW) / 2);
    const by = Math.floor(lot.y + lot.h - buildingH);

    ctx.fillStyle = type.color;
    ctx.fillRect(bx, by, buildingW, buildingH);

    ctx.fillStyle = darkenColor(type.color, -28);
    ctx.fillRect(bx - 4, by - 12, buildingW + 8, 12);

    ctx.fillStyle = "#2f2f2f";
    ctx.fillRect(bx + Math.floor(buildingW / 2) - 9, by + buildingH - 22, 18, 22);
    ctx.fillStyle = "#f5e0a1";
    ctx.fillRect(bx + Math.floor(buildingW / 2) + 5, by + buildingH - 12, 2, 2);

    ctx.fillStyle = "#eff7ff";
    const windowCount = 1 + Math.floor(lot.shop.level / 2);
    for (let i = 0; i < windowCount; i += 1) {
      const wx = bx + 12 + i * 26;
      ctx.fillRect(wx, by + 16, 14, 12);
    }

    const ratio = lot.shop.stock / lot.shop.capacity;
    ctx.fillStyle = "#2f2f2f";
    ctx.fillRect(lot.x + 10, lot.y + 8, lot.w - 20, 8);
    ctx.fillStyle = ratio > 0.4 ? "#6cd974" : "#db6156";
    ctx.fillRect(lot.x + 11, lot.y + 9, Math.floor((lot.w - 22) * ratio), 6);

    ctx.fillStyle = "#191919";
    ctx.font = "9px 'Press Start 2P', 'Courier New', monospace";
    ctx.fillText(shopLabel, lot.x + 14, lot.y + lot.h - 12);
  }
}

function drawInterior() {
  const lot = getCurrentInteriorLot();
  const shop = lot ? lot.shop : null;
  const type = shop ? SHOP_TYPES[shop.type] : SHOP_TYPES.grocery;
  const shopName = shop ? (shop.isHome ? "自宅ショップ" : type.label) : "店";

  ctx.fillStyle = "#c9b89f";
  ctx.fillRect(0, 0, canvas.width, 112);
  ctx.fillStyle = "#aa9a82";
  ctx.fillRect(0, 98, canvas.width, 14);

  ctx.fillStyle = "#7e6148";
  ctx.fillRect(0, 112, canvas.width, canvas.height - 112);
  ctx.fillStyle = "#6f543e";
  for (let y = 116; y < canvas.height; y += 14) {
    ctx.fillRect(0, y, canvas.width, 1);
  }

  ctx.fillStyle = darkenColor(type.color, -24);
  ctx.fillRect(44, 128, canvas.width - 88, 62);
  ctx.fillStyle = type.color;
  ctx.fillRect(48, 132, canvas.width - 96, 54);

  ctx.fillStyle = "#222";
  ctx.fillRect(80, 206, 146, 54);
  ctx.fillRect(canvas.width - 226, 206, 146, 54);
  ctx.fillStyle = "#f3e9cf";
  for (let i = 0; i < 4; i += 1) {
    const offset = 90 + i * 32;
    ctx.fillRect(offset, 215, 18, 10);
    ctx.fillRect(canvas.width - 218 + i * 32, 215, 18, 10);
  }

  ctx.fillStyle = "#46362a";
  ctx.fillRect(232, 216, 304, 46);
  ctx.fillStyle = "#ead7a8";
  ctx.fillRect(236, 220, 296, 38);
  drawCashRegister(418, 198);

  ctx.fillStyle = "#161616";
  ctx.font = "11px 'Press Start 2P', 'Courier New', monospace";
  ctx.fillText(`${shopName} 店内`, 254, 246);

  ctx.fillStyle = "#2e2e2e";
  ctx.fillRect(INTERIOR_EXIT.x - 8, INTERIOR_EXIT.y - 6, INTERIOR_EXIT.w + 16, INTERIOR_EXIT.h + 6);
  ctx.fillStyle = "#8fa8cb";
  ctx.fillRect(INTERIOR_EXIT.x, INTERIOR_EXIT.y, INTERIOR_EXIT.w, INTERIOR_EXIT.h);
  ctx.fillStyle = "#1a2330";
  ctx.font = "9px 'Press Start 2P', 'Courier New', monospace";
  ctx.fillText("EXIT", INTERIOR_EXIT.x + 24, INTERIOR_EXIT.y + 12);
}

function drawCashRegister(x, y) {
  ctx.fillStyle = "#1f2328";
  ctx.fillRect(x, y + 12, 64, 20);
  ctx.fillStyle = "#2d3741";
  ctx.fillRect(x + 3, y + 14, 58, 16);

  ctx.fillStyle = "#15181c";
  ctx.fillRect(x + 5, y, 40, 16);
  ctx.fillStyle = "#88f0a2";
  ctx.fillRect(x + 8, y + 3, 34, 8);

  ctx.fillStyle = "#c7cbd0";
  ctx.fillRect(x + 46, y + 3, 14, 11);

  ctx.fillStyle = "#f2f2f2";
  for (let row = 0; row < 2; row += 1) {
    for (let col = 0; col < 4; col += 1) {
      ctx.fillRect(x + 8 + col * 7, y + 18 + row * 6, 4, 3);
    }
  }

  ctx.fillStyle = "#3a3f45";
  ctx.fillRect(x + 46, y + 17, 13, 12);
}

function drawTownInteractionHint() {
  const nearby = findNearbyShopForEntry();
  if (!nearby) return;

  const type = SHOP_TYPES[nearby.shop.type];
  const name = nearby.shop.isHome ? "自宅ショップ" : type.label;
  const text = `E/Enter: ${name}に入る`;
  const x = Math.floor(canvas.width / 2 - 150);
  const y = canvas.height - 34;

  ctx.fillStyle = "rgba(0, 0, 0, 0.58)";
  ctx.fillRect(x, y, 300, 20);
  ctx.fillStyle = "#ffffff";
  ctx.font = "9px 'Press Start 2P', 'Courier New', monospace";
  ctx.fillText(text, x + 10, y + 13);
}

function drawInteriorHint() {
  const queued = (state.pendingInteriorByLot[state.interiorLotId] || []).length;
  const front = getFrontRegisterCustomer();
  const canCheckout = Boolean(front && front.state === "checkout" && isOwnerNearRegister(64));
  const text = canCheckout
    ? `E/Enter: レジ会計  来客待ち:${queued}`
    : `E/Enter: 外に出る  来客待ち:${queued}`;
  const x = Math.floor(canvas.width / 2 - 165);
  const y = 66;

  ctx.fillStyle = "rgba(0, 0, 0, 0.58)";
  ctx.fillRect(x, y, 330, 20);
  ctx.fillStyle = "#ffffff";
  ctx.font = "9px 'Press Start 2P', 'Courier New', monospace";
  ctx.fillText(text, x + 12, y + 13);
}

function drawInteriorCustomers() {
  for (const customer of state.interiorCustomers) {
    const palette = {
      1: "#3a2a20",
      2: "#f6ceb1",
      3: customer.shirt,
      4: "#3c4e7b",
      5: "#222",
      6: "#121212"
    };

    drawSprite(CUSTOMER_SPRITE, Math.floor(customer.x - 18), Math.floor(customer.y - 36), 3, palette);

    if (customer.state === "browsing") {
      drawBubble(customer.x, customer.y - 30, "...");
    } else if (customer.state === "toRegister") {
      drawBubble(customer.x, customer.y - 30, "Q");
    } else if (customer.state === "checkout") {
      drawBubble(customer.x, customer.y - 30, "$");
    } else if (customer.state === "leaving" && customer.mood === "happy") {
      drawBubble(customer.x, customer.y - 30, "+");
    } else if (customer.state === "leaving" && customer.mood === "sad") {
      drawBubble(customer.x, customer.y - 30, "-");
    }
  }
}

function drawCustomers() {
  for (const customer of state.customers) {
    const palette = {
      1: "#3a2a20",
      2: "#f6ceb1",
      3: customer.shirt,
      4: "#3c4e7b",
      5: "#222",
      6: "#121212"
    };

    drawSprite(CUSTOMER_SPRITE, Math.floor(customer.x - 18), Math.floor(customer.y - 36), 3, palette);

    if (customer.state === "buying") {
      drawBubble(customer.x, customer.y - 30, "...");
    } else if (customer.state === "leaving" && customer.mood === "happy") {
      drawBubble(customer.x, customer.y - 30, "+");
    } else if (customer.state === "leaving" && customer.mood === "sad") {
      drawBubble(customer.x, customer.y - 30, "-");
    }
  }
}

function drawOwner() {
  const bob = Math.sin(performance.now() * 0.01) * 1.5;
  const palette = {
    1: "#2c1f16",
    2: "#f1c3a8",
    3: "#1a87d4",
    4: "#114d87",
    5: "#202020",
    6: "#0f0f0f"
  };

  drawSprite(OWNER_SPRITE, Math.floor(state.owner.x - 18), Math.floor(state.owner.y - 36 + bob), 3, palette);
}

function drawTopBanner() {
  ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
  ctx.fillRect(12, 12, 280, 44);

  ctx.fillStyle = "#ffffff";
  ctx.font = "10px 'Press Start 2P', 'Courier New', monospace";
  ctx.fillText(`DAY ${state.day}`, 22, 30);
  ctx.fillText(`MONEY ${Math.floor(state.money)}G`, 22, 45);

  const ratio = state.timeInDay / state.dayLength;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(160, 26, 120, 8);
  ctx.fillStyle = "#4cc35a";
  ctx.fillRect(161, 27, Math.floor(118 * ratio), 6);
}

function drawBubble(x, y, text) {
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(Math.floor(x - 8), Math.floor(y - 10), 16, 12);
  ctx.strokeStyle = "#222";
  ctx.strokeRect(Math.floor(x - 8), Math.floor(y - 10), 16, 12);
  ctx.fillStyle = "#111";
  ctx.font = "8px 'Press Start 2P', 'Courier New', monospace";
  ctx.fillText(text, Math.floor(x - 4), Math.floor(y - 2));
}

function drawSprite(sprite, x, y, scale, palette) {
  for (let row = 0; row < sprite.length; row += 1) {
    for (let col = 0; col < sprite[row].length; col += 1) {
      const char = sprite[row][col];
      if (char === ".") continue;
      const color = palette[char];
      if (!color) continue;
      ctx.fillStyle = color;
      ctx.fillRect(x + col * scale, y + row * scale, scale, scale);
    }
  }
}

function darkenColor(hex, amount) {
  const value = hex.replace("#", "");
  const num = parseInt(value, 16);
  const r = clamp(((num >> 16) & 255) + amount, 0, 255);
  const g = clamp(((num >> 8) & 255) + amount, 0, 255);
  const b = clamp((num & 255) + amount, 0, 255);
  return `rgb(${r}, ${g}, ${b})`;
}

function refreshStats() {
  moneyValue.textContent = formatMoney(state.money);
  dayValue.textContent = `${state.day}日目`;
  customerValue.textContent = `${state.customersServed}人`;
  salesValue.textContent = `${Math.floor(state.totalSales).toLocaleString()}G`;
}

function setupInput() {
  window.addEventListener("keydown", (event) => {
    state.keys[event.key] = true;

    const key = event.key.toLowerCase();
    if (!event.repeat && (key === "e" || event.key === "Enter")) {
      handleInteract();
    }
  });

  window.addEventListener("keyup", (event) => {
    state.keys[event.key] = false;
  });
}

function setHudOpen(isOpen) {
  if (!appRoot || !hudToggle) return;

  appRoot.classList.toggle("hud-open", isOpen);
  hudToggle.textContent = isOpen ? "×" : "+";
  hudToggle.setAttribute("aria-expanded", String(isOpen));
  hudToggle.setAttribute("aria-label", isOpen ? "町の店長ストーリーを閉じる" : "町の店長ストーリーを開く");
}

function setupHudToggle() {
  if (!appRoot || !hudToggle) return;

  setHudOpen(false);

  hudToggle.addEventListener("click", () => {
    setHudOpen(!appRoot.classList.contains("hud-open"));
  });
}

function loop(timestamp) {
  if (!state.lastTs) state.lastTs = timestamp;
  const dt = Math.min((timestamp - state.lastTs) / 1000, 0.033);
  state.lastTs = timestamp;

  update(dt);
  drawScene();

  requestAnimationFrame(loop);
}

function startGame() {
  initLots();
  createLotControls();
  setupInput();
  setupHudToggle();
  refreshStats();
  addLog("まずは区画1の自宅ショップでお金を稼ぎましょう。", "good");
  addLog("お金が貯まったら区画2・区画3に新しい店を建てられます。", "good");
  addLog("店の近くで接客すると、購入スピードが上がります。", "good");
  requestAnimationFrame(loop);
}

startGame();
