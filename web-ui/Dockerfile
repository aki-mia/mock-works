FROM node:18-alpine
RUN apk add --no-cache bash curl
WORKDIR /app
COPY package.json yarn.lock ./

RUN curl https://mise.run | sh && \
    echo 'eval "$(~/.local/bin/mise activate bash)"' >> /etc/profile.d/mise.sh
ENV PATH="/root/.local/share/mise/shims:/root/.local/bin:${PATH}"
SHELL ["/bin/bash", "-lc"]
RUN mise i && yarn install
COPY . .
RUN yarn build
EXPOSE 3000
CMD ["yarn", "start"]