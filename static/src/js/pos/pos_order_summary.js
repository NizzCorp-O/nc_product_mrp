/** @odoo-module */
import { OrderWidget } from "@point_of_sale/app/generic_components/order_widget/order_widget";
import { patch } from "@web/core/utils/patch";
patch(OrderWidget.prototype, {
  get TotalQuantity() {
    var totalQuantity = 0;
    this.props.lines.forEach((line) => (totalQuantity += line.qty));
    return totalQuantity || 0;
  },
  get TotalItems() {
    return this.props.lines.length || 0;
  },
});
