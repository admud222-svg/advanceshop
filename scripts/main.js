import { world, system, Player, CommandPermissionLevel, CustomCommandStatus, CustomCommandOrigin, } from "@minecraft/server";
import { ActionFormData } from "@minecraft/server-ui";

import { getScore, setScore } from "./scoreUtils.js";
import { formatNumber } from "./formatUtils.js";
import { initializeStock, getStock } from "./stockUtils.js";
import { startRestockSystem } from "./restockManager.js";
//BLOCK CATEGORY
import { logs } from "./categories/blocks/logs.js";
import { planks } from "./categories/blocks/planks.js";
import { stone } from "./categories/blocks/stone.js";
import { decorativeStone } from "./categories/blocks/decorativeStone.js";
import { sandstone } from "./categories/blocks/sandstone.js";
import { wool } from "./categories/blocks/wool.js";
import { concrete } from "./categories/blocks/concrete.js";
import { terracotta } from "./categories/blocks/terracotta.js";
import { glazedTerracotta } from "./categories/blocks/glazedTerracotta.js";
import { quartzBlock } from "./categories/blocks/quartzBlock.js";
import { coralBlock } from "./categories/blocks/coralBlock.js";
import { functionalBlock } from "./categories/blocks/functionalBlock.js";
import { otherBlock } from "./categories/blocks/otherBlock.js";
//GLASS CATEGORY
import { glassBlock } from "./categories/glass/glassBlock.js";
//TOOLS CATEGORY
import { tools } from "./categories/tools/tools.js";
//ARMOR CATEGORY
import { armor } from "./categories/armor/armor.js";
//ORES CATEGORY
import { ores } from "./categories/ores/ores.js";
//FARM CATEGORY
import { farm } from "./categories/farm/farm.js";
//FOOD CATEGORY
import { food } from "./categories/food/food.js";
//DYE CATEGORY
import { dye } from "./categories/dye/dye.js";
//REDSTONE CATEGORY
import { redstone } from "./categories/redstone/redstone.js";
//MISCELLANEOUS CATEGORY
import { miscellaneous } from "./categories/miscellaneous/miscellaneous.js";
//MOB DROP CATEGORY
import { mobd } from "./categories/mobd/mobd.js";
import { openPurchaseUI } from "./shopUI.js";
import { getFavorites } from "./favoriteUtils.js";
import { calculatePrice, getLastPrice, setLastPrice } from "./priceUtils.js";
import { getTransactionHistory } from "./historyUtils.js";
import { applyRarityFluctuation, updatePrices } from "./priceUtils";
import { openLeaderboardUI } from "./leaderboardUI.js";
import { startLeaderboardSystem } from "./leaderboardUtils.js";
import { openEnchantmentCategory } from "./enchantmentUI.js";

let leaderboardStarted = false;

system.run(() => {
  if (leaderboardStarted) return;
  leaderboardStarted = true;

  startLeaderboardSystem();
});

const allItems = [ ...logs, ...planks, ...stone, ...decorativeStone, ...sandstone, ...wool, ...concrete, ...terracotta, ...glazedTerracotta, ...quartzBlock, ...coralBlock, ...functionalBlock, ...glassBlock, ...otherBlock, ...armor, ...ores, ...farm, ...food, ...dye, ...redstone, ...tools, ...miscellaneous, ...mobd ];

function initializeItemData() {
  for (const item of allItems) {
    const stockKey = "stock_" + item.id;
    const demandKey = "demand_" + item.id;
    const priceKey = "lastPrice_" + item.id;

    if (world.getDynamicProperty(stockKey) === undefined) {
      world.setDynamicProperty(stockKey, item.stockMax);
    }

    if (world.getDynamicProperty(demandKey) === undefined) {
      world.setDynamicProperty(demandKey, JSON.stringify([]));
    }

    if (world.getDynamicProperty(priceKey) === undefined) {
      world.setDynamicProperty(priceKey, item.basePrice);
    }
  }
}

world.afterEvents.playerSpawn.subscribe(({ player, initialSpawn }) => {
  if (!initialSpawn) return;

  if (!player.getDynamicProperty("firstJoin")) {
    player.setDynamicProperty("firstJoin", true);

    const moneyObj = world.scoreboard.getObjective("money")
      ?? world.scoreboard.addObjective("money", "Money");
    setScore(player, "money", 0);
  }
});

let initialized = false;

system.runInterval(() => {
  if (!initialized) {
    initialized = true;
    initializeItemData();
    initializeStock(allItems);
    startRestockSystem(allItems);
  }

  applyRarityFluctuation(allItems);
  updatePrices(allItems);
}, 200);

