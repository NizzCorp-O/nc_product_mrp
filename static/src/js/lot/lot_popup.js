/** @odoo-module **/
"use strict"
import { EditListPopup } from "@point_of_sale/app/store/select_lot_popup/select_lot_popup";
import { patch } from "@web/core/utils/patch";

patch(EditListPopup.prototype, {
    getRemainingOptions() {
        const usedValues = new Set(this.state.array.map((e) => e.text));
        return this.props.options.filter((o) => !usedValues.has(o.name));
    },
    shouldShowOptionsForItem(item) {
        return (
            item._id === this.state.selectedItemId &&
            (this.state.scrolledWithSelectedItemId !== item._id ||this.state.scrolledWithSelectedItemValue !== item.text) &&(!item.text ||
                !this.props.customInput ||
                !this.hasValidValue(item._id, item.text) ||
                !this.props.options.some(o => o.name === item.text))
        );
    },
    hasValidValue(itemId, text) {
        return (
            !this.props.isLotNameUsed(text) &&
            (this.props.customInput || this.props.options.some(o => o.name === text)) &&
            (!this.props.uniqueValues ||
                !this.state.array.some((elem) => elem._id !== itemId && elem.text === text))
        );
    },
    onInputChange(itemId, selected_option) {
        console.log("onchange")
        const item = this.state.array.find((elem) => elem._id === itemId);
        if(typeof selected_option ==="object" && selected_option.hasOwnProperty("name") && selected_option.hasOwnProperty("id")){
            item.text = selected_option.name;
            item._id=selected_option.id;
        }
        else{
            item.text=selected_option
        }
        this.resetScrollInfo();
    },
    confirm(){
        const finalValues = new Set();
        const filterIds = new Set(this.state.array.map(obj => obj.text));
        const selected_optons=this.props.options.filter((o)=>{
            if(filterIds.has(o.name)){
                const itemValue = o.name.trim();
                    const isValidValue =
                        itemValue !== "" &&
                        !this.props.isLotNameUsed(itemValue) &&
                        (this.props.customInput || this.props.options.includes(itemValue));
                    if (!isValidValue) {
                        return false;
                    }
                    if (this.props.uniqueValues) {
                        const isDuplicateValue = finalValues.has(itemValue);
                        if (!isDuplicateValue) {
                            finalValues.add(itemValue);
                        }
                        return !isDuplicateValue;
                    }
                    return true;
            }
            return false;
        });
        console.log("selected_optons1111",selected_optons)
        this.props.getPayload(
            selected_optons
        );
        this.props.close();
    }
});