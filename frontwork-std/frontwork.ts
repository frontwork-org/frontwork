import { Route, FrontworkRequest } from "./route.ts";


// TODO: make this a class


// TODO: Initiate the FrontWork Framework
export const routes: Route[] = [
    new Route("/", (_req: FrontworkRequest) => {
        const content = `
        <!doctype html>
        <html lang="en">
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>HTML5 Test Page</title>
          </head>
          <body>
            <div id="top" class="page" role="document">
              <header role="banner">
                <h1>HTML5 Test Page</h1>
                <p>This is a test page filled with common HTML elements to be used to provide visual feedback whilst building CSS systems and frameworks.</p>
              </header>
              <main role="main">
                <section id="text">
                  <header><h2>Test Form</h2></header>
                  <form id="text__form" action="" method="post">
                    <input type="text" name="text1" value="a">
                    <input type="text" name="text2" value="b">
                    <input type="text" name="text3" value="c">
                    <button type="submit" name="action" value="sent">Submit</button>
                  </form>
                </section>
              </main>
            </div>
          </body>
        </html>
        
        `;
  
        const response = new Response(content, {
            status: 200,
        });
        response.headers.set('content-type', 'text/html');
        return response;
    })
];


// TODO: allow custom errorHandler, 404 handler, before routes, after routes, redirect option to remove last "/" on empty. Example: "/test/" -> "/test"
export const Middleware =  {
    error_handler: function(_request: FrontworkRequest): Response {
        return new Response("ERROR", {
            status: 500,
        });
    },

    not_found_handler: function(_request: FrontworkRequest): Response {
        return new Response("ERROR 404 - Page not found", {
            status: 404,
        });
    },

    before_routes: function(_request: FrontworkRequest): Response|null {
        return null;
    },

    after_routes: function(_request: FrontworkRequest): Response|null {
        return null;
    },
}