system.beforeEvents.startup.subscribe((init) => {
  const shopCommand = ({
    name: "shop:shop",
    description: "Open the Advanced Shop UI",
    permissionLevel: CommandPermissionLevel.Any,
    cheatsRequired: false,
    optionalParameters: [],
    mandatoryParameters: [],
  });

  init.customCommandRegistry.registerCommand(
    shopCommand,
    shopCommandHandler
  );
});

function shopCommandHandler(origin) {
  const player = origin.sourceEntity;
  if (!player) {
    return {
      status: CustomCommandStatus.Failure,
      message: "No player found to open shop.",
    };
  }

  system.run(() => {
    openShopMenu(player);
  });

  return {
    status: CustomCommandStatus.Success,
  };
}

async function openShopMenu(player) {
	const balance = getScore(player, "money");
    const form = new ActionFormData()
        .title("§f§lADVANCED SHOP")
        .body(`Balance: §a$${formatNumber(balance)}\n§rSelect a category:`)
        .button("§fBlocks\n§8[Click To View]", "textures/icon/blocks/stone_3d.png")
        .button("§fGlass\n§8[Click To View]", "textures/blocks/glass.png")
        .button("§fTools\n§8[Click To View]", "textures/items/iron_sword.png")
        .button("§fArmor\n§8[Click To View]", "textures/items/diamond_chestplate.png")
        .button("§fOres\n§8[Click To View]", "textures/items/netherite_ingot.png")
        .button("§fFarm\n§8[Click To View]", "textures/items/wheat.png")
        .button("§fFood\n§8[Click To View]", "textures/items/carrot_golden.png")
        .button("§fDye\n§8[Click To View]", "textures/items/dye_powder_white_new.png")
        .button("§fRedstone\n§8[Click To View]", "textures/items/redstone_dust.png")
        .button("§fMiscellaneous\n§8[Click To View]", "textures/items/totem.png")
        .button("§fMob Drop\n§8[Click To View]", "textures/items/rotten_flesh.png")
        .button("§fEnchantment\n§8[Click To View]", "textures/items/book_enchanted.png")
        .button("§eFavorite\n§8[Click To View]", "textures/icon/favorited")
        .button("§6Leaderboard\n§8[Click To View]", "textures/icon/ldb.png")
        .button("§3Transaction History\n§8[Click To View]", "textures/icon/history");

    let res = await form.show(player);
    while (res.cancelationReason === "UserBusy") {
        res = await form.show(player);
    }

    switch (res.selection) {
        case 0: return openBlockCategory(player);
        case 1: return openGlassBlockCategory(player);
        case 2: return openToolsCategory(player);
        case 3: return openArmorCategory(player);
        case 4: return openOresCategory(player);
        case 5: return openFarmCategory(player);
        case 6: return openFoodCategory(player);
        case 7: return openDyeCategory(player);
        case 8: return openRedstoneCategory(player);
        case 9: return openMiscellaneousCategory(player);
        case 10: return openMobdCategory(player);
        case 11: return openEnchantmentCategory(player);
        case 12: return openFavoriteMenu(player);
        case 13: return openLeaderboardUI(player);
        case 14: return openTransactionHistoryMenu(player);
        default: player.sendMessage("§cExiting Advanced Shop.");
    }
}

