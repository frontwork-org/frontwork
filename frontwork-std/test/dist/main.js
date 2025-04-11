// utils.ts
function parse_url(url) {
  const url_protocol_split = url.split("://");
  if (url_protocol_split.length < 2)
    throw new Error("Invalid URL: " + url);
  const protocol = url_protocol_split[0] + ":";
  const url_querystring_split = url_protocol_split[1].split("?");
  const url_host_path_split = url_querystring_split[0].split("/");
  const host = url_host_path_split[0];
  let path;
  if (url_host_path_split.length < 2) {
    path = "/";
  } else {
    path = "";
    for (let i = 1; i < url_host_path_split.length; i++) {
      path += "/" + url_host_path_split[i];
    }
  }
  let query_string;
  let fragment;
  if (url_querystring_split.length > 1) {
    const query_string_fragment_split = url_querystring_split[1].split("#");
    query_string = query_string_fragment_split[0];
    fragment = query_string_fragment_split.length > 1 ? query_string_fragment_split[1] : "";
  } else {
    query_string = "";
    fragment = "";
  }
  return {
    protocol,
    host,
    path,
    query_string,
    fragment
  };
}
function key_value_list_to_object(list, list_delimiter, key_value_delimiter) {
  const result = {};
  const list_split = list.split(list_delimiter);
  for (let i = 0; i < list_split.length; i++) {
    const item = list_split[i];
    const item_split = item.split(key_value_delimiter);
    if (item_split[0] !== "") {
      if (item_split.length === 2) {
        result[item_split[0]] = item_split[1];
      } else {
        result[item_split[0]] = "";
      }
    }
  }
  return result;
}
function html_element_set_attributes(html_element, attributes) {
  for (let i = 0; i < attributes.length; i++) {
    const attribute = attributes[i];
    html_element.setAttribute(attribute.name, attribute.value);
  }
}
var Observer = class {
  observers = [];
  retriever = null;
  value = null;
  retriever_listeners = [];
  renew_is_running = false;
  // Set the retriever function that will be used in the get function
  define_retriever(retriever) {
    this.retriever = retriever;
  }
  // Remove the retriever function
  remove_retriever() {
    this.retriever = null;
  }
  // Observer listener
  subscribe(fn) {
    if (this.value !== null)
      fn(this.value);
    this.observers.push(fn);
  }
  unsubscribe(fn) {
    this.observers = this.observers.filter((observer) => observer !== fn);
  }
  /**
   * Retriever listener: executed before the retriever starts
   */
  add_retriever_listener(fn) {
    this.retriever_listeners.push(fn);
  }
  remove_retriever_listener(fn) {
    this.retriever_listeners = this.retriever_listeners.filter((listeners) => listeners !== fn);
  }
  // Notify all observers with a value
  set(value) {
    this.value = value;
    this.observers.forEach((observer) => observer(value));
  }
  // Notify all observers with a value
  set_value(value) {
    this.set({ ok: true, val: value });
  }
  // Set value to null. DOES NOT NOTIFY.
  set_null() {
    this.value = null;
  }
  /**
   * Returns true if value is null
   */
  is_null() {
    return this.value === null;
  }
  // Notify all observers with a value if value is unknown
  set_once(value) {
    if (this.value === null) {
      this.set({ ok: true, val: value });
    }
  }
  // Get the value as Promise by this.value, with the retriever or by subscribe and unsubscribe
  get() {
    return new Promise((resolve, reject) => {
      if (this.value === null) {
        if (this.retriever === null || this.renew_is_running) {
          const sub = (value) => {
            if (value.ok) {
              resolve(value.val);
            } else {
              reject(value.err);
            }
            this.unsubscribe(sub);
          };
          this.subscribe(sub);
        } else {
          this.get_renew().then((value) => resolve(value)).catch((error) => reject(error));
        }
      } else {
        if (this.value.ok) {
          resolve(this.value.val);
        } else {
          reject(this.value.err);
        }
      }
    });
  }
  // Fix the get_renew method
  get_renew() {
    return new Promise(async (resolve, reject) => {
      if (this.renew_is_running) {
        const sub = (value) => {
          if (value.ok) {
            resolve(value.val);
          } else {
            reject(value.err);
          }
          this.unsubscribe(sub);
        };
        this.subscribe(sub);
      } else {
        const result = await this.renew();
        if (result.ok) {
          resolve(result.val);
        } else {
          reject(result.err);
        }
      }
    });
  }
  // Fix the renew method
  renew() {
    return new Promise(async (resolve, reject) => {
      if (this.retriever === null) {
        reject(new Error("For Observer.renew() the retriever must be defined"));
        return;
      }
      this.renew_is_running = true;
      this.retriever_listeners.forEach((listener) => listener());
      try {
        const value = await this.retriever();
        this.set(value);
        this.renew_is_running = false;
        if (value.ok) {
          resolve(value);
        } else {
          FW.reporter(2 /* Error */, "Observer", "ERROR executing Observer.retriever()", null, value.err);
          resolve(value);
        }
      } catch (error) {
        this.renew_is_running = false;
        const errorResult = {
          ok: false,
          err: error instanceof Error ? error : new Error(String(error))
        };
        reject(errorResult);
      }
    });
  }
  // Get the current number of observers
  get count() {
    return this.observers.length;
  }
  // Clear all observers
  clear() {
    this.observers = [];
    this.value = null;
  }
};

