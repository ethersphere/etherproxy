FROM node:alpine

WORKDIR /usr/src/app

COPY package*.json .
COPY dist dist

RUN npm install --ignore-scripts

EXPOSE 9000

ENV PORT=""
ENV TARGET=""
ENV EXPIRY=""

CMD sh -c "node dist/index.js --port $PORT --target $TARGET --expiry $EXPIRY"
