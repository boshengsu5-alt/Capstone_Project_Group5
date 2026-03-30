export function shouldHideCompensationAmounts(status: string | null | undefined): boolean {
  return status === 'under_review';
}

export function getDisplayCompensationAmount(
  status: string | null | undefined,
  agreedAmount: number | null,
  assessedAmount: number | null
): number | null {
  if (shouldHideCompensationAmounts(status)) return null;
  return agreedAmount ?? assessedAmount;
}

export function getOutstandingAmount(
  agreedAmount: number | null,
  assessedAmount: number | null,
  paidAmount: number
): number {
  const target = agreedAmount ?? assessedAmount ?? 0;
  return Math.max(0, target - paidAmount);
}

export function getDisplayOutstandingAmount(
  status: string | null | undefined,
  agreedAmount: number | null,
  assessedAmount: number | null,
  paidAmount: number
): number {
  if (shouldHideCompensationAmounts(status)) return 0;
  return getOutstandingAmount(agreedAmount, assessedAmount, paidAmount);
}
