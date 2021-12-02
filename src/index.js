// Triarom Computers - ScreenConnect -> Slack Bridge

const LISTEN_PORT = process.env.LISTEN_PORT || 3000
const SLACK_WEBHOOK = process.env.SLACK_WEBHOOK || "<webhook url>"
const INHIBIT_REPEATS = (process.env.ENABLE_INHIBIT === "true") || true
const INHIBIT_TIME = 1000 * 60 * (process.env.INHIBIT_TIME || 30)

// Logging
const log = require('pino')();
log.level = process.env.LOG_LEVEL || 30;

log.debug(`configured webhook url: ${SLACK_WEBHOOK}`)

// Setup Express
const express = require("express");
const axios = require("axios");
const app = express();

// Message Inhibit
const cron = require("node-cron");
let inhibits = [];

const register_inhibit = (company, session_name) => {
	inhibits.push({
		company: company,
		session_name: session_name,
		time: Date.now()
	})

	log.debug("inhibit registered for company: " + company + " session: " + session_name);
}

const is_inhibited = (company, session_name) => {
	// Checks for inhibited messages.
	// Inhibits are raised when a company+computer sends a message, inhibits last
	// INHIBIT_TIME minutes, another message will not be forwarded until the inhibit lifts.
	// Both the company name & session_name must match.
	
	for (const inhibit of inhibits) {
		if (inhibit.company === company && inhibit.session_name === session_name) {
			log.debug("inhibit exists for company: " + company + " session: " + session_name);
			
			// Check date on this inhibit
			const release_time = inhibit.time + INHIBIT_TIME;
			log.trace(`release inhibit at: ${new Date(release_time).toISOString()}, time now: ${new Date().toISOString()}`);
			
			if (Date.now() > release_time) {
				log.debug("inhibit has expired, dropping.");
				log.trace("inhibit clear, " + inhibits.indexOf(inhibit) + " inhibits: " + inhibits.length);
				const slice = inhibits.splice(inhibits.indexOf(inhibit), 1);
				log.trace(slice)
				log.trace("after slice size: " + inhibits.length)
				return false;
			}

			// Inhibit is still in force
			log.debug("inhibit has triggered! The next message will drop.");

			// Renew inhibit release time
			inhibits[inhibits.indexOf(inhibit)].time = Date.now();
			log.debug("updated inhibit set time.")
			return true;
		}
	}
}

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

	const message = "*New ConnectWise Control Message* - There are no engineers connected.\n" +
	"Please react with ✅ when this issue has been dealt with.\n\n" +
	`Session Name: *${body.Session.Name}*\n` +
	`Session Code: *${body.Session.Code || "No session code"}*\n` +
	`Session Type: *${body.Session.SessionType}*\n` +
	`Remote Computer Username: *${body.Session.GuestLoggedOnUserName}*\n` +
	`Remote Computer OS: *${body.Session.GuestOperatingSystemName}*\n` +
	`Company: *${body.Session.CustomProperty1 || "Support Session - No Contract."}*\n`+
	`\nMessage:\n\`${body.Event.Data}\``;

	log.debug(message);

	// Check if this company+session has an inhibit.
	if (INHIBIT_REPEATS && is_inhibited(body.Session.CustomProperty1 || "SUPPORT_SESSION", body.Session.Name)) {
		return log.info("this message is inhibited due to a previous message - dropping.");
	}
	
	// Register the inhibit
	if (INHIBIT_REPEATS) register_inhibit(body.Session.CustomProperty1 || "SUPPORT_SESSION", body.Session.Name);

	// Respond to webhook.
	res.sendStatus(200);

	if (process.env.DISABLE_HOOK === "true") return log.warn("hook disabled with DISABLE_HOOK environment variable, dropping.");

	await axios.post(SLACK_WEBHOOK, {
		"text":  message
	}).catch(err => {
		log.error(`request failed, error: ${err}`);
	})
})

// Entrypoint
const main = async () => {
	if (SLACK_WEBHOOK === "<webhook url>") {
		return log.fatal("Missing Slack webhook URL, please configure properly!");
	}

	app.listen(LISTEN_PORT);
	log.info("Started Triarom Engineering ConnectWise Control - Slack Bridge, version 1.0, port: " + LISTEN_PORT);
	log.debug(`debug mode on, INHIBIT_REPEATS: ${INHIBIT_REPEATS}, INHIBIT_TIME: ${INHIBIT_TIME}ms`);

	// Create inhibit cleanup
	cron.schedule("0 0 * * *", () => {
		log.info(`clearing ${inhibits.length} inhibits.`)
		inhibits = [];
	});
}

main();