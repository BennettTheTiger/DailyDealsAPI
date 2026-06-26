export interface Deal {
  id: string;
  retailer: string;
  title: string;
  price?: string;
  originalPrice?: string;
  discount?: string;
  discountPercent?: number;
  url?: string;
  image?: string;
  description?: string;
  scrapedAt: string;
}

export interface ScraperResult {
  retailer: string;
  deals: Deal[];
  scrapedAt: string;
  success: boolean;
  error?: string;
}
