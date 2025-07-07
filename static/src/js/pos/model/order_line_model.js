"use strict";
/** @odoo-module */
import { PosOrderline } from "@point_of_sale/app/models/pos_order_line";
import { patch } from "@web/core/utils/patch";
import { formatFloat, roundDecimals, roundPrecision, floatIsZero } from "@web/core/utils/numbers";
patch(PosOrderline.prototype, {
    setPackLotLines({
        modifiedPackLotLines,
        newPackLotLines,
        setQuantity = true,
      }) {
        this.pack_lot_ids = [];
        if(newPackLotLines.length>0){
           
            this.models["pos.pack.operation.lot"].create({
            lot_name: newPackLotLines[0].lot_name,
            pos_order_line_id: this,
            });
            this.mrp = newPackLotLines[0].mrp;
            this.price_unit = newPackLotLines[0].sales_price;
            
        }else{
          const product= this.product_id;
          this.price_unit = product.lst_price;
          this.mrp = product.mrp;
        }
        this.setDirty();
      },
    isSameLot(orderline) {
        if(orderline.pack_lot_ids && this.pack_lot_ids ) {
            if(orderline.pack_lot_ids.length === 0 && this.pack_lot_ids.length === 0){
                return true;
            }else if(orderline.pack_lot_ids.length === 0 || this.pack_lot_ids.length === 0){
                return false;
            }
            else if(orderline.pack_lot_ids[0].lot_name===this.pack_lot_ids[0].lot_name){
                return true;
            }
            return false;
           
        }
        return true;
    },
    set_quantity(quantity, keep_price) {
        return super.set_quantity(quantity, true);
    },
  getDisplayData() {
    const result = super.getDisplayData();
    result.mrp=this.mrp;
    return result;
  },
  can_be_merged_with(orderline) {
    const isSameCustomerNote =
        (Boolean(orderline.get_customer_note()) === false &&
            Boolean(this.get_customer_note()) === false) ||
        orderline.get_customer_note() === this.get_customer_note();
    // only orderlines of the same product can be merged
    return (
        !this.skip_change &&
        orderline.getNote() === this.getNote() &&
        this.get_product().id === orderline.get_product().id &&
        this.is_pos_groupable() &&
        // don't merge discounted orderlines
        this.get_discount() === 0 &&
        floatIsZero(this.price_unit - orderline.price_unit , this.currency) &&
        this.isSameLot(orderline) &&
        this.full_product_name === orderline.full_product_name &&
        isSameCustomerNote &&
        !this.refunded_orderline_id &&
        !orderline.isPartOfCombo()
    );}
});