import { Navigate, Route, Routes } from "react-router-dom";

/* =========================================================
AUTH / PUBLIC PAGES
========================================================= */

import Login from "../pages/Login";
import Register from "../pages/Register";
import ResetPassword from "../pages/ResetPassword";

/* =========================================================
USER / DASHBOARD
========================================================= */

import Dashboard from "../dashboard/Dashboard";
import MainLayout from "../layout/MainLayout";

import ProtectedRoute from "./ProtectedRoute";
import PublicRoute from "./PublicRoute";
import RoleRoute from "./RoleRoute";

/* =========================================================
LOAN PAGES
========================================================= */

import Loans from "../pages/Loans";
import LoanApplication from "../pages/LoanApplication";
import LoanApplications from "../pages/MyLoanApplications";
import LoanApplicationDetails from "../loan/LoanApplicationDetails";
import MyLoans from "../pages/MyLoans";
import LoanDetails from "../pages/LoanDetails";
import RepaymentMandatePage from "../pages/RepaymentMandatePage";
import LoanOffers from "../pages/LoanOffers";
import LoanOfferDetails from "../pages/LoanOfferDetails";
import RepaymentAccount from "../pages/RepaymentAccount";

/* =========================================================
CUSTOMER ACCOUNT / VERIFICATION
========================================================= */

import Profile from "../pages/Profile";
import Kyc from "../pages/Kyc";

/* =========================================================
MANDATES
========================================================= */

import MandateAuthorization from "../pages/MandateAuthorization";

/* =========================================================
REPAYMENTS
========================================================= */

import RepaymentSchedule from "../component/RepaymentSchedule";
import RepaymentHistory from "../pages/RepaymentHistory";
import MakeRepayment from "../pages/MakeRepayment";
import AutoDebit from "../pages/AutoDebit";
import AutoDebitHistory from "../pages/AutoDebitHistory";

import OnboardingRouter from "../component/OnboardingRouter";
import BankAccountStep from "../component/BankAccountStep";
/* =========================================================
ADMIN
========================================================= */

import AdminLayout from "../admin/AdminLayout";
import AdminDashboard from "../admin/AdminDashboard";
import AdminUsers from "../admin/AdminUsers";
import AdminLoans from "../admin/AdminLoans";
import AdminOffers from "../admin/AdminOffers";
import AdminMandates from "../admin/AdminMandates";
import AdminTransfers from "../admin/AdminTransfers";
import AdminLedger from "../admin/AdminLedger";
import AdminFraud from "../admin/AdminFraud";
import AdminAudit from "../admin/AdminAudit";
import AdminSettings from "../admin/AdminSettings";
import AdminLoanProducts from "../admin/AdminLoanProducts";
import AdminKyc from "../admin/AdminKyc";
import AdminKycDetail from "../admin/AdminKycDetail";
import AdminBankAccounts from "../admin/AdminBankAccounts";
import AdminLoanApplications from "../admin/AdminLoanApplications";
import AdminDisbursement from "../admin/AdminDisbursement";
import AdminDisbursementDetails from "../admin/AdminDisbursementDetails";
import AdminLoanApplicationDetails from "../admin/AdminLoanApplicationDetails";

/* =========================================================
ROLE CONFIGURATION
========================================================= */

const ADMIN_ROLES = [
"admin",
"super_admin",
"loan_officer",
"risk_officer",
"finance",
"support",
];

/* =========================================================
ROUTES
========================================================= */

