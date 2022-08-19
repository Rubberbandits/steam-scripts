// Load env vars
require("dotenv").config()

const SteamUser = require('steam-user');
const fs = require("fs");
const { EPurchaseResultDetail, EResult } = require('steam-user');

var client = new SteamUser();

const keyCsv = fs.readFileSync("./keys.csv", {encoding: "ascii"})
const csvLines = keyCsv.split("\n")
const keys = csvLines.map((value) => {return value.split(",")[2]})

const APP_IDS = ["rusty HourBoost", 10, 730, 240]

var ERROR_OCCURRED = false
var PLAYING_GAME = false
var GAME_STATE = false
var DISCONNECTING = false
var LOGGED_IN_ELSEWHERE = false

function switchGameState(appIds) {
	if (appIds.length > 0)
		GAME_STATE = true

	client.gamesPlayed(appIds);
}

function redeemKey(client, keys, index) {
	client.redeemKey(keys[index], function(err) {
		if (err) {
			// rate limited
			if (err.purchaseResultDetails == 53) {
				console.log("Rate limited")

				setTimeout(() => {
					redeemKey(client, keys, index)
				}, 60000)

				return
			}

			// BadActivationCode
			if (err.purchaseResultDetails == 14) {
				console.log("BadActivationCode", keys[index])
				redeemKey(client, keys, index + 1)

				return
			}

			console.log(`Error code: ${EPurchaseResultDetail[err.purchaseResultDetails.toString()]} ${err.packageList}`)
		}

		console.log("Key redeemed")

		if (index < keys.length) {
			redeemKey(client, keys, index + 1)
			return
		}

		console.log("All keys finished")
	})
}

client.on('loggedOn', function(details) {
	console.log("Logged into Steam as " + client.steamID.getSteam3RenderedID());
	client.setPersona(SteamUser.EPersonaState.Online);

	/*let index = 0
	redeemKey(client, keys, index)*/

	setTimeout(() => {
		if (!PLAYING_GAME && !LOGGED_IN_ELSEWHERE) {
			console.log("No other sessions playing games")
			switchGameState(APP_IDS);
		}
	}, 5 * 1000)
});

client.on('playingState', (blocked, playingApp) => {
	if (playingApp == 0 && !ERROR_OCCURRED && !PLAYING_GAME && !LOGGED_IN_ELSEWHERE) {
		return
	}

	if (GAME_STATE) {
		GAME_STATE = false
		return
	}

	ERROR_OCCURRED = false
	GAME_STATE = false
	PLAYING_GAME = true

	if (blocked) {
		console.log("Switching gamesPlayed because another session was created!")

		PLAYING_GAME = false

		switchGameState([]);
	} else {
		console.log("Other session destroyed! Back to regular schedule")

		LOGGED_IN_ELSEWHERE = false

		switchGameState(APP_IDS);
	}
});

client.on('error', function(e) {
	if (e.message != EResult[EResult.LoggedInElsewhere.toString()]) {
		console.log(`An error has occurred (${e.message})`)
		ERROR_OCCURRED = true
	}

	LOGGED_IN_ELSEWHERE = true

	client.logOn({
		"accountName": process.env.STEAM_USER,
		"password": process.env.STEAM_PASS
	});	
});

client.on('disconnected', (eResult, msg) => {
	if (eResult == EResult.NoConnection && DISCONNECTING) {
		process.exit(0)
	}
});

client.logOn({
	"accountName": process.env.STEAM_USER,
	"password": process.env.STEAM_PASS
});

process.on("SIGINT", () => {
	DISCONNECTING = true 
	client.logOff()
})