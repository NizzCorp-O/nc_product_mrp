/** @odoo-module **/

import { patch } from "@web/core/utils/patch";
import { PosOrderline } from "@point_of_sale/app/models/pos_order_line";

patch(PosOrderline.prototype, {
    setPackLotLines(params) {
        this._super(...arguments);
        console.log('=== LOT SELECTION LOG ===');
        console.log('params:', params);
    }
});