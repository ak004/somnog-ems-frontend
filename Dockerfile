# Build: docker build --build-arg NEXT_PUBLIC_API_URL=https://api.example.com -t frontend .
#
# NEXT_PUBLIC_* vars are inlined into the JS bundle at build time, not read at
# container start - so the gateway's public URL has to be known here, as a
# build arg, not as a runtime env var on the running container.

FROM node:24-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

ARG NEXT_PUBLIC_API_URL=http://localhost:3000
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
