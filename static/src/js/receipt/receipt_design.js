/** @odoo-module */
import { OrderReceipt } from "@point_of_sale/app/screens/receipt_screen/receipt/order_receipt";
import { patch } from "@web/core/utils/patch";
import { BarcodeGenerator } from "../pos/widget/barcode";
patch(OrderReceipt.prototype, {
});
Object.assign(OrderReceipt.components, {
    BarcodeGenerator
  });
  