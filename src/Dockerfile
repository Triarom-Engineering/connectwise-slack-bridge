FROM mhart/alpine-node:latest
WORKDIR /app
COPY package.json package-lock.json ./

RUN npm ci --prod

# Switch to slim context
FROM mhart/alpine-node:slim

RUN apk add --no-cache tini
ENTRYPOINT ["/sbin/tini", "--"]

WORKDIR /app
COPY --from=0 /app .
COPY . .
CMD ["node", "index.js"]