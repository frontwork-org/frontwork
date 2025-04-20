FROM alpine:latest

# Install necessary build dependencies
RUN apk add --no-cache \
    rust \
    cargo \
    build-base

# Install frontwork
RUN cargo install frontwork

# Clean up build dependencies to reduce image size
RUN apk del rust cargo build-base

# Set the entrypoint to frontwork
ENTRYPOINT ["frontwork"]