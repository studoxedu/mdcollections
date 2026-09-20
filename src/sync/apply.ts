import { tx, run, one } from "../database/client";
import { uuid } from "../utils/id";
import { IncomingEvent } from "./types";

// Applies events pulled from other devices (via sync-pull) to local state.
// Every case here must be able to read whatever shape this app's own
// core.ts actually sends for that event type, since incoming events may
// have been created by any device running this same client. Fields that
// live on the event envelope itself (user_id, device_id, event_id,
// client_created_at) are read from `e`, not duplicated out of `p`.
export const applyIncomingEvents = (events: IncomingEvent[]) =>
  tx(() => {
    for (const e of events) {
      if (
        one("SELECT event_id FROM processed_events WHERE event_id=?", [
          e.event_id,
        ])
      )
        continue;
      const p = e.payload as any;
      switch (e.event_type) {
        case "PRODUCT_CREATED":
        case "PRODUCT_UPDATED": {
          // INSERT OR REPLACE replaces the whole row, so image_local_uri
          // must be carried forward explicitly or a photo that's already
          // downloaded on this device would be wiped back to null on every
          // incoming update — even ones that didn't touch the photo at
          // all. Only clear it when the incoming image_drive_id actually
          // differs from what's cached, which is the signal the sync
          // engine's photo-download sweep uses to fetch the new one.
          const existingProduct = one<any>(
            "SELECT image_local_uri, image_drive_id FROM products WHERE id=?",
            [p.id],
          );
          const incomingDriveId = p.image_drive_id || null;
          const keepLocalUri =
            existingProduct &&
            existingProduct.image_drive_id === incomingDriveId
              ? existingProduct.image_local_uri
              : null;
          run(
            `INSERT OR REPLACE INTO products(id,business_id,name,sku,barcode,category_id,supplier_id,cost_price,selling_price,current_stock,minimum_stock,unit,active,created_at,updated_at,image_local_uri,image_drive_id) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
            [
              p.id,
              e.business_id,
              p.name,
              p.sku,
              p.barcode || null,
              p.category_id || null,
              p.supplier_id || null,
              p.cost_price,
              p.selling_price,
              p.current_stock,
              p.minimum_stock,
              p.unit || "pcs",
              p.active === false ? 0 : 1,
              p.created_at,
              p.updated_at,
              keepLocalUri,
              incomingDriveId,
            ],
          );
          break;
        }

        case "PRODUCT_DEACTIVATED":
          run("UPDATE products SET active=0,updated_at=? WHERE id=?", [
            e.client_created_at,
            p.id || e.entity_id,
          ]);
          break;

        case "CATEGORY_CREATED":
          run(
            "INSERT OR REPLACE INTO categories(id,business_id,name,created_at) VALUES(?,?,?,?)",
            [p.id, e.business_id, p.name, p.created_at],
          );
          break;

        case "CUSTOMER_CREATED":
        case "CUSTOMER_UPDATED":
          run(
            "INSERT OR REPLACE INTO customers(id,business_id,name,phone,notes,created_at,updated_at) VALUES(?,?,?,?,?,?,?)",
            [
              p.id,
              e.business_id,
              p.name,
              p.phone || "",
              p.notes || "",
              p.created_at,
              p.created_at,
            ],
          );
          break;

        case "SUPPLIER_CREATED":
        case "SUPPLIER_UPDATED":
          run(
            "INSERT OR REPLACE INTO suppliers(id,business_id,name,phone,address,notes,created_at,updated_at) VALUES(?,?,?,?,?,?,?)",
            [
              p.id,
              e.business_id,
              p.name,
              p.phone || "",
              p.address || "",
              p.notes || "",
              p.created_at,
              p.created_at,
            ],
          );
          break;

        case "SALE_CREATED": {
          const sale = p.sale;
          run("INSERT OR REPLACE INTO sales VALUES(?,?,?,?,?,?,?,?,?,?,?)", [
            sale.id,
            e.business_id,
            sale.receipt_number,
            sale.customer_id || null,
            e.user_id,
            e.device_id,
            sale.subtotal,
            sale.total,
            sale.payment_method,
            sale.created_at,
            0,
          ]);
          for (const item of p.items || []) {
            run("INSERT OR REPLACE INTO sale_items VALUES(?,?,?,?,?,?,?,?)", [
              item.id,
              sale.id,
              item.product_id,
              item.product_name,
              item.quantity,
              item.unit_price,
              item.cost_price,
              item.line_total,
            ]);
            const prod = one<any>(
              "SELECT current_stock FROM products WHERE id=?",
              [item.product_id],
            );
            if (prod) {
              const newStock = prod.current_stock - item.quantity;
              run(
                "UPDATE products SET current_stock=?,updated_at=? WHERE id=?",
                [newStock, sale.created_at, item.product_id],
              );
              run(
                "INSERT OR REPLACE INTO stock_movements VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
                [
                  item.movement_id,
                  e.business_id,
                  item.product_id,
                  "SALE",
                  "OUT",
                  item.quantity,
                  prod.current_stock,
                  newStock,
                  "Sale",
                  sale.receipt_number,
                  e.user_id,
                  e.device_id,
                  e.event_id,
                  sale.created_at,
                ],
              );
            }
          }
          break;
        }

        case "SALE_CANCELLED": {
          run("UPDATE sales SET cancelled=1 WHERE id=?", [p.id || e.entity_id]);
          for (const item of p.items || []) {
            const prod = one<any>(
              "SELECT current_stock FROM products WHERE id=?",
              [item.product_id],
            );
            if (prod) {
              const newStock = prod.current_stock + item.quantity;
              run(
                "UPDATE products SET current_stock=?,updated_at=? WHERE id=?",
                [newStock, e.client_created_at, item.product_id],
              );
              run(
                "INSERT INTO stock_movements VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
                [
                  uuid(),
                  e.business_id,
                  item.product_id,
                  "CUSTOMER_RETURN",
                  "IN",
                  item.quantity,
                  prod.current_stock,
                  newStock,
                  "Sale cancelled",
                  "",
                  e.user_id,
                  e.device_id,
                  e.event_id,
                  e.client_created_at,
                ],
              );
            }
          }
          break;
        }

        case "STOCK_PURCHASED":
        case "STOCK_ADJUSTED":
        case "STOCK_MISSING":
        case "STOCK_DAMAGED":
        case "CUSTOMER_RETURN": {
          const prod = one<any>(
            "SELECT current_stock FROM products WHERE id=?",
            [p.product_id],
          );
          if (prod) {
            const numericDirection = p.direction === 1 ? 1 : -1;
            const newStock = prod.current_stock + numericDirection * p.quantity;
            const typeByEventType: Record<string, string> = {
              STOCK_PURCHASED: "PURCHASE",
              STOCK_ADJUSTED: "ADJUSTED",
              STOCK_MISSING: "MISSING",
              STOCK_DAMAGED: "DAMAGED",
              CUSTOMER_RETURN: "RETURN",
            };
            run("UPDATE products SET current_stock=?,updated_at=? WHERE id=?", [
              newStock,
              p.created_at,
              p.product_id,
            ]);
            run(
              "INSERT OR REPLACE INTO stock_movements VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
              [
                p.movement_id,
                e.business_id,
                p.product_id,
                typeByEventType[e.event_type],
                numericDirection === 1 ? "IN" : "OUT",
                p.quantity,
                prod.current_stock,
                newStock,
                p.reason || "",
                p.note || "",
                e.user_id,
                e.device_id,
                e.event_id,
                p.created_at,
              ],
            );
          }
          break;
        }

        case "EXPENSE_CREATED":
          // user_id/device_id/event_id are provenance columns on the local
          // table, not part of the wire payload — they come from the event
          // envelope, not from `p` (see core.ts's createExpense).
          run(
            "INSERT OR REPLACE INTO expenses VALUES(?,?,?,?,?,?,?,?,?,?,?,?)",
            [
              p.id,
              e.business_id,
              p.description,
              p.amount,
              p.category,
              p.date,
              p.note || "",
              e.user_id,
              e.device_id,
              e.event_id,
              p.created_at,
              0,
            ],
          );
          break;

        case "EXPENSE_DELETED":
          run("UPDATE expenses SET deleted=1 WHERE id=?", [
            p.id || e.entity_id,
          ]);
          break;

        case "MEMBER_CREATED":
          run("INSERT OR REPLACE INTO members VALUES(?,?,?,?,?,?,?,?,?,?,?)", [
            p.id || e.entity_id,
            e.business_id,
            p.user_id || p.id || e.entity_id,
            p.role || "EMPLOYEE",
            p.full_name || "",
            p.email || "",
            p.phone || "",
            1,
            JSON.stringify(p.permissions || {}),
            e.client_created_at,
            e.client_created_at,
          ]);
          break;

        case "MEMBER_DISABLED":
          run(
            "UPDATE members SET active=0,updated_at=? WHERE id=? OR user_id=?",
            [
              e.client_created_at,
              p.id || e.entity_id,
              p.user_id || p.id || e.entity_id,
            ],
          );
          break;

        case "MEMBER_PERMISSIONS_UPDATED":
          run(
            "UPDATE members SET permissions=?,updated_at=? WHERE id=? OR user_id=?",
            [
              JSON.stringify(p.permissions || {}),
              e.client_created_at,
              p.id || e.entity_id,
              p.user_id || p.id || e.entity_id,
            ],
          );
          break;

        case "SETTINGS_CHANGED":
          run(
            "UPDATE business SET name=COALESCE(?,name),currency=COALESCE(?,currency),updated_at=? WHERE id=?",
            [
              p.name || null,
              p.currency || null,
              e.client_created_at,
              e.business_id,
            ],
          );
          break;

        // DEVICE_REGISTERED, DEVICE_REVOKED, BUSINESS_RESTORED, LOGIN carry
        // no materialized local state (mirrors the backend's own snapshot
        // fold — see snapshot_create_process in the backend repo) — they
        // just need to be marked processed below so they aren't re-applied.
      }
      run(
        "INSERT INTO processed_events(event_id,server_sequence,processed_at) VALUES(?,?,?)",
        [e.event_id, e.server_sequence, new Date().toISOString()],
      );
    }
  });
