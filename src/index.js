// Triarom Computers - ScreenConnect -> Slack Bridge

const LISTEN_PORT = process.env.LISTEN_PORT || 3000
const SLACK_WEBHOOK = process.env.SLACK_WEBHOOK || "<webhook url>"

// Logging
const log = require('pino')();
log.level = process.env.LOG_LEVEL || 30;

log.debug(`configured webhook url: ${SLACK_WEBHOOK}`)

// Setup Express
const express = require("express");
const axios = require("axios");
const app = express();

// Use JSON handler
app.use(express.json());

app.use(async (req, res, next) => {
	// default handler
	log.debug(`request: ${req.method} ${req.originalUrl} (remote: ${req.hostname})`);
	next();
})

app.post("/alert", async (req, res) => {
	// Main handler for alerts from ConnectWise Control Trigger

	// Check for JSON payload
	if (!req.body) {
		log.warn(`dropping failed request, missing body.`);
		return res.sendStatus(500);
	}

	// Check if payload is valid
	if (!req.body.Event || !req.body.Session) {
		log.warn(`dropping failed request, missing "Event" or "Session" fields.`);
		return res.sendStatus(500);
	}

	// Fire the webhook
	const body = req.body;
	log.info(`successful request, forwarding to slack - ${body.Session.Name} - ${body.Event.Data}`);

	log.debug(body);

	let company;
	if (body.Session.CustomProperty1 == '') {
		company = "No company specified, possibly support session.";
	} else {
		company = body.Session.CustomProperty1;
	}

	const message = "**New ConnectWise Control Message** - There are no engineers connected.\n" +
	`Session Name: **${body.Session.Name}**\n` +
	`Session Code: **${body.Session.Code}**\n` +
	`Session Type: **${body.Session.SessionType}**\n` +
	`Remote Computer Username: **${body.Session.GuestLoggedOnUserName}**\n` +
	`Remote Computer OS: **${body.Session.GuestOperatingSystemName}\n` +
	`Company: ${company}\n`+
	`\nMessage:\n\`${body.Event.Data}\``;

	log.debug(message);

	await axios.post(SLACK_WEBHOOK, {
		"text":  message
	}).catch(err => {
		log.error(`request failed, error: ${err}`);
	})
})

// Entrypoint
const main = async () => {
	if (SLACK_WEBHOOK == "<webhook url>") {
		return log.fatal("Missing Slack webhook URL, please configure properly!")
	}

	app.listen(LISTEN_PORT)
	log.info("Started Triarom Engineering ConnectWise Control - Slack Bridge, version 1.0, port: " + LISTEN_PORT);
	log.debug("Debug logging enabled.")
}

main();