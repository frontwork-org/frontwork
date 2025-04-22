FROM alpine:latest AS rust

# Install required dependencies
RUN apk add --no-cache \
    rust \
    cargo \
    musl-dev \
    openssl-dev \
    pkgconfig \
    gcc

# Install /root/.cargo/bin/frontwork
RUN cargo install frontwork


FROM denoland/deno:alpine AS deno
COPY --from=rust /root/.cargo/bin/frontwork /usr/local/bin/
RUN chmod +x /usr/local/bin/

# Install required dependencies
RUN apk add --no-cache \
    rust \
    cargo \
    musl-dev \
    openssl-dev \
    pkgconfig \
    gcc


# Now you can use deno
RUN deno --help

# Set the entrypoint
ENTRYPOINT ["frontwork"]