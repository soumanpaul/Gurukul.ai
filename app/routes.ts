export const mainRoutes = ['notebooks', 'buddy', 'study', 'progress', 'settings'] as const;
export type MainRoute = typeof mainRoutes[number];
export type Route = MainRoute | 'diagnostics';
export const routeLabels: Record<MainRoute, string> = {
  notebooks: 'Notebooks', buddy: 'AI Buddy', study: 'Study', progress: 'Progress', settings: 'Settings',
};
