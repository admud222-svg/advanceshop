import { system, world } from "@minecraft/server";

const STOCK_PREFIX = "stock_";

export function getStock(itemId) {
    const raw = world.getDynamicProperty(STOCK_PREFIX + itemId);
    return typeof raw === "number" ? raw : null;
}

export function setStock(itemId, value) {
    world.setDynamicProperty(STOCK_PREFIX + itemId, Math.max(0, Math.floor(value)));
}

export function reduceStock(itemId, amount) {
    const current = getStock(itemId) ?? 0;
    if (current < amount) return false;
    setStock(itemId, current - amount);
    return true;
}

export function increaseStock(itemId, amount) {
    const current = getStock(itemId) ?? 0;
    setStock(itemId, current + amount);
}

export function initializeStock(itemList) {
    for (const item of itemList) {
        if (getStock(item.id) === null) {
            const initStock = Math.floor(item.stockMax / 2);
            setStock(item.id, initStock);
        }
    }
}