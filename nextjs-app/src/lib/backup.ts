function relevantKeys(): string[] {
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (key.startsWith("stargazer_") || key.startsWith("sg_"))) keys.push(key);
  }
  return keys;
}

export function exportBackup(): void {
  const data: Record<string, string> = {};
  for (const key of relevantKeys()) {
    const value = localStorage.getItem(key);
    if (value != null) data[key] = value;
  }
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `stargazer_backup_${new Date().toISOString().split("T")[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function importBackup(file: File): Promise<void> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result as string) as Record<string, string>;
        for (const key in data) {
          if (key.startsWith("stargazer_") || key.startsWith("sg_")) {
            localStorage.setItem(key, data[key]);
          }
        }
        resolve();
      } catch {
        reject(new Error("Invalid JSON backup file."));
      }
    };
    reader.onerror = () => reject(new Error("Could not read the selected file."));
    reader.readAsText(file);
  });
}
