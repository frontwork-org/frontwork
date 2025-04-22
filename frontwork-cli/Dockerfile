FROM rust:alpine AS rust

# Install required dependencies with specific OpenSSL static libraries
RUN apk add --no-cache \
    musl-dev \
    openssl-libs-static \
    openssl-dev \
    pkgconfig \
    gcc

# Set OPENSSL_STATIC environment variable to force static linking
ENV OPENSSL_STATIC=1
ENV OPENSSL_LIB_DIR=/usr/lib
ENV OPENSSL_INCLUDE_DIR=/usr/include

WORKDIR /frontwork-cli
COPY . .

RUN cargo build --target x86_64-unknown-linux-musl --release


FROM denoland/deno:alpine AS deno
COPY --from=rust /frontwork-cli/target/x86_64-unknown-linux-musl/release/frontwork /usr/local/bin/
RUN chmod +x /usr/local/bin/frontwork

# Install required dependencies for runtime
RUN apk add --no-cache openssl-libs-static gcc

# Test if deno and frontwork is installed
RUN deno --version
RUN frontwork --version

# Set the entrypoint
ENTRYPOINT ["frontwork"]