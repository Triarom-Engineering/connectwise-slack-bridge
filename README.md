# connectwise-slack-bridge
A simple bridge tool that recieves messages from ConnectWise Control "new message" triggers and sends them into a Slack channel.

## Installation

It's recommended that this bridge tool is run under docker.

Build the image with `docker build -t connectwise-slack .`

### Docker Compose

The docker-compose.yaml file contains the required env variables
and image location for local building (src/)

Run `docker-compose up -d` to launch the bridge

### Manual Docker

Environment Variables:

- LOG_LEVEL: logging level `trace/debug/info/warn/error` (default info)
- LISTEN_PORT: http port to listen on (default 3000)
- SLACK_WEBHOOK: **REQUIRED** - Slack Webhook URL.

`docker run -e LOG_LEVEL=info -e LISTEN_PORT=3000 -e SLACK_WEBHOOK=<webhook url> -p 3000:3000 --restart=unless-stopped connectwise-slack`

### With Node

This script can be run on any machine with Node installed, install the required
dependencies first with `npm install` and then use `node index.js` to launch the program.

## ConnectWise Control Trigger

A trigger must be created in ConnectWise control with the following settings:

**Event Filter**
```
Event.EventType = 'SentMessage' AND Connection.ProcessType = 'Guest' AND Session.HostConnectedCount = 0
```

**HTTP Method**
```
POST
```

**Content Type**
```
Application/JSON
```

**Body**
```
{*:json}
```

## Operation

Once started, this tool runs as a daemon and listens for 