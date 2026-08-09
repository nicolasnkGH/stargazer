export interface OpticsResult {
  magnification: number;
  exitPupilMm: number;
  trueFovDeg: number;
  maxUsefulMagnification: number;
}

export function computeOptics(scopeFocalLength: number, scopeApertureMm: number, eyepieceFocalLength: number, eyepieceApparentFov: number): OpticsResult {
  const magnification = eyepieceFocalLength > 0 ? scopeFocalLength / eyepieceFocalLength : 0;
  const exitPupilMm = magnification > 0 ? scopeApertureMm / magnification : 0;
  const trueFovDeg = magnification > 0 ? eyepieceApparentFov / magnification : 0;
  const maxUsefulMagnification = scopeApertureMm * 2;
  return { magnification, exitPupilMm, trueFovDeg, maxUsefulMagnification };
}
