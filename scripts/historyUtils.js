import { system, world } from "@minecraft/server";

const HISTORY_PREFIX = "history_";
const MAX_ENTRIES = 25;

export function recordTransaction(player, type, detail) {
    const key = HISTORY_PREFIX + player.name;
    const raw = world.getDynamicProperty(key);
    let list = [];

    try {
        list = typeof raw === "string" ? JSON.parse(raw) : [];
    } catch (e) {}

    const now = new Date();
    const entry = {
        t: now.toISOString(),
        type,
        detail
    };

    list.unshift(entry);
    if (list.length > MAX_ENTRIES) list.length = MAX_ENTRIES;

    world.setDynamicProperty(key, JSON.stringify(list));
}

export function getTransactionHistory(player) {
    const key = HISTORY_PREFIX + player.name;
    const raw = world.getDynamicProperty(key);
    try {
        return typeof raw === "string" ? JSON.parse(raw) : [];
    } catch (e) {
        return [];
    }
}