async function openBlockCategory(player) {
    const form = new ActionFormData()
        .title("§f§lBLOCK CATEGORY")
        .body("Select a sub-category:")
        .button("§fLog\n§8[Click To View]", "textures/icon/blocks/oak_log_3d.png")
        .button("§fPlanks\n§8[Click To View]", "textures/icon/blocks/oak_planks_3d.png")
        .button("§fStone\n§8[Click To View]", "textures/icon/blocks/stone_3d.png")
        .button("§fDecorative Stone\n§8[Click To View]", "textures/icon/blocks/stone_bricks_3d.png")
        .button("§fSandstone\n§8[Click To View]", "textures/icon/blocks/sandstone_3d.png")
        .button("§fWool\n§8[Click To View]", "textures/icon/blocks/white_wool_3d.png")
        .button("§fConcrete\n§8[Click To View]", "textures/icon/blocks/white_concrete_3d.png")
        .button("§fTerracotta\n§8[Click To View]", "textures/icon/blocks/terracotta_3d.png")
        .button("§fGlazed Terracotta\n§8[Click To View]", "textures/icon/blocks/white_glazed_terracotta_3d.png")
        .button("§fQuartz Block\n§8[Click To View]", "textures/icon/blocks/quartz_block_3d.png")
        .button("§fCoral Block\n§8[Click To View]", "textures/icon/blocks/tube_coral_block_3d.png")
        .button("§fFunctional Block\n§8[Click To View]", "textures/icon/blocks/chest_3d.png")
        .button("§fOther\n§8[Click To View]", "textures/icon/blocks/grass_block_3d.png")
        .button("§fBack");

    let res = await form.show(player);
    while (res.cancelationReason === "UserBusy") {
        res = await form.show(player);
    }

    switch (res.selection) {
        case 0: return openLogSubCategory(player);
        case 1: return openPlanksSubCategory(player);
        case 2: return openStoneSubCategory(player);
        case 3: return opendecStoneSubCategory(player);
        case 4: return openSandstoneSubCategory(player);
        case 5: return openWoolSubCategory(player);
        case 6: return openConcreteSubCategory(player);
        case 7: return openTerracottaSubCategory(player);
        case 8: return openGlazedTerracottaSubCategory(player);
        case 9: return openQuartzBlockSubCategory(player);
        case 10: return openCoralBlockSubCategory(player);
        case 11: return openFunctionalBlockSubCategory(player);
        case 12: return openOtherBlockSubCategory(player);
        default: return openShopMenu(player);
    }
}
/*

          ====================
                        BLOCK
                    CATEGORY
          ====================

*/
async function openLogSubCategory(player) {
    const form = new ActionFormData()
        .title("§f§lLog")
        .body("Select:");

    for (const item of logs) {
        const id = item.id;
        const base = typeof item.basePrice === "number" ? item.basePrice : 1000;
        const prev = world.getDynamicProperty("previousPrice_" + id) ?? base;
const curr = getLastPrice(id) ?? base;

let sym = "";
if (curr > prev) sym = "";
else if (curr < prev) sym = "";
        const stock = getStock(id) ?? 0;
        form.button(`${item.displayName}\nPrice: §a$${formatNumber(curr)}§r ${sym}  Stock: §2${formatNumber(stock)}§r`, item.icon);
    }
    form.button("§f§cBack");
    const res = await form.show(player);
    if (res.canceled || res.selection === logs.length) return openShopMenu(player);
    if (res.selection < 0 || res.selection >= logs.length) return;
    openPurchaseUI(player, logs[res.selection]);
}

async function openPlanksSubCategory(player) {
    const form = new ActionFormData()
        .title("§f§lPlanks")
        .body("Select:");

    for (const item of planks) {
        const id = item.id;
        const base = typeof item.basePrice === "number" ? item.basePrice : 1000;
        const prev = world.getDynamicProperty("previousPrice_" + id) ?? base;
const curr = getLastPrice(id) ?? base;

let sym = "";
if (curr > prev) sym = "";
else if (curr < prev) sym = "";
        const stock = getStock(id) ?? 0;
        form.button(`${item.displayName}\nPrice: §a$${formatNumber(curr)}§r ${sym}  Stock: §2${formatNumber(stock)}§r`, item.icon);
    }
    form.button("§f§cBack");
    const res = await form.show(player);
    if (res.canceled || res.selection === planks.length) return openShopMenu(player);
    if (res.selection < 0 || res.selection >= planks.length) return;
    openPurchaseUI(player, planks[res.selection]);
}

async function openStoneSubCategory(player) {
    const form = new ActionFormData()
        .title("§f§lStone")
        .body("Select:");

    for (const item of stone) {
        const id = item.id;
        const base = typeof item.basePrice === "number" ? item.basePrice : 1000;
        const prev = world.getDynamicProperty("previousPrice_" + id) ?? base;
const curr = getLastPrice(id) ?? base;

let sym = "";
if (curr > prev) sym = "";
else if (curr < prev) sym = "";
        const stock = getStock(id) ?? 0;
        form.button(`${item.displayName}\nPrice: §a$${formatNumber(curr)}§r ${sym}  Stock: §2${formatNumber(stock)}§r`, item.icon);
    }
    form.button("§f§cBack");
    const res = await form.show(player);
    if (res.canceled || res.selection === stone.length) return openShopMenu(player);
    if (res.selection < 0 || res.selection >= stone.length) return;
    openPurchaseUI(player, stone[res.selection]);
}

