import { Component, FrontworkContext, DocumentBuilder, FrontworkResponse, FrontworkClient } from "../../dependencies.ts";


export class StartpageComponent implements Component {
    build(context: FrontworkContext) {
        const document_builder = new DocumentBuilder();
        let title = 'Startpage';
        let description = 'Startpage';
        
        const main = document_builder.document_body.appendChild( document.createElement("main") );
        const title1 = main.appendChild( document.createElement("h1") );
		title1.innerText = context.i18n.get_translation("title1");
		const description_dom = main.appendChild( document.createElement("p") );
		description_dom.innerText = context.i18n.get_translation("text1");
		
		const section_form = main.appendChild( document.createElement("section") );
		const section_form_title = section_form.appendChild( document.createElement("h2") );
		section_form_title.innerText = context.i18n.get_translation("title2");
		
		const section_form_form = section_form.appendChild( document.createElement("form") );
		section_form_form.setAttribute("id", "test_form");
		section_form_form.setAttribute("action", "");
		section_form_form.setAttribute("method", "post");

		for (let i = 0; i < 3; i++) {
			const section_form_form_input_text = section_form_form.appendChild( document.createElement("input") );
			section_form_form_input_text.setAttribute("type", "text");
			section_form_form_input_text.setAttribute("name", "text"+i);
			section_form_form_input_text.setAttribute("value", "aabbcc");
		}
		
		const section_form_submit_button = section_form_form.appendChild( document.createElement("button") );
		section_form_submit_button.setAttribute("type", "submit");
		section_form_submit_button.setAttribute("name", "action");
		section_form_submit_button.setAttribute("value", "sent");
		section_form_submit_button.innerHTML = "Submit";
        

        return new FrontworkResponse(200, 
            document_builder
                .set_html_lang(context.i18n.selected_locale.locale)
                .add_head_meta_data(title, description, "index,follow")
        );
    }

    dom_ready(context: FrontworkContext, frontwork: FrontworkClient) {
        
  }
}
