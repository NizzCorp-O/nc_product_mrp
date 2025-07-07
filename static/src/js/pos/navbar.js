"use strict";
import { Navbar } from "@point_of_sale/app/navbar/navbar";
import { patch } from "@web/core/utils/patch";

patch(Navbar.prototype, {  
    async paymentDialog() {
        this.env.services.action.doAction({
            type: 'ir.actions.act_window',
            res_model: 'account.payment',
            views: [[1482, 'form']],
            target: 'new',  // Opens in a dialog
            context: {},
        });
    }
});