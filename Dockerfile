# builder
FROM node:18-alpine3.15 AS builder

WORKDIR /builder

COPY ["package.json", "package-lock.json*", "./"]
RUN npm install --production=false

COPY . .

RUN npm run build

# app
FROM node:18-alpine3.15

WORKDIR /app

ENV NODE_ENV=production

COPY ["package.json", "package-lock.json*", "./"]
RUN npm install --ignore-scripts
RUN npm rebuild

COPY ./settings/ ./settings/
COPY --from=builder ./builder/dist/ ./dist/

CMD ["npm", "run", "start"]