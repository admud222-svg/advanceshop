import { system, world } from "@minecraft/server";

export function getScore(entity, objective) {
    const obj = world.scoreboard.getObjective(objective) ?? world.scoreboard.addObjective(objective);
    return obj.hasParticipant(entity) ? obj.getScore(entity) : 0;
}

export function setScore(entity, objective, value) {
    const obj = world.scoreboard.getObjective(objective) ?? world.scoreboard.addObjective(objective);
    obj.setScore(entity, value);
    return getScore(entity, objective);
}

export function addScore(entity, objective, value) {
    const current = getScore(entity, objective);
    return setScore(entity, objective, current + value);
}