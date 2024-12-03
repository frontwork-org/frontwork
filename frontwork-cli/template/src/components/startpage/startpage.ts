import { Component, FrontworkContext, DocumentBuilder, FrontworkResponse, FrontworkClient, FrontworkForm, FW } from "../../dependencies.ts";
import { MainDocumentBuilder } from '../routes.ts';


export class StartpageComponent implements Component {
	constructor(context: FrontworkContext) {}

    async build(context: FrontworkContext) {
        const document_builder = new MainDocumentBuilder(context);
        
		const title1 = context.ensure_text_element("h1", "title1").append_to(document_builder.main);
		const text1 = context.ensure_text_element("p", "description1").append_to(document_builder.main);
		
		const section = context.create_element("section").append_to(document_builder.main);
		context.ensure_text_element("h2", "title2").append_to(section);

		// Form
		const action = context.request.GET.get("action");
		if (action !== null) {
			for (let i = 0; i < 3; i++) {
				const div = context.create_element("div").append_to(section);
				div.element.innerHTML = "text"+i+": "+context.request.GET.get("text"+i);
			}

		}
		
		const form = new FrontworkForm(context, "test_form", "", "post").append_to(section);

		for (let i = 0; i < 3; i++) {
			context.ensure_element("input", "text"+i, { type: "text", name: "text"+i, value: "aabbcc" }).append_to(form);
		}
		
		context.ensure_text_element("button", "submit_button", { type: "submit", name: "action", value: "sent" }).append_to(form);
        

        return new FrontworkResponse(200, 
            document_builder
                .add_head_meta_data(title1.element.innerText, text1.element.innerText, "index,follow")
        );
    }

    dom_ready(context: FrontworkContext, client: FrontworkClient) {
        
  }
}
