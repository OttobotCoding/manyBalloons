# Stage 1 - Build the React client
FROM node:20-alpine AS client-build

WORKDIR /app/client
COPY client/package.json ./
RUN npm install
COPY client/ ./
RUN npm run build

RUN ls -la /app/client/build

# Stage 2 - Production server image
FROM node:20-alpine AS final

WORKDIR /app/server
COPY server/package.json ./
RUN npm install --omit-dev
COPY server/ ./
RUN mkdir -p uploads

# Copy the React build output so Express can serve it
COPY --from=client-build /app/client/build /app/client/build

RUN ls -la /app/client/build

EXPOSE 5000
CMD ["node", "index.js"]


