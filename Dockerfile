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
COPY server/index.mjs server/reset-password.mjs server/list-users.mjs ./
COPY server/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
COPY --from=web /web/dist ./public
RUN apk add --no-cache su-exec \
 && sed -i 's/\r$//' /usr/local/bin/docker-entrypoint.sh \
 && chmod +x /usr/local/bin/docker-entrypoint.sh
VOLUME /data
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD wget -qO- http://127.0.0.1:3000/api/health >/dev/null || exit 1
ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["node", "--disable-warning=ExperimentalWarning", "index.mjs"]
