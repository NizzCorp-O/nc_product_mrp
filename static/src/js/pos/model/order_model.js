"use strict"
/** @odoo-module */
import { PosOrder } from "@point_of_sale/app/models/pos_order";
import { patch } from "@web/core/utils/patch";
import { formatDateTime } from "@web/core/l10n/dates";
import { parseUTCString } from "@point_of_sale/utils";
import { registry } from "@web/core/registry";
const formatCurrency = registry.subRegistries.formatters.content.monetary[1];
patch(PosOrder.prototype, {
   export_for_printing(baseUrl, headerData) {
       const result = super.export_for_printing(baseUrl, headerData);
       
       if (this.getCashierName()) {
           result.headerData.cashier = this.getCashierName();
       }
       if(this.get_partner()){
           result.headerData.partner_name = this.get_partner().name;
       }else{
           result.headerData.partner_name = "Cash";
       }
        result.counter=this.config.display_name;
        const total_mrp = this.getSortedOrderlines().map(item => item.mrp*item.qty).reduce((sum, value) => sum + value, 0) || 0;
        const total=this.get_total_with_tax() || 0;
        result.total_mrp=formatCurrency(total_mrp);
        const you_saved = total_mrp - total;
        result.you_saved = you_saved > 0 ? formatCurrency(you_saved) : 0;
        console.log("PosOrder-export_for_printing:->",result);
       return result;
   }
});