FROM node:24.18.0-alpine3.23@sha256:595398b0081eacda8e1c4c5b97b76cd1020e4d58a8ebcb4843b9bca1e79e7436 AS build

# Vite+ is the project toolchain entry point; npm is used only to provision the global binary.
RUN npm install --global vite-plus@0.1.19

WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
# AI modified: the dependency layer has no source tree or Git metadata, so project prepare hooks are intentionally skipped.
RUN CI=true vp install --frozen-lockfile --ignore-scripts

COPY . .
# AI modified: the shipped production image targets gnester-lite's default `/v1` controller prefix.
ARG VITE_API_BASE_URL=/api/v1
ARG VITE_ENABLE_MOCKS=false
ARG VITE_NAVIGATION_ALLOWED_ORIGINS=
ARG VITE_NOTIFICATION_WS_ALLOWED_ORIGINS=
ARG VITE_NOTIFICATION_WS_URL=
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_ENABLE_MOCKS=$VITE_ENABLE_MOCKS
ENV VITE_NAVIGATION_ALLOWED_ORIGINS=$VITE_NAVIGATION_ALLOWED_ORIGINS
ENV VITE_NOTIFICATION_WS_ALLOWED_ORIGINS=$VITE_NOTIFICATION_WS_ALLOWED_ORIGINS
ENV VITE_NOTIFICATION_WS_URL=$VITE_NOTIFICATION_WS_URL
RUN vp run build

FROM nginxinc/nginx-unprivileged:1.29.4-alpine@sha256:a6c4f61f456b85b8fdf7ec7ab28cc3e299440e6fb4a9dea520e5fd8fd440025e AS runtime

# AI modified: resolve API service names at request time so frontend liveness does not depend on backend startup order.
ENV API_UPSTREAM="backend:8080" \
    NGINX_ENTRYPOINT_LOCAL_RESOLVERS="1" \
    CSP_CONNECT_SRC="'self'" \
    CSP_FRAME_SRC="'self'"
COPY nginx.conf /etc/nginx/templates/default.conf.template
COPY --from=build --chown=nginx:nginx /app/dist /usr/share/nginx/html

USER nginx
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://127.0.0.1:8080/healthz || exit 1
