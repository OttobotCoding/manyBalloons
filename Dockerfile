# Stage 1 - Build the React client
FROM node:20-alpine AS client-build

WORKDIR /app/client
COPY client/package.json ./
RUN npm install
COPY client/ ./
RUN npm run build

RUN ls -la /app/client/build

# Stage 2 - Build the TypeScript server
FROM node:20-alpine AS server-build

WORKDIR /app/server
COPY server/package.json ./
RUN npm install
COPY server/ ./
RUN npm run build

# Stage 3 - Production server image
FROM node:20-alpine AS final

WORKDIR /app/server
COPY server/package.json ./
RUN npm install --omit=dev

# Compiled JS output (server/dist) — the server no longer ships .ts source
# directly to production, it runs the tsc-compiled output.
COPY --from=server-build /app/server/dist ./dist
RUN mkdir -p dist/uploads

# Copy the React build output so Express can serve it.
# NOTE: the compiled server entry point is server/dist/index.js, so its
# __dirname is one level deeper than the original server/index.js was.
# `path.join(__dirname, '..', 'client', 'build')` in index.ts (unchanged
# from the original JS) therefore resolves to server/client/build here,
# not a repo-root-level client/build — this COPY destination matches that.
COPY --from=client-build /app/client/build /app/server/client/build

RUN ls -la /app/server/client/build

EXPOSE 5000
CMD ["node", "dist/index.js"]
