"use strict";
import { ReceiptScreen } from "@point_of_sale/app/screens/receipt_screen/receipt_screen";
import { patch } from "@web/core/utils/patch";
import { registry } from "@web/core/registry";
const formatCurrency = registry.subRegistries.formatters.content.monetary[1];
patch(ReceiptScreen.prototype, {
    send_whatsapp(){
      console.log("data:===",this.currentOrder)
        const order=this.currentOrder;
        const payments=[]
        const line="\n----------------------\n"
        order.payment_ids.forEach((payment) => {
            payments.push(`${payment.payment_method_id.name}:${formatCurrency(payment.get_amount())}`)
        });
        if(order.mobile && order.mobile!==""){
            const message = `*Invoice ${order.tracking_number}*\n Date:${order.date_order}${line} Total Items: ${this.TotalItems}\n Total Quantity: ${this.TotalQuantity}${line} Total Amount: ${order.amount_total}${line}${payments.join('\n')}${line}Served by: ${order.user_id.name}(${order.user_id.id})`;
            console.log("message",message)
            window.open(`https://wa.me/${order.mobile}?text=${encodeURIComponent(message)}`, '_blank','toolbar=no,location=no,status=no,menubar=no,scrollbars=yes,resizable=yes,width=800,height=600,left=200,top=200');
        }
    },
    get TotalQuantity() {
        var totalQuantity = 0;
        this.currentOrder.lines.forEach((line) => (totalQuantity += line.qty));
        return totalQuantity;
      },
      get TotalItems() {
        return this.currentOrder.lines.length;
      }
});