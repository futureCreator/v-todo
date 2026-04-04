export default function YearProgress() {
  const now = new Date();
  const year = now.getFullYear();

  const startOfYear = new Date(year, 0, 1);
  const diff = now.getTime() - startOfYear.getTime();
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24)) + 1;

  const isLeapYear = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  const totalDays = isLeapYear ? 366 : 365;

  const percent = (dayOfYear / totalDays) * 100;
  const display = percent.toFixed(1);

  return (
    <div className="relative w-full h-5 rounded-full overflow-hidden bg-[var(--sys-fill-secondary)]">
      <div
        className="absolute inset-y-0 left-0 rounded-full bg-[var(--sys-blue)]"
        style={{ width: `${display}%` }}
      />
      <span className="absolute inset-0 flex items-center justify-center text-[13px] text-[var(--sys-label-secondary)] font-medium">
        {year}&nbsp;&nbsp;{display}%
      </span>
    </div>
  );
}
