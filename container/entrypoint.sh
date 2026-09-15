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
public_notification_url=${PUBLIC_NOTIFICATION_URL:-}
public_notification_allowed_origins=${PUBLIC_NOTIFICATION_ALLOWED_ORIGINS:-}
public_external_navigation_origins=${PUBLIC_EXTERNAL_NAVIGATION_ORIGINS:-}
public_iframe_origins=${PUBLIC_IFRAME_ORIGINS:-}
api_upstream=${API_UPSTREAM:-http://backend:8080}
backend_ready_path=${BACKEND_READY_PATH:-/health/ready}
csp_connect_extra=${CSP_CONNECT_SRC_EXTRA:-}
csp_frame_extra=${CSP_FRAME_SRC_EXTRA:-}
nginx_resolver=${NGINX_RESOLVER:-$(awk '/^nameserver / { print $2; exit }' /etc/resolv.conf)}

if ! printf '%s' "$public_api_base_url" | grep -Eq '^/[^?#[[:space:]\\]*$|^https://[^/@?#[[:space:]]+(:[0-9]+)?(/[^?#[[:space:]\\]*)?$'; then
  printf '%s\n' 'PUBLIC_API_BASE_URL must be a same-origin path or credential-free HTTPS URL.' >&2
  exit 64
fi
if ! printf '%s' "$app_base_path" | grep -Eq '^/([A-Za-z0-9_-]+/)*$'; then
  printf '%s\n' 'APP_BASE_PATH must be an absolute path ending with a slash.' >&2
  exit 64
fi
if printf '%s' "$public_api_base_url" | grep -Eq '^//'; then
  printf '%s\n' 'PUBLIC_API_BASE_URL cannot be protocol-relative.' >&2
  exit 64
fi
if [ -n "$public_notification_url" ] && ! printf '%s' "$public_notification_url" | grep -Eq '^wss://[^/@?#[[:space:]]+(:[0-9]+)?(/[^?#[[:space:]\\]*)?$'; then
  printf '%s\n' 'PUBLIC_NOTIFICATION_URL must be empty or a credential-free WSS URL.' >&2
  exit 64
fi
if ! printf '%s' "$api_upstream" | grep -Eq '^https?://[^/@?#[[:space:]]+(:[0-9]+)?$'; then
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

https_origin_list() {
  # AI modified: slurp mode preserves an intentional empty value as an empty origin list.
  jq -Rsce '
    def trim_space: gsub("^[[:space:]]+|[[:space:]]+$"; "");
    if . == "" then []
    else split(",") | map(trim_space)
      | if length > 64 or any(.[]; test("^https://[^/@?#[[:space:]]+(?::[0-9]+)?$") | not)
        then error("expected comma-separated exact HTTPS origins")
        else unique
        end
    end
  '
}

wss_origin_list() {
  # AI modified: slurp mode preserves an intentional empty value as an empty origin list.
  jq -Rsce '
    def trim_space: gsub("^[[:space:]]+|[[:space:]]+$"; "");
    if . == "" then []
    else split(",") | map(trim_space)
      | if length > 64 or any(.[]; test("^wss://[^/@?#[[:space:]]+(?::[0-9]+)?$") | not)
        then error("expected comma-separated exact WSS origins")
        else unique
        end
    end
  '
}

notification_allowed_origins_json=$(printf '%s' "$public_notification_allowed_origins" | wss_origin_list) || exit 64
external_navigation_origins_json=$(printf '%s' "$public_external_navigation_origins" | https_origin_list) || exit 64
iframe_origins_json=$(printf '%s' "$public_iframe_origins" | https_origin_list) || exit 64

if [ -n "$public_notification_url" ]; then
  notification_url_json=$(jq -cn --arg value "$public_notification_url" '$value')
else
  notification_url_json=null
fi

jq -cn \
  --arg api_base_url "$public_api_base_url" \
  --argjson notification_url "$notification_url_json" \
  --argjson notification_allowed_origins "$notification_allowed_origins_json" \
  --argjson external_navigation_origins "$external_navigation_origins_json" \
  --argjson iframe_origins "$iframe_origins_json" \
  '{
    schemaVersion: 1,
    api: { baseUrl: $api_base_url },
    notifications: {
      url: $notification_url,
      allowedOrigins: $notification_allowed_origins
    },
    navigation: {
      externalOrigins: $external_navigation_origins,
      iframeOrigins: $iframe_origins
    }
  }' > "$runtime_config_path"

if [ "$(wc -c < "$runtime_config_path")" -gt 32768 ]; then
  printf '%s\n' 'Generated Runtime Config exceeds 32 KiB.' >&2
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

csp_connect_src="'self'"
case "$public_api_base_url" in
  https://*) csp_connect_src="$csp_connect_src $(printf '%s' "$public_api_base_url" | sed -E 's#^(https://[^/]+).*$#\1#')" ;;
esac
if [ -n "$public_notification_url" ]; then
  csp_connect_src="$csp_connect_src $(printf '%s' "$public_notification_url" | sed -E 's#^(wss://[^/]+).*$#\1#')"
fi
notification_csp_sources=$(printf '%s' "$notification_allowed_origins_json" | jq -r 'join(" ")')
iframe_csp_sources=$(printf '%s' "$iframe_origins_json" | jq -r 'join(" ")')
CSP_CONNECT_SRC="$csp_connect_src $notification_csp_sources $csp_connect_extra"
CSP_FRAME_SRC="'self' $iframe_csp_sources $csp_frame_extra"
API_UPSTREAM=$api_upstream
APP_BASE_PATH=$app_base_path
BACKEND_READY_PATH=$backend_ready_path
NGINX_RESOLVER=$nginx_resolver
export API_UPSTREAM APP_BASE_PATH BACKEND_READY_PATH CSP_CONNECT_SRC CSP_FRAME_SRC NGINX_RESOLVER

# AI modified: only approved placeholders are expanded; Nginx request variables remain intact.
envsubst '${API_UPSTREAM} ${APP_BASE_PATH} ${BACKEND_READY_PATH} ${CSP_CONNECT_SRC} ${CSP_FRAME_SRC} ${NGINX_RESOLVER}' \
  < /opt/gvueter/nginx.conf.template \
  > "$nginx_config_path"

exec nginx -c "$nginx_config_path" -g 'daemon off;'
