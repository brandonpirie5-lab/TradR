/** Human copy for pit participant counts — never lead with a dead zero floor. */
export function formatFloorTraders(count: number): string {
  if (count <= 0) return 'Floor filling';
  if (count === 1) return '1 trader on the floor';
  return `${count.toLocaleString()} traders on the floor`;
}

export function formatFloorTradersShort(count: number): string {
  if (count <= 0) return 'Filling up';
  if (count === 1) return '1 trader';
  return `${count.toLocaleString()} traders`;
}