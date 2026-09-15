FROM node:24.18.0-alpine3.23@sha256:595398b0081eacda8e1c4c5b97b76cd1020e4d58a8ebcb4843b9bca1e79e7436 AS build

RUN corepack enable

WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN CI=true pnpm install --frozen-lockfile --ignore-scripts

COPY . .
ARG VITE_BASE_PATH=/
ARG VITE_ENABLE_MOCKS=false
ARG VITE_ENABLE_PWA=false
ENV VITE_BASE_PATH=$VITE_BASE_PATH
ENV VITE_ENABLE_MOCKS=$VITE_ENABLE_MOCKS
ENV VITE_ENABLE_PWA=$VITE_ENABLE_PWA
RUN pnpm run build

FROM nginxinc/nginx-unprivileged:1.29.4-alpine@sha256:a6c4f61f456b85b8fdf7ec7ab28cc3e299440e6fb4a9dea520e5fd8fd440025e AS runtime

USER root
# AI modified: the immutable Alpine base carries old package revisions; refresh installed security fixes before scanning.
# Keep jq pinned so deployment config generation remains reproducible within each built image.
RUN apk upgrade --no-cache \
  && apk add --no-cache jq=1.8.2-r0

ARG VCS_REF=unknown
ARG VITE_BASE_PATH=/
LABEL org.opencontainers.image.source="https://github.com/gvueter/gvueter" \
  org.opencontainers.image.revision=$VCS_REF \
  org.opencontainers.image.title="Gvueter Admin"

ENV API_UPSTREAM="http://backend:8080" \
  APP_BASE_PATH=$VITE_BASE_PATH \
  BACKEND_READY_PATH="/health/ready" \
  CSP_CONNECT_SRC_EXTRA="" \
  CSP_FRAME_SRC_EXTRA="" \
  PUBLIC_API_BASE_URL="/api" \
  PUBLIC_EXTERNAL_NAVIGATION_ORIGINS="" \
  PUBLIC_IFRAME_ORIGINS="" \
  PUBLIC_NOTIFICATION_ALLOWED_ORIGINS="" \
  PUBLIC_NOTIFICATION_URL=""

COPY nginx.conf /opt/gvueter/nginx.conf.template
COPY container/entrypoint.sh /usr/local/bin/gvueter-entrypoint
COPY --from=build --chown=nginx:nginx /app/dist /opt/gvueter/dist
RUN destination="/usr/share/nginx/html${VITE_BASE_PATH%/}" \
  && mkdir -p "$destination" \
  && cp -a /opt/gvueter/dist/. "$destination/" \
  && chmod 0555 /usr/local/bin/gvueter-entrypoint

USER nginx
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://127.0.0.1:8080/healthz || exit 1

ENTRYPOINT ["/usr/local/bin/gvueter-entrypoint"]