function AppRoutes() {
return ( <Routes>
{/* =====================================================
PUBLIC ROUTES
===================================================== */}


  <Route element={<PublicRoute />}>
    <Route
      path="/login"
      element={<Login />}
    />

    <Route
      path="/register"
      element={<Register />}
    />

    <Route
      path="/resetpassword"
      element={<ResetPassword />}
    />

    <Route
      path="/resetpassword/:token"
      element={<ResetPassword />}
    />
  </Route>

  {/* =====================================================
      AUTHENTICATED CUSTOMER ROUTES
  ===================================================== */}

  <Route element={<ProtectedRoute />}>
    <Route element={<MainLayout />}>

      {/* =================================================
          DASHBOARD
      ================================================= */}

      <Route
        path="/dashboard"
        element={
          <OnboardingRouter>
            <Dashboard />
          </OnboardingRouter>
        }
      />

      {/* =================================================
          LOANS
      ================================================= */}

      <Route
        path="/loans"
        element={<Loans />}
      />

      <Route
        path="/loans/apply/:productId"
        element={<LoanApplication />}
      />

      <Route
        path="/loans/applications"
        element={<LoanApplications />}
      />

      <Route
        path="/loans/applications/:id"
        element={<LoanApplicationDetails />}
      />

        <Route 
        path="/bank-accounts"
        element={<BankAccountStep/>}
        />
      {/* =================================================
          CUSTOMER ACTUAL LOANS
      ================================================= */}

      <Route
        path="/my-loans"
        element={<MyLoans />}
      />

      <Route
        path="/my-loans/:id"
        element={<LoanDetails />}
      />

      {/* =================================================
          CUSTOMER PROFILE
      ================================================= */}

      <Route
        path="/profile"
        element={<Profile />}
      />

      {/* =================================================
          UNIFIED CUSTOMER KYC ONBOARDING
          
          Flow:
          
          Personal Information
                ↓
          Address & Identity
                ↓
          Bank Account
                ↓
          BVN Verification
                ↓
          Loan Onboarding
      ================================================= */}

      <Route
        path="/kyc"
        element={<Kyc />}
      />

      {/* =================================================
          REPAYMENT MANDATE
      ================================================= */}

      <Route
        path="/repayment-mandate"
        element={<RepaymentMandatePage />}
      />

      {/* =================================================
          LOAN OFFERS
      ================================================= */}

      <Route
        path="/loan-offers"
        element={<LoanOffers />}
      />

      <Route
        path="/loan-offers/:offerId"
        element={<LoanOfferDetails />}
      />

      {/* =================================================
          MANDATE AUTHORIZATION
      ================================================= */}

      <Route
        path="/mandates/callback/:reference"
        element={<MandateAuthorization />}
      />

      <Route
        path="/mandates/callback"
        element={<MandateAuthorization />}
      />

      <Route
        path="/mandate/authorize/:reference"
        element={<MandateAuthorization />}
      />

      {/* =================================================
          REPAYMENT SCHEDULE
      ================================================= */}

      <Route
        path="/loans/repayments/:repaymentScheduleId"
        element={<RepaymentSchedule />}
      />

      {/* =================================================
          REPAYMENT ACCOUNT / DVA
      ================================================= */}

      <Route
        path="/repayment-account"
        element={<RepaymentAccount />}
      />

      {/* =================================================
          MAKE REPAYMENT
      ================================================= */}

      <Route
        path="/loans/repayments/pay/:repaymentScheduleId"
        element={<MakeRepayment />}
      />

      {/* =================================================
          REPAYMENT HISTORY
      ================================================= */}

      <Route
        path="/loans/repayments/history"
        element={<RepaymentHistory />}
      />

      {/* =================================================
          AUTO-DEBIT
      ================================================= */}

      <Route
        path="/repayments/auto-debit"
        element={<AutoDebit />}
      />

      <Route
        path="/repayments/auto-debit/history"
        element={<AutoDebitHistory />}
      />

      {/* =================================================
          UNKNOWN CUSTOMER ROUTES
      ================================================= */}

      <Route
        path="*"
        element={
          <Navigate
            to="/dashboard"
            replace
          />
        }
      />

    </Route>
  </Route>

  {/* =====================================================
      ADMIN / STAFF ROUTES
  ===================================================== */}

  <Route element={<ProtectedRoute />}>
    <Route
      element={
        <RoleRoute
          allowedRoles={[...ADMIN_ROLES]}
        />
      }
    >
      <Route
        path="/admin"
        element={<AdminLayout />}
      >

        {/* =============================================
            ADMIN DASHBOARD
        ============================================= */}

        <Route
          index
          element={<AdminDashboard />}
        />

        {/* =============================================
            USERS
        ============================================= */}

        <Route
          path="users"
          element={<AdminUsers />}
        />

        {/* =============================================
            LOANS
        ============================================= */}

        <Route
          path="loans"
          element={<AdminLoans />}
        />

        {/* =============================================
            LOAN OFFERS
        ============================================= */}

        <Route
          path="offers"
          element={<AdminOffers />}
        />

        {/* =============================================
            MANDATES
        ============================================= */}

        <Route
          path="mandates"
          element={<AdminMandates />}
        />

        {/* =============================================
            TRANSFERS
        ============================================= */}

        <Route
          path="transfers"
          element={<AdminTransfers />}
        />

        {/* =============================================
            LEDGER
        ============================================= */}

        <Route
          path="ledger"
          element={<AdminLedger />}
        />

        {/* =============================================
            FRAUD / RISK
        ============================================= */}

        <Route
          path="fraud"
          element={<AdminFraud />}
        />

        {/* =============================================
            AUDIT LOGS
        ============================================= */}

        <Route
          path="audit"
          element={<AdminAudit />}
        />

        {/* =============================================
            LOAN PRODUCTS
        ============================================= */}

        <Route
          path="loan-products"
          element={<AdminLoanProducts />}
        />

        {/* =============================================
            LOAN APPLICATIONS
        ============================================= */}

        <Route
          path="loan-applications"
          element={<AdminLoanApplications />}
        />

        <Route
          path="loan-applications/:applicationId"
          element={<AdminLoanApplicationDetails />}
        />

        {/* =============================================
            KYC
        ============================================= */}

        <Route
          path="kyc"
          element={<AdminKyc />}
        />

        <Route
          path="kyc/:id"
          element={<AdminKycDetail />}
        />

        {/* =============================================
            BANK ACCOUNT VERIFICATION
        ============================================= */}

        <Route
          path="bank-accounts"
          element={<AdminBankAccounts />}
        />

        {/* =============================================
            DISBURSEMENTS
        ============================================= */}

        <Route
          path="disbursements"
          element={<AdminDisbursement />}
        />

        <Route
          path="disbursements/:disbursementId"
          element={<AdminDisbursementDetails />}
        />

        {/* =============================================
            SETTINGS
        ============================================= */}

        <Route
          path="settings"
          element={<AdminSettings />}
        />

      </Route>
    </Route>
  </Route>

  {/* =====================================================
      ROOT
  ===================================================== */}

  <Route
    path="/"
    element={
      <Navigate
        to="/dashboard"
        replace
      />
    }
  />

  {/* =====================================================
      GLOBAL UNKNOWN ROUTES
  ===================================================== */}

  <Route
    path="*"
    element={
      <Navigate
        to="/dashboard"
        replace
      />
    }
  />
</Routes>


);
}

export default AppRoutes;
