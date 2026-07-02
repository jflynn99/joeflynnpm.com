// Shapes returned by OWID's public APIs, verified against the live API.
// See SPEC.md §4.

export interface SearchChartResult {
  type: "chart";
  slug: string;
  title: string;
  variantName?: string;
  availableEntities?: string[];
}

export interface SearchPageResult {
  type: "article" | "topic-page" | string;
  slug: string;
  title: string;
  content?: string;
  url?: string;
  authors?: string[];
  date?: string;
  thumbnailUrl?: string;
}

export type SearchResult = SearchChartResult | SearchPageResult;

export interface SearchResponse {
  query: string;
  results: SearchResult[];
  nbHits: number;
  offset: number;
  length: number;
}

// metadata.json?useColumnShortNames=true — columns keyed by CSV short column name
export interface ColumnMeta {
  titleShort: string;
  titleLong?: string;
  descriptionShort?: string;
  descriptionKey?: string[];
  unit?: string;
  shortUnit?: string;
  timespan?: string;
  type?: string;
  shortName: string;
  owidVariableId?: number;
  lastUpdated?: string;
  nextUpdate?: string;
  citationShort?: string;
  citationLong?: string;
  fullMetadata?: string;
}

export interface GrapherMetadata {
  chart: {
    title: string;
    subtitle?: string;
    citation: string;
    originalChartUrl: string;
    selection: string[]; // default entity selection, as names
  };
  columns: Record<string, ColumnMeta>;
}

// Parsed CSV
export interface DataRow {
  entity: string;
  code: string;
  year: number;
  values: Record<string, number | null>;
}

export interface ParsedChartData {
  columns: string[]; // value columns (excludes entity/code/year)
  rows: DataRow[];
}

// One renderable line: a (column, entity) pair
export interface EntitySeries {
  entity: string;
  code: string;
  points: [year: number, value: number][]; // sorted by year, gaps omitted
}

export interface EntityInfo {
  entity: string;
  code: string;
}

export interface EntitiesResponse {
  entities: EntityInfo[];
  minYear: number;
  maxYear: number;
}
