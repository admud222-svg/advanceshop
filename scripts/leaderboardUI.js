import { ActionFormData } from "@minecraft/server-ui";
import { getLeaderboardSnapshot } from "./leaderboardUtils.js";
import { formatNumber } from "./formatUtils.js";

const LEADERBOARD_BUTTON_TEXTURE = "textures/icon/plyr_profile";

export async function openLeaderboardUI(player) {
  const snapshot = getLeaderboardSnapshot();

  const form = new ActionFormData()
    .title("§f§lLEADERBOARD")
    .body("§fUpdated every 12 hours\n");

  if (!snapshot || snapshot.data.length === 0) {
    form.body("No leaderboard data available.");
    form.button("§cBack", LEADERBOARD_BUTTON_TEXTURE);
    await form.show(player);
    return;
  }

  snapshot.data.forEach((entry, index) => {
    const rank = index + 1;

    form.button(
      `§f${rank}. ${entry.name}\n§a$${formatNumber(entry.money)}`,
      LEADERBOARD_BUTTON_TEXTURE
    );
  });

  form.button("§cBack");

  await form.show(player);
}