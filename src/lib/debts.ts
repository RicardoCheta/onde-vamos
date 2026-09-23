// Algoritmo de simplificação de dívidas (estilo Splitwise): minimiza o número
// de transferências necessárias para acertar contas dentro de um grupo.
// Trabalha em cêntimos (inteiros) para evitar erros de vírgula flutuante.

export interface Transfer {
  fromUserId: string;
  toUserId: string;
  amountCents: number;
}

export function simplifyDebts(netBalanceCents: Record<string, number>): Transfer[] {
  const creditors: { userId: string; amount: number }[] = [];
  const debtors: { userId: string; amount: number }[] = [];

  for (const [userId, amount] of Object.entries(netBalanceCents)) {
    if (amount > 0) creditors.push({ userId, amount });
    else if (amount < 0) debtors.push({ userId, amount: -amount });
  }

  creditors.sort((a, b) => b.amount - a.amount);
  debtors.sort((a, b) => b.amount - a.amount);

  const transfers: Transfer[] = [];
  let i = 0;
  let j = 0;

  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];
    const amount = Math.min(debtor.amount, creditor.amount);

    if (amount > 0) {
      transfers.push({ fromUserId: debtor.userId, toUserId: creditor.userId, amountCents: amount });
    }

    debtor.amount -= amount;
    creditor.amount -= amount;

    if (debtor.amount === 0) i++;
    if (creditor.amount === 0) j++;
  }

  return transfers;
}

export function equalShares(totalCents: number, participantCount: number): number[] {
  const base = Math.floor(totalCents / participantCount);
  const remainder = totalCents - base * participantCount;
  // Distribui os cêntimos que sobram (do arredondamento) pelos primeiros participantes
  return Array.from({ length: participantCount }, (_, i) => base + (i < remainder ? 1 : 0));
}
