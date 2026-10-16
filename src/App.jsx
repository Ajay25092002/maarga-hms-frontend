import { Routes, Route, Navigate } from "react-router-dom";

import Login from "./Pages/Login";
import ForgotPassword from "./Pages/ForgotPassword";
import Dashboard from "./Pages/Dashboard";

import PatientRegistration from "./Pages/PatientRegistration";
import Patients from "./Pages/Patients";
import EditPatient from "./Pages/EditPatient";

import OPBills from "./Pages/OPBills";
import CreateOPBill from "./Pages/CreateOPBill";
import OPBillDetails from "./Pages/OPBillDetails";

import IPBills from "./Pages/IPBills";
import CreateIPBill from "./Pages/CreateIPBill";
import IPBillDetails from "./Pages/IPBillDetails";

import Payments from "./Pages/Payments";
import CreatePayment from "./Pages/CreatePayment";
import ReceiptDetails from "./Pages/ReceiptDetails";

import Roles from "./Pages/Roles";
import CreateRole from "./Pages/CreateRole";
import EditRole from "./Pages/EditRole";
import RoleDetails from "./Pages/RoleDetails";

import Users from "./Pages/Users";
import CreateUser from "./Pages/CreateUser";
import EditUser from "./Pages/EditUser";
import UserDetails from "./Pages/UserDetails";

import PricingManagement from "./Pages/PricingManagement";

import ProtectedRoute from "./Components/Common/ProtectedRoute";
import AccessDenied from "./Pages/AccessDenied";

import PaymentRefunds from "./Pages/PaymentRefunds";
import RecordPaymentRefund from "./Pages/RecordPaymentRefund";
import RefundDetails from "./Pages/RefundDetails";

export default function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/403" element={<AccessDenied />} />

      {/* Dashboard */}
      <Route
        path="/"
        element={
          <ProtectedRoute permission="dashboard.view">
            <Dashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/home"
        element={
          <ProtectedRoute permission="dashboard.view">
            <Dashboard />
          </ProtectedRoute>
        }
      />

      {/* Patient management */}
      <Route
        path="/patients"
        element={
          <ProtectedRoute permission={["patients.op.view", "patients.ip.view"]}>
            <Patients />
          </ProtectedRoute>
        }
      />

      <Route
        path="/patients/new"
        element={
          <ProtectedRoute
            permission={["patients.op.create", "patients.ip.create"]}
          >
            <PatientRegistration />
          </ProtectedRoute>
        }
      />

      <Route
        path="/patients/:patientId/edit"
        element={
          <ProtectedRoute permission={["patients.op.edit", "patients.ip.edit"]}>
            <EditPatient />
          </ProtectedRoute>
        }
      />

      {/* OP Billing */}
      <Route
        path="/op-billing"
        element={
          <ProtectedRoute permission="bills.op.view">
            <OPBills />
          </ProtectedRoute>
        }
      />

      <Route
        path="/op-billing/new"
        element={
          <ProtectedRoute permission="bills.op.create">
            <CreateOPBill />
          </ProtectedRoute>
        }
      />

      <Route
        path="/op-billing/:billId"
        element={
          <ProtectedRoute permission="bills.op.view">
            <OPBillDetails />
          </ProtectedRoute>
        }
      />

      {/* IP Billing */}
      <Route
        path="/ip-billing"
        element={
          <ProtectedRoute permission="bills.ip.view">
            <IPBills />
          </ProtectedRoute>
        }
      />

      <Route
        path="/ip-billing/new"
        element={
          <ProtectedRoute permission="bills.ip.create">
            <CreateIPBill />
          </ProtectedRoute>
        }
      />

      <Route
        path="/ip-billing/:billId"
        element={
          <ProtectedRoute permission="bills.ip.view">
            <IPBillDetails />
          </ProtectedRoute>
        }
      />

      {/* Payments and receipts */}
      <Route
        path="/payments"
        element={
          <ProtectedRoute permission="payments.view">
            <Payments />
          </ProtectedRoute>
        }
      />

      <Route
        path="/payments/new"
        element={
          <ProtectedRoute permission="payments.create">
            <CreatePayment />
          </ProtectedRoute>
        }
      />

      <Route
        path="/payments/receipts/:paymentId"
        element={
          <ProtectedRoute permission="payments.view">
            <ReceiptDetails />
          </ProtectedRoute>
        }
      />

      {/* Pricing Management */}
      <Route
        path="/settings/pricing"
        element={
          <ProtectedRoute permission="pricing.view">
            <PricingManagement />
          </ProtectedRoute>
        }
      />

      {/* Payment Refunds */}
      <Route
        path="/payment-refunds"
        element={
          <ProtectedRoute permission="refunds.view">
            <PaymentRefunds />
          </ProtectedRoute>
        }
      />

      <Route
        path="/payment-refunds/new"
        element={
          <ProtectedRoute permission="refunds.create">
            <RecordPaymentRefund />
          </ProtectedRoute>
        }
      />

      <Route
        path="/payment-refunds/:refundId"
        element={
          <ProtectedRoute permission="refunds.view">
            <RefundDetails />
          </ProtectedRoute>
        }
      />

      {/* Roles */}
      <Route
        path="/settings/roles"
        element={
          <ProtectedRoute permission="roles.view">
            <Roles />
          </ProtectedRoute>
        }
      />

      <Route
        path="/settings/roles/create"
        element={
          <ProtectedRoute permission="roles.create">
            <CreateRole />
          </ProtectedRoute>
        }
      />

      <Route
        path="/settings/roles/:roleId/edit"
        element={
          <ProtectedRoute permission="roles.edit">
            <EditRole />
          </ProtectedRoute>
        }
      />

      <Route
        path="/settings/roles/:roleId"
        element={
          <ProtectedRoute permission="roles.view">
            <RoleDetails />
          </ProtectedRoute>
        }
      />

      {/* Users */}
      <Route
        path="/settings/users"
        element={
          <ProtectedRoute permission="users.view">
            <Users />
          </ProtectedRoute>
        }
      />

      <Route
        path="/settings/users/create"
        element={
          <ProtectedRoute permission="users.create">
            <CreateUser />
          </ProtectedRoute>
        }
      />

      <Route
        path="/settings/users/:userId/edit"
        element={
          <ProtectedRoute permission="users.edit">
            <EditUser />
          </ProtectedRoute>
        }
      />

      <Route
        path="/settings/users/:userId"
        element={
          <ProtectedRoute permission="users.view">
            <UserDetails />
          </ProtectedRoute>
        }
      />

      {/* Unknown routes */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
