// Start listening on port 8080 of localhost.
const server = Deno.listen({ port: 8080 });
console.log(`HTTP webserver running.  Access it at:  http://localhost:8080/`);

// Connections to the server will be yielded up as an async iterable.
for await (const conn of server) {
  // In order to not be blocking, we need to handle each connection individually
  // without awaiting the function
  serveHttp(conn);
}

async function serveHttp(conn: Deno.Conn) {
  // This "upgrades" a network connection into an HTTP connection.
  const httpConn = Deno.serveHttp(conn);
  // Each request sent over the HTTP connection will be yielded as an async
  // iterator from the HTTP connection.
  for await (const requestEvent of httpConn) {
    // The native HTTP server uses the web standard `Request` and `Response`
    // objects.
    const body = `<DOCTYPE html>
    <body>
    <form id="test_form" action="" method="post"><input type="text" name="text0" value="aabbcc"><input type="text" name="text1" value="aabbcc"><input type="text" name="text2" value="aabbcc"><button type="submit" name="action" value="sent">Submit</button></form>
        Your user-agent is:\n\n${requestEvent.request.headers.get("user-agent") ?? "Unknown"}
    </body>`;
    // The requestEvent's `.respondWith()` method is how we send the response
    // back to the client.
    const response = new Response(body, {
      status: 200,
    });
    response.headers.set('content-type', "text/html");

    requestEvent.respondWith(response);
  }
}