// frontwork.ts
var FW = {
  /**
   * Is false if dom.ts / frontwork-service.ts / frontwork-testworker.ts has been imported
   */
  is_client_side: true,
  /**
   * If true the default reporter will sent some client logs to the dev server
   */
  reporter_client_to_server: true,
  /**
   * IF true FW.reporter will not be be called on LogType.Info.
   * Warn and Error messages will always be reported.
   */
  verbose_logging: false,
  /**
   * To enable a bug reporter for staging and production you can modify FW.reporter, that it sents a request to the backend
   * @param log_type: LogType 
   * @param category: string 
   * @param text: string
  */
  // deno-lint-ignore no-unused-vars
  reporter: function(log_type, category, text, context, error) {
    if (FW.reporter_client_to_server && FW.is_client_side) {
      fetch(location.protocol + "//" + location.host + "//dr", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ report_text: text })
      });
    }
    if (log_type === 2 /* Error */) {
      if (error === null)
        console.error(text);
      else
        console.error(text, error);
    } else if (log_type === 1 /* Warn */) {
      console.warn(text);
    } else if (log_type === 0 /* Info */) {
      console.log(text);
    }
  }
};
var HTMLElementWrapper = class {
  element;
  created_element;
  // true if element was created; Otherwise false the element already exists
  constructor(element, created_element) {
    this.element = element;
    this.created_element = created_element;
  }
  prepend_to(parent) {
    if (this.created_element)
      parent.element.prepend(this.element);
    return this;
  }
  append_to(parent) {
    if (this.created_element)
      parent.element.append(this.element);
    return this;
  }
  replace_text(search, replace) {
    this.element.innerText = this.element.innerText.split(search).join(replace);
  }
  replace_html(search, replace) {
    this.element.innerHTML = this.element.innerHTML.split(search).join(replace);
  }
  then(runnable) {
    if (this.created_element)
      runnable();
  }
  show() {
    const attr_value = this.element.getAttribute("style");
    if (attr_value)
      this.element.setAttribute("style", attr_value.replace("display: none;", ""));
  }
  hide() {
    const current_style = this.element.getAttribute("style");
    if (current_style === null) {
      this.element.setAttribute("style", "display: none;");
    } else {
      if (!current_style.includes("display: none;"))
        this.element.setAttribute("style", current_style + " display: none;");
    }
  }
};
var FrontworkForm = class extends HTMLElementWrapper {
  constructor(context, id, action, method) {
    super(context.ensure_element("form", id, { action, method }).element, context.do_building);
    this.element.setAttribute("fw-form", "1");
  }
};
var I18nLocale = class {
  locale;
  translations;
  constructor(locale, translations) {
    this.locale = locale;
    this.translations = translations;
  }
  get_translation(id) {
    const translation = this.translations[id];
    if (translation === void 0) {
      FW.reporter(2 /* Error */, "I18n", "    Missing translation for the locale '" + this.locale + `': ,"` + id + '": "translated_text"', null, null);
      return "";
    }
    return translation;
  }
};
var Scope = class {
  items;
  constructor(items) {
    this.items = items;
  }
  get(key) {
    const value = this.items[key];
    if (value === void 0)
      return null;
    return value;
  }
  forEach(callback) {
    Object.entries(this.items).forEach(([key, value]) => {
      callback(key, value);
    });
  }
};
var GetScope = class extends Scope {
  constructor(items) {
    super(items);
  }
};
var PostScope = class extends Scope {
  constructor(items) {
    super(items);
  }
  /** Retrieve the POST data from a Request object and set it to PostScope.items */
  async from_request(_request) {
    let content_type = _request.headers.get("content-type");
    if (content_type !== null) {
      content_type = content_type.split(";")[0];
      if (_request.body !== null) {
        if (content_type === "application/x-www-form-urlencoded") {
          const reader = _request.body.getReader();
          if (reader !== null) {
            await reader.read().then((body) => {
              if (body.value !== null) {
                const body_string = new TextDecoder().decode(body.value);
                this.items = key_value_list_to_object(body_string, "&", "=");
              }
            });
          }
        } else if (content_type === "application/json") {
          const reader = _request.body.getReader();
          if (reader !== null) {
            await reader.read().then((body) => {
              if (body.value !== null) {
                const body_string = new TextDecoder().decode(body.value);
                this.items = JSON.parse(body_string);
              }
            });
          }
        }
      }
    }
    return this;
  }
};
var CookiesScope = class extends Scope {
  constructor(items) {
    super(items);
  }
};
var FrontworkRequest = class {
  headers;
  method;
  url;
  protocol;
  host;
  path;
  path_dirs;
  query_string;
  fragment;
  GET;
  POST;
  COOKIES;
  constructor(method, url, headers, post) {
    const parsed_url = parse_url(url);
    this.headers = headers;
    this.method = method;
    this.url = url;
    this.protocol = parsed_url.protocol;
    this.host = parsed_url.host;
    this.path = parsed_url.path;
    this.path_dirs = decodeURIComponent(parsed_url.path.replace(/\+/g, "%20")).split("/");
    this.query_string = parsed_url.query_string;
    this.fragment = parsed_url.fragment;
    this.GET = new GetScope(
      key_value_list_to_object(parsed_url.query_string, "&", "=")
    );
    this.POST = post;
    const cookies_string = this.headers.get("cookie");
    this.COOKIES = new CookiesScope(
      cookies_string === null ? {} : key_value_list_to_object(cookies_string, "; ", "=")
    );
  }
  __request_text(category) {
    let text = this.method + " " + this.path;
    if (this.query_string !== "")
      text += "?" + this.query_string;
    text += " [" + category + "]";
    const keys = Object.keys(this.POST.items);
    if (keys.length !== 0) {
      text += "\n    Scope POST: ";
      keys.forEach((key) => {
        text += "\n        " + key + ' = "' + this.POST.items[key] + '"';
      });
    }
    return text;
  }
  log(category, context) {
    if (FW.verbose_logging)
      FW.reporter(0 /* Info */, category, this.__request_text(category), context, null);
  }
  error(category, context, error) {
    FW.reporter(2 /* Error */, category, this.__request_text(category), context, error);
  }
};
var FrontworkResponse = class {
  status_code;
  mime_type = "text/html";
  // content: DocumentBuilderInterface|Blob|string;
  content;
  headers = [];
  cookies = [];
  constructor(status_code, content) {
    this.status_code = status_code;
    this.content = content;
  }
  set_mime_type(mime_type) {
    this.mime_type = mime_type;
    return this;
  }
  add_header(name, value) {
    this.headers.push([name, value]);
    return this;
  }
  get_header(name) {
    for (const header of this.headers) {
      if (header[0] === name) {
        return header[1];
      }
    }
    return null;
  }
  set_cookie(cookie) {
    for (let i = 0; i < this.cookies.length; i++) {
      if (this.cookies[i].name === cookie.name) {
        this.cookies[i] = cookie;
        return this;
      }
    }
    this.cookies.push(cookie);
    return this;
  }
  into_response() {
    const response = new Response(this.content.toString(), { status: this.status_code });
    response.headers.set("content-type", this.mime_type);
    for (let i = 0; i < this.headers.length; i++) {
      const header = this.headers[i];
      response.headers.set(header[0], header[1]);
    }
    for (let i = 0; i < this.cookies.length; i++) {
      const cookie = this.cookies[i];
      response.headers.append("set-cookie", cookie.to_string());
    }
    return response;
  }
};
var DocumentBuilder = class {
  context;
  doctype;
  constructor(context) {
    this.context = context;
    this.doctype = "<!DOCTYPE html>";
    this.set_html_lang(context.selected_locale.locale);
  }
  //
  // Head methods
  //
  head_append_tag(tag, attributes) {
    const element = document.createElement(tag);
    if (attributes) {
      for (const key in attributes) {
        element.setAttribute(key, attributes[key]);
      }
    }
    this.context.document_head.append(element);
    return this;
  }
  add_head_meta_data(title, description, robots) {
    const meta_chatset = this.context.document_head.appendChild(document.createElement("meta"));
    meta_chatset.setAttribute("charset", "UTF-8");
    const meta_compatible = this.context.document_head.appendChild(document.createElement("meta"));
    meta_compatible.setAttribute("http-equiv", "X-UA-Compatible");
    meta_compatible.setAttribute("content", "IE=edge");
    const meta_viewport = this.context.document_head.appendChild(document.createElement("meta"));
    meta_viewport.setAttribute("name", "viewport");
    meta_viewport.setAttribute("content", "width=device-width, initial-scale=1, maximum-scale=1");
    const meta_title = this.context.document_head.appendChild(document.createElement("title"));
    meta_title.innerHTML = title;
    const meta_description = this.context.document_head.appendChild(document.createElement("meta"));
    meta_description.setAttribute("name", "description");
    meta_description.setAttribute("content", description);
    const meta_robots = this.context.document_head.appendChild(document.createElement("meta"));
    meta_robots.setAttribute("name", "robots");
    meta_robots.setAttribute("content", robots);
    return this;
  }
  add_head_meta_opengraph_website(title, description, url, image_url) {
    const meta_og_type = this.context.document_head.appendChild(document.createElement("meta"));
    meta_og_type.setAttribute("property", "og:type");
    meta_og_type.setAttribute("content", "website");
    const meta_og_url = this.context.document_head.appendChild(document.createElement("meta"));
    meta_og_url.setAttribute("property", "og:url");
    meta_og_url.setAttribute("content", url);
    const meta_og_title = this.context.document_head.appendChild(document.createElement("meta"));
    meta_og_title.setAttribute("property", "og:title");
    meta_og_title.setAttribute("content", title);
    const meta_og_description = this.context.document_head.appendChild(document.createElement("meta"));
    meta_og_description.setAttribute("property", "og:description");
    meta_og_description.setAttribute("content", description);
    const meta_og_image = this.context.document_head.appendChild(document.createElement("meta"));
    meta_og_image.setAttribute("property", "og:image");
    meta_og_image.setAttribute("content", image_url);
    return this;
  }
  //
  // Body methods
  //
  set_html_lang(code) {
    this.context.document_html.setAttribute("lang", code);
    return this;
  }
  body_append(wr) {
    this.context.document_body.append(wr.element);
    return wr;
  }
  //
  // Build methods
  //
  html() {
    const style_css = this.context.document_head.appendChild(document.createElement("link"));
    style_css.setAttribute("id", "fw-style");
    style_css.setAttribute("rel", "stylesheet");
    style_css.setAttribute("href", "/css/style.css");
    style_css.setAttribute("type", "text/css");
    const main_js = this.context.document_body.appendChild(document.createElement("script"));
    main_js.setAttribute("id", "fw-script");
    main_js.setAttribute("src", "/js/main.js");
    main_js.setAttribute("type", "text/javascript");
    return this.context.document_html;
  }
  toString() {
    const html_response = this.html();
    return this.doctype + "\n" + html_response.outerHTML;
  }
};
var FrontworkResponseRedirect = class extends FrontworkResponse {
  constructor(redirect_path, status_code) {
    if (FW.verbose_logging)
      FW.reporter(0 /* Info */, "REDIRECT", "    [" + status_code + " REDIRECT]-> " + redirect_path, null, null);
    super(status_code, "redirecting...");
    this.add_header("Location", redirect_path);
  }
};
var previous_route_id = 0;
var Route = class {
  id;
  path;
  component;
  constructor(path, component) {
    this.path = path;
    this.component = component;
    this.id = previous_route_id;
    previous_route_id += 1;
  }
};
var client_observers = {};
var FrontworkContext = class {
  platform;
  stage;
  client_ip;
  // For Deno side use only. On Client side it will be always 127.0.0.1
  api_protocol_address;
  // API Address Browser should use
  api_protocol_address_ssr;
  // API Address Deno should use
  i18n;
  request;
  do_building;
  document_html;
  document_head;
  document_body;
  api_error_event;
  client;
  /**
   * Set-Cookie headers for deno side rendering. Deno should retrieve Cookies from the API and pass them to the browser. Should not be used to manually set Cookies. Use the FrontworkResponse.set_cookie method instead
   */
  set_cookies = [];
  selected_locale;
  constructor(platform, stage, client_ip, api_protocol_address, api_protocol_address_ssr, api_error_event, i18n2, request, do_building, client) {
    this.platform = platform;
    this.stage = stage;
    this.client_ip = client_ip;
    this.api_protocol_address = api_protocol_address;
    this.api_protocol_address_ssr = api_protocol_address_ssr;
    this.api_error_event = api_error_event;
    this.request = request;
    this.do_building = do_building;
    this.client = client;
    this.document_html = document.createElement("html");
    this.document_head = this.document_html.appendChild(document.createElement("head"));
    this.document_body = this.document_html.appendChild(document.createElement("body"));
    if (i18n2.length === 0)
      throw new Error("I18n: No locales provided");
    this.i18n = i18n2;
    this.selected_locale = i18n2[0];
  }
  set_locale(locale) {
    if (FW.verbose_logging)
      FW.reporter(0 /* Info */, "I18n", '    Setting locale to "' + locale + '"', null, null);
    const locale_found = this.i18n.find((l) => l.locale === locale);
    if (locale_found === void 0) {
      FW.reporter(2 /* Error */, "I18n", "Locale '" + locale + "' does not exist", null, null);
      return false;
    }
    this.selected_locale = locale_found;
    return true;
  }
  get_translation(key) {
    return this.selected_locale.get_translation(key);
  }
  get_translation_replace(key, search, replace) {
    return this.selected_locale.get_translation(key).split(search).join(replace);
  }
  get_translation_replace_number(key, search, number) {
    if (number === 1)
      return this.selected_locale.get_translation(key + "_one");
    return this.selected_locale.get_translation(key).split(search).join(number.toString());
  }
  server_observers = {};
  get_observer(key) {
    if (FW.is_client_side) {
      if (!client_observers[key]) {
        client_observers[key] = new Observer();
      }
      return client_observers[key];
    } else {
      if (!this.server_observers[key]) {
        this.server_observers[key] = new Observer();
      }
      return this.server_observers[key];
    }
  }
  /**
   * Creates an HTML element. DOES NOT CHECK IF ALREADY EXIST.
   * @param tag The tag name of the element to create.
   * @param attributes Optional. Attributes will be only added if it is created. Example: { class: "container", "data-role": "content" }
   * @returns HTMLElementWrapper
   */
  create_element(tag, attributes) {
    const elem = document.createElement(tag);
    if (attributes) {
      for (const key in attributes) {
        elem.setAttribute(key, attributes[key]);
      }
    }
    return new HTMLElementWrapper(elem, true);
  }
  /**
   * Creates a new element and appends I18n text. DOES NOT CHECK IF ALREADY EXIST.
   * @param tag The tag name of the element to create.
   * @param i18n_key The keyword specified in the english.json. Uses innerText to set the translated text.
   * @param attributes Optional. Attributes will be only added if it is created. Example: { class: "container", "data-role": "content" }
   * @returns HTMLElementWrapper
   */
  create_text_element(tag, i18n_key, attributes) {
    const elem = document.createElement(tag);
    elem.innerText = this.get_translation(i18n_key);
    if (attributes) {
      for (const key in attributes) {
        elem.setAttribute(key, attributes[key]);
      }
    }
    return new HTMLElementWrapper(elem, true);
  }
  /**
   * Ensures the existence of an HTML element by ID. Creates a new element if it doesn't exist.
   * @param tag The tag name of the element to create if it doesn't exist.
   * @param id The ID of the element to search for or create. Must be unique!
   * @param attributes Optional. Attributes will be only added if it is created. Example: { class: "container", "data-role": "content" }
   * @returns The HTML element with the specified ID.
   */
  ensure_element(tag, id, attributes) {
    const elem = this.do_building ? this.document_html.querySelector("#" + id) : document.getElementById(id);
    if (elem !== null)
      return new HTMLElementWrapper(elem, false);
    const elem2 = document.createElement(tag);
    elem2.id = id;
    if (attributes) {
      for (const key in attributes) {
        elem2.setAttribute(key, attributes[key]);
      }
    }
    return new HTMLElementWrapper(elem2, true);
  }
  /**
   * Ensures the existence of an HTML element by ID. Creates a new element and appends I18n text if it doesn't exist
   * @param tag The tag name of the element.
   * @param id The ID of the element to search for or create. Must be unique!
   * @param text The text content of the element.     
   * @param attributes Optional. Example: { class: "container", "data-role": "content" }
   * @returns The newly created HTML element.
   */
  ensure_text_element(tag, id, attributes) {
    const elem = this.do_building ? this.document_html.querySelector("#" + id) : document.getElementById(id);
    if (elem !== null)
      return new HTMLElementWrapper(elem, false);
    const elem2 = document.createElement(tag);
    elem2.id = id;
    elem2.innerText = this.get_translation(id);
    if (attributes) {
      for (const key in attributes) {
        elem2.setAttribute(key, attributes[key]);
      }
    }
    return new HTMLElementWrapper(elem2, true);
  }
  async api_request(method, path, params, extras = {}) {
    let url = (FW.is_client_side ? this.api_protocol_address : this.api_protocol_address_ssr) + path;
    const options = extras;
    options.method = method;
    options.headers = extras.headers ? extras.headers : new Headers();
    let params_string = "";
    const params_array = Object.entries(params);
    if (params_array.length > 0) {
      params_string += params_array[0][0] + "=" + params_array[0][1];
      for (let a = 1; a < params_array.length; a++) {
        params_string += "&" + params_array[a][0] + "=" + params_array[a][1];
      }
    }
    if (method === "GET") {
      if (params_string.length > 0)
        url += "?" + params_string;
    } else {
      options.body = params_string;
      options.headers.set("Content-Type", "application/x-www-form-urlencoded");
    }
    if (!FW.is_client_side) {
      let cookies_string = "";
      this.request.COOKIES.forEach((key, name) => {
        cookies_string += key + "=" + name + "; ";
      });
      options.headers.set("Cookie", cookies_string);
      options.headers.set("X-Forwarded-For", this.client_ip);
    }
    try {
      const response = await fetch(url, options);
      if (!FW.is_client_side) {
        const set_cookies = response.headers.getSetCookie();
        set_cookies.forEach((item) => this.set_cookies.push(item));
      }
      if (!response.ok) {
        FW.reporter(2 /* Error */, "api_request", "ERROR executing api_request( " + method + " " + path + " )", this, null);
        console.error(response);
        try {
          let api_error_response = await response.json();
          api_error_response.status = response.status;
          this.api_error_event(this, this.client, method, path, params, api_error_response);
          return {
            ok: false,
            err: api_error_response
          };
        } catch (error) {
          FW.reporter(2 /* Error */, "api_request", "Could not parse ApiErrorResponse for api_request(" + method + " " + path + ")", this, error);
          let api_error_response = { status: 501, error_message: "API did not returned parsable JSON" };
          this.api_error_event(this, this.client, method, path, params, api_error_response);
          return {
            ok: false,
            err: api_error_response
          };
        }
      }
      const data = await response.json();
      return {
        ok: true,
        val: data
      };
    } catch (error) {
      FW.reporter(2 /* Error */, "api_request", "ERROR executing api_request( " + method + " " + path + " )", this, error);
      let api_error_response = { status: 503, error_message: error };
      this.api_error_event(this, this.client, method, path, params, api_error_response);
      return {
        ok: false,
        err: api_error_response
      };
    }
  }
  /* Set the retriever of an Observer to be a specified api_request */
  api_request_observer(observer, method, path, params, extras = {}) {
    const retriever = async () => {
      const result = await this.api_request(method, path, params, extras);
      if (result.ok) {
        return { ok: true, val: result.val };
      } else {
        return { ok: false, err: new Error(result.err.error_message) };
      }
    };
    observer.define_retriever(retriever);
    observer.renew().catch((_error) => {
    });
  }
};
var Frontwork = class {
  platform;
  stage;
  port;
  api_protocol_address;
  api_protocol_address_ssr;
  domain_to_route_selector;
  middleware;
  i18n;
  api_error_event;
  constructor(init) {
    this.platform = init.platform;
    this.stage = init.stage;
    this.port = init.port;
    this.api_protocol_address = init.api_protocol_address;
    this.api_protocol_address_ssr = init.api_protocol_address_ssr;
    this.domain_to_route_selector = init.domain_to_route_selector;
    this.middleware = init.middleware;
    this.i18n = init.i18n;
    this.api_error_event = init.api_error_event === void 0 ? () => {
    } : init.api_error_event;
    if (this.stage === 0 /* Development */)
      FW.verbose_logging = true;
  }
  async route_resolver(context) {
    const routes = await this.domain_to_route_selector(context);
    for (let b = 0; b < routes.length; b++) {
      const route = routes[b];
      const route_path_dirs = route.path.split("/");
      if (context.request.path_dirs.length === route_path_dirs.length) {
        for (let c = 0; c < route_path_dirs.length; c++) {
          if (context.request.path_dirs.length === route_path_dirs.length) {
            let found = true;
            for (let i = 0; i < route_path_dirs.length; i++) {
              const route_path_dir = route_path_dirs[i];
              if (route_path_dir !== "*" && route_path_dir !== context.request.path_dirs[i]) {
                found = false;
                break;
              }
            }
            if (found) {
              if (FW.verbose_logging)
                context.request.log("ROUTE #" + route.id + " (" + route.path + ")", context);
              return route;
            }
          }
        }
      }
    }
    return null;
  }
  async route_execute_build(context, route) {
    if (route) {
      try {
        const component = new route.component(context);
        return { response: await component.build(context), component };
      } catch (error) {
        context.request.error("ROUTE #" + route.id + " (" + route.path + ")", context, error);
        return { response: await this.middleware.error_handler_component.build(context), component: this.middleware.error_handler_component };
      }
    }
    if (FW.verbose_logging)
      context.request.log("NOT_FOUND", context);
    try {
      const component = new this.middleware.not_found_handler(context);
      return { response: await component.build(context), component };
    } catch (error) {
      context.request.error("NOT_FOUND", context, error);
      return { response: await this.middleware.error_handler_component.build(context), component: this.middleware.error_handler_component };
    }
  }
};
var FrontworkMiddleware = class {
  error_handler;
  /** The error handler should only have a response. The Component is only for internal use. */
  error_handler_component;
  not_found_handler;
  before_route;
  redirect_lonely_slash;
  constructor(init) {
    this.error_handler = init.error_handler;
    this.error_handler_component = {
      async build(context) {
        context.document_head.innerHTML = "";
        context.document_body.innerHTML = "";
        return init.error_handler(context);
      },
      dom_ready() {
      },
      on_destroy() {
      }
    };
    this.not_found_handler = init.not_found_handler;
    this.before_route = init.before_route;
    this.redirect_lonely_slash = init && init.redirect_lonely_slash ? init.redirect_lonely_slash : true;
  }
};