async function opendecStoneSubCategory(player) {
    const form = new ActionFormData()
        .title("§f§lDecorative Stone")
        .body("Select:");

    for (const item of decorativeStone) {
        const id = item.id;
        const base = typeof item.basePrice === "number" ? item.basePrice : 1000;
        const prev = world.getDynamicProperty("previousPrice_" + id) ?? base;
const curr = getLastPrice(id) ?? base;

let sym = "";
if (curr > prev) sym = "";
else if (curr < prev) sym = "";
        const stock = getStock(id) ?? 0;
        form.button(`${item.displayName}\nPrice: §a$${formatNumber(curr)}§r ${sym}  Stock: §2${formatNumber(stock)}§r`, item.icon);
    }
    form.button("§f§cBack");
    const res = await form.show(player);
    if (res.canceled || res.selection === decorativeStone.length) return openShopMenu(player);
    if (res.selection < 0 || res.selection >= decorativeStone.length) return;
    openPurchaseUI(player, decorativeStone[res.selection]);
}

async function openSandstoneSubCategory(player) {
    const form = new ActionFormData()
        .title("§f§lSandstone")
        .body("Select:");

    for (const item of sandstone) {
        const id = item.id;
        const base = typeof item.basePrice === "number" ? item.basePrice : 1000;
        const prev = world.getDynamicProperty("previousPrice_" + id) ?? base;
const curr = getLastPrice(id) ?? base;

let sym = "";
if (curr > prev) sym = "";
else if (curr < prev) sym = "";
        const stock = getStock(id) ?? 0;
        form.button(`${item.displayName}\nPrice: §a$${formatNumber(curr)}§r ${sym}  Stock: §2${formatNumber(stock)}§r`, item.icon);
    }
    form.button("§f§cBack");
    const res = await form.show(player);
    if (res.canceled || res.selection === sandstone.length) return openShopMenu(player);
    if (res.selection < 0 || res.selection >= sandstone.length) return;
    openPurchaseUI(player, sandstone[res.selection]);
}

async function openWoolSubCategory(player) {
    const form = new ActionFormData()
        .title("§f§lWool")
        .body("Select:");

    for (const item of wool) {
        const id = item.id;
        const base = typeof item.basePrice === "number" ? item.basePrice : 1000;
        const prev = world.getDynamicProperty("previousPrice_" + id) ?? base;
const curr = getLastPrice(id) ?? base;

let sym = "";
if (curr > prev) sym = "";
else if (curr < prev) sym = "";
        const stock = getStock(id) ?? 0;
        form.button(`${item.displayName}\nPrice: §a$${formatNumber(curr)}§r ${sym}  Stock: §2${formatNumber(stock)}§r`, item.icon);
    }
    form.button("§f§cBack");
    const res = await form.show(player);
    if (res.canceled || res.selection === wool.length) return openShopMenu(player);
    if (res.selection < 0 || res.selection >= wool.length) return;
    openPurchaseUI(player, wool[res.selection]);
}

async function openConcreteSubCategory(player) {
    const form = new ActionFormData()
        .title("§f§lConcrete")
        .body("Select:");

    for (const item of concrete) {
        const id = item.id;
        const base = typeof item.basePrice === "number" ? item.basePrice : 1000;
        const prev = world.getDynamicProperty("previousPrice_" + id) ?? base;
const curr = getLastPrice(id) ?? base;

let sym = "";
if (curr > prev) sym = "";
else if (curr < prev) sym = "";
        const stock = getStock(id) ?? 0;
        form.button(`${item.displayName}\nPrice: §a$${formatNumber(curr)}§r ${sym}  Stock: §2${formatNumber(stock)}§r`, item.icon);
    }
    form.button("§f§cBack");
    const res = await form.show(player);
    if (res.canceled || res.selection === concrete.length) return openShopMenu(player);
    if (res.selection < 0 || res.selection >= concrete.length) return;
    openPurchaseUI(player, concrete[res.selection]);
}

async function openTerracottaSubCategory(player) {
    const form = new ActionFormData()
        .title("§f§lTerracotta")
        .body("Select:");

    for (const item of terracotta) {
        const id = item.id;
        const base = typeof item.basePrice === "number" ? item.basePrice : 1000;
        const prev = world.getDynamicProperty("previousPrice_" + id) ?? base;
const curr = getLastPrice(id) ?? base;

let sym = "";
if (curr > prev) sym = "";
else if (curr < prev) sym = "";
        const stock = getStock(id) ?? 0;
        form.button(`${item.displayName}\nPrice: §a$${formatNumber(curr)}§r ${sym}  Stock: §2${formatNumber(stock)}§r`, item.icon);
    }
    form.button("§f§cBack");
    const res = await form.show(player);
    if (res.canceled || res.selection === terracotta.length) return openShopMenu(player);
    if (res.selection < 0 || res.selection >= terracotta.length) return;
    openPurchaseUI(player, terracotta[res.selection]);
}

