export const queryKeys = {
  reports: {
    all: ['reports'],
    detail: (id: string) => ['reports', id],
  },
  dashboard: {
    all: ['dashboard'],
  },
  reviews: {
    all: ['reviews'],
    detail: (id: string) => ['reviews', id],
  },
  precursors: {
    all: ['precursors'],
  },
  interventions: {
    all: ['interventions'],
  },
  correctiveActions: {
    all: ['corrective-actions'],
    detail: (id: string) => ['corrective-actions', id],
  },
};
