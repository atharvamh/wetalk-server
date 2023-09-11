FROM node:18-alpine
WORKDIR /app
COPY package.json ./
RUN npm i --silent
COPY . ./
EXPOSE 5543
CMD ["npm", "run", "dev"]