async function openGlazedTerracottaSubCategory(player) {
    const form = new ActionFormData()
        .title("§f§lGlazed Terracotta")
        .body("Select:");

    for (const item of glazedTerracotta) {
        const id = item.id;
        const base = typeof item.basePrice === "number" ? item.basePrice : 1000;
        const prev = world.getDynamicProperty("previousPrice_" + id) ?? base;
const curr = getLastPrice(id) ?? base;

let sym = "";
if (curr > prev) sym = "";
else if (curr < prev) sym = "";
        const stock = getStock(id) ?? 0;
        form.button(`${item.displayName}\nPrice: §a$${formatNumber(curr)}§r ${sym}  Stock: §2${formatNumber(stock)}§r`, item.icon);
    }
    form.button("§f§cBack");
    const res = await form.show(player);
    if (res.canceled || res.selection === glazedTerracotta.length) return openShopMenu(player);
    if (res.selection < 0 || res.selection >= glazedTerracotta.length) return;
    openPurchaseUI(player, glazedTerracotta[res.selection]);
}

async function openQuartzBlockSubCategory(player) {
    const form = new ActionFormData()
        .title("§f§lQuartz Block")
        .body("Select:");

    for (const item of quartzBlock) {
        const id = item.id;
        const base = typeof item.basePrice === "number" ? item.basePrice : 1000;
        const prev = world.getDynamicProperty("previousPrice_" + id) ?? base;
const curr = getLastPrice(id) ?? base;

let sym = "";
if (curr > prev) sym = "";
else if (curr < prev) sym = "";
        const stock = getStock(id) ?? 0;
        form.button(`${item.displayName}\nPrice: §a$${formatNumber(curr)}§r ${sym}  Stock: §2${formatNumber(stock)}§r`, item.icon);
    }
    form.button("§f§cBack");
    const res = await form.show(player);
    if (res.canceled || res.selection === quartzBlock.length) return openShopMenu(player);
    if (res.selection < 0 || res.selection >= quartzBlock.length) return;
    openPurchaseUI(player, quartzBlock[res.selection]);
}

async function openCoralBlockSubCategory(player) {
    const form = new ActionFormData()
        .title("§f§lCoral Block")
        .body("Select:");

    for (const item of coralBlock) {
        const id = item.id;
        const base = typeof item.basePrice === "number" ? item.basePrice : 1000;
        const prev = world.getDynamicProperty("previousPrice_" + id) ?? base;
const curr = getLastPrice(id) ?? base;

let sym = "";
if (curr > prev) sym = "";
else if (curr < prev) sym = "";
        const stock = getStock(id) ?? 0;
        form.button(`${item.displayName}\nPrice: §a$${formatNumber(curr)}§r ${sym}  Stock: §2${formatNumber(stock)}§r`, item.icon);
    }
    form.button("§f§cBack");
    const res = await form.show(player);
    if (res.canceled || res.selection === coralBlock.length) return openShopMenu(player);
    if (res.selection < 0 || res.selection >= coralBlock.length) return;
    openPurchaseUI(player, coralBlock[res.selection]);
}

async function openFunctionalBlockSubCategory(player) {
    const form = new ActionFormData()
        .title("§f§lFunctional Block")
        .body("Select:");

    for (const item of functionalBlock) {
        const id = item.id;
        const base = typeof item.basePrice === "number" ? item.basePrice : 1000;
        const prev = world.getDynamicProperty("previousPrice_" + id) ?? base;
const curr = getLastPrice(id) ?? base;

let sym = "";
if (curr > prev) sym = "";
else if (curr < prev) sym = "";
        const stock = getStock(id) ?? 0;
        form.button(`${item.displayName}\nPrice: §a$${formatNumber(curr)}§r ${sym}  Stock: §2${formatNumber(stock)}§r`, item.icon);
    }
    form.button("§cBack");
    const res = await form.show(player);
    if (res.canceled || res.selection === functionalBlock.length) return openShopMenu(player);
    if (res.selection < 0 || res.selection >= functionalBlock.length) return;
    openPurchaseUI(player, functionalBlock[res.selection]);
}

