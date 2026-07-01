import type { Business, CalendarItem, ContentItem, Strategy } from "@/lib/types";
import type { AppSnapshotInput } from "@/lib/schemas";

export type { AppSnapshotInput as AppSnapshot };

export interface DataRepository {
  sync(snapshot: AppSnapshotInput): Promise<void>;
  getBusiness(userId: string, businessId: string): Business | null;
  getStrategy(userId: string, businessId: string): Strategy | null;
  getCalendarItem(userId: string, businessId: string, itemId: string): CalendarItem | null;
  getContent(userId: string, businessId: string, contentId: string): ContentItem | null;
}
