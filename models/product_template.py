from odoo import models, fields, api
import logging

_logger = logging.getLogger(__name__)

class ProductTemplate(models.Model):
    _inherit = 'product.template'

    mrp = fields.Float(
        string='Maximum Retail Price',
        help='Maximum Retail Price (MRP) of the product',
        digits='Product Price',
        copy=True
    )

class ProductProduct(models.Model):
    _inherit = 'product.product'

    mrp = fields.Float(
        string='Maximum Retail Price',
        related='product_tmpl_id.mrp',
        store=True,
        readonly=False
    )
    @api.model
    def _load_pos_data_fields(self, config_id):
       data = super()._load_pos_data_fields(config_id)
       data += ['mrp']
       return data 