async function openOtherBlockSubCategory(player) {
    const form = new ActionFormData()
        .title("§f§lOther Block")
        .body("Select:");

    for (const item of otherBlock) {
        const id = item.id;
        const base = typeof item.basePrice === "number" ? item.basePrice : 1000;
        const prev = world.getDynamicProperty("previousPrice_" + id) ?? base;
const curr = getLastPrice(id) ?? base;

let sym = "";
if (curr > prev) sym = "";
else if (curr < prev) sym = "";
        const stock = getStock(id) ?? 0;
        form.button(`${item.displayName}\nPrice: §a$${formatNumber(curr)}§r ${sym}  Stock: §2${formatNumber(stock)}§r`, item.icon);
    }
    form.button("§f§cBack");
    const res = await form.show(player);
    if (res.canceled || res.selection === otherBlock.length) return openShopMenu(player);
    if (res.selection < 0 || res.selection >= otherBlock.length) return;
    openPurchaseUI(player, otherBlock[res.selection]);
}
/*

          ====================
                        GLASS
                    CATEGORY
          ====================

*/

async function openGlassBlockCategory(player) {
    const form = new ActionFormData()
        .title("§f§lGlass")
        .body("Select:");

    for (const item of glassBlock) {
        const id = item.id;
        const base = typeof item.basePrice === "number" ? item.basePrice : 1000;
        const prev = world.getDynamicProperty("previousPrice_" + id) ?? base;
const curr = getLastPrice(id) ?? base;

let sym = "";
if (curr > prev) sym = "";
else if (curr < prev) sym = "";
        const stock = getStock(id) ?? 0;
        form.button(`${item.displayName}\nPrice: §a$${formatNumber(curr)}§r ${sym}  Stock: §2${formatNumber(stock)}§r`, item.icon);
    }
    form.button("§f§cBack");
    const res = await form.show(player);
    if (res.canceled || res.selection === glassBlock.length) return openShopMenu(player);
    if (res.selection < 0 || res.selection >= glassBlock.length) return;
    openPurchaseUI(player, glassBlock[res.selection]);
}
/*

          ====================
                        TOOLS
                    CATEGORY
          ====================

*/

async function openToolsCategory(player) {
    const form = new ActionFormData()
        .title("§f§lTools")
        .body("Select:");

    for (const item of tools) {
        const id = item.id;
        const base = typeof item.basePrice === "number" ? item.basePrice : 1000;
        const prev = world.getDynamicProperty("previousPrice_" + id) ?? base;
const curr = getLastPrice(id) ?? base;

let sym = "";
if (curr > prev) sym = "";
else if (curr < prev) sym = "";
        const stock = getStock(id) ?? 0;
        form.button(`${item.displayName}\nPrice: §a$${formatNumber(curr)}§r ${sym}  Stock: §2${formatNumber(stock)}§r`, item.icon);
    }
    form.button("§f§cBack");
    const res = await form.show(player);
    if (res.canceled || res.selection === tools.length) return openShopMenu(player);
    if (res.selection < 0 || res.selection >= tools.length) return;
    openPurchaseUI(player, tools[res.selection]);
}
/*

          ====================
                        ARMOR
                    CATEGORY
          ====================

*/

async function openArmorCategory(player) {
    const form = new ActionFormData()
        .title("§f§lArmor")
        .body("Select:");

    for (const item of armor) {
        const id = item.id;
        const base = typeof item.basePrice === "number" ? item.basePrice : 1000;
        const prev = world.getDynamicProperty("previousPrice_" + id) ?? base;
const curr = getLastPrice(id) ?? base;

let sym = "";
if (curr > prev) sym = "";
else if (curr < prev) sym = "";
        const stock = getStock(id) ?? 0;
        form.button(`${item.displayName}\nPrice: §a$${formatNumber(curr)}§r ${sym}  Stock: §2${formatNumber(stock)}§r`, item.icon);
    }
    form.button("§f§cBack");
    const res = await form.show(player);
    if (res.canceled || res.selection === armor.length) return openShopMenu(player);
    if (res.selection < 0 || res.selection >= armor.length) return;
    openPurchaseUI(player, armor[res.selection]);
}
/*

          ====================
                        ORES
                    CATEGORY
          ====================

*/

async function openOresCategory(player) {
    const form = new ActionFormData()
        .title("§f§lOres")
        .body("Select:");

    for (const item of ores) {
        const id = item.id;
        const base = typeof item.basePrice === "number" ? item.basePrice : 1000;
        const prev = world.getDynamicProperty("previousPrice_" + id) ?? base;
const curr = getLastPrice(id) ?? base;

let sym = "";
if (curr > prev) sym = "";
else if (curr < prev) sym = "";
        const stock = getStock(id) ?? 0;
        form.button(`${item.displayName}\nPrice: §a$${formatNumber(curr)}§r ${sym}  Stock: §2${formatNumber(stock)}§r`, item.icon);
    }
    form.button("§f§cBack");
    const res = await form.show(player);
    if (res.canceled || res.selection === ores.length) return openShopMenu(player);
    if (res.selection < 0 || res.selection >= ores.length) return;
    openPurchaseUI(player, ores[res.selection]);
}
/*

          ====================
                        FARM
                    CATEGORY
          ====================

*/

