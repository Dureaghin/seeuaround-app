/** Monday–Sunday dates for the week that contains `at`, in the server's local calendar. */
export function currentWeekDates(at = new Date()): string[] {
  const monday = new Date(at);
  monday.setDate(at.getDate() - ((at.getDay() + 6) % 7));
  monday.setHours(12, 0, 0, 0);
  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(monday);
    day.setDate(monday.getDate() + index);
    const month = String(day.getMonth() + 1).padStart(2, "0");
    const date = String(day.getDate()).padStart(2, "0");
    return `${day.getFullYear()}-${month}-${date}`;
  });
}

export function todayYmd(at = new Date()): string {
  const month = String(at.getMonth() + 1).padStart(2, "0");
  const date = String(at.getDate()).padStart(2, "0");
  return `${at.getFullYear()}-${month}-${date}`;
}
