import type { PlanEntry } from "@/types";
import { showToast } from "@/lib/toast";

function downloadBlob(content: string, type: string, filename: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportPlanTxt(plan: PlanEntry[]) {
  if (plan.length === 0) return showToast("Your night plan is empty!");
  let txt = `STARGAZER - SESSION PLAN\nGenerated on: ${new Date().toLocaleDateString()}\n\n`;
  plan.forEach((item, idx) => {
    txt += `${idx + 1}. ${item.name}\n   Observing window: ${item.startTime} - ${item.endTime}\n   Coordinates: RA ${item.ra}°, DEC ${item.dec}°\n\n`;
  });
  downloadBlob(txt, "text/plain", `stargazer_session_plan_${Date.now()}.txt`);
}

export function exportPlanCsv(plan: PlanEntry[]) {
  if (plan.length === 0) return showToast("Your night plan is empty!");
  let csv = `Order,Target Name,Start Time,End Time,RA,DEC\n`;
  plan.forEach((item, idx) => {
    csv += `${idx + 1},"${item.name}",${item.startTime},${item.endTime},${item.ra},${item.dec}\n`;
  });
  downloadBlob(csv, "text/csv", `stargazer_session_plan_${Date.now()}.csv`);
}
