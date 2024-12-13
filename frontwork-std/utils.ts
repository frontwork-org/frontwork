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