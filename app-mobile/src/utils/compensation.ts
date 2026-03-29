export function getOutstandingAmount(
  agreedAmount: number | null,
  assessedAmount: number | null,
  paidAmount: number
): number {
  const target = agreedAmount ?? assessedAmount ?? 0;
  return Math.max(0, target - paidAmount);
}
