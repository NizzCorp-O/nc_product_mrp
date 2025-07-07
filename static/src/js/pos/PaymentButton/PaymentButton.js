/** @odoo-module **/

import { patch } from "@web/core/utils/patch";
import { ActionpadWidget } from "@point_of_sale/app/screens/product_screen/action_pad/action_pad";
import { registry } from "@web/core/registry";
const formatCurrency = registry.subRegistries.formatters.content.monetary[1];
patch(ActionpadWidget.prototype, {
    formattedTotal() {
        const order = this.pos.get_order();
        if (!order) return "";
        const total = order.get_total_with_tax();
        const currencyId = this.pos.currency?.id;
        return formatCurrency(total);
    }
});
