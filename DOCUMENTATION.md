# Frontwork Docs

## 1. Introduction
Frontwork is a TypeScript Framework to develop Frontend applications for the web, desktop and android

### Feature highlights
- Serverside rendering by default
    - Create serverside rendering code while you also create JS/TS Frontend code
- Simple assets sender with the method setup_assets_resolver(assets_dir)
- Routing System

### Whats wrong with missing iOS and Mac support?
I do not own any products of apple. If you are interested to support them, then create a pull request.  
I don't like apple because their products are overpriced, the software is restricting the user, and the hardware is flawed by design.  
Still, apple has a market share, thus Frontwork will support apple products in the future.


## 2. Getting Started
For getting started you need to install the frontwork-cli tool "frontwork": cargo install frontwork
    frontwork install
    frontwork init


## 3. Routing
### Domain
Domain is a RegExp object. It is the pattern to test for a domain. Thanks to this we can use different routes for each domain.

### Route
Routes contains the path where the spezific Component will be executed.
The path con also contain "*" which mean any but not empty characters for the desired directory.  
Example:

    /hello/*

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
By returning a "Component" you stop the execution.
Or you return null to continue the execution.


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