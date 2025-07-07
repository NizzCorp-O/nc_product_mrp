# 1. Setup PostgreSQL

```sh
docker run -d -v odoo-db:/var/lib/postgresql/data -e POSTGRES_USER=odoo -e POSTGRES_PASSWORD=odoo -e POSTGRES_DB=postgres --name db postgres:15
```

# 2.Use Named Containers

```sh
docker run -v odoo-data:/var/lib/odoo -v odoo-extra-addons:/mnt/extra-addons -d -p 8069:8069 --name odoo --link db:db -t odoo
```