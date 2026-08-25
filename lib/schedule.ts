import type { ScheduleType } from '@/types/database';

export function generateReviewWeeks(teachingWeek: number, scheduleType: ScheduleType): number[] {
  const weeks: number[] = [];

  if (scheduleType === 'fixed') {
    let current = teachingWeek;
    while (true) {
      current += 8;
      if (current > 40) break;
      weeks.push(current);
    }
    return weeks;
  }

  let current = teachingWeek;
  let reviewCount = 0;
  while (true) {
    const interval = reviewCount === 0 ? 1 : reviewCount === 1 ? 4 : 9;
    current += interval;
    if (current > 40) break;
    weeks.push(current);
    reviewCount += 1;
  }

  return weeks;
}
