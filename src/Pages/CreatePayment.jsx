import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Wallet } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import AppSidebar from "../Components/Layout/AppSidebar";
import TopNavbar from "../Components/Layout/TopNavbar";
import { useTheme } from "../Context/ThemeContext";
import PaymentForm from "../Components/Payments/PaymentForm";
import { paymentService } from "../Services/paymentService";
import { getBillBalance, getErrorMessage, normalizeList, todayInputValue } from "../Components/Payments/paymentUtils";

export default function CreatePayment() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { theme } = useTheme();
  const dark = theme === "dark";
  const [bills, setBills] = useState([]);
  const [billsLoading, setBillsLoading] = useState(true);
  const [billsError, setBillsError] = useState("");
  const [billQuery, setBillQuery] = useState("");
  const [selectedBill, setSelectedBill] = useState(null);
  const [amount, setAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(todayInputValue());
  const [paymentMethod, setPaymentMethod] = useState("");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");



  const loadBills = useCallback(async () => {
  setBillsLoading(true);
  setBillsError("");

  try {
    const payload = await paymentService.listBills({
      page: 1,
      page_size: 5,
      search: billQuery.trim() || undefined,
    });

    const rows = normalizeList(payload);

    setBills(
      rows
        .filter((bill) => getBillBalance(bill) > 0)
        .slice(0, 5)
    );
  } catch (err) {
    setBills([]);
    setBillsError(getErrorMessage(err, "Unable to load bills."));
  } finally {
    setBillsLoading(false);
  }
}, [billQuery]);

  useEffect(() => {
    const timer = window.setTimeout(loadBills, billQuery ? 250 : 0);
    return () => window.clearTimeout(timer);
  }, [loadBills, billQuery]);

  useEffect(() => {
    const billId = searchParams.get("bill_id");
    if (!billId) return;
    let active = true;
    paymentService.getBill(billId).then((bill) => {
      if (active) {
        setSelectedBill(bill);
        setBills((current) => current.some((item) => String(item.id) === String(bill.id)) ? current : [bill, ...current]);
      }
    }).catch((err) => {
      if (active) setError(getErrorMessage(err, "Unable to load the selected bill."));
    });
    return () => { active = false; };
  }, [searchParams]);

  const selectBill = async (bill) => {
    setError("");
    try {
      const fullBill = await paymentService.getBill(bill.id);
      setSelectedBill(fullBill);
      setAmount("");
    } catch (err) {
      setError(getErrorMessage(err, "Unable to load bill details."));
    }
  };

  const submitPayment = async (event) => {
    event.preventDefault();
    setError("");
    if (!selectedBill) {
      setError("Select an existing bill before recording a payment.");
      return;
    }
    const numericAmount = Number(amount);
    const balance = getBillBalance(selectedBill);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setError("Enter a payment amount greater than zero.");
      return;
    }
    if (numericAmount > balance) {
      setError("Payment amount cannot exceed the current outstanding balance.");
      return;
    }
    if (!paymentMethod) {
      setError("Select a payment mode.");
      return;
    }

    setSubmitting(true);
    try {
      const payment = await paymentService.createPayment(selectedBill.id, {
        amount: Number(numericAmount.toFixed(2)),
        payment_date: new Date(`${paymentDate}T12:00:00`).toISOString(),
        payment_method: paymentMethod,
        reference_number: referenceNumber.trim() || null,
        notes: notes.trim() || null,
      });
      const paymentId = payment?.id ?? payment?.payment_id;
      if (paymentId) {
        navigate(`/payments/receipts/${paymentId}`, { replace: true });
      } else {
        navigate("/payments", { replace: true, state: { notice: "Payment recorded. The API did not return a payment ID, so open the payment list to view it." } });
      }
    } catch (err) {
      setError(getErrorMessage(err, "Unable to record payment."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={`min-h-screen min-w-0 ${dark ? "bg-[#11121F]" : "bg-[#F6F6FC]"}`}>
      <AppSidebar />
      <div className="min-h-screen min-w-0 md:ml-[72px] lg:ml-[260px]">
        <TopNavbar title="Create Payment" breadcrumb={["Hospital Management", "Billing", "Payments", "Create Payment"]}/>
        <main className="min-w-0 space-y-5 px-4 py-5 sm:px-5 lg:px-6">
          <div className="flex items-start gap-3">
            <button type="button" onClick={() => navigate("/payments")} aria-label="Back to payments" className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${dark ? "border-slate-700 text-slate-200" : "border-slate-200 bg-white text-slate-700"}`}><ArrowLeft size={17}/></button>
            <div className="min-w-0"><h1 className={`text-xl font-bold ${dark ? "text-slate-100" : "text-slate-900"}`}>Create Payment</h1><p className={`mt-1 text-sm ${dark ? "text-slate-400" : "text-slate-500"}`}>Record money received against an existing bill. Payment records cannot be edited from this screen.</p></div>
          </div>
          <PaymentForm
            bills={bills} billsLoading={billsLoading} billsError={billsError}
            selectedBill={selectedBill} onSelectBill={selectBill}
            billQuery={billQuery} onBillQueryChange={setBillQuery}
            amount={amount} onAmountChange={setAmount}
            paymentDate={paymentDate} onPaymentDateChange={setPaymentDate}
            paymentMethod={paymentMethod} onPaymentMethodChange={setPaymentMethod}
            referenceNumber={referenceNumber} onReferenceNumberChange={setReferenceNumber}
            notes={notes} onNotesChange={setNotes}
            submitting={submitting} error={error} onSubmit={submitPayment}
            onCancel={() => navigate("/payments")} dark={dark}
          />
        </main>
      </div>
    </div>
  );
}
