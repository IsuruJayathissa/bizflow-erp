"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentStatus = exports.PaymentMethod = exports.InvoiceStatus = exports.PurchaseStatus = exports.StockMovementType = exports.UserRole = void 0;
var UserRole;
(function (UserRole) {
    UserRole["ADMIN"] = "ADMIN";
    UserRole["MANAGER"] = "MANAGER";
    UserRole["SALES_STAFF"] = "SALES_STAFF";
    UserRole["INVENTORY_STAFF"] = "INVENTORY_STAFF";
    UserRole["ACCOUNTANT"] = "ACCOUNTANT";
})(UserRole || (exports.UserRole = UserRole = {}));
var StockMovementType;
(function (StockMovementType) {
    StockMovementType["IN"] = "IN";
    StockMovementType["OUT"] = "OUT";
    StockMovementType["ADJUSTMENT"] = "ADJUSTMENT";
})(StockMovementType || (exports.StockMovementType = StockMovementType = {}));
var PurchaseStatus;
(function (PurchaseStatus) {
    PurchaseStatus["PENDING"] = "PENDING";
    PurchaseStatus["RECEIVED"] = "RECEIVED";
    PurchaseStatus["PARTIALLY_PAID"] = "PARTIALLY_PAID";
    PurchaseStatus["PAID"] = "PAID";
    PurchaseStatus["CANCELLED"] = "CANCELLED";
})(PurchaseStatus || (exports.PurchaseStatus = PurchaseStatus = {}));
var InvoiceStatus;
(function (InvoiceStatus) {
    InvoiceStatus["PAID"] = "PAID";
    InvoiceStatus["PARTIALLY_PAID"] = "PARTIALLY_PAID";
    InvoiceStatus["UNPAID"] = "UNPAID";
    InvoiceStatus["CANCELLED"] = "CANCELLED";
})(InvoiceStatus || (exports.InvoiceStatus = InvoiceStatus = {}));
var PaymentMethod;
(function (PaymentMethod) {
    PaymentMethod["CASH"] = "CASH";
    PaymentMethod["CARD"] = "CARD";
    PaymentMethod["BANK_TRANSFER"] = "BANK_TRANSFER";
    PaymentMethod["OTHER"] = "OTHER";
})(PaymentMethod || (exports.PaymentMethod = PaymentMethod = {}));
var PaymentStatus;
(function (PaymentStatus) {
    PaymentStatus["PAID"] = "PAID";
    PaymentStatus["PARTIALLY_PAID"] = "PARTIALLY_PAID";
    PaymentStatus["UNPAID"] = "UNPAID";
})(PaymentStatus || (exports.PaymentStatus = PaymentStatus = {}));
