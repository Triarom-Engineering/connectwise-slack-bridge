FROM mhart/alpine-node:17
WORKDIR /app
COPY package.json package-lock.json ./

RUN npm ci --prod

# Switch to slim context
FROM mhart/alpine-node:slim-17

RUN apk add --no-cache tini
ENTRYPOINT ["/sbin/tini", "--"]

WORKDIR /app
COPY --from=0 /app .
COPY . .
CMD ["node", "index.js"]