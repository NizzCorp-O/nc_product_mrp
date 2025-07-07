# -*- coding: utf-8 -*-
from odoo import models, fields, api

class StockMoveLine(models.Model):
    _inherit = 'stock.move.line'
    
    sales_price = fields.Float(
        string='Sales Price',
        digits='Product Price',
        help='Sales price for this specific lot/serial number'
    )
    
    mrp = fields.Float(
        string='Maximum Retail Price',
        digits='Product Price',
        help='Maximum Retail Price (MRP) for this specific lot/serial number'
    )
    
    @api.onchange('product_id')
    def _onchange_product_id(self):
        res = super(StockMoveLine, self)._onchange_product_id()
        if self.product_id:
            self.sales_price = self.product_id.list_price
            self.mrp = self.product_id.mrp
        return res
    
    @api.onchange('lot_id')
    def _onchange_lot_id(self):
        """Update sales_price and mrp when lot_id changes"""
        if self.lot_id and self.lot_id.exists():
            # If the lot already has sales price and MRP values, use those
            if hasattr(self.lot_id, 'sales_price') and hasattr(self.lot_id, 'mrp'):
                self.sales_price = self.lot_id.sales_price
                self.mrp = self.lot_id.mrp
        return {} 
    def _prepare_new_lot_vals(self):
        """Override to add sales_price and mrp when creating new lots"""
        vals = super(StockMoveLine, self)._prepare_new_lot_vals()
        
        # Add sales_price and mrp to the lot values
        if self.product_id:
            vals.update({
                'sales_price': self.sales_price if self.sales_price else self.product_id.list_price,
                'mrp': self.mrp if self.mrp else self.product_id.mrp,
            })
            
        return vals