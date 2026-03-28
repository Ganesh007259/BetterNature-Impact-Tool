export type Area = {
  city: string;
  state: string;
  zip: string;
  lat: number;
  lng: number;
  food_insecurity_score: number;
  poverty_rate: number;
  population: number;
  need_priority_level: string;
  pounds_distributed: number;
  meal_kits_distributed: number;
  event_count: number;
  volunteers_total: number;
  people_served: number;
  chapters_active: string[];
  event_types: string[];
  activity_index: number;
  coverage_gap: number;
  chapter_proximity_bonus: number;
  priority_score: number;
  recommendation_summary: string;
};

export type EventRow = {
  id: string;
  chapter: string;
  city: string;
  state: string;
  zip: string;
  lat: number;
  lng: number;
  date: string;
  pounds: number;
  meal_kits: number;
  volunteers: number;
  people_served: number;
  event_type: string;
};

export type Chapter = {
  name: string;
  city: string;
  state: string;
  lat: number;
  lng: number;
  launch_date: string;
  lead_contact: string;
  total_events: number;
  total_pounds: number;
  status: string;
  reported_events: number;
  reported_pounds: number;
  reported_meal_kits: number;
  reported_volunteers: number;
  reported_people_served: number;
  has_impact: boolean;
};

export type Partner = {
  name: string;
  type: string;
  city: string;
  state: string;
  zip: string;
  lat: number;
  lng: number;
};

export type DatasetMeta = {
  app_version: string;
  sqlite_path: string;
  areas_count: number;
  events_count: number;
  persistence: string;
  need_data_note: string;
  memphis_note: string;
  updated_at?: string;
};

export type Summary = {
  total_food_lbs: number;
  total_meal_kits: number;
  total_events: number;
  total_volunteers_reported: number;
  people_reached: number;
  active_chapters: number;
  chapters_reporting_impact: number;
  top_priority_regions: { zip: string; city: string; state?: string; priority_score: number; need_level: string }[];
  data_note?: string;
};

export type Recommendation = {
  zip: string;
  city: string;
  state: string;
  priority_score: number;
  food_insecurity_score: number;
  coverage_gap: number;
  activity_index: number;
  population: number;
  need_priority_level: string;
  suggested_actions: string[];
  ai_summary: string;
};
