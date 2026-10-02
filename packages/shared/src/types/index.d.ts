export declare enum UserRole {
    ADMIN = "ADMIN",
    MANAGER = "MANAGER",
    SALES_STAFF = "SALES_STAFF",
    INVENTORY_STAFF = "INVENTORY_STAFF",
    ACCOUNTANT = "ACCOUNTANT"
}
export declare enum StockMovementType {
    IN = "IN",
    OUT = "OUT",
    ADJUSTMENT = "ADJUSTMENT"
}
export declare enum PurchaseStatus {
    PENDING = "PENDING",
    RECEIVED = "RECEIVED",
    PARTIALLY_PAID = "PARTIALLY_PAID",
    PAID = "PAID",
    CANCELLED = "CANCELLED"
}
export declare enum InvoiceStatus {
    PAID = "PAID",
    PARTIALLY_PAID = "PARTIALLY_PAID",
    UNPAID = "UNPAID",
    CANCELLED = "CANCELLED"
}
export declare enum PaymentMethod {
    CASH = "CASH",
    CARD = "CARD",
    BANK_TRANSFER = "BANK_TRANSFER",
    OTHER = "OTHER"
}
export declare enum PaymentStatus {
    PAID = "PAID",
    PARTIALLY_PAID = "PARTIALLY_PAID",
    UNPAID = "UNPAID"
}
export interface AuthUser {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: UserRole;
    businessId?: string;
}
export interface ApiResponse<T = any> {
    success: boolean;
    message?: string;
    data?: T;
    meta?: {
        total?: number;
        page?: number;
        limit?: number;
    };
}
