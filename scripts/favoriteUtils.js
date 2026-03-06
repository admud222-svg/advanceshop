import { world } from "@minecraft/server";

const PREFIX = "favorite_";

export function getFavorites(player) {
    const raw = world.getDynamicProperty(PREFIX + player.name);
    try {
        return typeof raw === "string" ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

export function toggleFavorite(player, itemId) {
    const key = PREFIX + player.name;
    const list = getFavorites(player);

    const index = list.indexOf(itemId);
    if (index === -1) list.push(itemId);
    else list.splice(index, 1);

    world.setDynamicProperty(key, JSON.stringify(list));
}

export function isFavorited(player, itemId) {
    const list = getFavorites(player);
    return list.includes(itemId);
}