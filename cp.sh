docker run --rm \
  -v odoo-extra-addons:/target \
  -v $(pwd):/source \
  alpine \
  sh -c "rm -rf /target/nc_product_mrp && mkdir -p nc_product_mrp && cp -r /source /target/nc_product_mrp"
docker run --rm \
  --name odoo-installer \
  --link db:db \
  -v odoo-data:/var/lib/odoo \
  -v odoo-extra-addons:/mnt/extra-addons \
  -e db=db \
  -e USER=odoo \
  -e PASSWORD=odoo \
  odoo:18 \
  odoo -d odoo -u nc_product_mrp --stop-after-init


