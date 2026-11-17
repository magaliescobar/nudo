#!/bin/sh
# Dentro del contenedor `localhost` es el propio contenedor: el Redis existente del host
# se alcanza por host.docker.internal (extra_hosts: host-gateway en el compose).
set -eu
if [ -n "${REDIS_URL:-}" ]; then
  REDIS_URL=$(printf '%s' "$REDIS_URL" | sed -e 's#@localhost#@host.docker.internal#' \
    -e 's#//localhost#//host.docker.internal#' -e 's#127\.0\.0\.1#host.docker.internal#')
  export REDIS_URL
fi
exec "$@"