async function openFarmCategory(player) {
    const form = new ActionFormData()
        .title("§f§lFarm")
        .body("Select:");

    for (const item of farm) {
        const id = item.id;
        const base = typeof item.basePrice === "number" ? item.basePrice : 1000;
        const prev = world.getDynamicProperty("previousPrice_" + id) ?? base;
const curr = getLastPrice(id) ?? base;

let sym = "";
if (curr > prev) sym = "";
else if (curr < prev) sym = "";
        const stock = getStock(id) ?? 0;
        form.button(`${item.displayName}\nPrice: §a$${formatNumber(curr)}§r ${sym}  Stock: §2${formatNumber(stock)}§r`, item.icon);
    }
    form.button("§f§cBack");
    const res = await form.show(player);
    if (res.canceled || res.selection === farm.length) return openShopMenu(player);
    if (res.selection < 0 || res.selection >= farm.length) return;
    openPurchaseUI(player, farm[res.selection]);
}

/*

          ====================
                        FOOD
                    CATEGORY
          ====================

*/

async function openFoodCategory(player) {
    const form = new ActionFormData()
        .title("§f§lFood")
        .body("Select:");

    for (const item of food) {
        const id = item.id;
        const base = typeof item.basePrice === "number" ? item.basePrice : 1000;
        const prev = world.getDynamicProperty("previousPrice_" + id) ?? base;
const curr = getLastPrice(id) ?? base;

let sym = "";
if (curr > prev) sym = "";
else if (curr < prev) sym = "";
        const stock = getStock(id) ?? 0;
        form.button(`${item.displayName}\nPrice: §a$${formatNumber(curr)}§r ${sym}  Stock: §2${formatNumber(stock)}§r`, item.icon);
    }
    form.button("§f§cBack");
    const res = await form.show(player);
    if (res.canceled || res.selection === food.length) return openShopMenu(player);
    if (res.selection < 0 || res.selection >= food.length) return;
    openPurchaseUI(player, food[res.selection]);
}
/*

          ====================
                        DYE
                    CATEGORY
          ====================

*/

async function openDyeCategory(player) {
    const form = new ActionFormData()
        .title("§f§lDye")
        .body("Select:");

    for (const item of dye) {
        const id = item.id;
        const base = typeof item.basePrice === "number" ? item.basePrice : 1000;
        const prev = world.getDynamicProperty("previousPrice_" + id) ?? base;
const curr = getLastPrice(id) ?? base;

let sym = "";
if (curr > prev) sym = "";
else if (curr < prev) sym = "";
        const stock = getStock(id) ?? 0;
        form.button(`${item.displayName}\nPrice: §a$${formatNumber(curr)}§r ${sym}  Stock: §2${formatNumber(stock)}§r`, item.icon);
    }
    form.button("§f§cBack");
    const res = await form.show(player);
    if (res.canceled || res.selection === dye.length) return openShopMenu(player);
    if (res.selection < 0 || res.selection >= dye.length) return;
    openPurchaseUI(player, dye[res.selection]);
}
/*

          ====================
                    REDSTONE
                    CATEGORY
          ====================

*/

async function openRedstoneCategory(player) {
    const form = new ActionFormData()
        .title("§f§lRedstone")
        .body("Select:");

    for (const item of redstone) {
        const id = item.id;
        const base = typeof item.basePrice === "number" ? item.basePrice : 1000;
        const prev = world.getDynamicProperty("previousPrice_" + id) ?? base;
const curr = getLastPrice(id) ?? base;

let sym = "";
if (curr > prev) sym = "";
else if (curr < prev) sym = "";
        const stock = getStock(id) ?? 0;
        form.button(`${item.displayName}\nPrice: §a$${formatNumber(curr)}§r ${sym}  Stock: §2${formatNumber(stock)}§r`, item.icon);
    }
    form.button("§f§cBack");
    const res = await form.show(player);
    if (res.canceled || res.selection === redstone.length) return openShopMenu(player);
    if (res.selection < 0 || res.selection >= redstone.length) return;
    openPurchaseUI(player, redstone[res.selection]);
}
/*

          ====================
              MISCELLANEOUS
                    CATEGORY
          ====================

*/