// frontwork-client.ts
var FrontworkClient = class extends Frontwork {
  build_on_page_load;
  client_observers = {};
  /** page_change() behaviour: 
      It kills the previous Promise so that it will not execute its Component build function since it is not needed because the user already clicked to the next page.
      But we should wait for page_change_form because we want ensure that the data is transmitted. */
  page_change_ready = true;
  page_change_previous_abort_controller = null;
  is_page_change_ready() {
    return this.page_change_ready;
  }
  previous_component = null;
  previous_context = null;
  get_headers() {
    return new Headers([["Cookie", document.cookie]]);
  }
  constructor(init) {
    super(init);
    if (typeof init.build_on_page_load === "boolean")
      this.build_on_page_load = init.build_on_page_load;
    else
      this.build_on_page_load = false;
    document.addEventListener("DOMContentLoaded", () => {
      const request = new FrontworkRequest("GET", location.toString(), this.get_headers(), new PostScope({}));
      this.page_change(request, this.build_on_page_load, false);
    });
    document.addEventListener("click", async (event) => {
      const target = event.target;
      if (target.tagName === "A" && (target.target === "" || target.target === "_self")) {
        const url = new URL(target.href);
        if (url.hostname !== "" && url.hostname !== window.location.hostname) {
          return;
        }
        if (this.page_change_ready) {
          if (await this.page_change_to(target.href, false)) {
            event.preventDefault();
          }
        } else {
          event.preventDefault();
        }
      }
    }, false);
    document.addEventListener("submit", async (event) => {
      const target = event.target;
      if (target.tagName === "FORM" && target.getAttribute("fw-form") !== null) {
        event.preventDefault();
        if (target.ariaDisabled === "true") {
          console.log("fw-form is ariaDisabled. Because it already has been submitted.", target);
        } else {
          target.ariaDisabled = "true";
          let submit_button = event.submitter;
          submit_button = submit_button && submit_button.name ? submit_button : null;
          const result = await this.page_change_form(target, submit_button);
          console.log("page_change_form result", result);
          target.ariaDisabled = "false";
        }
      }
    });
    addEventListener("popstate", (event) => {
      if (this.page_change_ready) {
        const savestate = event.state;
        if (savestate && savestate.url) {
          const request = new FrontworkRequest("GET", savestate.url, this.get_headers(), new PostScope({}));
          this.page_change(request, true, true);
        }
      } else {
        history.pushState(null, "", window.location.pathname);
      }
    });
    if (this.stage === 0 /* Development */) {
      console.info("hot-reloading is enabled; Make sure this is the development environment");
      let state = 0;
      const connect = () => {
        const ws = new WebSocket("ws://" + location.host + "//ws");
        ws.onopen = function() {
          ws.send("REQUEST::SERVICE_STARTED");
          if (state === 2) {
            location.reload();
          } else {
            state = 1;
          }
        };
        ws.onclose = function() {
          state = 2;
          setTimeout(connect, 1e3);
        };
        ws.onerror = function() {
          ws.close();
        };
      };
      connect();
    }
  }
  async page_change(request, do_building, ignore_not_ready) {
    if (this.page_change_ready || ignore_not_ready) {
      if (this.page_change_previous_abort_controller !== null) {
        this.page_change_previous_abort_controller.abort();
      }
      const abort_controller = new AbortController();
      this.page_change_previous_abort_controller = abort_controller;
      if (this.previous_component !== null && this.previous_context !== null)
        await this.previous_component.on_destroy(this.previous_context, this);
      const context = new FrontworkContext(this.platform, this.stage, "127.0.0.1", this.api_protocol_address, this.api_protocol_address_ssr, this.api_error_event, this.i18n, request, do_building, this);
      this.previous_context = context;
      let route;
      try {
        route = await this.route_resolver(context);
      } catch (error) {
        context.request.error("ERROR in route_resolver", context, error);
        return null;
      }
      try {
        this.middleware.before_route.build(context);
        this.middleware.before_route.dom_ready(context, this);
      } catch (error) {
        context.request.error("before_route", context, error);
      }
      if (do_building) {
        const reb_result = await this.route_execute_build(context, route);
        if (abort_controller.signal.aborted) {
          this.page_change_ready = true;
          return null;
        }
        for (let i = 0; i < reb_result.response.cookies.length; i++) {
          const cookie = reb_result.response.cookies[i];
          if (cookie.http_only === false) {
            document.cookie = cookie.toString();
          }
        }
        if (reb_result.response.status_code === 301 || reb_result.response.status_code === 302) {
          const redirect_url = reb_result.response.get_header("Location");
          if (redirect_url === null) {
            FW.reporter(2 /* Error */, "REDIRECT", "Tried to redirect: Status Code is 301, but Location header is null", context, null);
            this.page_change_ready = true;
            return null;
          } else {
            if (FW.verbose_logging)
              FW.reporter(0 /* Info */, "REDIRECT", "Redirect to: " + redirect_url, context, null);
            this.page_change_to(redirect_url, true);
            this.page_change_ready = true;
            return { method: request.method, url: context.request.url, is_redirect: true, status_code: reb_result.response.status_code };
          }
        }
        const resolved_content = reb_result.response.content;
        if (typeof resolved_content.context.document_html !== "undefined") {
          resolved_content.html();
          html_element_set_attributes(document.children[0], resolved_content.context.document_html.attributes);
          html_element_set_attributes(document.head, resolved_content.context.document_head.attributes);
          document.head.innerHTML = resolved_content.context.document_head.innerHTML;
          const html = document.body.parentElement;
          if (document.body !== null)
            document.body.remove();
          if (html !== null) {
            for (let i = 0; i < context.document_body.children.length; i++) {
              const child = context.document_body.children[i];
              if (child.tagName === "SCRIPT") {
                child.remove();
              }
            }
            html.append(context.document_body);
          }
          reb_result.component.dom_ready(context, this);
          this.previous_component = reb_result.component;
          this.page_change_ready = true;
          return { method: request.method, url: request.url, is_redirect: false, status_code: reb_result.response.status_code };
        }
      } else {
        if (route !== null) {
          const route_component = new route.component(context);
          route_component.dom_ready(context, this);
          this.previous_component = route_component;
        } else {
          const not_found_component = new this.middleware.not_found_handler(context);
          not_found_component.dom_ready(context, this);
          this.previous_component = not_found_component;
        }
      }
      this.page_change_ready = true;
    }
    return null;
  }
  // function replacement for window.location; accessible for the Component method dom_ready */
  async page_change_to(url_or_path, ignore_not_ready) {
    if (FW.verbose_logging)
      FW.reporter(0 /* Info */, "PageChange", "    page_change_to: " + url_or_path, null, null);
    let url;
    const test = url_or_path.indexOf("//");
    if (test === 0 || test === 5 || test === 6) {
      url = url_or_path;
    } else {
      url = location.protocol + "//" + location.host + url_or_path;
    }
    const request = new FrontworkRequest("GET", url, this.get_headers(), new PostScope({}));
    const result = await this.page_change(request, true, ignore_not_ready === true);
    if (result !== null) {
      if (result.is_redirect)
        return true;
      history.pushState(result, document.title, url);
      return true;
    }
    return false;
  }
  /** function to handle Form submits being handled in client */
  async page_change_form(form, submit_button) {
    this.page_change_ready = false;
    if (FW.verbose_logging)
      FW.reporter(0 /* Info */, "PageChange", "page_change_form", null, null);
    let method = form.getAttribute("method");
    if (method === null)
      method = "POST";
    const IS_METHOD_GET = method === "GET";
    if (submit_button)
      submit_button.disabled = true;
    let url;
    const action = form.getAttribute("action");
    if (action === "") {
      if (this.previous_context) {
        if (IS_METHOD_GET) {
          url = this.previous_context.request.protocol + "//" + this.previous_context.request.host + this.previous_context.request.path;
        } else {
          url = this.previous_context.request.url;
        }
      } else {
        url = location.protocol + "//" + location.host + window.location.pathname.toString();
        if (IS_METHOD_GET && location.search !== "")
          url += location.search;
      }
    } else {
      url = location.protocol + "//" + location.host + action;
    }
    if (this.middleware.redirect_lonely_slash && url.substring(url.length - 1) === "/") {
      url = url.substring(0, url.length - 1);
    }
    const form_data = new FormData(form);
    const POST = new PostScope({});
    if (IS_METHOD_GET) {
      let first = true;
      form_data.forEach((value, key) => {
        if (first) {
          first = false;
          url += "?";
        } else {
          url += "&";
        }
        url += key + "=" + encodeURIComponent(value.toString());
      });
      if (submit_button !== null) {
        url += (first ? "?" : "&") + submit_button.name + "=" + submit_button.value;
      }
    } else {
      form_data.forEach((value, key) => POST.items[key] = value.toString());
      if (submit_button !== null) {
        POST.items[submit_button.name] = submit_button.value;
      }
    }
    const request = new FrontworkRequest(method, url, this.get_headers(), POST);
    const result = await this.page_change(request, true, true);
    console.log("page_change_form result inner", result);
    if (result !== null) {
      if (result.is_redirect)
        return true;
      history.pushState(result, document.title, url);
      return true;
    }
    if (submit_button)
      submit_button.disabled = true;
    return false;
  }
  refresh() {
    return this.page_change_to(window.location.toString(), true);
  }
};

