export type Role='OWNER'|'EMPLOYEE'; export type PaymentMethod='Cash'|'Transfer'|'POS'|'Other';
export type EventType='PRODUCT_CREATED'|'PRODUCT_UPDATED'|'PRODUCT_DEACTIVATED'|'CATEGORY_CREATED'|'CUSTOMER_CREATED'|'CUSTOMER_UPDATED'|'SUPPLIER_CREATED'|'SUPPLIER_UPDATED'|'SALE_CREATED'|'SALE_CANCELLED'|'STOCK_PURCHASED'|'STOCK_ADJUSTED'|'STOCK_MISSING'|'STOCK_DAMAGED'|'CUSTOMER_RETURN'|'EXPENSE_CREATED'|'EXPENSE_DELETED'|'MEMBER_CREATED'|'MEMBER_DISABLED'|'MEMBER_PERMISSIONS_UPDATED'|'SETTINGS_CHANGED'|'DEVICE_REGISTERED'|'DEVICE_REVOKED'|'BUSINESS_RESTORED'|'LOGIN';
export interface Product{id:string;business_id:string;name:string;sku:string;barcode?:string|null;category_id?:string|null;supplier_id?:string|null;cost_price:number;selling_price:number;current_stock:number;minimum_stock:number;unit:string;active:number;created_at:string;updated_at:string}
export interface Category{id:string;business_id:string;name:string;created_at:string}
export interface Member{id:string;business_id:string;user_id:string;role:Role;full_name:string;email:string;phone?:string;active:number;permissions:string;created_at:string;updated_at:string}
export interface CartItem extends Product{quantity:number}
export interface SyncEvent{event_id:string;business_id:string;device_id:string;user_id:string;event_type:EventType;entity_id:string;payload:Record<string,unknown>;client_created_at:string}
