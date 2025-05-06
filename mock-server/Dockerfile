FROM golang:1.21-alpine AS builder
WORKDIR /app
COPY . .
RUN go build -o mockserver main.go

FROM alpine:latest
WORKDIR /app
COPY --from=builder /app/mockserver ./mockserver
COPY --from=builder /app/routes.json ./routes.json
COPY --from=builder /app/responses ./responses
COPY --from=builder /app/static/swagger ./static/swagger
ENV ALLOWED_ORIGINS=*
EXPOSE 8080
CMD ["./mockserver"]