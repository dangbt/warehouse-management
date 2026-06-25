FROM node:22-alpine
WORKDIR /app
COPY package.json ./
COPY prisma ./prisma
RUN npm install && npx prisma generate
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["node", "dist/src/main.js"]
