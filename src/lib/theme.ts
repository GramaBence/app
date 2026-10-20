export const colors = {
  navy: '#1A365D', orange: '#FF6B00', paper: '#F5F1E9', white: '#FFFEFB',
  muted: '#68778A', line: '#E4DDD2', pale: '#EAF0F5', paleOrange: '#FFF0E5',
  green: '#E8F5EF', danger: '#B42318', ink: '#14263E', sun: '#FFD166', lilac: '#E9DDF7', mint: '#DCEFE5',
};

export const categories = ['Design', 'Technológia', 'Környezet', 'Film és fotó', 'Zene', 'Más'];
export const initials = (name?: string | null) => (name || 'Alkotó').split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase();
export const shortDate = (date: string) => new Intl.DateTimeFormat('hu-HU', { month: 'short', day: 'numeric' }).format(new Date(date));
