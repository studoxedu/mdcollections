export const money = (n: number) => `₦${Math.round(n).toLocaleString("en-NG")}`;
export const dateTime = (s: string) =>
  new Date(s).toLocaleString("en-NG", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
export const dateOnly = (s: string) =>
  new Date(s).toLocaleDateString("en-NG", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
