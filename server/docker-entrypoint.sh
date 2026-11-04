#!/bin/sh
set -e

# Il volume montato dall'host appartiene spesso a root: sistema i permessi e
# poi abbassa i privilegi all'utente "node".
if [ "$(id -u)" = "0" ]; then
  mkdir -p "$DATA_DIR"
  chown -R node:node "$DATA_DIR"
  exec su-exec node "$@"
fi

exec "$@"
