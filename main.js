// Load env vars
require("dotenv").config()

const SteamUser = require('steam-user');
const fs = require("fs");
const { EPurchaseResultDetail } = require('steam-user');

var client = new SteamUser();

const keyCsv = fs.readFileSync("./keys.csv", {encoding: "ascii"})
const csvLines = keyCsv.split("\n")
const keys = csvLines.map((value) => {return value.split(",")[2]})

client.logOn({
	"accountName": process.env.STEAM_USER,
	"password": process.env.STEAM_PASS
});

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

	client.gamesPlayed([10, 730, 240], function(err){
		if (err) {
			console.log(err)
		}
	});
});

client.on('error', function(e) {
	console.log(e);
});
