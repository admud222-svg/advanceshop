import { EntityInventoryComponent, ItemStack } from "@minecraft/server";

export function getItemCount(player, itemId) {
    const container = player.getComponent(EntityInventoryComponent.componentId)?.container;
    let count = 0;
    for (let i = 0; i < container.size; i++) {
        const item = container.getItem(i);
        if (item && item.typeId === itemId) {
            count += item.amount;
        }
    }
    return count;
}

export function removeItem(player, itemId, amount = 0) {
    const container = player.getComponent(EntityInventoryComponent.componentId)?.container;
    let remaining = amount;

    for (let i = 0; i < container.size; i++) {
        const item = container.getItem(i);
        if (item && item.typeId === itemId) {
            if (amount === 0) {
                container.setItem(i, undefined);
            } else {
                const removeCount = Math.min(item.amount, remaining);
                remaining -= removeCount;
                const newAmount = item.amount - removeCount;

                if (newAmount <= 0) {
                    container.setItem(i, undefined);
                } else {
                    item.amount = newAmount;
                    container.setItem(i, item);
                }

                if (remaining <= 0) break;
            }
        }
    }
}

export function inventoryHasSpace(player, itemId, amount) {
    const container = player.getComponent("inventory").container;
    const testStack = new ItemStack(itemId, 1);
    const maxStack = testStack.maxAmount ?? 64;
    let spaceAvailable = 0;

    for (let i = 0; i < container.size; i++) {
        const item = container.getItem(i);

        if (!item) {
            spaceAvailable += maxStack;
        } else if (item.typeId === itemId) {
            const currentAmount = item.amount ?? 0;
            const stackLimit = item.maxAmount ?? maxStack;
            spaceAvailable += (stackLimit - currentAmount);
        }

        if (spaceAvailable >= amount) return true;
    }

    return false;
}