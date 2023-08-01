FROM node:alpine as base

WORKDIR /usr/src/app

COPY . .

RUN npm ci

RUN npm run build

FROM node:alpine

WORKDIR /usr/src/app

ENV PORT=""
ENV TARGET=""
ENV EXPIRY=""

COPY --from=base --chown=nobody:nogroup /usr/src/app/dist dist
COPY --from=base --chown=nobody:nogroup /usr/src/app/node_modules node_modules
USER nobody
EXPOSE 9000

CMD sh -c "node dist/index.js --port $PORT --target $TARGET --expiry $EXPIRY"
