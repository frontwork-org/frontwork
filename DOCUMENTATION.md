# Frontwork Docs

## 1. Introduction
Frontwork is a TypeScript Framework to develop Frontend applications for the web, desktop and android


## 2. Getting Started
For getting started you need to install the frontwork-cli tool "frontwork": 

    cargo install frontwork  
And then use `frontwork install` to install required dev-dependencies 

To start a new project you can use `frontwork init` to use the current directory or `frontwork new` to create a new one.


## 3. Routing
### Domain
With FrontworkInit.domain_to_route_selector we are able to selects which routes should work under a domain by returning Route[].

### Route
Routes contains the path where the spezific Component will be executed.
The path con also contain "*" which mean any but not empty characters for the desired directory.  
Example:

    /hello/*

#### Routes collision
To handle issue that a route like "/hello/*" make "/hello/world" never in use. It is a easy fix by ordering the array of routes. The priority is first come, first served.

##### Rare case in which the priority is not sufficient
In this case we just create a new Component that acts as middleman.
```TypeScript
class CollisionHandlerComponent implements Component {
    build(context: FrontworkContext) {
        if (context.request.path_dirs[2] === "first-come-first-served") {
            return new HelloWorldPrioTestComponent().build(context);
        }
        return new HelloWorldComponent().build(context);
    }
    dom_ready(context: FrontworkContext): void {
        if (context.request.path_dirs[2] === "first-come-first-served") {
            new HelloWorldPrioTestComponent().dom_ready(context);
        }
        new HelloWorldComponent().dom_ready(context);
    }
}
```

### Component
Component contains 2 handler functions "build" and "dom_ready" 

#### build
Executed for server side rendering and on client side after clicking on a link.

#### dom_ready
Executed after the DOM is ready. Put here the code for events.



## 4. Middleware

### Error Handler
Will be executed on error, expects to return a "FrontworkResponse".

### Not Found Handler
Will be executed if no route or middleware matches, expects to return a "Component".

### before routes / after routes
It is possible to execute a function before and after routing.   
By returning a "Component" you stop the execution of a Route.  
Or you return null to continue the execution of the Route.


## 5. Request & Scope
For every request the framework will simplify the access to nececerry variables. The class "FrontworkRequest" contains all information about the users request. Additionaly you have access to the following Scopes:

- GET Scope
- POST Scope
- Cookies Scope

From a Scope you can get the value with the get() method.


## 6. Response
The class "FrontworkResponse" contains information about the data you want to sent to the user.

### Set-Cookie Headers
According to RFC6265 section 4.1 to set or change the value of a cookie the server has to sent for each cookie a "Set-Cookie" header.  

To make it easier to set cookies we have the class "Cookie" to create them and the set_cookie method to add them inside the class "FrontworkResponse". If a cookie with the same name already exists it will be overwritten.

### Redirection
The extended class "FrontworkResponseRedirect" of FrontworkResponse requires only the path or URL to redirect.