// test/i18n/english.json
var english_default = {
  title1: "Frontwork Test Page",
  text1: "This is a test page for the Frontwork framework.",
  title2: "Test Form",
  "test-page2": "Test Page 2",
  another_title1: "Hello from 127.0.0.1",
  another_text1: "Yes you can have different domains :)",
  "a-home": "Home",
  "a-test2": "Test2",
  "a-test3": "Test3",
  "a-german": "German",
  "a-crash": "Crash",
  event_button_tester: "Event Button Tester",
  formtest_title_fail: "This form test was sent to the Deno server!",
  formtest_title_ok: "This form test was not sent to the Deno server :)",
  submit_button: "Submit"
};

// test/i18n/german.json
var german_default = {
  title1: "Frontwork Test Seite",
  text1: "Dies ist eine deutsche Test Seite f\xFCr das Frontwork framework.",
  title2: "Test Formular",
  "a-home": "Startseite",
  "a-test2": "Testseite2",
  "a-test3": "Testseite3",
  "a-german": "Deutsch",
  "a-crash": "Absturz",
  event_button_tester: "Ereignistastentester",
  formtest_title_fail: "Dieser Formtest wurde an den Deno Server gesendet!",
  formtest_title_ok: "Dieser Formtest wurde nicht an den Deno Server gesendet :)",
  submit_button: "Senden"
};

