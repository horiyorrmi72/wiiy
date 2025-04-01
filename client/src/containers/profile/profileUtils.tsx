export function getSpecialtyDisplayName(
  specialtyName: string | null | undefined
): string {
  let ret = 'Unknown';
  if (specialtyName) {
    ret = specialtyName.replace(/_/g, ' ');
  }
  return ret;
}
