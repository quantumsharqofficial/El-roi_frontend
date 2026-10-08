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
  Image,
} from "lucide-react";
import { numberToWordsIndian, maskAccountNumber, getOrdinal } from "../utilities/salaryUtils";
import { toast } from "sonner";

export default function PayslipModal({
  selectedPayslip,
  employeeDetails,
  onClose,
}) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [isDownloadingImage, setIsDownloadingImage] = useState(false);
  const printableRef = useRef(null);

  if (!selectedPayslip) return null;
  console.log("sakt hi   ", employeeDetails?.bankDetails?.accountNumber
  );

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
  const fuelAllowances =
    Number(selectedPayslip.fuelAllowances) ||
    Number(selectedPayslip.fuelAllowance) ||
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
    Number(selectedPayslip.travelAllowance) ||
    0;
  const otherPayments =
    Number(selectedPayslip.otherPayments) ||
    Number(selectedPayslip.otherAdditionalPayments) ||
    0;
  // OT is stored as hours; calculate ₹ amount using daily rate
  const dailyRate = basicSalary / (totalWorkingDays || 26);
  const hourlyRate = dailyRate / 8 || 150;
  const overtimeHours = Number(selectedPayslip.overtimeHours) || 0;
  const overtimePay =
    Number(selectedPayslip.overtimePay) ||
    Math.round(overtimeHours * hourlyRate);

  const grossEarnings =
    basicSalary +
    homeRehabIncentives +
    fuelAllowances +
    otherIncentives +
    sundayPostings +
    sundayHomeRehab +
    otherPayments +
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
  const bankName = employeeDetails?.bankDetails?.bankName || "--";
  const rawAcc = employeeDetails?.bankDetails?.accountNumber;
  const accountNumber = rawAcc ? maskAccountNumber(rawAcc) : "--";
  const ifscCode = employeeDetails?.bankDetails?.ifscCode || "--";

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

  // Image Download Handler using html2canvas
  // Captures the payslip at its FULL natural document size — not the viewport/camera size
  const handleDownloadImage = async () => {
    if (!printableRef.current) return;
    setIsDownloadingImage(true);
    toast.info("Capturing payslip as image...");
    try {
      const html2canvasModule = await import("html2canvas");
      const html2canvas = html2canvasModule.default || html2canvasModule;

      const element = printableRef.current;

      // Clone element off-screen at full natural width so html2canvas
      // captures the complete payslip, not just what's visible on screen
      const NATURAL_WIDTH = 800; // matches max-w-[800px] payslip container
      const clone = element.cloneNode(true);
      clone.style.position = "fixed";
      clone.style.top = "-99999px";
      clone.style.left = "-99999px";
      clone.style.width = `${NATURAL_WIDTH}px`;
      clone.style.height = "auto";
      clone.style.overflow = "visible";
      clone.style.zIndex = "-9999";
      document.body.appendChild(clone);

      // Wait one frame so styles apply
      await new Promise((r) => requestAnimationFrame(r));

      const canvas = await html2canvas(clone, {
        scale: 2.5,
        useCORS: true,
        logging: false,
        scrollX: 0,
        scrollY: 0,
        width: clone.scrollWidth,
        height: clone.scrollHeight,
        windowWidth: NATURAL_WIDTH,
        windowHeight: clone.scrollHeight,
        backgroundColor: "#ffffff",
      });

      document.body.removeChild(clone);

      const sanitizedName = employeeName.replace(/[^a-zA-Z0-9]/g, "_");
      const filename = `Payslip_${sanitizedName}_${monthStr}.png`;

      const link = document.createElement("a");
      link.download = filename;
      link.href = canvas.toDataURL("image/png");
      link.click();

      toast.success("Payslip image downloaded successfully!");
    } catch (err) {
      console.error("Image capture failed:", err);
      toast.error("Failed to generate image.");
    } finally {
      setIsDownloadingImage(false);
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

            {/* Download Image Button */}
            <button
              type="button"
              onClick={handleDownloadImage}
              disabled={isDownloadingImage}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold transition-all shadow-sm cursor-pointer disabled:opacity-50"
              title="Download Payslip as PNG Image"
            >
              <Image className="w-3.5 h-3.5" />
              {isDownloadingImage ? "Capturing..." : "Save as Image"}
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

            {/* 4. Earnings & Deductions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-4">
              {/* Earnings */}
              <div className="border border-slate-800 flex flex-col">
                <div className="bg-slate-100 border-b border-slate-800 py-1.5 text-center text-[10px] font-black uppercase tracking-[0.18em] text-slate-900">EARNINGS</div>
                <div className="grid grid-cols-[1fr_90px] px-3 py-1.5 bg-slate-50 border-b border-slate-300">
                  <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Particulars</span>
                  <span className="text-right text-[10px] font-bold text-slate-600 uppercase tracking-wider">Amount</span>
                </div>
                <div className="flex-1 divide-y divide-slate-200 text-[11px]">
                  <div className="grid grid-cols-[1fr_90px] px-3 py-[7px]"><span className="font-medium text-slate-700">Basic Salary</span><span className="text-right font-semibold font-mono text-slate-900">{basicSalary ? formatCurr(basicSalary) : "20,000.00"}</span></div>
                  <div className="grid grid-cols-[1fr_90px] px-3 py-[7px]"><span className="font-medium text-slate-700">Home Rehab incentives</span><span className="text-right font-semibold font-mono text-slate-900">{homeRehabIncentives ? formatCurr(homeRehabIncentives) : "-"}</span></div>
                  <div className="grid grid-cols-[1fr_90px] px-3 py-[7px]"><span className="font-medium text-slate-700">Fuel Allowances</span><span className="text-right font-semibold font-mono text-slate-900">{fuelAllowances ? formatCurr(fuelAllowances) : "-"}</span></div>
                  <div className="grid grid-cols-[1fr_90px] px-3 py-[7px]"><span className="font-medium text-slate-700">Other Incentives</span><span className="text-right font-semibold font-mono text-slate-900">{otherIncentives ? formatCurr(otherIncentives) : "-"}</span></div>
                  <div className="grid grid-cols-[1fr_90px] px-3 py-[7px]"><span className="font-medium text-slate-700">Sunday Postings</span><span className="text-right font-semibold font-mono text-slate-900">{sundayPostings ? formatCurr(sundayPostings) : "-"}</span></div>
                  <div className="grid grid-cols-[1fr_90px] px-3 py-[7px]"><span className="font-medium text-slate-700">Sunday Home Rehab</span><span className="text-right font-semibold font-mono text-slate-900">{sundayHomeRehab ? formatCurr(sundayHomeRehab) : "-"}</span></div>
                  <div className="grid grid-cols-[1fr_90px] px-3 py-[7px]"><span className="font-medium text-slate-700">{overtimeHours > 0 ? `Overtime Incentive (${overtimeHours} hrs)` : "Overtime Incentive"}</span><span className="text-right font-semibold font-mono text-slate-900">{overtimePay ? formatCurr(overtimePay) : "-"}</span></div>
                </div>
                <div className="grid grid-cols-[1fr_90px] px-3 py-2 border-t-2 border-slate-800 bg-slate-100">
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-900">Gross Earnings</span>
                  <span className="text-right text-[12px] font-black font-mono text-slate-900">{formatCurr(grossEarnings)}</span>
                </div>
              </div>
              {/* Deductions */}
              <div className="border border-slate-800 flex flex-col">
                <div className="bg-slate-100 border-b border-slate-800 py-1.5 text-center text-[10px] font-black uppercase tracking-[0.18em] text-slate-900">DEDUCTIONS</div>
                <div className="grid grid-cols-[1fr_90px] px-3 py-1.5 bg-slate-50 border-b border-slate-300">
                  <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Particulars</span>
                  <span className="text-right text-[10px] font-bold text-slate-600 uppercase tracking-wider">Amount</span>
                </div>
                <div className="flex-1 divide-y divide-slate-200 text-[11px]">
                  <div className="grid grid-cols-[1fr_90px] px-3 py-[7px]"><span className="font-medium text-slate-700">Leave Deductions</span><span className="text-right font-semibold font-mono text-rose-700">{leaveDeductions ? formatCurr(leaveDeductions) : "-"}</span></div>
                  <div className="grid grid-cols-[1fr_90px] px-3 py-[7px]"><span className="font-medium text-slate-700">Late Coming Deductions</span><span className="text-right font-semibold font-mono text-rose-700">{lateComingDeductions ? formatCurr(lateComingDeductions) : "-"}</span></div>
                  <div className="grid grid-cols-[1fr_90px] px-3 py-[7px]"><span className="font-medium text-slate-700">Other Deductions</span><span className="text-right font-semibold font-mono text-rose-700">{otherDeductions ? formatCurr(otherDeductions) : "-"}</span></div>
                  <div className="grid grid-cols-[1fr_90px] px-3 py-[7px] opacity-0 select-none"><span>-</span><span>-</span></div>
                  <div className="grid grid-cols-[1fr_90px] px-3 py-[7px] opacity-0 select-none"><span>-</span><span>-</span></div>
                  <div className="grid grid-cols-[1fr_90px] px-3 py-[7px] opacity-0 select-none"><span>-</span><span>-</span></div>
                  <div className="grid grid-cols-[1fr_90px] px-3 py-[7px] opacity-0 select-none"><span>-</span><span>-</span></div>
                </div>
                <div className="grid grid-cols-[1fr_90px] px-3 py-2 border-t-2 border-slate-800 bg-slate-100">
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-900">Total Deductions</span>
                  <span className="text-right text-[12px] font-black font-mono text-rose-700">{formatCurr(totalDeductions)}</span>
                </div>
              </div>
            </div>

            {/* 5. NET PAY */}
            <div className="my-4 border-2 border-slate-800 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-5 py-3">
              <div className="flex items-baseline gap-3">
                <span className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-800">NET PAY</span>
                <span className="text-2xl font-black text-slate-900 font-mono">
                  &#8377;{Number(netPay).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="text-[11px] font-semibold text-slate-600 italic sm:text-right">({netPayInWords})</div>
            </div>

            {/* 6. PAYMENT DETAILS */}
            <div className="border-t border-slate-300 pt-4 pb-4 mx-0">
              <h4 className="text-center text-[10px] font-black uppercase tracking-[0.18em] text-slate-800 mb-3">PAYMENT DETAILS</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-2 text-[11.5px] px-2">
                <div className="space-y-2">
                  <div className="flex"><span className="w-32 font-bold text-slate-600 shrink-0">Bank Name</span><span className="font-semibold text-slate-900">&nbsp;:&nbsp;{bankName}</span></div>
                  <div className="flex"><span className="w-32 font-bold text-slate-600 shrink-0">Account No</span><span className="font-semibold text-slate-900 font-mono">&nbsp;:&nbsp;{accountNumber}</span></div>
                </div>
                <div className="space-y-2">
                  <div className="flex"><span className="w-32 font-bold text-slate-600 shrink-0">IFSC Code</span><span className="font-semibold text-slate-900 font-mono">&nbsp;:&nbsp;{ifscCode}</span></div>
                  <div className="flex"><span className="w-32 font-bold text-slate-600 shrink-0">Payment Date</span><span className="font-semibold text-slate-900">&nbsp;:&nbsp;{paymentDateFormatted}</span></div>
                </div>
              </div>
            </div>

            {/* 7. SIGNATURES */}
            <div className="border-t border-slate-300 pt-6 pb-5">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="flex flex-col items-center gap-2">
                  <span className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-700">Prepared By</span>
                  <div className="h-10 flex items-end justify-center w-full">

                  </div>
                  <div className="border-t border-slate-700 w-full pt-1 text-[9px] font-bold text-slate-700 uppercase tracking-wider">Clinical In-Charge</div>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <span className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-700">Approved By</span>
                  <div className="h-10 flex items-end justify-center w-full">

                  </div>
                  <div className="border-t border-slate-700 w-full pt-1 text-[9px] font-bold text-slate-700 uppercase tracking-wider">Managing Director</div>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <span className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-700">Received By</span>
                  <div className="h-10 flex items-end justify-center w-full">

                  </div>
                  <div className="border-t border-slate-700 w-full pt-1 text-[9px] font-bold text-slate-900 truncate">{employeeName}</div>
                </div>
              </div>
            </div>

            {/* 8. FOOTER */}
            <div className="border-t border-slate-200 pt-3 pb-4 text-center text-[9.5px] text-slate-400 font-medium">
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
              onClick={handleDownloadImage}
              disabled={isDownloadingImage}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Image className="w-3.5 h-3.5" />
              {isDownloadingImage ? "Capturing..." : "Save as Image"}
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
