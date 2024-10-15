/*
Copyright (C) 2024 Deana Brcka

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.
This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.
You should have received a copy of the GNU General Public License
along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import { Instance as i } from "server/cspointscript";

var currentZone = "";
var timerStopped = true;
var timerTicks = 0;
var checkpoint = null;
var cpNum = 0;
var tpNum = 0;
var respawnPos = null;
var playerVel = "000.00";
var playerPreVel = "000.00";
var playerPos = null;
var oldPlayerPos = null;
var playerJumped = false;
var playerJumpedPos = null;
var playerLandedPos = null;
var ticksInAir = 0;

var keysEnabled = false;
var keyW = false;
var keyS = false;
var keyA = false;
var keyD = false;
var keySpace = false;
var keySpaceAlt = false;
var keyCtrl = false;

var currentColor = { r: 255, g: 0, b: 0 };

i.PublicMethod("on_tick", /*none*/() => { onTick() });
i.PublicMethod("stop_timer", /*none*/() => { stopTimer() });
i.PublicMethod("start_timer", /*none*/() => { startTimer() });
i.PublicMethod("stop_timerb1", /*none*/() => { stopTimer(1) });
i.PublicMethod("start_timerb1", /*none*/() => { startTimer(1) });
i.PublicMethod("stop_timerb2", /*none*/() => { stopTimer(2) });
i.PublicMethod("start_timerb2", /*none*/() => { startTimer(2) });
i.PublicMethod("stop_timerb3", /*none*/() => { stopTimer(3) });
i.PublicMethod("start_timerb3", /*none*/() => { startTimer(3) });

i.PublicMethod("on_jump", /*none*/() => { onPlayerJump() });
i.PublicMethod("on_spawn", /*none*/() => { onPlayerSpawn() });
i.PublicMethod("on_sound", /*none*/() => { onPlayerSound() });
i.PublicMethod("on_velo", /*number*/(v) => { onVelo(v) });

i.PublicMethod("kz_cp", /*none*/() => { saveCheckpoint() });
i.PublicMethod("kz_tp", /*none*/() => { loadCheckpoint() });
i.PublicMethod("kz_r", /*none*/() => { respawn() });
i.PublicMethod("kz_keys", /*none*/() => { toggleKeys() });

i.PublicMethod("p_kz_w", /*none*/() => { keyPress("w") });
i.PublicMethod("r_kz_w", /*none*/() => { keyRelease("w") });

i.PublicMethod("p_kz_a", /*none*/() => { keyPress("a") });
i.PublicMethod("r_kz_a", /*none*/() => { keyRelease("a") });

i.PublicMethod("p_kz_s", /*none*/() => { keyPress("s") });
i.PublicMethod("r_kz_s", /*none*/() => { keyRelease("s") });

i.PublicMethod("p_kz_d", /*none*/() => { keyPress("d") });
i.PublicMethod("r_kz_d", /*none*/() => { keyRelease("d") });

i.PublicMethod("p_kz_space", /*none*/() => { keyPress("space") });
i.PublicMethod("r_kz_space", /*none*/() => { keyRelease("space") });

i.PublicMethod("p_kz_ctrl", /*none*/() => { keyPress("ctrl") });
i.PublicMethod("r_kz_ctrl", /*none*/() => { keyRelease("ctrl") });

function EntFireAtName(targetname, key, value = "", delay = 0) { i.EntFireAtName(targetname, key, value, delay) };
function SendCommand(message, delay = 0) { i.EntFireAtName("sv", "Command", `${message}`, delay) };
function CreateHud(message) { i.EntFireAtName("sv", "Command", `ent_create env_hudhint {"targetname" "hudDisplay" "message" "${message}"}`, 0) };
function ShowHud() { i.EntFireAtName("sv", "Command", `ent_fire hudDisplay showhudhint`, 0) };
function DestroyHud() { i.EntFireAtName("hudDisplay", "Kill") };

function onTick() {
    printTimerToHud();
    if (oldPlayerPos != playerPos) SpawnTrail();
    if (playerJumped) ticksInAir++;
    if (!timerStopped) timerTicks++;
    oldPlayerPos = playerPos;
    playerPos = i.GetEntityOrigin(i.GetPlayerPawn(0)).toString().replace(/,/g, ' ');
    EntFireAtName("kz_script", "on_tick", "", 0.015625);
}

function printTimerToHud() {
    DestroyHud();
    CreateHud(`${!timerStopped ? `${currentZone} ${formatTime(timerTicks)} | CPs: ${cpNum} | TPs: ${tpNum} \r` : ""} ${playerVel} (${playerPreVel}) ${keysEnabled ? `\r ${keyW ? "W" : "_"} ${keyA ? "A" : "_"} ${keyS ? "S" : "_"} ${keyD ? "D" : "_"} ${keySpace || keySpaceAlt ? "J" : "_"} ${keyCtrl ? "C" : "_"}` : ""}`);
    ShowHud();
    if(keySpaceAlt) keySpaceAlt = false;
}

function stopTimer(zone = 0) {
    if (!timerStopped) {
        var endZone = "";
        switch (zone) {
            case 0:
                endZone = "";
                break;
            case 1:
                endZone = "Bonus 1";
                break;
            case 2:
                endZone = "Bonus 2";
                break;
            case 3:
                endZone = "Bonus 3";
                break;
            default:
                endZone = "";
                break;
        }

        if (endZone != currentZone) return;

        timerStopped = true;

        SendCommand(`say ${endZone} Timer stopped! Total time: ${formatTime(timerTicks)} | CPs: ${cpNum} | TPs: ${tpNum}`);
    }
}

