# -*- coding: utf-8 -*-
from odoo import models, fields, api
import logging

_logger = logging.getLogger(__name__)
class PosOrderLine(models.Model):
    _inherit = 'pos.order.line'
    mrp = fields.Float(
        string='Maximum Retail Price',
        digits='Product Price',
        help='Maximum Retail Price (MRP) for this specific order line'
    )

    @api.model
    def get_existing_lots(self, company_id, product_id):
        # Call the original method
        lots = super().get_existing_lots(company_id, product_id)
        # Add additional data to each lot
        for lot in lots:
            lot_id = self.env['stock.lot'].browse(lot['id'])
            lot['sales_price'] = lot_id.sales_price  # Assuming you have a sales_rate field on the lot model
            lot['mrp'] = lot_id.mrp 
            
        return lots

    @api.model_create_multi
    def create(self, vals_list):
        _logger.info(vals_list)
        return super().create(vals_list)