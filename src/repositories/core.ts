import { q, run, tx } from "../database/client";
import { uuid, now } from "../utils/id";
import { addEvent } from "../sync/outbox";
import { getCurrentUserId, getCurrentDeviceId } from "../services/session";

// NOTE ON EVENT PAYLOADS: every payload built here must match what
// sync/apply.ts expects for that event_type exactly — correct field names,
// correct JS types (numbers as numbers, not the raw strings that come out
// of text inputs; booleans as real booleans, not SQLite's 0/1), and the
// exact shape per event type. There's no server validating this anymore
// (Google Drive stores whatever JSON it's given), so a mismatch here
// fails silently on every *other* device instead of loudly on push — the
// backend, when there was one, used to reject a shape that apply.ts
// couldn't read; now apply.ts's shape assumptions are the only contract
// at all. Local SQLite writes are free to keep SQLite's own conventions
// (0/1 for booleans, "IN"/"OUT" for movement direction) since those never
// leave the device — only the addEvent() payload has to match apply.ts.

export function createProduct(
  p: any,
  user = getCurrentUserId(),
  device = getCurrentDeviceId(),
) {
  const t = now(),
    id = p.id || uuid(),
    b = q<any>("SELECT id FROM business LIMIT 1")[0].id;
  const costPrice = Number(p.cost_price) || 0;
  const sellingPrice = Number(p.selling_price) || 0;
  const currentStock = Number(p.current_stock) || 0;
  const minimumStock = Number(p.minimum_stock) || 0;
  const unit = p.unit || "pcs";
  const imageLocalUri = p.image_local_uri || null;
  return tx(() => {
    run(
      `INSERT INTO products(id,business_id,name,sku,barcode,category_id,supplier_id,cost_price,selling_price,current_stock,minimum_stock,unit,active,created_at,updated_at,image_local_uri,image_drive_id) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        id,
        b,
        p.name,
        p.sku,
        p.barcode || null,
        p.category_id || null,
        p.supplier_id || null,
        costPrice,
        sellingPrice,
        currentStock,
        minimumStock,
        unit,
        1,
        t,
        t,
        imageLocalUri,
        null,
      ],
    );
    addEvent({
      business_id: b,
      device_id: device,
      user_id: user,
      event_type: "PRODUCT_CREATED",
      entity_id: id,
      payload: {
        id,
        business_id: b,
        name: p.name,
        sku: p.sku || null,
        barcode: p.barcode || null,
        category_id: p.category_id || null,
        supplier_id: p.supplier_id || null,
        cost_price: costPrice,
        selling_price: sellingPrice,
        current_stock: currentStock,
        minimum_stock: minimumStock,
        unit,
        active: true,
        created_at: t,
        updated_at: t,
        // Uploaded lazily by the sync engine's photo sweep, which then
        // emits a follow-up PRODUCT_UPDATED once it has a real Drive id —
        // there's no id yet at creation time, a bare local file isn't.
        image_drive_id: null,
      },
    });
    run("INSERT INTO audit_events VALUES(?,?,?,?,?,?,?,?,?)", [
      uuid(),
      b,
      user,
      device,
      "Created product",
      "PRODUCT",
      id,
      JSON.stringify(p),
      t,
    ]);
    return id;
  });
}

export function updateProduct(
  id: string,
  p: any,
  user = getCurrentUserId(),
  device = getCurrentDeviceId(),
) {
  const t = now(),
    b = q<any>("SELECT id FROM business LIMIT 1")[0].id,
    existing = q<any>("SELECT * FROM products WHERE id=?", [id])[0];
  if (!existing) throw new Error(`Product ${id} not found`);
  const costPrice =
    p.cost_price !== undefined
      ? Number(p.cost_price) || 0
      : existing.cost_price;
  const sellingPrice =
    p.selling_price !== undefined
      ? Number(p.selling_price) || 0
      : existing.selling_price;
  const minimumStock =
    p.minimum_stock !== undefined
      ? Number(p.minimum_stock) || 0
      : existing.minimum_stock;
  const name = p.name ?? existing.name;
  const sku = p.sku ?? existing.sku;
  const unit = p.unit ?? existing.unit;
  const barcode = p.barcode ?? existing.barcode;
  const categoryId = p.category_id ?? existing.category_id;
  const supplierId = p.supplier_id ?? existing.supplier_id;
  // A new local photo clears image_drive_id (it needs re-uploading) unless
  // the caller explicitly passes one — the sync engine's photo sweep sets
  // image_drive_id itself once the upload finishes, going through this
  // same function with only that field set.
  const imageLocalUri =
    p.image_local_uri !== undefined
      ? p.image_local_uri
      : existing.image_local_uri;
  const imageDriveId =
    p.image_drive_id !== undefined
      ? p.image_drive_id
      : p.image_local_uri !== undefined
        ? null
        : existing.image_drive_id;
  return tx(() => {
    run(
      "UPDATE products SET name=?,sku=?,barcode=?,category_id=?,supplier_id=?,cost_price=?,selling_price=?,minimum_stock=?,unit=?,updated_at=?,image_local_uri=?,image_drive_id=? WHERE id=?",
      [
        name,
        sku,
        barcode || null,
        categoryId || null,
        supplierId || null,
        costPrice,
        sellingPrice,
        minimumStock,
        unit,
        t,
        imageLocalUri,
        imageDriveId,
        id,
      ],
    );
    addEvent({
      business_id: b,
      device_id: device,
      user_id: user,
      event_type: "PRODUCT_UPDATED",
      entity_id: id,
      payload: {
        id,
        business_id: b,
        name,
        sku: sku || null,
        barcode: barcode || null,
        category_id: categoryId || null,
        supplier_id: supplierId || null,
        cost_price: costPrice,
        selling_price: sellingPrice,
        current_stock: existing.current_stock,
        minimum_stock: minimumStock,
        unit,
        active: !!existing.active,
        created_at: existing.created_at,
        updated_at: t,
        image_drive_id: imageDriveId,
      },
    });
    run("INSERT INTO audit_events VALUES(?,?,?,?,?,?,?,?,?)", [
      uuid(),
      b,
      user,
      device,
      "Updated product",
      "PRODUCT",
      id,
      JSON.stringify(p),
      t,
    ]);
    return id;
  });
}

export function deactivateProduct(
  id: string,
  user = getCurrentUserId(),
  device = getCurrentDeviceId(),
) {
  const t = now(),
    b = q<any>("SELECT id FROM business LIMIT 1")[0].id;
  return tx(() => {
    run("UPDATE products SET active=0,updated_at=? WHERE id=?", [t, id]);
    addEvent({
      business_id: b,
      device_id: device,
      user_id: user,
      event_type: "PRODUCT_DEACTIVATED",
      entity_id: id,
      payload: { id },
    });
    run("INSERT INTO audit_events VALUES(?,?,?,?,?,?,?,?,?)", [
      uuid(),
      b,
      user,
      device,
      "Deactivated product",
      "PRODUCT",
      id,
      JSON.stringify({ id }),
      t,
    ]);
    return id;
  });
}

export function createSale(
  items: any[],
  method: string,
  user = getCurrentUserId(),
  device = getCurrentDeviceId(),
  customer_id?: string,
) {
  const t = now(),
    id = uuid(),
    eid = uuid(),
    b = q<any>("SELECT id FROM business LIMIT 1")[0].id,
    total = items.reduce((a, x) => a + x.quantity * x.selling_price, 0),
    receipt = `MD-${Date.now().toString().slice(-7)}`;
  return tx(() => {
    run("INSERT INTO sales VALUES(?,?,?,?,?,?,?,?,?,?,?)", [
      id,
      b,
      receipt,
      customer_id || null,
      user,
      device,
      total,
      total,
      method,
      t,
      0,
    ]);
    // §8.7 SALE_CREATED is a single event carrying { sale, items[] } — the
    // server rejects any other shape, so we build the whole items array up
    // front and emit exactly one event after the loop, instead of one
    // malformed event per line item.
    const eventItems: any[] = [];
    items.forEach((x) => {
      const old =
        q<any>("SELECT current_stock FROM products WHERE id=?", [x.id])[0]
          ?.current_stock || 0;
      const itemId = uuid();
      const movementId = uuid();
      const lineTotal = x.quantity * x.selling_price;
      run("INSERT INTO sale_items VALUES(?,?,?,?,?,?,?,?)", [
        itemId,
        id,
        x.id,
        x.name,
        x.quantity,
        x.selling_price,
        x.cost_price,
        lineTotal,
      ]);
      run("UPDATE products SET current_stock=?,updated_at=? WHERE id=?", [
        old - x.quantity,
        t,
        x.id,
      ]);
      run("INSERT INTO stock_movements VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)", [
        movementId,
        b,
        x.id,
        "SALE",
        "OUT",
        x.quantity,
        old,
        old - x.quantity,
        "Sale",
        receipt,
        user,
        device,
        eid,
        t,
      ]);
      eventItems.push({
        id: itemId,
        product_id: x.id,
        product_name: x.name,
        quantity: x.quantity,
        unit_price: x.selling_price,
        cost_price: x.cost_price,
        line_total: lineTotal,
        movement_id: movementId,
      });
    });
    addEvent({
      event_id: eid,
      business_id: b,
      device_id: device,
      user_id: user,
      event_type: "SALE_CREATED",
      entity_id: id,
      payload: {
        sale: {
          id,
          receipt_number: receipt,
          customer_id: customer_id || null,
          subtotal: total,
          total,
          payment_method: method,
          created_at: t,
        },
        items: eventItems,
      },
    });
    run("INSERT INTO audit_events VALUES(?,?,?,?,?,?,?,?,?)", [
      uuid(),
      b,
      user,
      device,
      "Completed sale",
      "SALE",
      id,
      JSON.stringify({ total, method }),
      t,
    ]);
    return { id, receipt, total };
  });
}

export function cancelSale(
  id: string,
  user = getCurrentUserId(),
  device = getCurrentDeviceId(),
) {
  const t = now(),
    b = q<any>("SELECT id FROM business LIMIT 1")[0].id,
    items = q<any>("SELECT * FROM sale_items WHERE sale_id=?", [id]);
  return tx(() => {
    run("UPDATE sales SET cancelled=1 WHERE id=?", [id]);
    items.forEach((x) => {
      const old =
        q<any>("SELECT current_stock FROM products WHERE id=?", [
          x.product_id,
        ])[0]?.current_stock || 0;
      run("UPDATE products SET current_stock=?,updated_at=? WHERE id=?", [
        old + x.quantity,
        t,
        x.product_id,
      ]);
      run("INSERT INTO stock_movements VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)", [
        uuid(),
        b,
        x.product_id,
        "CUSTOMER_RETURN",
        "IN",
        x.quantity,
        old,
        old + x.quantity,
        "Sale cancelled",
        "",
        user,
        device,
        null,
        t,
      ]);
    });
    addEvent({
      business_id: b,
      device_id: device,
      user_id: user,
      event_type: "SALE_CANCELLED",
      entity_id: id,
      payload: {
        id,
        items: items.map((x) => ({
          product_id: x.product_id,
          quantity: x.quantity,
        })),
      },
    });
    run("INSERT INTO audit_events VALUES(?,?,?,?,?,?,?,?,?)", [
      uuid(),
      b,
      user,
      device,
      "Cancelled sale",
      "SALE",
      id,
      JSON.stringify({ id }),
      t,
    ]);
    return id;
  });
}

export function movement(
  p: any,
  user = getCurrentUserId(),
  device = getCurrentDeviceId(),
) {
  const t = now(),
    b = q<any>("SELECT id FROM business LIMIT 1")[0].id,
    id = uuid(),
    prod = q<any>("SELECT * FROM products WHERE id=?", [p.product_id])[0];
  const qty = Number(p.quantity) || 0;
  // Local storage keeps the app's own "IN"/"OUT" convention; the sync
  // payload must use the backend's numeric 1|-1 convention (§8.7).
  const direction: "IN" | "OUT" = p.direction === "IN" ? "IN" : "OUT";
  const numericDirection = direction === "IN" ? 1 : -1;
  const delta = numericDirection * qty;
  // "RETURN" maps to the dedicated CUSTOMER_RETURN event type rather than
  // falling into the generic STOCK_ADJUSTED bucket — the backend folds
  // CUSTOMER_RETURN separately in its snapshot materialization.
  const eventType =
    p.type === "PURCHASE"
      ? "STOCK_PURCHASED"
      : p.type === "MISSING"
        ? "STOCK_MISSING"
        : p.type === "DAMAGED"
          ? "STOCK_DAMAGED"
          : p.type === "RETURN"
            ? "CUSTOMER_RETURN"
            : "STOCK_ADJUSTED"; // CORRECTION, OPENING, and anything else
  return tx(() => {
    const result = prod.current_stock + delta;
    run("UPDATE products SET current_stock=?,updated_at=? WHERE id=?", [
      result,
      t,
      prod.id,
    ]);
    const eid = addEvent({
      business_id: b,
      device_id: device,
      user_id: user,
      event_type: eventType,
      entity_id: id,
      payload: {
        movement_id: id,
        product_id: prod.id,
        direction: numericDirection,
        quantity: qty,
        reason: p.reason || null,
        note: p.note || null,
        created_at: t,
      },
    });
    run("INSERT INTO stock_movements VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)", [
      id,
      b,
      prod.id,
      p.type,
      direction,
      qty,
      prod.current_stock,
      result,
      p.reason || "",
      p.note || "",
      user,
      device,
      eid,
      t,
    ]);
    return id;
  });
}

export function createExpense(
  p: any,
  user = getCurrentUserId(),
  device = getCurrentDeviceId(),
) {
  const t = now(),
    b = q<any>("SELECT id FROM business LIMIT 1")[0].id,
    id = uuid();
  const amount = Number(p.amount) || 0;
  const date = p.date || t.slice(0, 10);
  return tx(() => {
    const eid = addEvent({
      business_id: b,
      device_id: device,
      user_id: user,
      event_type: "EXPENSE_CREATED",
      entity_id: id,
      payload: {
        id,
        description: p.description,
        amount,
        category: p.category,
        date,
        note: p.note || null,
        created_at: t,
      },
    });
    run("INSERT INTO expenses VALUES(?,?,?,?,?,?,?,?,?,?,?,?)", [
      id,
      b,
      p.description,
      amount,
      p.category,
      date,
      p.note || "",
      user,
      device,
      eid,
      t,
      0,
    ]);
    run("INSERT INTO audit_events VALUES(?,?,?,?,?,?,?,?,?)", [
      uuid(),
      b,
      user,
      device,
      "Created expense",
      "EXPENSE",
      id,
      JSON.stringify(p),
      t,
    ]);
    return id;
  });
}

export function deleteExpense(
  id: string,
  user = getCurrentUserId(),
  device = getCurrentDeviceId(),
) {
  const t = now(),
    b = q<any>("SELECT id FROM business LIMIT 1")[0].id;
  return tx(() => {
    run("UPDATE expenses SET deleted=1 WHERE id=?", [id]);
    addEvent({
      business_id: b,
      device_id: device,
      user_id: user,
      event_type: "EXPENSE_DELETED",
      entity_id: id,
      payload: { id },
    });
    run("INSERT INTO audit_events VALUES(?,?,?,?,?,?,?,?,?)", [
      uuid(),
      b,
      user,
      device,
      "Deleted expense",
      "EXPENSE",
      id,
      JSON.stringify({ id }),
      t,
    ]);
    return id;
  });
}

export const addCategory = (name: string) => {
  const t = now(),
    b = q<any>("SELECT id FROM business LIMIT 1")[0].id,
    id = uuid();
  tx(() => {
    run("INSERT INTO categories VALUES(?,?,?,?)", [id, b, name, t]);
    addEvent({
      business_id: b,
      device_id: getCurrentDeviceId(),
      user_id: getCurrentUserId(),
      event_type: "CATEGORY_CREATED",
      entity_id: id,
      payload: { id, name, created_at: t },
    });
  });
  return id;
};

export function createCustomer(
  p: any,
  user = getCurrentUserId(),
  device = getCurrentDeviceId(),
) {
  const t = now(),
    b = q<any>("SELECT id FROM business LIMIT 1")[0].id,
    id = uuid();
  return tx(() => {
    run("INSERT INTO customers VALUES(?,?,?,?,?,?,?)", [
      id,
      b,
      p.name,
      p.phone || "",
      p.notes || "",
      t,
      t,
    ]);
    addEvent({
      business_id: b,
      device_id: device,
      user_id: user,
      event_type: "CUSTOMER_CREATED",
      entity_id: id,
      payload: {
        id,
        name: p.name,
        phone: p.phone || null,
        notes: p.notes || null,
        created_at: t,
      },
    });
    return id;
  });
}

export function createMember(
  p: any,
  user = getCurrentUserId(),
  device = getCurrentDeviceId(),
) {
  const t = now(),
    b = q<any>("SELECT id FROM business LIMIT 1")[0].id,
    id = uuid(),
    userId = p.user_id || p.email || id;
  const permissions = p.permissions ?? { preset: p.preset || "cashier" };
  return tx(() => {
    run("INSERT INTO members VALUES(?,?,?,?,?,?,?,?,?,?,?)", [
      id,
      b,
      userId,
      "EMPLOYEE",
      p.full_name,
      p.email || "",
      p.phone || "",
      1,
      JSON.stringify(permissions),
      t,
      t,
    ]);
    addEvent({
      business_id: b,
      device_id: device,
      user_id: user,
      event_type: "MEMBER_CREATED",
      entity_id: id,
      payload: {
        id,
        user_id: userId,
        role: "EMPLOYEE",
        full_name: p.full_name,
        email: p.email || null,
        phone: p.phone || null,
        permissions,
      },
    });
    return id;
  });
}

export function createSupplier(
  p: any,
  user = getCurrentUserId(),
  device = getCurrentDeviceId(),
) {
  const t = now(),
    b = q<any>("SELECT id FROM business LIMIT 1")[0].id,
    id = uuid();
  return tx(() => {
    run("INSERT INTO suppliers VALUES(?,?,?,?,?,?,?)", [
      id,
      b,
      p.name,
      p.phone || "",
      p.address || "",
      p.notes || "",
      t,
      t,
    ]);
    addEvent({
      business_id: b,
      device_id: device,
      user_id: user,
      event_type: "SUPPLIER_CREATED",
      entity_id: id,
      payload: {
        id,
        name: p.name,
        phone: p.phone || null,
        address: p.address || null,
        notes: p.notes || null,
        created_at: t,
      },
    });
    return id;
  });
}
