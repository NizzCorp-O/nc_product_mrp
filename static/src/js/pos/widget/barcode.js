/** @odoo-module */
import { Component, onMounted, useRef } from "@odoo/owl";
export class BarcodeGenerator extends Component {
    static template = "nc_product_mrp.BarcodeGenerator";
    static props = {
        code: { 
            type: String, 
            optional: true,  // Make it optional if needed
            validate: (code) => code !== undefined 
        }
    };

    // Optional default props
    static defaultProps = {
        code: ''
    };
    setup() {
        this.barcodeRef = useRef("barcode");
        onMounted(() => {
            JsBarcode(this.barcodeRef.el, this.props.code, {
                format: "CODE128",
                lineColor: "#000",
                width: 1,
                height: 30,
                displayValue: false,
            });
        });
    }
}