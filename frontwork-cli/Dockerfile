FROM alpine:latest

# Install required dependencies
RUN apk add --no-cache \
    rust \
    cargo \
    musl-dev \
    openssl-dev \
    pkgconfig \
    gcc

# Install frontwork
RUN cargo install frontwork && \
    mv /root/.cargo/bin/frontwork /usr/local/bin/

# Clean up
RUN apk del rust cargo
RUN rm -rf /root/.cargo


RUN frontwork install
RUN deno --run

# Set the entrypoint
ENTRYPOINT ["frontwork"]