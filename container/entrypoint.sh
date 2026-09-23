#!/bin/sh
set -eu

runtime_directory=/tmp/gvueter-runtime
runtime_config_path=$runtime_directory/runtime-config.json
nginx_config_path=$runtime_directory/nginx.conf

mkdir -p \
  "$runtime_directory/client-body" \
  "$runtime_directory/fastcgi" \
  "$runtime_directory/proxy" \
  "$runtime_directory/scgi" \
  "$runtime_directory/uwsgi"

public_api_base_url=${PUBLIC_API_BASE_URL:-/api}
app_base_path=${APP_BASE_PATH:-/}
api_upstream=${API_UPSTREAM:-}
backend_ready_path=${BACKEND_READY_PATH:-/api/health/ready}
csp_connect_extra=${CSP_CONNECT_SRC_EXTRA:-}
csp_frame_extra=${CSP_FRAME_SRC_EXTRA:-}
nginx_resolver=${NGINX_RESOLVER:-$(awk '/^nameserver / { print $2; exit }' /etc/resolv.conf)}

if ! printf '%s' "$public_api_base_url" | grep -Eq '^/[^?#[[:space:]\\]*$|^https://[^/@?#[[:space:]]+(:[0-9]+)?(/[^?#[[:space:]\\]*)?$'; then
  printf '%s\n' 'PUBLIC_API_BASE_URL must be a same-origin path or credential-free HTTPS URL.' >&2
  exit 64
fi
if [ "${public_api_base_url#//}" != "$public_api_base_url" ]; then
  # AI modified: deployment validation follows the same-origin rule used by the browser schema.
  printf '%s\n' 'PUBLIC_API_BASE_URL cannot start with //.' >&2
  exit 64
fi
if ! printf '%s' "$app_base_path" | grep -Eq '^/([A-Za-z0-9_-]+/)*$'; then
  printf '%s\n' 'APP_BASE_PATH must be an absolute path ending with a slash.' >&2
  exit 64
fi
if [ -n "$api_upstream" ] && ! printf '%s' "$api_upstream" | grep -Eq '^https?://[^/@?#[[:space:]]+(:[0-9]+)?$'; then
  printf '%s\n' 'API_UPSTREAM must be a credential-free HTTP(S) origin without a path.' >&2
  exit 64
fi
if ! printf '%s' "$backend_ready_path" | grep -Eq '^/[^?#[[:space:]\\]*$' || printf '%s' "$backend_ready_path" | grep -Eq '^//'; then
  printf '%s\n' 'BACKEND_READY_PATH must be an in-origin absolute path.' >&2
  exit 64
fi
if ! printf '%s' "$nginx_resolver" | grep -Eq '^[A-Fa-f0-9:.]+$'; then
  printf '%s\n' 'NGINX_RESOLVER must be an IP address.' >&2
  exit 64
fi

validate_csp_sources() {
  source_kind=$1
  source_list=$2
  for source_value in $source_list; do
    if [ "$source_kind" = connect ]; then
      source_pattern='^https?://[^/@?#[[:space:]]+(:[0-9]+)?$|^wss://[^/@?#[[:space:]]+(:[0-9]+)?$'
    else
      source_pattern='^https://[^/@?#[[:space:]]+(:[0-9]+)?$'
    fi
    if ! printf '%s' "$source_value" | grep -Eq "$source_pattern"; then
      printf 'Invalid deployment CSP source: %s\n' "$source_value" >&2
      exit 64
    fi
  done
}

validate_csp_sources connect "$csp_connect_extra"
validate_csp_sources frame "$csp_frame_extra"

# AI modified: frontend-only deployments generate the same closed runtime schema without a backend.
jq -cn --arg api_base_url "$public_api_base_url" \
  '{schemaVersion: 2, api: {baseUrl: $api_base_url}}' > "$runtime_config_path"

csp_connect_src="'self'"
case "$public_api_base_url" in
  https://*) csp_connect_src="$csp_connect_src $(printf '%s' "$public_api_base_url" | sed -E 's#^(https://[^/]+).*$#\1#')" ;;
esac

API_UPSTREAM=$api_upstream
APP_BASE_PATH=$app_base_path
BACKEND_READY_PATH=$backend_ready_path
CSP_CONNECT_SRC="$csp_connect_src $csp_connect_extra"
CSP_FRAME_SRC="'self' $csp_frame_extra"
NGINX_RESOLVER=$nginx_resolver
export API_UPSTREAM APP_BASE_PATH BACKEND_READY_PATH CSP_CONNECT_SRC CSP_FRAME_SRC NGINX_RESOLVER

# AI modified: only deployment placeholders are expanded; Nginx request variables stay intact.
envsubst '${API_UPSTREAM} ${APP_BASE_PATH} ${BACKEND_READY_PATH} ${CSP_CONNECT_SRC} ${CSP_FRAME_SRC} ${NGINX_RESOLVER}' \
  < /opt/gvueter/nginx.conf.template \
  > "$nginx_config_path"

exec nginx -c "$nginx_config_path" -g 'daemon off;'