// test/test.i18n.ts
var i18n = [
  new I18nLocale("en", english_default),
  new I18nLocale("de", german_default)
];

// test/test.routes.ts
var MyMainDocumentBuilder = class extends DocumentBuilder {
  main;
  constructor(context) {
    super(context);
    const header = this.body_append(context.create_element("header"));
    context.ensure_text_element("a", "a-home", { href: "/" }).append_to(header);
    context.ensure_text_element("a", "a-test2", { href: "/test2" }).append_to(header);
    context.ensure_text_element("a", "a-test3", { href: "/test3" }).append_to(header);
    context.ensure_text_element("a", "a-german", { href: "/german" }).append_to(header);
    context.ensure_text_element("a", "a-crash", { href: "/crash" }).append_to(header);
    this.main = this.body_append(context.create_element("main"));
  }
};
var AnotherComponent = class {
  async build(context) {
    const document_builder = new DocumentBuilder(context);
    const main = document_builder.body_append(context.create_element("main"));
    context.ensure_text_element("h1", "another_title1").append_to(main);
    context.ensure_text_element("p", "another_text1").append_to(main);
    return new FrontworkResponse(200, document_builder);
  }
  async dom_ready() {
  }
  async on_destroy() {
  }
};
var TestComponent = class {
  button_event;
  constructor(context) {
    this.button_event = context.ensure_text_element("button", "event_button_tester", { type: "button" });
  }
  async build(context) {
    const user = await context.get_observer("user").get();
    console.log("The User is", user);
    const document_builder = new MyMainDocumentBuilder(context);
    const title = context.ensure_text_element("h1", "title1").append_to(document_builder.main);
    const description = context.ensure_text_element("p", "text1").append_to(document_builder.main);
    this.button_event.append_to(document_builder.main);
    const section = context.create_element("section").append_to(document_builder.main);
    context.ensure_text_element("h2", "title2").append_to(section);
    const action = context.request.GET.get("action");
    if (action !== null) {
      context.ensure_text_element("h3", "formtest_title_" + (FW.is_client_side ? "ok" : "fail")).append_to(section);
      for (let i = 0; i < 3; i++) {
        const div = context.create_element("div").append_to(section);
        div.element.innerHTML = "text" + i + ": " + context.request.GET.get("text" + i);
      }
    }
    const form = new FrontworkForm(context, "test_form", "", "GET").append_to(section);
    for (let i = 0; i < 3; i++) {
      context.ensure_element("input", "input" + i, { type: "text", name: "text" + i, value: "asdsad" + i }).append_to(form);
    }
    context.ensure_text_element("button", "submit_button", { type: "submit", name: "action", value: "sent" }).append_to(form);
    return new FrontworkResponse(
      200,
      document_builder.add_head_meta_data(title.element.innerText, description.element.innerText, "noindex,nofollow")
    );
  }
  async dom_ready(context, client) {
    try {
      let times = 0;
      this.button_event.element.addEventListener("click", () => {
        times++;
        this.button_event.element.innerHTML = "Changed " + times + " times";
      });
    } catch (error) {
      console.error(error);
    }
  }
  async on_destroy() {
  }
};
var TestGerman = class extends TestComponent {
  constructor(context) {
    context.set_locale("de");
    super(context);
  }
  async build(context) {
    return await super.build(context);
  }
  async dom_ready(context, client) {
    super.dom_ready(context, client);
  }
};
var Test2Component = class {
  async build(context) {
    const document_builder = new MyMainDocumentBuilder(context);
    const title1 = context.ensure_text_element("h1", "test-page2").append_to(document_builder.main);
    const description = context.ensure_element("p", "description").append_to(document_builder.main);
    description.element.innerHTML = "This is a test page <b>2</b> for the Frontwork framework. I will redirect you with js to the home page in 1 second.";
    FW.reporter(1 /* Warn */, "TEST", "Warn counter test for Testworker", context, null);
    return new FrontworkResponse(
      200,
      document_builder.add_head_meta_data(title1.element.innerText, description.element.innerText, "noindex,nofollow")
    );
  }
  async dom_ready(context, client) {
    setTimeout(() => {
      client.page_change_to("/", false);
    }, 1e3);
  }
  async on_destroy() {
    console.log("on_destroy test");
  }
};
var Test3Component = class {
  async build() {
    return new FrontworkResponseRedirect("/", 301);
  }
  async dom_ready() {
  }
  async on_destroy() {
  }
};
var ElementTestComponent = class {
  async build(context) {
    const document_builder = new MyMainDocumentBuilder(context);
    return new FrontworkResponse(
      200,
      document_builder.add_head_meta_data("element_test", "element_test", "noindex,nofollow")
    );
  }
  async dom_ready() {
  }
  async on_destroy() {
  }
};
var HelloWorldPrioTestComponent = class {
  async build(context) {
    const content = "Hello this is indeed first come, first served basis";
    return new FrontworkResponse(200, content);
  }
  async dom_ready(context) {
  }
  async on_destroy() {
  }
};
var HelloWorldComponent = class {
  async build(context) {
    const content = "Hello " + context.request.path_dirs[2];
    return new FrontworkResponse(200, content);
  }
  async dom_ready(context) {
  }
  async on_destroy(context) {
  }
};
var CollisionHandlerComponent = class {
  async build(context) {
    if (context.request.path_dirs[2] === "first-come-first-served") {
      return new HelloWorldPrioTestComponent().build(context);
    }
    return new HelloWorldComponent().build(context);
  }
  async dom_ready(context) {
    if (context.request.path_dirs[2] === "first-come-first-served") {
      new HelloWorldPrioTestComponent().dom_ready(context);
    }
    new HelloWorldComponent().dom_ready(context);
  }
  async on_destroy() {
  }
};
var CrashComponent = class {
  async build() {
    throw new Error("Crash Test");
    return new FrontworkResponse(200, "this text shall never be seen in the browser");
  }
  async dom_ready() {
  }
  async on_destroy() {
  }
};
var NotFoundComponent = class {
  async build(context) {
    const document_builder = new MyMainDocumentBuilder(context);
    const h1 = context.document_body.appendChild(document.createElement("h1"));
    h1.innerText = "ERROR 404 - Not found";
    return new FrontworkResponse(
      404,
      document_builder.add_head_meta_data(h1.innerText, h1.innerText, "noindex,nofollow")
    );
  }
  async dom_ready() {
  }
  async on_destroy() {
  }
};
var default_routes = [
  new Route("/", TestComponent),
  new Route("/test2", Test2Component),
  new Route("/test3", Test3Component),
  new Route("/german", TestGerman),
  new Route("/crash", CrashComponent),
  new Route("/element_test", ElementTestComponent),
  new Route("/hello/first-come-first-served", HelloWorldPrioTestComponent),
  new Route("/hello/*", HelloWorldComponent),
  new Route("/hi/*", CollisionHandlerComponent)
];
var another_routes = [
  new Route("/", AnotherComponent)
];
var middleware = new FrontworkMiddleware({
  before_route: {
    build: async (context) => {
      console.log("context.request.COOKIES", context.request.COOKIES);
      context.set_locale("en");
      const observer = context.get_observer("user");
      if (observer.is_null())
        context.api_request_observer(observer, "POST", "/api/v1/account/user", {});
    },
    dom_ready: async () => {
      console.log("ASDAAAAAAAAA");
    }
  },
  error_handler: async (context) => {
    const document_builder = new MyMainDocumentBuilder(context);
    const h1 = context.document_body.appendChild(document.createElement("h1"));
    h1.innerText = "ERROR 500 - Internal server error";
    return new FrontworkResponse(
      500,
      document_builder.add_head_meta_data(h1.innerText, h1.innerText, "noindex,nofollow")
    );
  },
  not_found_handler: NotFoundComponent
});
var APP_CONFIG = {
  platform: 0 /* Web */,
  stage: 0 /* Development */,
  port: 8080,
  api_protocol_address: "",
  api_protocol_address_ssr: "http://localhost:40201",
  domain_to_route_selector: async (context) => {
    const domain = context.request.host.split(":")[0];
    throw new Error("TEST");
    if (domain === "127.0.0.1")
      return another_routes;
    return default_routes;
  },
  middleware,
  i18n,
  build_on_page_load: false,
  api_error_event: (context, client, method, path, params, error) => {
    if (context.request.path !== "/" && client !== null && error.status === 401) {
      client.page_change_to("/", true);
    }
  }
};

// test/test.client.ts
new FrontworkClient(APP_CONFIG);
