# -*- coding: utf-8 -*-
from odoo import models, fields, api

class StockLot(models.Model):
    _inherit = 'stock.lot'
    
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
    
    @api.model_create_multi
    def create(self, vals_list):
        for vals in vals_list:
            if 'product_id' in vals and 'sales_price' not in vals:
                product = self.env['product.product'].browse(vals['product_id'])
                vals['sales_price'] = product.list_price
                
            if 'product_id' in vals and 'mrp' not in vals:
                product = self.env['product.product'].browse(vals['product_id'])
                vals['mrp'] = product.mrp
                
        return super(StockLot, self).create(vals_list)