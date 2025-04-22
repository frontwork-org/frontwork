<style>
    h1 {
        counter-reset: h2
    }

    h2 {
        counter-reset: h3
    }

    h3 {
        counter-reset: h4
    }

    h2:before {
        counter-increment: h2;
        content: counter(h2) ". "
    }

    h3:before {
        counter-increment: h3;
        content: counter(h2) "." counter(h3) ". "
    }

    h4:before {
        counter-increment: h4;
        content: counter(h2) "." counter(h3) "." counter(h4) ". "
    }
</style>

# Frontwork Docs

## Introduction
Frontwork is a TypeScript Framework to develop Frontend applications for the web, desktop and android


## Getting Started
For getting started you need to install the frontwork-cli tool "frontwork": 

    cargo install frontwork  
And then use `frontwork install` to install required dev-dependencies 

To start a new project you can use `frontwork init` to use the current directory or `frontwork new` to create a new one.


## Routing
### Domain
With FrontworkInit.domain_to_route_selector we are able to selects which routes should work under a domain by returning Route[].

### Route
Routes contains the path where the spezific Component will be executed.
The path can also contain "*" (single wildcard) which mean any characters for the desired directory.  
Example:

- `/api/users/*` matches `/api/users/123`
  
The "**" (double asterisk) typically matches zero or more path segments in routing. Double asterisk should be listed last in the routing lists, otherwise there may routing collisions.  
Example matches:
- Route "/api/**" will match:
  - "/api"
  - "/api/users"
  - "/api/users/123"
  - "/api/any/number/of/segments"
- Route "/api/**/settings" will match:
  - "/api/settings"
  - "/api/users/settings"
  - "/api/users/123/settings"
- Route "/api/**" will match:
  - "/api"
  - "/api/users"
  - "/api/users/123"

#### Routes collision
To handle issue that a route like "/hello/*" make "/hello/world" never in use. It is a easy fix by ordering the array of routes. The priority is first come, first served.

##### Rare case in which the priority is not sufficient
In this case we just create a new Component that acts as middleman.
```TypeScript
class CollisionHandlerComponent implements Component {
	component: Component

	constructor(context: FrontworkContext) {
		if (context.request.path_dirs[2] === "first-come-first-served") {
			this.component = new HelloWorldPrioTestComponent();
		}
		this.component = new HelloWorldComponent();
	}

    async build(context: FrontworkContext) {
		return this.component.build(context);
	}
    async dom_ready(context: FrontworkContext, client: FrontworkClient) {
		return this.component.dom_ready(context, client);
	}
	async on_destroy() {}
}
```

### Component
Component contains 2 handler functions "build" and "dom_ready" 

#### build
Executed for server side rendering and on client side after clicking on a link.

#### dom_ready
Executed after the DOM is ready. Put here the code for events.



## Middleware

### Error Handler
Will be executed on error, expects to return a "FrontworkResponse".

### Not Found Handler
Will be executed if no route or middleware matches, expects to return a "Component".

### before routes / after routes
It is possible to execute a function before and after routing.   
By returning a "Component" you stop the execution of a Route.  
Or you return null to continue the execution of the Route.


## Context
To be able to get easy access to data an FrontworkContext object will always be included in the constructor and methods of a Component.

### Request
#### URL
A URL consists from the following parts and are available inside FrontworkRequest:

- protocol
- host
- path
- query_string
- fragment

Additianaly the attribute FrontworkRequest.path_dirs contains the splitted path by "/", that way we get easy access to directories.  
Please note that path_dirs[0] is always empty thus the first directory to query would be path_dirs[1]. Do not worry about its length as it gets always checked beforehand.


#### Scopes
For every request the framework will simplify the access to nececerry variables. The class "FrontworkRequest" contains all information about the users request. Additionaly you have access to the following Scopes:

- GET Scope
- POST Scope
- Cookies Scope

From a Scope you can get the value with the get() method.

### Header Limitations
For security reasons, browsers do not expose certain parts of the HTTP request, such as headers or the exact request body, to client-side JavaScript.

## 6. Response
The class "FrontworkResponse" contains information about the data you want to sent to the user.

### Set-Cookie Headers
According to RFC6265 section 4.1 to set or change the value of a cookie the server has to sent for each cookie a "Set-Cookie" header.  

To make it easier to set cookies we have the class "Cookie" to create them and the set_cookie method to add them inside the class "FrontworkResponse". If a cookie with the same name already exists it will be overwritten.

### Redirection
The extended class "FrontworkResponseRedirect" of FrontworkResponse requires only the path or URL to redirect.