import React, { useRef, useState } from "react";
import {
  X,
  Download,
  Printer,
  FileCheck,
  Building2,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  CreditCard,
} from "lucide-react";
import { numberToWordsIndian, maskAccountNumber, getOrdinal } from "../utilities/salaryUtils";
import { toast } from "sonner";

export default function PayslipModal({
  selectedPayslip,
  employeeDetails,
  onClose,
}) {
  const [isDownloading, setIsDownloading] = useState(false);
  const printableRef = useRef(null);

  if (!selectedPayslip) return null;

  // Extract date information
  const monthStr = selectedPayslip.month || new Date().toISOString().slice(0, 7);
  const [yearPart, monthPart] = monthStr.split("-");
  const year = parseInt(yearPart, 10);
  const monthIndex = parseInt(monthPart, 10) - 1;

  const dateObj = new Date(year, monthIndex, 1);
  const monthName = dateObj.toLocaleDateString("en-US", { month: "long" });
  const monthYearFormatted = `${monthName} ${year}`;

  // Calculate days in month for Pay Period
  const lastDayOfMonth = new Date(year, monthIndex + 1, 0).getDate();
  const payPeriodFormatted = `01 ${monthName} ${year} - ${lastDayOfMonth} ${monthName} ${year}`;

  // Payment Date: typically 5th of next month
  const nextMonthDate = new Date(year, monthIndex + 1, 5);
  const nextMonthName = nextMonthDate.toLocaleDateString("en-US", { month: "long" });
  const paymentDateFormatted = `5th ${nextMonthName} ${nextMonthDate.getFullYear()}`;

  // Joining date formatting
  const rawJoiningDate = employeeDetails?.dateOfJoining || selectedPayslip.dateOfJoining;
  let joiningDateFormatted = "01 August 2025";
  if (rawJoiningDate) {
    try {
      const jd = new Date(rawJoiningDate);
      if (!isNaN(jd.getTime())) {
        const dayStr = String(jd.getDate()).padStart(2, "0");
        const monthFull = jd.toLocaleDateString("en-US", { month: "long" });
        joiningDateFormatted = `${dayStr} ${monthFull} ${jd.getFullYear()}`;
      }
    } catch (e) {
      joiningDateFormatted = "01 August 2025";
    }
  }

  // Employee details
  const employeeName =
    selectedPayslip.employeeName ||
    `${employeeDetails?.firstName || ""} ${employeeDetails?.lastName || ""}`.trim() ||
    "Dr. N. Dheepa";
  const employeeId = selectedPayslip.employeeEID || employeeDetails?.employeeId || "EPC0132025";
  const designation =
    employeeDetails?.designation ||
    selectedPayslip.employeeDesignation ||
    "Senior Physiotherapist";
  const department =
    employeeDetails?.department ||
    selectedPayslip.employeeDepartment ||
    "Physiotherapy & Rehabilitation";

  // Attendance stats
  const totalWorkingDays = selectedPayslip.totalWorkingDays || 26;
  const actualWorkingDays =
    selectedPayslip.actualWorkingDays !== undefined
      ? selectedPayslip.actualWorkingDays
      : 24;
  const unpaidLeaves = selectedPayslip.unpaidLeavesCount || 0;
  const presenceDays = actualWorkingDays;
  const absentDays =
    selectedPayslip.absentDays !== undefined
      ? selectedPayslip.absentDays
      : unpaidLeaves > 0
      ? unpaidLeaves
      : Math.max(0, totalWorkingDays - actualWorkingDays);
  const lateDays = selectedPayslip.lateDays || 0;
  const paidDays =
    selectedPayslip.paidDays !== undefined
      ? selectedPayslip.paidDays
      : Math.max(0, totalWorkingDays - absentDays);

  // Earnings
  const basicSalary = Number(selectedPayslip.basicSalary) || 20000;
  const homeRehabIncentives =
    Number(selectedPayslip.homeRehabIncentives) ||
    Number(selectedPayslip.incentives) ||
    0;
  const fuelAllowance =
    Number(selectedPayslip.fuelAllowance) ||
    Number(selectedPayslip.travelAllowance) ||
    0;
  const otherIncentives =
    Number(selectedPayslip.otherIncentives) ||
    Number(selectedPayslip.performanceBonus) ||
    0;
  const sundayPostings =
    Number(selectedPayslip.sundayPostings) ||
    Number(selectedPayslip.specialAllowances) ||
    0;
  const sundayHomeRehab =
    Number(selectedPayslip.sundayHomeRehab) ||
    Number(selectedPayslip.otherAdditionalPayments) ||
    0;
  const overtimePay = Number(selectedPayslip.overtimePay) || 0;

  const grossEarnings =
    basicSalary +
    homeRehabIncentives +
    fuelAllowance +
    otherIncentives +
    sundayPostings +
    sundayHomeRehab +
    overtimePay;

  // Deductions
  const leaveDeductions = Number(selectedPayslip.leaveDeductions) || 0;
  const lateComingDeductions = Number(selectedPayslip.lateComingDeductions) || 0;
  const otherDeductions = Number(selectedPayslip.otherDeductions) || 0;
  const totalDeductions = leaveDeductions + lateComingDeductions + otherDeductions;

  // Net Pay
  const netPay =
    selectedPayslip.payableSalary !== undefined
      ? Number(selectedPayslip.payableSalary)
      : Math.max(0, grossEarnings - totalDeductions);

  const netPayInWords = numberToWordsIndian(netPay);

  // Bank Info
  const bankName = employeeDetails?.bankDetails?.bankName || "Axis Bank";
  const rawAcc = employeeDetails?.bankDetails?.accountNumber;
  const accountNumber = rawAcc ? maskAccountNumber(rawAcc) : "XXXX XXXX XXXX 827";
  const ifscCode = employeeDetails?.bankDetails?.ifscCode || "UTIB0000801";

  // PDF Download Handler using html2pdf.js
  const handleDownloadPDF = async () => {
    if (!printableRef.current) return;
    setIsDownloading(true);
    toast.info("Preparing PDF download...");

    try {
      const html2pdfModule = await import("html2pdf.js");
      const html2pdf = html2pdfModule.default || html2pdfModule;

      const element = printableRef.current;
      const sanitizedName = employeeName.replace(/[^a-zA-Z0-9]/g, "_");
      const filename = `Payslip_${sanitizedName}_${monthStr}.pdf`;

      const opt = {
        margin: [6, 6, 6, 6],
        filename: filename,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: {
          scale: 2.5,
          useCORS: true,
          logging: false,
          scrollY: 0,
        },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      };

      await html2pdf().set(opt).from(element).save();
      toast.success("Payslip PDF downloaded successfully!");
    } catch (err) {
      console.error("PDF generation failed:", err);
      toast.error("Failed to generate PDF directly. Opening print dialog...");
      window.print();
    } finally {
      setIsDownloading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const formatCurr = (amount) => {
    if (amount === 0 || !amount) return "-";
    return Number(amount).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4 overflow-y-auto print:p-0 print:bg-white print:static">
      <div className="bg-white rounded-2xl md:rounded-3xl border border-slate-200 shadow-2xl w-full max-w-4xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-auto print:border-none print:shadow-none print:w-full print:max-w-none print:rounded-none">
        {/* Top Control Action Bar (Hidden in Print) */}
        <div className="px-5 py-3.5 bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border-b border-slate-800 flex items-center justify-between text-white no-print">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#588b12]/20 border border-[#588b12]/40 flex items-center justify-center text-[#7cc21e]">
              <FileCheck className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-white">
                  Salary Pay Slip
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-[#588b12]/20 text-[#86efac] border border-[#588b12]/40">
                  {selectedPayslip.status || "Paid"}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Statement for {monthYearFormatted} • {employeeName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Download PDF Button */}
            <button
              type="button"
              onClick={handleDownloadPDF}
              disabled={isDownloading}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#588b12] hover:bg-[#48730e] text-white text-xs font-bold transition-all shadow-sm cursor-pointer disabled:opacity-50"
              title="Download Payslip as PDF"
            >
              <Download className="w-3.5 h-3.5" />
              {isDownloading ? "Generating PDF..." : "Download PDF"}
            </button>

            {/* Print Button */}
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition-all cursor-pointer"
              title="Print or Save via Browser Dialog"
            >
              <Printer className="w-3.5 h-3.5" />
              Print
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors ml-1 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Payslip Document Preview Container */}
        <div className="p-3 md:p-6 bg-slate-100 overflow-y-auto max-h-[calc(88vh-60px)] print:p-0 print:bg-white print:max-h-none">
          <div
            id="payslip-printable-document"
            ref={printableRef}
            className="bg-white mx-auto shadow-sm border border-slate-300 p-6 md:p-8 text-slate-900 font-sans max-w-[800px] print:shadow-none print:border-none print:p-4 print:max-w-full"
            style={{ minHeight: "1050px" }}
          >
            {/* 1. Header Section */}
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pb-4 border-b-2 border-slate-900">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-md bg-[#588b12] text-white flex items-center justify-center font-black text-sm">
                    EP
                  </div>
                  <h1 className="text-lg md:text-xl font-black text-slate-900 uppercase tracking-tight font-serif">
                    ELROI PHYSIO CARE &amp; REHABILITATION CENTRE
                  </h1>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 text-xs font-bold text-slate-600">
                  <span className="font-mono">Reg No: PY3463501326</span>
                  <span className="text-slate-400">•</span>
                  <span className="text-[11px] font-normal text-slate-500">
                    5, Vaanidhaasan St, Kamaraj Nagar, Puducherry - 605011
                  </span>
                </div>
              </div>

              <div className="text-left sm:text-right w-full sm:w-auto">
                <h2 className="text-lg md:text-xl font-black text-slate-900 uppercase tracking-wider font-serif">
                  SALARY SLIP
                </h2>
                <p className="text-sm font-extrabold text-slate-800 mt-0.5">
                  {monthYearFormatted}
                </p>
                <div className="mt-1">
                  <span className="inline-block px-2 py-0.5 rounded text-[9px] font-black uppercase bg-slate-100 text-slate-700 border border-slate-300">
                    Verified Statement
                  </span>
                </div>
              </div>
            </div>

            {/* 2. Employee Details & Pay Period Grid (Replicating the printed layout) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1.5 py-4 text-xs border-b border-slate-300">
              {/* Left Column */}
              <div className="space-y-1.5">
                <div className="flex">
                  <span className="w-36 font-bold text-slate-700">Employee Name</span>
                  <span className="font-bold text-slate-900">: {employeeName}</span>
                </div>
                <div className="flex">
                  <span className="w-36 font-bold text-slate-700">Employee ID</span>
                  <span className="font-bold text-slate-900 font-mono">: {employeeId}</span>
                </div>
                <div className="flex">
                  <span className="w-36 font-bold text-slate-700">Designation</span>
                  <span className="font-semibold text-slate-900">: {designation}</span>
                </div>
                <div className="flex">
                  <span className="w-36 font-bold text-slate-700">Department</span>
                  <span className="font-semibold text-slate-900">: {department}</span>
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-1.5">
                <div className="flex">
                  <span className="w-44 font-bold text-slate-700">Date of joining</span>
                  <span className="font-semibold text-slate-900">: {joiningDateFormatted}</span>
                </div>
                <div className="flex">
                  <span className="w-44 font-bold text-slate-700">Pay Period</span>
                  <span className="font-semibold text-slate-900">: {payPeriodFormatted}</span>
                </div>
                <div className="flex">
                  <span className="w-44 font-bold text-slate-700">Working days in Month</span>
                  <span className="font-bold text-slate-900">: {totalWorkingDays}</span>
                </div>
                <div className="flex">
                  <span className="w-44 font-bold text-slate-700">Paid days</span>
                  <span className="font-bold text-slate-900">: {paidDays}</span>
                </div>
              </div>
            </div>

            {/* 3. Attendance Summary Box */}
            <div className="my-4">
              <h4 className="text-center font-black text-xs uppercase tracking-widest text-slate-800 mb-2">
                ATTENDANCE SUMMARY
              </h4>
              <div className="border border-slate-900 overflow-hidden text-center text-xs">
                <div className="grid grid-cols-3 bg-slate-50 border-b border-slate-900 font-black text-slate-800 py-1.5 tracking-wider uppercase text-[11px]">
                  <div className="border-r border-slate-900">PRESENCE DAYS</div>
                  <div className="border-r border-slate-900">ABSENT DAYS</div>
                  <div>LATE DAYS</div>
                </div>
                <div className="grid grid-cols-3 font-extrabold text-slate-900 py-1.5 text-sm bg-white">
                  <div className="border-r border-slate-900">{presenceDays}</div>
                  <div className="border-r border-slate-900 text-rose-700">{absentDays}</div>
                  <div>{lateDays}</div>
                </div>
              </div>
            </div>

            {/* 4. Earnings & Deductions Tables (Two-column exact side-by-side grid) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 my-4">
              {/* Left Column: Earnings */}
              <div className="border border-slate-900 flex flex-col justify-between">
                <div>
                  <div className="bg-slate-100 border-b border-slate-900 py-1.5 text-center font-black text-xs tracking-wider uppercase text-slate-900">
                    EARNINGS
                  </div>
                  <div className="grid grid-cols-[1fr_90px] border-b border-slate-900 font-bold text-[11px] px-2.5 py-1 bg-slate-50 text-slate-700">
                    <span>Particulars</span>
                    <span className="text-right">Amount</span>
                  </div>

                  <div className="divide-y divide-slate-200 text-xs">
                    <div className="grid grid-cols-[1fr_90px] px-2.5 py-1.5">
                      <span className="font-medium text-slate-800">Basic Salary</span>
                      <span className="text-right font-semibold text-slate-900 font-mono">
                        {basicSalary ? formatCurr(basicSalary) : "20,000.00"}
                      </span>
                    </div>
                    <div className="grid grid-cols-[1fr_90px] px-2.5 py-1.5">
                      <span className="font-medium text-slate-800">Home Rehab incentives</span>
                      <span className="text-right font-semibold text-slate-900 font-mono">
                        {homeRehabIncentives ? formatCurr(homeRehabIncentives) : "-"}
                      </span>
                    </div>
                    <div className="grid grid-cols-[1fr_90px] px-2.5 py-1.5">
                      <span className="font-medium text-slate-800">Fuel Allowances</span>
                      <span className="text-right font-semibold text-slate-900 font-mono">
                        {fuelAllowance ? formatCurr(fuelAllowance) : "-"}
                      </span>
                    </div>
                    <div className="grid grid-cols-[1fr_90px] px-2.5 py-1.5">
                      <span className="font-medium text-slate-800">Other Incentives</span>
                      <span className="text-right font-semibold text-slate-900 font-mono">
                        {otherIncentives ? formatCurr(otherIncentives) : "-"}
                      </span>
                    </div>
                    <div className="grid grid-cols-[1fr_90px] px-2.5 py-1.5">
                      <span className="font-medium text-slate-800">Sunday Postings</span>
                      <span className="text-right font-semibold text-slate-900 font-mono">
                        {sundayPostings ? formatCurr(sundayPostings) : "-"}
                      </span>
                    </div>
                    <div className="grid grid-cols-[1fr_90px] px-2.5 py-1.5">
                      <span className="font-medium text-slate-800">Sunday Home Rehab</span>
                      <span className="text-right font-semibold text-slate-900 font-mono">
                        {sundayHomeRehab ? formatCurr(sundayHomeRehab) : "-"}
                      </span>
                    </div>
                    <div className="grid grid-cols-[1fr_90px] px-2.5 py-1.5">
                      <span className="font-medium text-slate-800">Overtime</span>
                      <span className="text-right font-semibold text-slate-900 font-mono">
                        {overtimePay ? formatCurr(overtimePay) : "-"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-[1fr_100px] border-t-2 border-slate-900 px-2.5 py-2 font-black text-xs bg-slate-50">
                  <span className="uppercase tracking-wider text-slate-900">GROSS EARNINGS</span>
                  <span className="text-right text-slate-900 font-mono text-sm">
                    {formatCurr(grossEarnings)}
                  </span>
                </div>
              </div>

              {/* Right Column: Deductions */}
              <div className="border border-slate-900 flex flex-col justify-between">
                <div>
                  <div className="bg-slate-100 border-b border-slate-900 py-1.5 text-center font-black text-xs tracking-wider uppercase text-slate-900">
                    DEDUCTIONS
                  </div>
                  <div className="grid grid-cols-[1fr_90px] border-b border-slate-900 font-bold text-[11px] px-2.5 py-1 bg-slate-50 text-slate-700">
                    <span>Particulars</span>
                    <span className="text-right">Amount</span>
                  </div>

                  <div className="divide-y divide-slate-200 text-xs">
                    <div className="grid grid-cols-[1fr_90px] px-2.5 py-1.5">
                      <span className="font-medium text-slate-800">Leave Deductions</span>
                      <span className="text-right font-semibold text-rose-700 font-mono">
                        {leaveDeductions ? formatCurr(leaveDeductions) : "-"}
                      </span>
                    </div>
                    <div className="grid grid-cols-[1fr_90px] px-2.5 py-1.5">
                      <span className="font-medium text-slate-800">Late Coming Deductions</span>
                      <span className="text-right font-semibold text-rose-700 font-mono">
                        {lateComingDeductions ? formatCurr(lateComingDeductions) : "-"}
                      </span>
                    </div>
                    <div className="grid grid-cols-[1fr_90px] px-2.5 py-1.5">
                      <span className="font-medium text-slate-800">Other Deductions</span>
                      <span className="text-right font-semibold text-rose-700 font-mono">
                        {otherDeductions ? formatCurr(otherDeductions) : "-"}
                      </span>
                    </div>
                    {/* Empty placeholder rows to visually align height with earnings table */}
                    <div className="grid grid-cols-[1fr_90px] px-2.5 py-1.5 opacity-0 select-none">
                      <span>-</span>
                      <span className="text-right">-</span>
                    </div>
                    <div className="grid grid-cols-[1fr_90px] px-2.5 py-1.5 opacity-0 select-none">
                      <span>-</span>
                      <span className="text-right">-</span>
                    </div>
                    <div className="grid grid-cols-[1fr_90px] px-2.5 py-1.5 opacity-0 select-none">
                      <span>-</span>
                      <span className="text-right">-</span>
                    </div>
                    <div className="grid grid-cols-[1fr_90px] px-2.5 py-1.5 opacity-0 select-none">
                      <span>-</span>
                      <span className="text-right">-</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-[1fr_100px] border-t-2 border-slate-900 px-2.5 py-2 font-black text-xs bg-slate-50">
                  <span className="uppercase tracking-wider text-slate-900">TOTAL DEDUCTIONS</span>
                  <span className="text-right text-rose-700 font-mono text-sm">
                    {formatCurr(totalDeductions)}
                  </span>
                </div>
              </div>
            </div>

            {/* 5. Net Pay & Words Banner */}
            <div className="my-5 p-3.5 border-2 border-slate-900 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-baseline gap-3">
                <span className="font-black text-sm tracking-wider uppercase text-slate-900">
                  NET PAY
                </span>
                <span className="text-xl md:text-2xl font-black text-slate-900 font-mono">
                  ₹{Number(netPay).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="text-xs font-bold text-slate-700 italic">
                {netPayInWords}
              </div>
            </div>

            {/* 6. Payment Details & Official Clinic Stamp */}
            <div className="border border-slate-900 my-4 p-3 relative overflow-hidden bg-white">
              <div className="text-center font-black text-xs uppercase tracking-widest text-slate-800 border-b border-slate-300 pb-1 mb-2.5">
                PAYMENT DETAILS
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Bank Fields */}
                <div className="space-y-1.5 text-xs">
                  <div className="flex">
                    <span className="w-28 font-bold text-slate-700">Bank Name</span>
                    <span className="font-bold text-slate-900">: {bankName}</span>
                  </div>
                  <div className="flex">
                    <span className="w-28 font-bold text-slate-700">Account No.</span>
                    <span className="font-bold text-slate-900 font-mono">: {accountNumber}</span>
                  </div>
                  <div className="flex">
                    <span className="w-28 font-bold text-slate-700">IFSC CODE</span>
                    <span className="font-bold text-slate-900 font-mono">: {ifscCode}</span>
                  </div>
                  <div className="flex">
                    <span className="w-28 font-bold text-slate-700">Payment Date</span>
                    <span className="font-bold text-slate-900">: {paymentDateFormatted}</span>
                  </div>
                </div>

                {/* Authentic Clinical Stamp Replicated from Photo */}
                <div className="flex items-center justify-end sm:justify-center">
                  <div className="border-2 border-blue-800/80 rounded-sm p-2 text-blue-900/90 text-center font-sans tracking-tight text-[9px] md:text-[10px] uppercase font-bold leading-tight max-w-[280px] bg-blue-50/30 transform -rotate-1 shadow-sm">
                    <div className="font-black text-[10px] text-blue-950 border-b border-blue-800/40 pb-0.5 mb-0.5">
                      Dr. A.VASANTHARAJ., MPT(NEURO), MIAP, MIFNR,
                    </div>
                    <div className="text-[9px] font-black text-blue-900">
                      REG No: 56748
                    </div>
                    <div className="font-extrabold text-[9px]">
                      CHIEF PHYSIOTHERAPIST
                    </div>
                    <div className="font-black tracking-wider text-blue-950">
                      EL-ROI PHYSIO CARE
                    </div>
                    <div className="text-[8px] font-semibold text-blue-900/90 lowercase capitalize">
                      5, Vaanidhaasan St, Kamaraj Nagar, Puducherry - 605011.
                    </div>
                    <div className="text-[8.5px] font-black text-blue-950 mt-0.5">
                      CELL: +91 98292 37774
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 7. Signatures / Approvals (Three Column Layout) */}
            <div className="grid grid-cols-3 gap-4 pt-10 pb-4 text-center">
              {/* Prepared By */}
              <div className="space-y-1">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-800 block">
                  PREPARED BY
                </span>
                {/* Replicated Cursive Signature Stroke */}
                <div className="h-10 flex items-center justify-center">
                  <svg
                    className="w-24 h-8 text-blue-950"
                    viewBox="0 0 120 40"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  >
                    <path d="M10,25 C25,10 35,35 45,20 C55,10 65,30 85,15 C95,10 100,28 110,22" />
                    <path d="M20,32 L95,30" strokeWidth="1" opacity="0.6" />
                  </svg>
                </div>
                <div className="border-t border-slate-700 pt-1 text-[10px] font-bold text-slate-700 uppercase">
                  CLINICAL IN-CHARGE
                </div>
              </div>

              {/* Approved By */}
              <div className="space-y-1">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-800 block">
                  APPROVED BY
                </span>
                {/* Replicated Cursive Signature Stroke */}
                <div className="h-10 flex items-center justify-center">
                  <svg
                    className="w-28 h-8 text-blue-950"
                    viewBox="0 0 140 40"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  >
                    <path d="M15,28 L35,12 L50,30 L65,18 L85,25 L105,15 L125,24" />
                    <path d="M30,34 L120,32" strokeWidth="1" opacity="0.6" />
                  </svg>
                </div>
                <div className="border-t border-slate-700 pt-1 text-[10px] font-bold text-slate-700 uppercase">
                  MANAGING DIRECTOR
                </div>
              </div>

              {/* Received By */}
              <div className="space-y-1">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-800 block">
                  RECEIVED BY
                </span>
                {/* Replicated Cursive Signature Stroke */}
                <div className="h-10 flex items-center justify-center">
                  <svg
                    className="w-24 h-8 text-blue-950"
                    viewBox="0 0 120 40"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  >
                    <path d="M15,22 C30,12 40,28 55,18 C70,12 85,24 105,18" />
                    <path d="M25,32 L95,31" strokeWidth="1" opacity="0.6" />
                  </svg>
                </div>
                <div className="border-t border-slate-700 pt-1 text-[10px] font-bold text-slate-900 truncate">
                  {employeeName}
                </div>
              </div>
            </div>

            {/* 8. Verified Footer Note */}
            <div className="border-t border-slate-200 mt-6 pt-3 text-center text-[10px] text-slate-400 font-medium">
              This document is a computer-generated salary slip officially issued by Elroi Physio Care &amp; Rehabilitation Centre.
            </div>
          </div>
        </div>

        {/* Modal Footer Controls (Hidden in Print) */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 no-print">
          <span className="text-xs text-slate-500 font-medium text-center sm:text-left">
            Ready to export as PDF (A4 format) or direct print.
          </span>
          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={handleDownloadPDF}
              disabled={isDownloading}
              className="px-4 py-2 bg-[#588b12] hover:bg-[#48730e] text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              {isDownloading ? "Generating..." : "Download PDF"}
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              Print Slip
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
