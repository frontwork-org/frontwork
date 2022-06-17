import { Route, FrontworkRequest, FrontworkMiddleware, FrontworkResponse } from "../frontwork.ts";

export const routes: Route[] = [
	new Route("/", 100, (_req: FrontworkRequest): FrontworkResponse => {
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
			</html>`;
	  
		return new FrontworkResponse(200, content);
	})

	,new Route("/hello/22222222", 1, (_req: FrontworkRequest): FrontworkResponse => {
		const content = "hello "+_req.path.split("/")[2];
		return new FrontworkResponse(200, content);
	})

	,new Route("/hello/*", 501111, (_req: FrontworkRequest): FrontworkResponse => {
		const content = "hello "+_req.path.split("/")[2];
		return new FrontworkResponse(200, content);
	})
];


export const middleware = new FrontworkMiddleware();
