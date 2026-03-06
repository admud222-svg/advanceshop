import { system, world } from "@minecraft/server";

const DEMAND_PREFIX = "demand_";
const LAST_PREFIX = "lastPrice_";

export function addDemand(itemId, count = 1) {
    const key = DEMAND_PREFIX + itemId;
    const raw = world.getDynamicProperty(key);
    let list = [];

    try {
        list = typeof raw === "string" ? JSON.parse(raw) : [];
    } catch (e) {
        list = [];
    }

    const now = Date.now();
    list.push({ t: now, a: count });

    world.setDynamicProperty(key, JSON.stringify(list));
}

function getDemandMultiplier(itemId, windowMinutes = 60) {
    const key = DEMAND_PREFIX + itemId;
    const raw = world.getDynamicProperty(key);
    if (typeof raw !== "string") return 1;

    let list = [];
    try {
        list = JSON.parse(raw);
    } catch (e) {
        return 1;
    }

    const now = Date.now();
    const windowMs = windowMinutes * 60 * 1000;
    list = list.filter(entry => now - entry.t <= windowMs);
    world.setDynamicProperty(key, JSON.stringify(list));

    const totalBought = list.reduce((acc, x) => acc + x.a, 0);
    const multiplier = 1.0 + Math.min(totalBought / 20, 1.0); // Max 2.0x
    return Math.round(multiplier * 100) / 100;
}

function getStockMultiplier(stock, stockMax) {
    if (typeof stock !== "number" || typeof stockMax !== "number" || stockMax <= 0) return 1.0;
    const ratio = stock / stockMax;
    if (ratio >= 1) return 1.0;
    return Math.round((1.5 - ratio * 0.5) * 100) / 100; // Max 1.5x, min 1.0x
}

export function calculatePrice(itemData) {
    const base = typeof itemData.basePrice === "number" ? itemData.basePrice : 1000;
    const rarity = typeof itemData.rarityFactor === "number" ? itemData.rarityFactor : 1.0;
    const stockMax = typeof itemData.stockMax === "number" ? itemData.stockMax : 100;

    const rawStock = world.getDynamicProperty("stock_" + itemData.id);
    const stock = typeof rawStock === "number" ? rawStock : stockMax;

    const demandMult = getDemandMultiplier(itemData.id, itemData.demandWindowSize ?? 60);
    const stockMult = getStockMultiplier(stock, stockMax);

    let price = base * rarity * demandMult * stockMult;
    const rawFloor = itemData.priceFloorPercent ?? 0.9;
    const rawCeil  = itemData.priceCeilingPercent ?? 1.1;
    const floorPct = rawFloor > 10 ? rawFloor / 100 : rawFloor;
    const ceilPct  = rawCeil  > 10 ? rawCeil  / 100 : rawCeil;
    const min = Math.round(base * floorPct);
    const max = Math.round(base * ceilPct);
    price = Math.max(min, Math.min(price, max));
    price = Math.round(price);
    setLastPrice(itemData.id, price);
    return price;
}

export function getLastPrice(itemId) {
    const key = LAST_PREFIX + itemId;
    const raw = world.getDynamicProperty(key);
    return typeof raw === "number" ? raw : 0;
}

export function setLastPrice(itemId, price) {
    const key = LAST_PREFIX + itemId;
    world.setDynamicProperty(key, price);
}

export function applyRarityFluctuation(itemData) {
    if (Array.isArray(itemData)) {
        for (const item of itemData) applyRarityFluctuation(item);
        return;
    }

    const id = itemData.id;
    const rarity = itemData.rarityFactor;
    if (typeof rarity !== "number" || rarity <= 0) return;

    const maxPct = itemData._fp ?? 0.05;
    const upChance = itemData._tc ?? 0.5;

    const base = itemData.basePrice;
    const rawFloor = itemData.priceFloorPercent ?? 0.9;
    const rawCeil  = itemData.priceCeilingPercent ?? 1.1;
    const floorPct = rawFloor > 10 ? rawFloor / 100 : rawFloor;
    const ceilPct  = rawCeil > 10 ? rawCeil / 100 : rawCeil;
    const min = Math.round(base * floorPct);
    const max = Math.round(base * ceilPct);

    const current = getLastPrice(id) ?? base;
    const goingUp = Math.random() < upChance;
    const pct = Math.random() * maxPct;
    const delta = Math.round(current * pct * (goingUp ? 1 : -1));
    let next = current + delta;
    next = Math.max(min, Math.min(max, next));

    world.setDynamicProperty("previousPrice_" + id, current);
    setLastPrice(id, next);
}

export function updatePrices(itemArray) {
    for (const item of itemArray) {
        if (typeof item.rarityFactor !== "number") {
            calculatePrice(item);
        }
    }
}