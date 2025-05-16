ARG NODE_VERSION=24
FROM node:${NODE_VERSION}-alpine
ENV NODE_ENV=production
WORKDIR /usr/src/app
USER node
COPY . .
RUN npm ci --omit=dev
EXPOSE 3000
CMD node --experimental-sqlite app.js
