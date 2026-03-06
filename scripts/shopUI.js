import { ModalFormData } from "@minecraft/server-ui";
import { formatNumber } from "./formatUtils.js";
import { isFavorited, toggleFavorite } from "./favoriteUtils.js";
import { getScore, setScore, addScore } from "./scoreUtils.js";
import { calculatePrice, addDemand, getLastPrice, setLastPrice } from "./priceUtils.js";
import { reduceStock, increaseStock, getStock } from "./stockUtils.js";
import { getItemCount, removeItem, inventoryHasSpace } from "./inventoryUtils.js";
import { recordTransaction } from "./historyUtils.js";
import { world, ItemStack } from "@minecraft/server";

export async function openPurchaseUI(player, itemData) {
    const price = getLastPrice(itemData.id) ?? calculatePrice(itemData);
const oldPrice = price;
    const stock = getStock(itemData.id) ?? itemData.stockMax;
    const money = getScore(player, "money");
    const maxBuyByMoney = Math.floor(money / price);
    const maxBuy = Math.min(stock, maxBuyByMoney);

    if (stock <= 0) {
        player.sendMessage("§cThis item is currently out of stock.");
        player.playSound("note.bass");
        return;
    }
    
    const cannotBeSold = itemData.cannotBeSold === true;
    let infoLine = `You can buy up to: ${maxBuy}`;
if (cannotBeSold) {
  infoLine += `\n§cThis item cannot be sold`;
}
    
    const form = new ModalFormData()
        .title(`${itemData.displayName} - $${price}`)
        .textField(infoLine, "Enter amount")
        .toggle("", { defaultValue: true })
        .toggle("Add to Favorite", { defaultValue: isFavorited(player, itemData.id) });

    const res = await form.show(player);
    if (res.canceled) return;

    const amount = parseInt(res.formValues[0]);
    const isBuying = res.formValues[1];
    const addToFav = res.formValues[2];
    const isCurrentlyFavorited = isFavorited(player, itemData.id);

    if (addToFav !== isCurrentlyFavorited) {
        toggleFavorite(player, itemData.id);
    }

    if (isNaN(amount) || amount <= 0) {
        player.sendMessage("§cPlease enter a valid amount.");
        player.playSound("note.bass");
        return;
    }

    if (isBuying) {
        if (amount > maxBuy) {
            player.sendMessage(`§cYou can only buy up to ${maxBuy} items.`);
            return;
        }

        if (!inventoryHasSpace(player, itemData.id, amount)) {
            player.sendMessage("§cYour inventory does not have enough space.");
            player.playSound("note.bass");
            return;
        }

        setScore(player, "money", money - (amount * price));
        const inv = player.getComponent("inventory").container;
        const prototypeStack = new ItemStack(itemData.id, 1);
        const maxStackSize = prototypeStack.maxAmount ?? 64;
        let remaining = amount;
        while (remaining > 0) {
            const thisStack = Math.min(remaining, maxStackSize);
            inv.addItem(new ItemStack(itemData.id, thisStack));
            remaining -= thisStack;
        }
        reduceStock(itemData.id, amount);
        addDemand(itemData.id, amount);
        recordTransaction(player, "Buy", `+${amount}x ${itemData.displayName} for $${amount * price}`);
        player.sendMessage(`§aSuccessfully bought ${amount}x ${itemData.displayName} for $${amount * price}.`);
        player.playSound("random.orb");
        player.onScreenDisplay.setActionBar(`§c-$${formatNumber(amount * price)}`);
    } else {
    	
         if (!isBuying && cannotBeSold) {
  player.sendMessage("§cThis item cannot be sold!");
  player.playSound("note.bass");
  return;
}
    
        const owned = getItemCount(player, itemData.id);
        if (amount > owned) {
            player.sendMessage("§cYou don't have that many items to sell.");
            player.playSound("note.bass");
            return;
        }

        removeItem(player, itemData.id, amount);
        addScore(player, "money", amount * price);
        increaseStock(itemData.id, amount);
        recordTransaction(player, "Sell", `-${amount}x ${itemData.displayName} for $${amount * price}`);
        player.sendMessage(`§aSuccessfully sold ${amount}x ${itemData.displayName} for $${amount * price}.`);
        player.playSound("random.orb");
        player.onScreenDisplay.setActionBar(`§a+$${formatNumber(amount * price)}`);
    }
}
