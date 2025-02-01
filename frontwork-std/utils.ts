

export function parse_url(url:string): {protocol:string, host:string, path:string, query_string:string, fragment:string} {
    const url_protocol_split = url.split("://");
    if(url_protocol_split.length < 2) throw new Error("Invalid URL: " + url);

    const protocol = url_protocol_split[0];

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
        protocol: protocol,
        host: host,
        path: path,
        query_string: query_string,
        fragment: fragment,
    };
}


export function key_value_list_to_object(list: string, list_delimiter: string, key_value_delimiter: string): { [key: string]: string } {
    const result: { [key: string]: string } = {};

    const list_split = list.split(list_delimiter);
    for (let i = 0; i < list_split.length; i++) {
        const item = list_split[i];
        const item_split: string[] = item.split(key_value_delimiter);
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

export function html_element_set_attributes(html_element: HTMLElement, attributes: NamedNodeMap) {
    for (let i = 0; i < attributes.length; i++) {
        const attribute = attributes[i];
        html_element.setAttribute(attribute.name, attribute.value);
    }
}

export type Result<T, E> = {
    ok: true;
    val: T;
} | {
    ok: false;
    err: E;
};

export interface ObserverFunction<T> {
    (value: Result<T, Error>): void;
}

export interface ObserverRetrieverFunction<T> {
    (): Promise<Result<T, Error>>;
}

/**
 * Observers may execute their function multiple times then the notify method gets called.
 */
 export class Observer<T> {
    private observers: ObserverFunction<T>[] = [];
    private retriever: ObserverRetrieverFunction<T>|null = null;
    private value: Result<T, Error>|null = null;
    private retriever_listeners: (() => void)[] = [];
    renew_is_running = false;

    // Set the retriever function that will be used in the get function
    define_retriever(retriever: ObserverRetrieverFunction<T>) {
        this.retriever = retriever;
    }

    // Remove the retriever function
    remove_retriever() {
        this.retriever = null;
    }

    // Observer listener
    subscribe(fn: ObserverFunction<T>): void {
        if (this.value !== null) fn(this.value);
        this.observers.push(fn);
    }
    unsubscribe(fn: ObserverFunction<T>): void {
        this.observers = this.observers.filter(observer => observer !== fn);
    }

    /**
     * Retriever listener: executed before the retriever starts
     */
    add_retriever_listener(fn: () => void): void {
        this.retriever_listeners.push(fn);
    }
    remove_retriever_listener(fn: () => void): void {
        this.retriever_listeners = this.retriever_listeners.filter(listeners => listeners !== fn);
    }

    // Notify all observers with a value
    set(value: Result<T, Error>): void {
        this.value = value;
        this.observers.forEach(observer => observer(value));
    }

    // Notify all observers with a value
    set_value(value: T): void {
        this.set({ ok: true, val: value });
    }

    // Set value to null. DOES NOT NOTIFY.
    set_null(): void {
        this.value = null;
    }

    // Notify all observers with a value if value is unknown
    set_once(value: T): void {
        if (this.value === null) {
            this.set({ ok: true, val: value });
        }
    }

    // Get the value as Promise by this.value, with the retriever or by subscribe and unsubscribe
    get(): Promise<T> {
        return new Promise((resolve, reject) => {
            if (this.value === null) {
                if (this.retriever === null || this.renew_is_running) {
                    // Get the value by subscribe and unsubscribe
                    const sub: ObserverFunction<T> = (value: Result<T, Error>) => {
                        if (value.ok) {
                            resolve(value.val);
                        } else {
                            reject(value.err);
                        }
                        this.unsubscribe(sub);
                    };
                    this.subscribe(sub);
                } else {
                    // Get the value using the retriever
                    this.get_renew()
                        .then((value) => resolve(value))
                        .catch((error) => reject(error));
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
    get_renew(): Promise<T> {
        return new Promise(async (resolve, reject) => {
            if (this.renew_is_running) {
                const sub: ObserverFunction<T> = (value: Result<T, Error>) => {
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
    renew(): Promise<Result<T, Error>> {
        return new Promise(async (resolve, reject) => {
            if (this.retriever === null) {
                reject(new Error("For Observer.renew() the retriever must be defined"));
                return;
            }

            this.renew_is_running = true;
            this.retriever_listeners.forEach(listener => listener());

            try {
                const value = await this.retriever();
                this.set(value);
                this.renew_is_running = false;

                if (value.ok) {
                    resolve(value);
                } else {
                    console.error("ERROR executing Observer.retriever()", value.err);
                    resolve(value); // Still resolve with the error result
                }
            } catch (error) {
                this.renew_is_running = false;
                const errorResult: Result<T, Error> = {
                    ok: false,
                    err: error instanceof Error ? error : new Error(String(error))
                };
                reject(errorResult);
            }
        });
    }

    // Get the current number of observers
    get count(): number {
        return this.observers.length;
    }

    // Clear all observers
    clear(): void {
        this.observers = [];
        this.value = null;
    }
}
