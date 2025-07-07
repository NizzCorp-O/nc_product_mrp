"use strict";
import { Orderline } from "@point_of_sale/app/generic_components/orderline/orderline";
import { patch } from "@web/core/utils/patch";

patch(Orderline.prototype, {
  
});
Object.assign(Orderline.props.line.shape, {
  mrp: { type: [Number, String], optional: true },
});