async function openMiscellaneousCategory(player) {
    const form = new ActionFormData()
        .title("§f§lMiscellaneous")
        .body("Select:");

    for (const item of miscellaneous) {
        const id = item.id;
        const base = typeof item.basePrice === "number" ? item.basePrice : 1000;
        const prev = world.getDynamicProperty("previousPrice_" + id) ?? base;
const curr = getLastPrice(id) ?? base;

let sym = "";
if (curr > prev) sym = "";
else if (curr < prev) sym = "";
        const stock = getStock(id) ?? 0;
        form.button(`${item.displayName}\nPrice: §a$${formatNumber(curr)}§r ${sym}  Stock: §2${formatNumber(stock)}§r`, item.icon);
    }
    form.button("§f§cBack");
    const res = await form.show(player);
    if (res.canceled || res.selection === miscellaneous.length) return openShopMenu(player);
    if (res.selection < 0 || res.selection >= miscellaneous.length) return;
    openPurchaseUI(player, miscellaneous[res.selection]);
}
/*

          ====================
                    MOB DROP
                    CATEGORY
          ====================

*/

async function openMobdCategory(player) {
    const form = new ActionFormData()
        .title("§f§lMOB DROP")
        .body("Select:");

    for (const item of mobd) {
        const id = item.id;
        const base = typeof item.basePrice === "number" ? item.basePrice : 1000;
        const prev = world.getDynamicProperty("previousPrice_" + id) ?? base;
const curr = getLastPrice(id) ?? base;

let sym = "";
if (curr > prev) sym = "";
else if (curr < prev) sym = "";
        const stock = getStock(id) ?? 0;
        form.button(`${item.displayName}\nPrice: §a$${formatNumber(curr)}§r ${sym}  Stock: §2${formatNumber(stock)}§r`, item.icon);
    }
    form.button("§f§cBack");
    const res = await form.show(player);
    if (res.canceled || res.selection === mobd.length) return openShopMenu(player);
    if (res.selection < 0 || res.selection >= mobd.length) return;
    openPurchaseUI(player, mobd[res.selection]);
}

async function openFavoriteMenu(player) {
    const favorites = getFavorites(player);
    const allItems = [
        ...logs, ...planks, ...stone, ...decorativeStone,
        ...sandstone, ...wool, ...concrete, ...terracotta, ...glazedTerracotta,
        ...quartzBlock, ...coralBlock, ...functionalBlock, ...glassBlock, ...otherBlock,
        ...armor, ...ores, ...farm, ...food, ...dye, ...redstone, ...tools, ...miscellaneous, ...mobd
    ];

    const favItems = allItems.filter(item => favorites.includes(item.id));

    if (favItems.length === 0) {
        player.sendMessage("§cYou have no favorite item or block.");
        player.playSound("note.bass");
        return;
    }

    const form = new ActionFormData()
        .title("§f§lFavorite Items and Block")
        .body("Select:");

    for (const item of favItems) {
        const id = item.id;
        const base = typeof item.basePrice === "number" ? item.basePrice : 1000;
        const prev = world.getDynamicProperty("previousPrice_" + id) ?? base;
        const curr = getLastPrice(id) ?? base;

        let sym = "";
        if (curr > prev) sym = "";
        else if (curr < prev) sym = "";

        const stock = getStock(id) ?? 0;
        form.button(`${item.displayName}\nPrice: §a$${formatNumber(curr)}§r ${sym}  Stock: §2${formatNumber(stock)}§r`, item.icon);
    }

    form.button("§cBack");

    let res = await form.show(player);
    while (res.cancelationReason === "UserBusy") {
        res = await form.show(player);
    }

    if (res.canceled || res.selection === favItems.length) return openShopMenu(player);
    if (res.selection < 0 || res.selection >= favItems.length) return;

    openPurchaseUI(player, favItems[res.selection]);
}

async function openTransactionHistoryMenu(player) {
    const history = getTransactionHistory(player);
    if (history.length === 0) {
        player.sendMessage("§cNo transaction history.");
        player.playSound("note.bass");
        return;
    }

    const lines = history.slice(0, 15).map(entry => {
        const date = new Date(entry.t);
        const formattedDate = date.toLocaleDateString("en-US", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric"
        });
        const formattedTime = date.toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
            hour12: true
        });
        return `[§e${formattedDate} ${formattedTime}§r] §f${entry.type} - ${entry.detail}`;
    });

    const form = new ActionFormData()
        .title("§fTransaction History")
        .body(lines.join("\n"))
        .button("§cClose");

    await form.show(player);
}

world.beforeEvents.chatSend.subscribe(chat => {
    const player = chat.sender;
    if (chat.message.trim().toLowerCase() === "!shop") {
        chat.cancel = true;
        system.runTimeout(() => openShopMenu(player), 0);
    }
});