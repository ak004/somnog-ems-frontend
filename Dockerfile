# Build: docker build -t frontend .
#
# NEXT_PUBLIC_* vars are inlined into the JS bundle at build time, not read at
# container start - so anything the browser needs has to be known here, as a
# build arg, not as a runtime env var on the running container.
#
# The default is empty on purpose: the deployed stack puts nginx in front of
# both this app and the gateway, so /api is same-origin and the bundle needs no
# url at all. Only set NEXT_PUBLIC_API_URL when the gateway is on a DIFFERENT
# origin than the frontend (and then the gateway's CORS APP_WEB_URL has to
# allow that origin).

FROM node:24-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

ARG NEXT_PUBLIC_API_URL=
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
RUN npm run build

# ---- runtime: standalone server + static assets, nothing else ----
FROM node:24-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app

COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public

USER node
EXPOSE 3000
# Docker sets HOSTNAME to the container id by default, and the standalone
# server binds to it - without this override it listens on an address
# nothing outside the container can reach.
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
CMD ["node", "server.js"]