function startTimer(zone = 0) {
    timerStopped = false;
    timerTicks = 0;

    switch (zone) {
        case 0:
            currentZone = "";
            break;
        case 1:
            currentZone = "Bonus 1";
            break;
        case 2:
            currentZone = "Bonus 2";
            break;
        case 3:
            currentZone = "Bonus 3";
            break;
        default:
            currentZone = "";
            break;
    }
}

//taken from my previous SharpTimer project
function formatTime(ticks) {
    const secondsPerTick = ticks / 64.0;

    const totalSeconds = Math.floor(secondsPerTick);
    const totalMinutes = Math.floor(totalSeconds / 60);
    const remainingSeconds = totalSeconds % 60;
    const milliseconds = `${((ticks % 64) * (1000.0 / 64.0)).toFixed(0).padStart(3, '0')}`;

    return `${totalMinutes}:${remainingSeconds.toString().padStart(2, '0')}.${milliseconds}`;
}

function saveCheckpoint() {
    if (ticksInAir > 3) {
        SendCommand(`say You must be on the ground before saving a checkpoint!`);
        return;
    }

    var playerPos = i.GetEntityOrigin(i.GetPlayerPawn(0));
    checkpoint = playerPos.toString().replace(/,/g, ' ');
    cpNum++;
    SendCommand(`say Checkpoint #${cpNum} Saved!`);
}

//this is shit
function loadCheckpoint() {
    if (checkpoint != null) {
        SendCommand("setpos " + checkpoint);
        tpNum++;
        playerJumped = false;
        SendCommand(`say Checkpoint #${cpNum} Loaded!`);
    } else
        SendCommand(`say No checkpoint to load!`);
}

function respawn() {
    if (respawnPos != null) {
        SendCommand("setpos " + respawnPos);
        timerStopped = true;
        timerTicks = 0;
        cpNum = 0;
        tpNum = 0;
        checkpoint = null;
        playerJumped = false;
    } else {
        SendCommand(`say No respawn to load! Setting spawn...`);
        var playerPos = i.GetEntityOrigin(i.GetPlayerPawn(0));
        respawnPos = playerPos.toString().replace(/,/g, ' ');
    }
}

function onPlayerJump() {
    keySpaceAlt = true;
    playerPreVel = playerVel;
    playerJumped = true;
    playerJumpedPos = oldPlayerPos;
    ticksInAir = 0;
}

function onPlayerSpawn() {
    SendCommand(`say Setting spawn...`);
    var playerPos = i.GetEntityOrigin(i.GetPlayerPawn(0));
    respawnPos = playerPos.toString().replace(/,/g, ' ');
}

function onPlayerSound() {
    if (playerJumped) {
        playerLandedPos = oldPlayerPos;

        if (playerJumpedPos != null && playerLandedPos != null) {
            const distance = calculateDistance(playerJumpedPos, playerLandedPos);
            if (distance > 100 && ticksInAir > 5 && timerStopped) SendCommand(`say LJ: ${distance.toFixed(2)} | Pre: ${playerPreVel}`);
        }
        ticksInAir = 0;
        playerJumped = false;
    }
}

function calculateDistance(playerJumpedPos, playerLandedPos) {
    const jumpComponents = playerJumpedPos.split(' ').map(parseFloat);
    const landComponents = playerLandedPos.split(' ').map(parseFloat);

    if (jumpComponents.length !== 3 || landComponents.length !== 3) {
        i.Msg('Invalid vector string format');
        return;
    }

    const distance = Math.sqrt(
        Math.pow(landComponents[0] - jumpComponents[0], 2) + // x component
        Math.pow(landComponents[1] - jumpComponents[1], 2)   // y component
    );

    return distance;
}

function keyPress(key) {
    switch (key) {
        case "w":
            keyW = true;
            break;
        case "a":
            keyA = true;
            break;
        case "s":
            keyS = true;
            break;
        case "d":
            keyD = true;
            break;
        case "space":
            keySpace = true;
            break;
        case "ctrl":
            keyCtrl = true;
            break;
        default:
            break;
    }
};

function keyRelease(key) {
    switch (key) {
        case "w":
            keyW = false;
            break;
        case "a":
            keyA = false;
            break;
        case "s":
            keyS = false;
            break;
        case "d":
            keyD = false;
            break;
        case "space":
            keySpace = false;
            break;
        case "ctrl":
            keyCtrl = false;
            break;
        default:
            break;
    }
};

function toggleKeys() {
    keysEnabled = !keysEnabled;
}

function onVelo(v) {
    v = v.toFixed(2).toString().padStart(6, '0');
    playerVel = v;
}

function SpawnTrail() {
    SendCommand(`box  ${oldPlayerPos} ${playerPos} 3 ${currentColor.r} ${currentColor.g} ${currentColor.b}`);
    nextRainbowColor();
}

function nextRainbowColor() {
    var r = currentColor.r;
    var g = currentColor.g;
    var b = currentColor.b;

    var step = 5;

    if (r === 255 && g < 255 && b === 0) {
        g += step;
    } else if (g === 255 && r > 0 && b === 0) {
        r -= step;
    } else if (g === 255 && b < 255 && r === 0) {
        b += step;
    } else if (b === 255 && g > 0 && r === 0) {
        g -= step;
    } else if (b === 255 && r < 255 && g === 0) {
        r += step;
    } else if (r === 255 && b > 0 && g === 0) {
        b -= step;
    }

    r = Math.max(0, Math.min(255, r));
    g = Math.max(0, Math.min(255, g));
    b = Math.max(0, Math.min(255, b));
    currentColor = { r: r, g: g, b: b };
    return 'rgb(' + r + ', ' + g + ', ' + b + ')';
}
