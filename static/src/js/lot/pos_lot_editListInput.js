"use strict";
import { patch } from "@web/core/utils/patch";
import { EditListInput } from "@point_of_sale/app/store/select_lot_popup/edit_list_input/edit_list_input";
patch(EditListInput.prototype, {
    get displayedOptions() {
        const options = this.props.getOptions();
        console.log("EditListInput:options:", options);
        if (!this.props.customInput || this.props.hasInvalidValue) {
            return options;
        }
        console.log("this.props.item.text",this.props.item.text)
        console.log("EditListInput:options:", options.filter((o) => o.name.includes(this.props.item.text)));
        return options.filter((o) => o.name.includes(this.props.item.text));
    }
})