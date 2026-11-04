FROM node:24-alpine AS web
WORKDIR /web
ARG APP_VERSION=dev
ENV APP_VERSION=$APP_VERSION
COPY web/package*.json ./
RUN npm ci
COPY web/ .
RUN npm run build

FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production DATA_DIR=/data PORT=3000
COPY server/package*.json ./
RUN npm ci --omit=dev
COPY server/index.mjs server/reset-password.mjs ./
COPY --from=web /web/dist ./public
VOLUME /data
EXPOSE 3000
CMD ["node", "--disable-warning=ExperimentalWarning", "index.mjs"]
