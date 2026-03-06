import { system } from "@minecraft/server";
import { getStock, increaseStock } from "./stockUtils.js";

export function startRestockSystem(itemList) {
    for (const item of itemList) {
        if (!item.restockAmount || !item.restockIntervalMinutes) continue;

        const intervalTicks = item.restockIntervalMinutes * 60 * 20;
        system.runInterval(() => {
            const current = getStock(item.id) ?? 0;
            if (current < item.stockMax) {
                const add = Math.min(item.restockAmount, item.stockMax - current);
                increaseStock(item.id, add);
            }
        }, intervalTicks);
    }
}