export const eventNames = [
  'book_banner_view',
  'book_detail_click',
  'book_purchase_click',
  'book_companion_click',
  'awesome_fde_click',
  'community_card_view',
  'community_detail_click',
  'membership_purchase_click',
  'purchase_qrcode_view',
  'purchase_link_copy',
  'member_access_click',
] as const;
export type MarketingEvent = (typeof eventNames)[number];
export type MarketingContext = { placement: string; contentType?: string; articleId?: string };
