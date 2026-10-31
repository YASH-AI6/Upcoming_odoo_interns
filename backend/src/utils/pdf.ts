import PDFDocument from "pdfkit";

export interface InvoicePdfData {
  number: string;
  issueDate: Date;
  dueDate: Date;
  customer: {
    name: string;
    email: string;
    address?: string | null;
    city?: string | null;
    country?: string | null;
  };
  subscriptionNumber?: string | null;
  lines: Array<{
    productName: string;
    quantity: number;
    unitPrice: string | number;
    taxRate: string | number;
    discountAmount: string | number;
    amount: string | number;
  }>;
  subtotal: string | number;
  discountTotal: string | number;
  taxTotal: string | number;
  total: string | number;
  amountPaid: string | number;
  status: string;
}

export const generateInvoicePdf = (data: InvoicePdfData): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const buffers: Buffer[] = [];

    doc.on("data", (chunk: Buffer) => buffers.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(buffers)));
    doc.on("error", (err: Error) => reject(err));

    doc.fontSize(22).text("INVOICE", { align: "right" });
    doc.fontSize(10).fillColor("#666666").text(`Invoice #: ${data.number}`, { align: "right" });
    doc.text(`Issue Date: ${new Date(data.issueDate).toLocaleDateString()}`, { align: "right" });
    doc.text(`Due Date: ${new Date(data.dueDate).toLocaleDateString()}`, { align: "right" });
    doc.text(`Status: ${data.status}`, { align: "right" });

    doc.moveDown();
    doc.fontSize(14).fillColor("#000000").text("Subscription Management Inc.");
    doc.fontSize(10).fillColor("#444444").text("100 Innovation Way");
    doc.text("Tech Park, CA 94016");
    doc.text("support@subscription.local");

    doc.moveDown();
    doc.fontSize(12).fillColor("#000000").text("Bill To:");
    doc.fontSize(10).fillColor("#444444").text(data.customer.name);
    doc.text(data.customer.email);
    if (data.customer.address) doc.text(data.customer.address);
    if (data.customer.city || data.customer.country) {
      doc.text([data.customer.city, data.customer.country].filter(Boolean).join(", "));
    }
    if (data.subscriptionNumber) {
      doc.text(`Subscription: ${data.subscriptionNumber}`);
    }

    doc.moveDown();

    const tableTop = doc.y + 10;
    doc.fontSize(10).fillColor("#000000");
    doc.text("Item", 50, tableTop);
    doc.text("Qty", 240, tableTop, { width: 40, align: "right" });
    doc.text("Unit Price", 290, tableTop, { width: 60, align: "right" });
    doc.text("Tax %", 360, tableTop, { width: 40, align: "right" });
    doc.text("Discount", 410, tableTop, { width: 50, align: "right" });
    doc.text("Total", 470, tableTop, { width: 70, align: "right" });

    doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).strokeColor("#cccccc").stroke();

    let yPosition = tableTop + 25;
    data.lines.forEach((line) => {
      doc.fontSize(9).fillColor("#333333");
      doc.text(line.productName, 50, yPosition, { width: 180 });
      doc.text(String(line.quantity), 240, yPosition, { width: 40, align: "right" });
      doc.text(`$${Number(line.unitPrice).toFixed(2)}`, 290, yPosition, { width: 60, align: "right" });
      doc.text(`${Number(line.taxRate).toFixed(1)}%`, 360, yPosition, { width: 40, align: "right" });
      doc.text(`$${Number(line.discountAmount).toFixed(2)}`, 410, yPosition, { width: 50, align: "right" });
      doc.text(`$${Number(line.amount).toFixed(2)}`, 470, yPosition, { width: 70, align: "right" });
      yPosition += 20;
    });

    doc.moveTo(50, yPosition).lineTo(550, yPosition).strokeColor("#cccccc").stroke();
    yPosition += 15;

    const printTotalLine = (label: string, amount: string | number, isBold = false) => {
      doc.fontSize(isBold ? 11 : 10);
      if (isBold) {
        doc.fillColor("#000000");
      } else {
        doc.fillColor("#555555");
      }
      doc.text(label, 360, yPosition, { width: 100, align: "right" });
      doc.text(`$${Number(amount).toFixed(2)}`, 470, yPosition, { width: 70, align: "right" });
      yPosition += 18;
    };

    printTotalLine("Subtotal:", data.subtotal);
    printTotalLine("Discount Total:", data.discountTotal);
    printTotalLine("Tax Total:", data.taxTotal);
    printTotalLine("Total:", data.total, true);
    printTotalLine("Amount Paid:", data.amountPaid);
    const balanceDue = Math.max(0, Number(data.total) - Number(data.amountPaid));
    printTotalLine("Balance Due:", balanceDue, true);

    doc.moveDown(2);
    doc.fontSize(9).fillColor("#888888").text("Thank you for your business!", { align: "center" });

    doc.end();
  });
};
