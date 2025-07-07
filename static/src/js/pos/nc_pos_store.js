"use strict";
import { PosStore } from "@point_of_sale/app/store/pos_store";
import { patch } from "@web/core/utils/patch";
import { _t } from "@web/core/l10n/translation";
import { AlertDialog } from "@web/core/confirmation_dialog/confirmation_dialog";
import { EditListPopup } from "@point_of_sale/app/store/select_lot_popup/select_lot_popup";
import { PartnerList } from "@point_of_sale/app/screens/partner_list/partner_list";
import {
  makeAwaitable,
  ask,
  makeActionAwaitable,
} from "@point_of_sale/app/store/make_awaitable_dialog";

patch(PosStore.prototype, {
  async selectPartner() {
    // FIXME, find order to refund when we are in the ticketscreen.
    const currentOrder = this.get_order();
    if (!currentOrder) {
      return false;
    }
    const currentPartner = currentOrder.get_partner();
    if (currentPartner && currentOrder.getHasRefundLines()) {
      this.dialog.add(AlertDialog, {
        title: _t("Can't change customer"),
        body: _t(
          "This order already has refund lines for %s. We can't change the customer associated to it. Create a new order for the new customer.",
          currentPartner.name
        ),
      });
      return currentPartner;
    }
    const payload = await makeAwaitable(this.dialog, PartnerList, {
      partner: currentPartner,
      getPayload: (newPartner) => currentOrder.set_partner(newPartner),
    });

    if (payload) {
      currentOrder.set_partner(payload);
    } else {
      currentOrder.set_partner(false);
    }

    return currentPartner;
  },
  async addLineToOrder(vals, order, opts = {}, configure = true) {
    let merge = true;
    order.assert_editable();

    const options = {
      ...opts,
    };

    if ("price_unit" in vals) {
      merge = false;
    }

    if (typeof vals.product_id == "number") {
      vals.product_id = this.data.models["product.product"].get(
        vals.product_id
      );
    }
    const product = vals.product_id;

    const values = {
      price_type: "price_unit" in vals ? "manual" : "original",
      price_extra: 0,
      price_unit: 0,
      mrp: 0,
      order_id: this.get_order(),
      qty: 1,
      tax_ids: product.taxes_id.map((tax) => ["link", tax]),
      ...vals,
    };

    // Handle refund constraints
    if (
      order.doNotAllowRefundAndSales() &&
      order._isRefundOrder() &&
      (!values.qty || values.qty > 0)
    ) {
      this.dialog.add(AlertDialog, {
        title: _t("Refund and Sales not allowed"),
        body: _t("It is not allowed to mix refunds and sales"),
      });
      return;
    }

    // In case of configurable product a popup will be shown to the user
    // We assign the payload to the current values object.
    // ---
    // This actions cannot be handled inside pos_order.js or pos_order_line.js
    if (values.product_id.isConfigurable() && configure) {
      const payload = await this.openConfigurator(values.product_id);

      if (payload) {
        const productFound = this.models["product.product"]
          .filter((p) => p.raw?.product_template_variant_value_ids?.length > 0)
          .find((p) =>
            p.raw.product_template_variant_value_ids.every((v) =>
              payload.attribute_value_ids.includes(v)
            )
          );

        Object.assign(values, {
          attribute_value_ids: payload.attribute_value_ids
            .filter((a) => {
              if (productFound) {
                const attr =
                  this.data.models["product.template.attribute.value"].get(a);
                return (
                  attr.is_custom ||
                  attr.attribute_id.create_variant !== "always"
                );
              }
              return true;
            })
            .map((id) => [
              "link",
              this.data.models["product.template.attribute.value"].get(id),
            ]),
          custom_attribute_value_ids: Object.entries(
            payload.attribute_custom_values
          ).map(([id, cus]) => [
            "create",
            {
              custom_product_template_attribute_value_id:
                this.data.models["product.template.attribute.value"].get(id),
              custom_value: cus,
            },
          ]),
          price_extra: values.price_extra + payload.price_extra,
          qty: payload.qty || values.qty,
          product_id: productFound || values.product_id,
        });
      } else {
        return;
      }
    } else if (
      values.product_id.product_template_variant_value_ids.length > 0
    ) {
      // Verify price extra of variant products
      const priceExtra = values.product_id.product_template_variant_value_ids
        .filter((attr) => attr.attribute_id.create_variant !== "always")
        .reduce((acc, attr) => acc + attr.price_extra, 0);
      values.price_extra += priceExtra;
    }

    // In case of clicking a combo product a popup will be shown to the user
    // It will return the combo prices and the selected products
    // ---
    // This actions cannot be handled inside pos_order.js or pos_order_line.js
    if (values.product_id.isCombo() && configure) {
      const payload = await makeAwaitable(this.dialog, ComboConfiguratorPopup, {
        product: values.product_id,
      });

      if (!payload) {
        return;
      }

      const comboPrices = computeComboItems(
        values.product_id,
        payload,
        order.pricelist_id,
        this.data.models["decimal.precision"].getAll(),
        this.data.models["product.template.attribute.value"].getAllBy("id")
      );

      values.combo_line_ids = comboPrices.map((comboItem) => [
        "create",
        {
          product_id: comboItem.combo_item_id.product_id,
          tax_ids: comboItem.combo_item_id.product_id.taxes_id.map((tax) => [
            "link",
            tax,
          ]),
          combo_item_id: comboItem.combo_item_id,
          price_unit: comboItem.price_unit,
          order_id: order,
          qty: 1,
          attribute_value_ids: comboItem.attribute_value_ids?.map((attr) => [
            "link",
            attr,
          ]),
          custom_attribute_value_ids: Object.entries(
            comboItem.attribute_custom_values
          ).map(([id, cus]) => [
            "create",
            {
              custom_product_template_attribute_value_id:
                this.data.models["product.template.attribute.value"].get(id),
              custom_value: cus,
            },
          ]),
        },
      ]);
    }

    // In the case of a product with tracking enabled, we need to ask the user for the lot/serial number.
    // It will return an instance of pos.pack.operation.lot
    // ---
    // This actions cannot be handled inside pos_order.js or pos_order_line.js
    const code = opts.code;
    let pack_lot_ids = {};
    if (values.product_id.isTracked() && (configure || code)) {
      const packLotLinesToEdit =
        (!values.product_id.isAllowOnlyOneLot() &&
          this.get_order()
            .get_orderlines()
            .filter((line) => !line.get_discount())
            .find((line) => line.product_id.id === values.product_id.id)
            ?.getPackLotLinesToEdit()) ||
        [];

      // if the lot information exists in the barcode, we don't need to ask it from the user.
      if (code && code.type === "lot") {
        // consider the old and new packlot lines
        const modifiedPackLotLines = Object.fromEntries(
          packLotLinesToEdit
            .filter((item) => item.id)
            .map((item) => [item.id, item.text])
        );
        const newPackLotLines = [{ lot_name: code.code }];
        pack_lot_ids = { modifiedPackLotLines, newPackLotLines };
      } else {
        pack_lot_ids = await this.editLots(
          values.product_id,
          packLotLinesToEdit
        );
      }

      if (!pack_lot_ids) {
        return;
      } else if (pack_lot_ids.newPackLotLines?.length > 0) {
        console.log("pack_lot_ids", pack_lot_ids);
        const packLotLine = pack_lot_ids.newPackLotLines;
        values.pack_lot_ids = packLotLine.map((lot) => ["create", lot]);
        values.price_unit = packLotLine[0].sales_price;
        values.mrp = packLotLine[0].mrp;
      }
    }

    // In case of clicking a product with tracking weight enabled a popup will be shown to the user
    // It will return the weight of the product as quantity
    // ---
    // This actions cannot be handled inside pos_order.js or pos_order_line.js
    if (
      values.product_id.to_weight &&
      this.config.iface_electronic_scale &&
      configure
    ) {
      if (values.product_id.isScaleAvailable) {
        this.scale.setProduct(
          values.product_id,
          this.getProductPrice(values.product_id)
        );
        const weight = await makeAwaitable(
          this.env.services.dialog,
          ScaleScreen
        );
        if (weight) {
          values.qty = weight;
        }
      } else {
        await values.product_id._onScaleNotAvailable();
      }
    }

    // Handle price unit
    if (!values.product_id.isCombo() && vals.price_unit === undefined) {
      if (pack_lot_ids && pack_lot_ids.newPackLotLines?.length > 0) {
        const packLotLine = pack_lot_ids.newPackLotLines;
        values.price_unit = packLotLine[0].sales_price;
        values.mrp = packLotLine[0].mrp;
      } else {
        values.price_unit = values.product_id.get_price(
          order.pricelist_id,
          values.qty
        );
      }
    }
    const isScannedProduct = opts.code && opts.code.type === "product";
    if (values.price_extra && !isScannedProduct) {
      if (pack_lot_ids && pack_lot_ids.newPackLotLines?.length > 0) {
        const packLotLine = pack_lot_ids.newPackLotLines;
        values.price_unit = packLotLine[0].sales_price;
        values.mrp = packLotLine[0].mrp;
      } else {
        const price = values.product_id.get_price(
          order.pricelist_id,
          values.qty,
          values.price_extra
        );
        values.price_unit = price;
      }
    }
    const line = this.data.models["pos.order.line"].create({
      ...values,
      order_id: order,
    });
    line.mrp = values.mrp;
    console.log("line", line);
    line.setOptions(options);
    this.selectOrderLine(order, line);
    if (configure) {
      this.numberBuffer.reset();
    }
    const selectedOrderline = order.get_selected_orderline();
    if (options.draftPackLotLines && configure) {
      selectedOrderline.setPackLotLines({
        ...options.draftPackLotLines,
        setQuantity: options.quantity === undefined,
      });
    }

    let to_merge_orderline;
    for (const curLine of order.lines) {
      if (curLine.id !== line.id) {
        if (curLine.can_be_merged_with(line) && merge !== false) {
          to_merge_orderline = curLine;
        }
      }
    }

    if (to_merge_orderline) {
      console.log("before", to_merge_orderline);
      to_merge_orderline.merge(line);
      console.log("after", to_merge_orderline);
      line.delete();
      this.selectOrderLine(order, to_merge_orderline);
    } else if (!selectedOrderline) {
      this.selectOrderLine(order, order.get_last_orderline());
    }
    if (product.tracking === "serial") {
      this.selectedOrder.get_selected_orderline().setPackLotLines({
        modifiedPackLotLines: pack_lot_ids.modifiedPackLotLines ?? [],
        newPackLotLines: pack_lot_ids.newPackLotLines ?? [],
        setQuantity: false,
      });
    }
    if (configure) {
      this.numberBuffer.reset();
    }

    // FIXME: Put this in an effect so that we don't have to call it manually.
    order.recomputeOrderData();

    if (configure) {
      this.numberBuffer.reset();
    }

    this.hasJustAddedProduct = true;
    clearTimeout(this.productReminderTimeout);
    this.productReminderTimeout = setTimeout(() => {
      this.hasJustAddedProduct = false;
    }, 3000);
    console.log("line-final", line);
    // FIXME: If merged with another line, this returned object is useless.
    return line;
  },
  async editLots(product, packLotLinesToEdit) {
    const isAllowOnlyOneLot = product.isAllowOnlyOneLot();
    let canCreateLots =
      this.pickingType.use_create_lots || !this.pickingType.use_existing_lots;

    let existingLots = [];
    try {
      existingLots = await this.data.call(
        "pos.order.line",
        "get_existing_lots",
        [this.company.id, product.id],
        {
          context: {
            config_id: this.config.id,
          },
        }
      );
      if (!canCreateLots && (!existingLots || existingLots.length === 0)) {
        this.dialog.add(AlertDialog, {
          title: _t("No existing serial/lot number"),
          body: _t(
            "There is no serial/lot number for the selected product, and their creation is not allowed from the Point of Sale app."
          ),
        });
        return null;
      }
    } catch (ex) {
      console.error("Collecting existing lots failed: ", ex);
      const confirmed = await ask(this.dialog, {
        title: _t("Server communication problem"),
        body: _t(
          "The existing serial/lot numbers could not be retrieved. \nContinue without checking the validity of serial/lot numbers ?"
        ),
        confirmLabel: _t("Yes"),
        cancelLabel: _t("No"),
      });
      if (!confirmed) {
        return null;
      }
      canCreateLots = true;
    }

    const usedLotsQty = this.models["pos.pack.operation.lot"]
      .filter(
        (lot) =>
          lot.pos_order_line_id?.product_id?.id === product.id &&
          lot.pos_order_line_id?.order_id?.state === "draft"
      )
      .reduce((acc, lot) => {
        if (!acc[lot.lot_name]) {
          acc[lot.lot_name] = { total: 0, currentOrderCount: 0 };
        }
        acc[lot.lot_name].total += lot.pos_order_line_id?.qty || 0;

        if (lot.pos_order_line_id?.order_id?.id === this.selectedOrder.id) {
          acc[lot.lot_name].currentOrderCount +=
            lot.pos_order_line_id?.qty || 0;
        }
        return acc;
      }, {});

    // Remove lot/serial names that are already used in draft orders
    existingLots = existingLots.filter(
      (lot) => lot.product_qty > (usedLotsQty[lot.name]?.total || 0)
    );
    existingLots = existingLots.map((item) => {
      const tmp_item = item;
      tmp_item.product_qty =
        item.product_qty - (usedLotsQty[item.name]?.total || 0);
      return tmp_item;
    });
    // Check if the input lot/serial name is already used in another order
    const isLotNameUsed = (itemValue) => {
      const totalQty =
        existingLots.find((lt) => lt.name == itemValue)?.product_qty || 0;
      const usedQty = usedLotsQty[itemValue]
        ? usedLotsQty[itemValue].total -
          usedLotsQty[itemValue].currentOrderCount
        : 0;
      return usedQty ? usedQty >= totalQty : false;
    };
    // const existingLotsName = existingLots.map((l) => l.name);
    if (!packLotLinesToEdit.length && existingLots.length === 0) {
      // If there's no existing lot/serial number, automatically assign the default product price
      return { modifiedPackLotLines: [], newPackLotLines: [] };
    } else if (!packLotLinesToEdit.length && existingLots.length === 1) {
      // If there's only one existing lot/serial number, automatically assign it to the order line
      return {
        newPackLotLines: [
          {
            lot_name: existingLots[0].name,
            sales_price: existingLots[0].sales_price,
            mrp: existingLots[0].mrp,
          },
        ],
      };
    }

    const payload = await makeAwaitable(this.dialog, EditListPopup, {
      title: _t("Lot/Serial Number(s) Required"),
      name: product.display_name,
      isSingleItem: isAllowOnlyOneLot,
      array: packLotLinesToEdit,
      options: existingLots,
      customInput: canCreateLots,
      uniqueValues: product.tracking === "serial",
      isLotNameUsed: isLotNameUsed,
    });
    if (payload) {
      // Segregate the old and new packlot lines
      const modifiedPackLotLines = Object.fromEntries(
        payload.filter((item) => item.id).map((item) => [item.id, item.name])
      );

      const newPackLotLines = payload.map((item) => ({
        lot_name: item.name,
        sales_price: item.sales_price,
        mrp: item.mrp,
      }));
      return { modifiedPackLotLines, newPackLotLines };
    } else {
      return null;
    }
  },
});
