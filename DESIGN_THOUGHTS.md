# Thoughts we had while developing / why we did not used some features

## Collecting all HTMLElements IDs with events, sending as string to the browser inside a script tag to firing them on dom_ready 
```JavaScript
const eventFunction = function() { return true; };
console.log( String(functionToText) );
```

While this would make things look simpler on userland, scopes would get lost. This means inside every event you would need to get every the DATA throuth DOM querying.


## Middleware AfterRoutes
The idea to be able to manipulate a route should be not be implemented. There is no reason to since there is already the option to create a custon DocumentBuilder by extending it. By doing so you have full access to what should be rendered.

## RoutesResolverResult as return for routes_resolver_with_middleware
I thought that I could implement it that way we would not have redundant code to handle middleware. But I was wrong. This caused that Component.build would be always executed even then it should not. The resolver should only get the Route so that FrontworkClient can decide to if it should execute or not. Since the html rendering was already done by the server it does not be rendered again by FrontworkClient.  
The web browser should only render when the page changes and not on the first render.  
I tried implementing it so I could implementing Middleware AfterRoutes.

## Component the 3-way functions design
The constructor of a Component should create attributes that the methods build() and dom_ready() share.
build() will always be executed on the server side, but on client side only on a page change.
Thus all events needs to be added in dom_ready().

## Issue with DOM queries
If the client has already a page rendered and now it will render the same page, all DOM queries will be related to old state and thus if you ask if an element already exists it will say yes even it is not in the new state.  
So we have to provide custom functions to query the DOM. By default it will query document.body, but on page change it will query context.html.body

For easy access to these functions I put them inside FrontworkContext, that way it has an easy access to context.html.body.

### Same case with error_handler and before_routes
It could be possible that there are already some elements created. To fix this the error_handler will only be a build function that returns a FrontworkResponse.
For before_routes it is an intented behaviour.

## An HtmlElement attribute in Component
May develop bad habits to use the constructor for rendering