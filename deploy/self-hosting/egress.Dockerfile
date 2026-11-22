FROM golang:1.25-alpine AS build

RUN CGO_ENABLED=0 GOBIN=/out go install github.com/stripe/smokescreen@v0.1.0

FROM alpine:3.22

COPY --from=build /out/smokescreen /usr/local/bin/smokescreen
COPY deploy/self-hosting/egress-start.sh /egress-start.sh

USER nobody
EXPOSE 4750
ENTRYPOINT ["sh", "/egress-start.sh"]
