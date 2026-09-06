export type DraftsPageProps = {
  searchParams: Promise<{
    year?: string | string[];
    team?: string | string[];
    round?: string | string[];
    q?: string | string[];
    sort?: string | string[];
    dir?: string | string[];
    page?: string | string[];
    from?: string | string[];
    to?: string | string[];
    view?: string | string[];
    outcomeMetric?: string | string[];
    roundGroup?: string | string[];
    direction?: string | string[];
  }>;
};
