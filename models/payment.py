# -*- coding: utf-8 -*-
from odoo import models, fields, api
from odoo.exceptions import ValidationError
import logging

_logger = logging.getLogger(__name__)
class PosOrderLine(models.Model):
    _inherit = 'account.payment'
    partner_balance = fields.Float(string="Partner Balance", readonly=True, compute='_onchange_partner_id')
    @api.model_create_multi
    def create(self, vals_list):
        _logger.info(vals_list)
        records = super().create(vals_list)
        records.action_post()
        if records.state == 'in_process':
            records.write({'state': 'paid'}) 
        return records

    @api.constrains('amount')
    def _check_positive_amount(self):
        for payment in self:
            if payment.amount <= 0:
                raise ValidationError("Payment amount must be greater than zero.")
    

    @api.depends('partner_id')
    def _onchange_partner_id(self):
        for rec in self:
            if not self.partner_id:
                rec.partner_balance = 0
                continue
            _logger.info("self.partner_id: " + str(self.partner_id.id))
            self.env.cr.execute("""SELECT
                SUM(CASE WHEN payment_type = 'inbound' THEN amount ELSE 0 END) AS inbound_total,
                SUM(CASE WHEN payment_type = 'outbound' THEN amount ELSE 0 END) AS outbound_total
                    FROM account_payment
                    WHERE partner_id = %s AND state = 'paid'
                """, [self.partner_id.id])
            result = self.env.cr.fetchone()
            inbound_total = result[0] or 0
            outbound_total = result[1] or 0
            self.env.cr.execute("""
                SELECT SUM(pp.amount)
                FROM pos_payment pp
                JOIN pos_order po ON po.id = pp.pos_order_id
                JOIN pos_payment_method ppm ON ppm.id = pp.payment_method_id
                WHERE po.partner_id = %s
                AND ppm.split_transactions = TRUE
                AND ppm.journal_id IS NULL
            """, [self.partner_id.id])

            result = self.env.cr.fetchone()
            total_pos_invoice_payments = result[0] or 0
            rec.partner_balance = total_pos_invoice_payments + outbound_total - inbound_total